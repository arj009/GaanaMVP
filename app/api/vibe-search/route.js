import { NextResponse } from "next/server";
import { recommendSongs } from "@/lib/llm";
import { enrichWithiTunes } from "@/lib/itunes";
import { searchSimilarSongs } from "@/lib/pinecone";

const VIBE_MATCH_THRESHOLD = 5; // Lowered to prevent strict filtering of simple moods
const PINECONE_MERGE_THRESHOLD = 0.6; // Only merge high-confidence Pinecone results

export async function POST(req) {
  try {
    const body = await req.json();
    const { query, mode, refinement, previousQuery, previousSongs } = body;

    // 1. Build the search intent
    const searchQuery = refinement ? `${previousQuery} — ${refinement}` : query;

    // 2. Run LLM recommendation and Pinecone search in parallel
    const [llmResults, pineconeResults] = await Promise.allSettled([
      recommendSongs(searchQuery, previousSongs || [], mode),
      searchSimilarSongs(searchQuery, 8)
    ]);

    // 3. Collect LLM recommendations
    let recommendations = [];
    if (llmResults.status === "fulfilled" && llmResults.value) {
      recommendations = llmResults.value;
    }

    // 4. QUALITY GATE: Filter out songs below vibe_match threshold
    // This is the core fix — LLM now self-scores each song's vibe relevance
    const beforeFilter = recommendations.length;
    recommendations = recommendations.filter(song => {
      const score = song.vibe_match ?? 10; // Default high if field missing (backward compat)
      return score >= VIBE_MATCH_THRESHOLD;
    });
    console.log(`[Quality Gate] vibe_match filter: ${beforeFilter} → ${recommendations.length} songs (threshold: ${VIBE_MATCH_THRESHOLD})`);

    // 5. Merge Pinecone results (augmentation layer) — ONLY high-confidence matches
    if (pineconeResults.status === "fulfilled" && pineconeResults.value?.length > 0) {
      const pineconeMatches = pineconeResults.value
        .filter(match => match.score > PINECONE_MERGE_THRESHOLD); // Tighter threshold
      
      // Deduplicate: only add Pinecone songs not already in LLM results
      const llmSongKeys = new Set(
        recommendations.map(s => `${s.song.toLowerCase()}-${s.artist.toLowerCase()}`)
      );

      for (const pSong of pineconeMatches) {
        const key = `${pSong.song.toLowerCase()}-${pSong.artist.toLowerCase()}`;
        if (!llmSongKeys.has(key)) {
          recommendations.push(pSong);
        }
      }
      console.log(`[Pinecone] Merged ${pineconeMatches.length} high-confidence matches (threshold: ${PINECONE_MERGE_THRESHOLD})`);
    }

    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json({ songs: [], message: "No recommendations found for this vibe." });
    }

    // 6. Sort by vibe_match score (highest first) before enrichment
    recommendations.sort((a, b) => (b.vibe_match ?? 8) - (a.vibe_match ?? 8));

    // 7. Enrich with iTunes preview URLs and artwork (audio delivery layer)
    // Take top 14 to maximize chances of getting 6+ with valid previews
    const enrichedSongs = await enrichWithiTunes(recommendations.slice(0, 14));

    if (enrichedSongs.length === 0) {
      // Fallback: return recommendations without audio
      return NextResponse.json({
        songs: recommendations.slice(0, 6).map(s => ({
          ...s,
          preview_url: null,
          artwork_url: null
        })),
        message: "Songs found but audio previews unavailable."
      });
    }

    return NextResponse.json({ songs: enrichedSongs });
  } catch (error) {
    console.error("Vibe Search Route Error:", error);
    return NextResponse.json({ error: "Failed to generate vibe queue" }, { status: 500 });
  }
}
