/**
 * Multi-Source Data Ingestion Pipeline
 * =====================================
 * Ingests music data from 3 Kaggle sources into a unified Pinecone vector index:
 *
 * Source 1: Kaggle Dataset of Songs.csv
 *   - Spotify audio features (Danceability, Energy, Valence, etc.)
 *   - Feature Engineering: translates numerical values → natural language mood sentences
 *
 * Source 2: spotify_data.csv
 *   - Indian/Punjabi song metadata (Song Name, Artist, Release Date, Popularity)
 *   - Provides catalog coverage for regional Indian music
 *
 * Source 3: Indian Hindi Songs Lyrics Dataset/
 *   - Raw Hindi lyrics in .txt files organized by mood folders
 *   - Folder name (e.g. "New happy") serves as the ground-truth mood label
 *   - Lyrics are embedded directly for deep semantic matching
 *
 * Usage: node scripts/ingest-embeddings.js
 * Required env vars: GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local (Next.js convention)
import dotenv from "dotenv";
dotenv.config({ path: resolve(__dirname, "../.env.local") });

// ─── Configuration ────────────────────────────────────────────────────────────
const BATCH_SIZE = 10;          // Pinecone upsert batch size
const EMBED_DELAY_MS = 120;     // Delay between embedding API calls (rate limit)
const MAX_LYRICS_CHARS = 1500;  // Truncate lyrics to avoid token limits
const MAX_SONGS_PER_CSV = 500;  // Cap per CSV to stay within free-tier limits

// ─── Feature Engineering: Translate Spotify numbers → natural language ────────
function translateAudioFeatures(row) {
  const parts = [];

  // Danceability (0-1)
  const dance = parseFloat(row.Danceability);
  if (!isNaN(dance)) {
    if (dance >= 0.8) parts.push("highly danceable, great for parties");
    else if (dance >= 0.6) parts.push("moderately danceable, good groove");
    else if (dance >= 0.4) parts.push("somewhat rhythmic");
    else parts.push("not very danceable, more of a sit-down listen");
  }

  // Energy (0-1)
  const energy = parseFloat(row.Energy);
  if (!isNaN(energy)) {
    if (energy >= 0.8) parts.push("very high energy, intense and powerful");
    else if (energy >= 0.6) parts.push("energetic and upbeat");
    else if (energy >= 0.4) parts.push("moderate energy");
    else parts.push("calm and mellow, low energy");
  }

  // Valence (0-1) — musical positiveness
  const valence = parseFloat(row.Valence);
  if (!isNaN(valence)) {
    if (valence >= 0.7) parts.push("happy, cheerful, and positive mood");
    else if (valence >= 0.5) parts.push("balanced mood, neither too happy nor sad");
    else if (valence >= 0.3) parts.push("melancholic, bittersweet feel");
    else parts.push("sad, dark, or introspective mood");
  }

  // Acousticness (0-1)
  const acoustic = parseFloat(row.Acousticness);
  if (!isNaN(acoustic)) {
    if (acoustic >= 0.7) parts.push("acoustic, organic instrumentation");
    else if (acoustic <= 0.2) parts.push("electronic, heavily produced");
  }

  // Speechiness (0-1)
  const speech = parseFloat(row.Speechiness);
  if (!isNaN(speech)) {
    if (speech >= 0.6) parts.push("spoken word or rap-heavy");
    else if (speech >= 0.3) parts.push("some spoken or rap elements");
  }

  // Instrumentalness (0-1)
  const instrumental = parseFloat(row.Instrumentalness);
  if (!isNaN(instrumental) && instrumental >= 0.5) {
    parts.push("instrumental, minimal vocals");
  }

  // Liveness (0-1)
  const liveness = parseFloat(row.Liveness);
  if (!isNaN(liveness) && liveness >= 0.6) {
    parts.push("live performance feel");
  }

  // Tempo
  const tempo = parseFloat(row.Tempo);
  if (!isNaN(tempo)) {
    if (tempo >= 140) parts.push(`fast tempo at ${Math.round(tempo)} BPM`);
    else if (tempo >= 100) parts.push(`mid-tempo at ${Math.round(tempo)} BPM`);
    else parts.push(`slow tempo at ${Math.round(tempo)} BPM`);
  }

  return parts.join(". ");
}

// ─── CSV Parser (handles quoted fields with commas) ──────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });
    rows.push(row);
  }
  return rows;
}

// ─── Embedding Generator ─────────────────────────────────────────────────────
async function generateEmbedding(genAI, text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// ─── Source 1: Kaggle Audio Features CSV ─────────────────────────────────────
function loadKaggleAudioFeatures() {
  const csvPath = resolve(__dirname, "../data/Kaggle Dataset of Songs.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⚠️  Kaggle Dataset of Songs.csv not found, skipping...");
    return [];
  }

  const rows = parseCSV(csvPath);
  console.log(`  📊 Raw rows in Kaggle CSV: ${rows.length}`);

  // Deduplicate by SongName+ArtistName (keep first occurrence)
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${(row.SongName || "").toLowerCase()}|${(row.ArtistName || "").toLowerCase()}`;
    if (key === "|") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  console.log(`  🔄 After dedup: ${unique.length} unique songs`);

  // Sort by popularity descending, take top N
  unique.sort((a, b) => (parseInt(b.Popularity) || 0) - (parseInt(a.Popularity) || 0));
  const selected = unique.slice(0, MAX_SONGS_PER_CSV);

  return selected.map(row => {
    const features = translateAudioFeatures(row);
    const textToEmbed = `${row.SongName} by ${row.ArtistName}. ${features}.`;

    return {
      id: `kaggle-${(row.SongName || "unknown").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-${(row.ArtistName || "unknown").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}`,
      text: textToEmbed,
      metadata: {
        song: row.SongName || "Unknown",
        artist: row.ArtistName || "Unknown",
        source: "kaggle-audio-features",
        popularity: parseInt(row.Popularity) || 0,
        mood: features.split(". ").find(p => p.includes("mood")) || "unknown",
        genre: "Pop"  // Default; this CSV doesn't have genre
      }
    };
  });
}

// ─── Source 2: Spotify Indian Music CSV ──────────────────────────────────────
function loadSpotifyIndianData() {
  const csvPath = resolve(__dirname, "../data/spotify_data.csv");
  if (!existsSync(csvPath)) {
    console.log("  ⚠️  spotify_data.csv not found, skipping...");
    return [];
  }

  const rows = parseCSV(csvPath);
  console.log(`  📊 Raw rows in Spotify CSV: ${rows.length}`);

  // Deduplicate by Song Name + Artists
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const songName = row["Song Name"] || "";
    const artist = row["Artists"] || "";
    const key = `${songName.toLowerCase()}|${artist.toLowerCase()}`;
    if (key === "|") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  console.log(`  🔄 After dedup: ${unique.length} unique songs`);

  // Sort by popularity, take top N
  unique.sort((a, b) => (parseInt(b.Popularity) || 0) - (parseInt(a.Popularity) || 0));
  const selected = unique.slice(0, MAX_SONGS_PER_CSV);

  return selected.map(row => {
    const songName = row["Song Name"] || "Unknown";
    const artist = row["Artists"] || "Unknown";
    const released = row["Released Dates"] || "";
    const albumType = row["Album Type"] || "";
    const popularity = parseInt(row["Popularity"]) || 0;

    // Infer mood from song title keywords (best-effort for metadata-only CSV)
    let inferredMood = "Indian music";
    const titleLower = songName.toLowerCase();
    if (titleLower.includes("love") || titleLower.includes("pyar") || titleLower.includes("dil") || titleLower.includes("valentine") || titleLower.includes("romantic")) {
      inferredMood = "romantic, love song";
    } else if (titleLower.includes("sad") || titleLower.includes("breakup") || titleLower.includes("bewafa")) {
      inferredMood = "sad, heartbreak";
    } else if (titleLower.includes("party") || titleLower.includes("mashup") || titleLower.includes("remix")) {
      inferredMood = "party, upbeat";
    } else if (titleLower.includes("motivational") || titleLower.includes("poetry")) {
      inferredMood = "motivational, inspiring";
    }

    const textToEmbed = `${songName} by ${artist}. A ${inferredMood} ${albumType} from ${released}. Popular Indian Punjabi Hindi song.`;

    return {
      id: `spotify-${songName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-${artist.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}`,
      text: textToEmbed,
      metadata: {
        song: songName,
        artist: artist,
        source: "spotify-indian-catalog",
        popularity: popularity,
        mood: inferredMood,
        genre: "Indian/Punjabi",
        artwork: row["Cover Image"] || ""
      }
    };
  });
}

// ─── Source 3: Hindi Lyrics Dataset ──────────────────────────────────────────
function loadLyricsDataset() {
  const basePath = resolve(__dirname, "../data/Indian Hindi songs lyrics dataset/Songs_Dataset_new");
  if (!existsSync(basePath)) {
    console.log("  ⚠️  Lyrics dataset folder not found, skipping...");
    return [];
  }

  const moodFolders = readdirSync(basePath).filter(f => {
    return statSync(join(basePath, f)).isDirectory();
  });

  console.log(`  📁 Found mood folders: ${moodFolders.join(", ")}`);

  const songs = [];

  for (const folder of moodFolders) {
    // Extract mood from folder name: "New happy" → "happy"
    const mood = folder.replace(/^New\s*/i, "").toLowerCase();
    const folderPath = join(basePath, folder);
    const files = readdirSync(folderPath).filter(f => f.endsWith(".txt"));

    for (const file of files) {
      try {
        const filePath = join(folderPath, file);
        let lyrics = readFileSync(filePath, "utf-8").trim();

        if (!lyrics || lyrics.length < 20) continue; // Skip near-empty files

        // Truncate very long lyrics to stay within token limits
        if (lyrics.length > MAX_LYRICS_CHARS) {
          lyrics = lyrics.slice(0, MAX_LYRICS_CHARS) + "...";
        }

        // Use the filename (without ext) as the song name
        const songName = basename(file, ".txt")
          .replace(/^[HSPRD]\d+$/, `${mood} song ${file}`)  // For coded names like H1, S2
          .replace(/^\d+/, "")
          .trim() || `${mood} song`;

        // Build a rich text representation combining mood label + actual lyrics
        const textToEmbed = `This is a ${mood} mood Hindi Bollywood song. Mood: ${mood}. Song: ${songName}. Lyrics: ${lyrics}`;

        songs.push({
          id: `lyrics-${mood}-${basename(file, ".txt").replace(/[^a-zA-Z0-9]/g, "_")}`,
          text: textToEmbed,
          metadata: {
            song: songName.charAt(0).toUpperCase() + songName.slice(1),
            artist: "Bollywood",
            source: "hindi-lyrics-dataset",
            mood: mood,
            genre: "Hindi/Bollywood",
            language: "Hindi"
          }
        });
      } catch (err) {
        console.error(`  ❌ Failed to read ${file}: ${err.message}`);
      }
    }
  }

  return songs;
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  🚀 GAANA VIBE SEARCH — Multi-Source Data Ingestion Pipeline");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Validate env vars
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  if (!process.env.PINECONE_API_KEY) throw new Error("Missing PINECONE_API_KEY");
  if (!process.env.PINECONE_INDEX) throw new Error("Missing PINECONE_INDEX");

  // Initialize clients
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pinecone.index(process.env.PINECONE_INDEX);

  // ─── Load all 3 sources ────────────────────────────────────────────────
  console.log("📂 SOURCE 1: Kaggle Audio Features (Feature Engineering)");
  const kaggleSongs = loadKaggleAudioFeatures();
  console.log(`   → ${kaggleSongs.length} songs loaded\n`);

  console.log("📂 SOURCE 2: Spotify Indian Music Catalog");
  const spotifySongs = loadSpotifyIndianData();
  console.log(`   → ${spotifySongs.length} songs loaded\n`);

  console.log("📂 SOURCE 3: Hindi Lyrics Dataset (Mood-Labeled)");
  const lyricsSongs = loadLyricsDataset();
  console.log(`   → ${lyricsSongs.length} songs loaded\n`);

  // Combine all sources
  const allSongs = [...kaggleSongs, ...spotifySongs, ...lyricsSongs];
  console.log(`\n📊 TOTAL: ${allSongs.length} songs to embed and index`);
  console.log(`   Kaggle:  ${kaggleSongs.length}`);
  console.log(`   Spotify: ${spotifySongs.length}`);
  console.log(`   Lyrics:  ${lyricsSongs.length}\n`);

  // ─── Generate embeddings ───────────────────────────────────────────────
  console.log("🔮 Generating embeddings via Gemini text-embedding-004...\n");

  const vectors = [];
  let failCount = 0;

  for (let i = 0; i < allSongs.length; i++) {
    const song = allSongs[i];

    try {
      const embedding = await generateEmbedding(genAI, song.text);

      vectors.push({
        id: song.id,
        values: embedding,
        metadata: song.metadata
      });

      if ((i + 1) % 25 === 0 || i === allSongs.length - 1) {
        console.log(`  ✅ [${i + 1}/${allSongs.length}] Embedded: "${song.metadata.song}" (${song.metadata.source})`);
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, EMBED_DELAY_MS));
    } catch (err) {
      failCount++;
      console.error(`  ❌ [${i + 1}/${allSongs.length}] Failed: "${song.metadata.song}" — ${err.message}`);

      // If we hit rate limit, wait longer
      if (err.message.includes("429") || err.message.includes("quota") || err.message.includes("RATE")) {
        console.log("  ⏳ Rate limited. Waiting 30s...");
        await new Promise(r => setTimeout(r, 30000));
        i--; // Retry this song
      }
    }
  }

  console.log(`\n✅ Embedding complete: ${vectors.length} succeeded, ${failCount} failed\n`);

  if (vectors.length === 0) {
    console.error("❌ No vectors generated. Check your GEMINI_API_KEY.");
    return;
  }

  // ─── Upsert to Pinecone ────────────────────────────────────────────────
  console.log(`📤 Uploading ${vectors.length} vectors to Pinecone index: ${process.env.PINECONE_INDEX}...\n`);

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    try {
      await index.upsert(batch);
      console.log(`  📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Upserted ${batch.length} vectors`);
    } catch (err) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`);
      // Wait and retry once
      await new Promise(r => setTimeout(r, 5000));
      try {
        await index.upsert(batch);
        console.log(`  🔁 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Retry succeeded`);
      } catch (retryErr) {
        console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Retry also failed`);
      }
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  🎉 PIPELINE COMPLETE!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Total vectors indexed:  ${vectors.length}`);
  console.log(`  Vector dimensions:      ${vectors[0]?.values.length || "unknown"}`);
  console.log(`  Pinecone index:         ${process.env.PINECONE_INDEX}`);
  console.log(`  Sources:`);
  console.log(`    • Kaggle Audio Features:  ${kaggleSongs.length} songs (feature-engineered)`);
  console.log(`    • Spotify Indian Catalog: ${spotifySongs.length} songs (metadata)`);
  console.log(`    • Hindi Lyrics:           ${lyricsSongs.length} songs (mood-labeled text)`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
