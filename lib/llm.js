import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Primary Recommendation Engine: LLM-as-Recommender
 * The LLM uses its vast training knowledge of music to directly recommend
 * songs that match the user's vibe description. This is semantically superior
 * to keyword-based iTunes search.
 */
export async function recommendSongs(query, previousSongs = []) {
  const systemPrompt = `You are Gaana's music discovery AI, built for Indian listeners who are tired of repetitive recommendations.

Your job: Given a vibe description, recommend exactly 10 real songs (with real artist names) that perfectly match the user's mood, context, and musical intent.

You have deep knowledge of:
- Bollywood (classic and modern), Tollywood, Kollywood, Sandalwood music
- Indian indie (Prateek Kuhad, The Local Train, When Chai Met Toast, etc.)
- Punjabi pop, Sufi, Ghazal, Carnatic fusion
- International music popular in India (English pop, K-pop, Arabic, Latin)
- Mood science: tempo, energy, valence, instrumentation

Rules:
1. Return ONLY a valid JSON array of exactly 10 objects. No markdown, no explanation, no code fences.
2. Each object must have: {"song": "Track Name", "artist": "Artist Name", "reason": "Because you want...", "mood_tags": ["Tag1", "Tag2", "Tag3"], "is_fresh_find": true/false}
3. The "reason" field MUST start with "Because you want" and echo the user's exact words/mood.
4. Wrap key mood words in the reason with <em> tags for highlighting.
5. Every song MUST be a real, published track by a real artist. Do NOT hallucinate fake songs.
6. CRITICAL: To break repetitive listening habits, AT LEAST 2 songs MUST be by emerging, indie, or low-playcount artists (not Top 50 mainstream like Arijit/Badshah). Set "is_fresh_find": true for these discovery tracks.
7. Ensure variety in artists — do not repeat the same artist more than twice.
${previousSongs.length > 0 ? `8. Do NOT recommend any of these previously shown songs: ${JSON.stringify(previousSongs)}` : ''}

Return ONLY the raw JSON array. Example format:
[{"song":"Khaabon Ke Parinday","artist":"Mohit Chauhan","reason":"Because you want <em>raw and emotional</em> vocals","mood_tags":["Hindi-Indie","Raw","Uplifting"],"is_fresh_find":false}]`;

  const userPrompt = `Find 10 songs for this vibe: "${query}"`;

  // Try Groq first, fallback to Gemini
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    return parseJSON(content);
  } catch (error) {
    console.log("Groq failed, falling back to Gemini...", error.message);
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
      return parseJSON(result.response.text());
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
