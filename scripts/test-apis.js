require('dotenv').config({ path: '.env.local' });
const { Groq } = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGroq() {
  console.log("--- Testing Groq ---");
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      messages: [
        { role: "user", content: "Hello, reply with one word." }
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.5,
    }).withResponse();
    
    console.log("Groq Success:", response.data.choices[0]?.message?.content);
    console.log("Groq Headers:");
    for (const [key, value] of response.response.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('limit') || key.includes('remaining') || key.includes('retry')) {
        console.log(`  ${key}: ${value}`);
      }
    }
  } catch (error) {
    console.error("Groq Error:", error.message);
    if (error.status) console.error("Groq HTTP Status:", error.status);
    if (error.headers) {
      console.error("Groq Headers:");
      console.error("  x-ratelimit-limit-requests:", error.headers['x-ratelimit-limit-requests']);
      console.error("  x-ratelimit-remaining-requests:", error.headers['x-ratelimit-remaining-requests']);
      console.error("  x-ratelimit-limit-tokens:", error.headers['x-ratelimit-limit-tokens']);
      console.error("  x-ratelimit-remaining-tokens:", error.headers['x-ratelimit-remaining-tokens']);
      console.error("  retry-after:", error.headers['retry-after']);
    }
  }
}

async function testGemini() {
  console.log("--- Testing Gemini Fallback ---");
  const systemPrompt = `You are Gaana's music discovery AI, built for Indian listeners who are tired of repetitive recommendations.

Your job: Given a vibe description, recommend exactly 12 real songs (with real artist names) that STRICTLY match the user's mood, context, and musical intent.

Output Rules:
1. Return ONLY a valid JSON array of exactly 12 objects. No markdown, no explanation, no code fences.
2. Each object must have: {"song": "Track Name", "artist": "Artist Name", "reason": "Because you want...", "mood_tags": ["Tag1", "Tag2", "Tag3"], "vibe_match": 8, "is_fresh_find": true/false}
3. The "reason" field MUST start with "Because you want" and echo the user's exact words/mood.
4. Wrap key mood words in the reason with <em> tags for highlighting.
5. "vibe_match" is your confidence score (1-10) for how well this song matches the EXACT vibe. Be honest. Only include songs you'd rate 7 or above.
6. Every song MUST be a real, published track by a real artist. Do NOT hallucinate fake songs.
7. To break repetitive listening habits, AT LEAST 2 songs MUST be by emerging, indie, or low-playcount artists. Set "is_fresh_find": true for these.
8. Ensure variety in artists — do not repeat the same artist more than twice.

Return ONLY the raw JSON array. Example format:
[{"song":"Khaabon Ke Parinday","artist":"Mohit Chauhan","reason":"Because you want <em>raw and emotional</em> vocals","mood_tags":["Hindi-Indie","Raw","Uplifting"],"vibe_match":9,"is_fresh_find":false}]`;

  const userPrompt = `Find 12 songs for this vibe: "monsoon evening tea music"

IMPORTANT: Every song must STRICTLY match this vibe. Do not pad the list with loosely related songs. Quality over variety.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt);
    const responseText = result.response.text();
    console.log("Gemini Response Text Length:", responseText.length);
    const parsed = JSON.parse(responseText);
    console.log("Gemini Parsing Success! Number of songs returned:", parsed.length);
    console.log("Is array?", Array.isArray(parsed));
    if (parsed.length > 0) {
      console.log("First song item:", parsed[0]);
    }
  } catch (error) {
    console.error("Gemini Error:", error.message || error);
  }
}

async function run() {
  await testGroq();
  await testGemini();
}

run();
