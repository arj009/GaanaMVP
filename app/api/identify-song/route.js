import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Song Identification API
 * Accepts recorded audio (base64) and uses AudD (ACR) for exact matches,
 * falling back to Gemini for vibe/lyrics identification.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { audioBase64, mimeType } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }

    // 1. Try AudD.io for exact acoustic fingerprinting match
    if (process.env.AUDD_API_KEY) {
      console.log("[Song ID] Trying AudD.io exact match...");
      try {
        const formData = new URLSearchParams();
        formData.append('api_token', process.env.AUDD_API_KEY);
        formData.append('audio', audioBase64);
        
        const auddRes = await fetch('https://api.audd.io/', {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const auddData = await auddRes.json();
        
        if (auddData.status === 'success' && auddData.result) {
          console.log(`[Song ID] AudD Match Found:`, auddData.result.title);
          return NextResponse.json({
            identified: true,
            song: auddData.result.title,
            artist: auddData.result.artist,
            confidence: "high"
          });
        }
        console.log("[Song ID] AudD found no exact match. Falling back to Gemini...");
      } catch (err) {
        console.error("[Song ID] AudD API error:", err);
      }
    } else {
      console.log("[Song ID] No AUDD_API_KEY found, skipping exact match...");
    }

    // 2. Fallback: Use Gemini for lyrics extraction and vibe matching
    console.log("[Song ID] Using Gemini for audio analysis fallback...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64
        }
      },
      {
        text: `Listen to this audio carefully. Someone is either:
1. Singing or humming lyrics of a song
2. Playing a song from a speaker/phone
3. Speaking a song name out loud

Your job: Identify the song.

IMPORTANT RULES:
- If a song is playing from a speaker, analyze the melody, beat, instruments, and vocals to identify the track. You have deep knowledge of acoustics and music.
- If a human is singing/humming, pay very close attention to the LYRICS and MELODY to match it to known Bollywood, Hindi, Punjabi, or English songs.
- If you can confidently identify the song, return ONLY a JSON object: {"identified": true, "song": "Song Name", "artist": "Artist Name", "confidence": "high/medium/low"}
- If you CANNOT identify the exact song name, but you hear vocals, TRANSCRIBE THE LYRICS EXACTLY as they are sung. Return: {"identified": false, "vibe": "the transcribed lyrics you heard", "confidence": "low"}
- If there are absolutely no vocals and you cannot identify it, describe the musical vibe: {"identified": false, "vibe": "upbeat acoustic guitar with fast tabla beats", "confidence": "low"}
- If the audio is silent or just noise: {"identified": false, "vibe": "unclear", "confidence": "none"}
- Return ONLY the raw JSON. No markdown, no explanation.`
      }
    ]);

    const text = result.response.text();
    
    // Parse the response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini song ID response:", text);
      return NextResponse.json({ 
        identified: false, 
        vibe: "Could not process audio. Try singing louder or holding your device closer to the speaker.",
        confidence: "none"
      });
    }

    console.log(`[Song ID] Result:`, parsed);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Song identification error:", error);
    return NextResponse.json({ 
      error: "Failed to identify song",
      identified: false,
      vibe: "Something went wrong. Please try again.",
      confidence: "none" 
    }, { status: 500 });
  }
}
