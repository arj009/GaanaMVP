import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

let pineconeIndex = null;

function getPineconeIndex() {
  if (!pineconeIndex && process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = pinecone.index(process.env.PINECONE_INDEX);
  }
  return pineconeIndex;
}

async function generateQueryEmbedding(queryText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(queryText);
  return result.embedding.values;
}

/**
 * Search Pinecone for songs similar to the user's vibe query.
 * Returns top-K matches with metadata.
 * 
 * Now supports 3 data sources:
 *   - kaggle-audio-features  (feature-engineered from Spotify numbers)
 *   - spotify-indian-catalog (Indian/Punjabi metadata)
 *   - hindi-lyrics-dataset   (mood-labeled Hindi lyrics)
 */
export async function searchSimilarSongs(query, topK = 8) {
  try {
    const index = getPineconeIndex();
    if (!index) {
      console.log("Pinecone not configured, skipping vector search");
      return [];
    }

    // Generate embedding for the user's vibe query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Query Pinecone for similar songs
    const results = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });

    // Transform Pinecone results into song objects
    return (results.matches || [])
      .filter(match => match.score > 0.5) // Raised threshold from 0.3 for stricter vibe matching
      .map(match => {
        const meta = match.metadata;
        
        // Extract mood tags — handle both string and comma-separated formats
        let moodTags = [];
        if (meta.mood) {
          moodTags = meta.mood.split(",").map(t => t.trim()).filter(Boolean).slice(0, 3);
          if (moodTags.length === 0) moodTags = [meta.mood];
        }

        return {
          song: meta.song || "Unknown",
          artist: meta.artist || "Unknown",
          genre: meta.genre || "Unknown",
          mood_tags: moodTags,
          reason: `Vector match (${(match.score * 100).toFixed(0)}% similarity) from ${meta.source || "pinecone"} — ${meta.mood || "matching your vibe"}`,
          score: match.score,
          source: "pinecone",
          data_source: meta.source || "unknown"
        };
      });
  } catch (error) {
    // Non-blocking per EdgeCases.md: Pinecone is augmentation, not primary
    console.error("Pinecone search failed (non-blocking):", error.message);
    return [];
  }
}
