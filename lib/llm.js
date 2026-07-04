import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Primary Recommendation Engine: LLM-as-Recommender
 * The LLM uses its vast training knowledge of music to directly recommend
 * songs that match the user's vibe description. This is semantically superior
 * to keyword-based iTunes search.
 */
export async function recommendSongs(query, previousSongs = [], mode = 'text') {
  const systemPrompt = `You are Gaana's music discovery AI, built for Indian listeners who are tired of repetitive recommendations.

Your job: Given a vibe description, recommend exactly 12 real songs (with real artist names) that STRICTLY match the user's mood, context, and musical intent.

You have deep knowledge of:
- Bollywood (classic and modern), Tollywood, Kollywood, Sandalwood music
- Indian indie (Prateek Kuhad, The Local Train, When Chai Met Toast, etc.)
- Punjabi pop, Sufi, Ghazal, Carnatic fusion
- International music popular in India (English pop, K-pop, Arabic, Latin)
- Mood science: tempo, energy, valence, instrumentation

VIBE-STRICTNESS RULES (MOST IMPORTANT):
- Every single song MUST fit the exact vibe the user described. No exceptions.
- SELF-AUDIT: Before including a song, ask yourself: "If someone is in this EXACT mood and hears this song, would they skip it?" If yes, REPLACE it with a better match.

VIBE DEFINITIONS (use these to distinguish similar-sounding vibes):
- "gym" / "workout" = AGGRESSIVE energy. Think: hard-hitting bass, motivational lyrics, rap, rock, intense EDM, powerful vocals. Songs that make you push harder. Do NOT include Bollywood party/dance songs (e.g. Kala Chashma, Dil Chori, Badtameez Dil) — those are PARTY songs, not gym songs. Gym songs should feel like a pre-fight warmup, not a wedding dance floor.
- "party" / "dance" = FUN energy. Bollywood dance hits, catchy hooks, dance floor anthems. This is where Kala Chashma and Dil Chori belong.
- "romantic" = GENUINELY romantic in lyrics AND melody. Soft, intimate, loving. Do NOT include party songs, sad breakup songs, friendship anthems, or item numbers.
- "sad" / "heartbreak" = Melancholic, heavy, emotional pain. Do NOT include upbeat recovery songs or empowering anthems.
- "chill" / "relax" = Low tempo, ambient, lo-fi, acoustic, peaceful. Do NOT include anything with loud drops or high energy.
- "drive" / "road trip" = Singalong anthems, steady tempo, windows-down energy. A mix of upbeat and feel-good.

Output Rules:
1. Return ONLY a valid JSON array of exactly 12 objects. No markdown, no explanation, no code fences.
2. Each object must have: {"song": "Track Name", "artist": "Artist Name", "reason": "Because you want...", "mood_tags": ["Tag1", "Tag2", "Tag3"], "vibe_match": 8, "is_fresh_find": true/false}
3. The "reason" field MUST start with "Because you want" and echo the user's exact words/mood.
4. Wrap key mood words in the reason with <em> tags for highlighting.
5. "vibe_match" is your confidence score (1-10) for how well this song matches the EXACT vibe. Be honest. A gym playlist should not have a 10/10 for a chill acoustic track. Only include songs you'd rate 7 or above.
6. Every song MUST be a real, published track by a real artist. Do NOT hallucinate fake songs.
7. To break repetitive listening habits, AT LEAST 2 songs MUST be by emerging, indie, or low-playcount artists (not Top 50 mainstream like Arijit/Badshah). Set "is_fresh_find": true for these. BUT they must STILL match the vibe strictly.
8. Ensure variety in artists — do not repeat the same artist more than twice.
${previousSongs.length > 0 ? `9. Do NOT recommend any of these previously shown songs: ${JSON.stringify(previousSongs)}` : ''}

Return ONLY the raw JSON array. Example format:
[{"song":"Khaabon Ke Parinday","artist":"Mohit Chauhan","reason":"Because you want <em>raw and emotional</em> vocals","mood_tags":["Hindi-Indie","Raw","Uplifting"],"vibe_match":9,"is_fresh_find":false}]`;

  let userPrompt = `Find 12 songs for this vibe: "${query}"

IMPORTANT: Every song must STRICTLY match this vibe. Do not pad the list with loosely related songs. Quality over variety.`;

  if (mode === 'seed' || mode === 'audio') {
    userPrompt = `The user has spoken/sung these lyrics or song name: "${query}". 
    
IMPORTANT: 
1. Identify the song they are singing/naming and make it the FIRST result in your JSON array (index 0).
2. For the remaining 11 songs, find tracks that have the EXACT SAME vibe, genre, and mood as that first song. Do not just pad the list. Quality over variety.`;
  }

  // Try Groq first, fallback to Gemini
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    return parseJSON(content);
  } catch (error) {
    console.log("Groq failed, falling back to Gemini...", error.message);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
      const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
      return JSON.parse(result.response.text());
    } catch (fallbackError) {
      console.error("Gemini fallback also failed:", fallbackError);
      throw fallbackError;
    }
  }
}

function parseJSON(text) {
  try {
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    if (startIndex >= 0 && endIndex >= 0) {
      text = text.substring(startIndex, endIndex + 1);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from LLM:", text);
    throw e;
  }
}
