import { NextResponse } from "next/server";
import { recommendSongs } from "@/lib/llm";
import { enrichWithiTunes } from "@/lib/itunes";
import { searchSimilarSongs } from "@/lib/pinecone";

export async function POST(req) {
  try {
    const body = await req.json();
    const { query, mode, refinement, previousQuery, previousSongs } = body;

    // 1. Build the search intent
    const searchQuery = refinement ? `${previousQuery} — ${refinement}` : query;

    // 2. Run LLM recommendation and Pinecone search in parallel
    const [llmResults, pineconeResults] = await Promise.allSettled([
      recommendSongs(searchQuery, previousSongs || []),
      searchSimilarSongs(searchQuery, 8)
    ]);

    // 3. Collect LLM recommendations
    let recommendations = [];
    if (llmResults.status === "fulfilled" && llmResults.value) {
      recommendations = llmResults.value;
    }

    // 4. Merge Pinecone results (augmentation layer)
    if (pineconeResults.status === "fulfilled" && pineconeResults.value?.length > 0) {
      const pineconeMatches = pineconeResults.value;
      
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
    }

    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json({ songs: [], message: "No recommendations found for this vibe." });
    }

    // 5. Enrich with iTunes preview URLs and artwork (audio delivery layer)
    // Take top 12 to maximize chances of getting 6 with valid previews
    const enrichedSongs = await enrichWithiTunes(recommendations.slice(0, 12));

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
