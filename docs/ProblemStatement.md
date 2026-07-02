Problem Statement :

Gaana's Discovery Seekers are trapped in a repetitive listening loop — not because discovery features are absent, but because neither Trending nor Made For You can understand what a user actually wants right now.

Trending serves popularity, not the individual. Made For You serves listening history, not exploration. And critically, nowhere in the app can a user say "I want something raw and upbeat, not Bollywood" and have the system understand that as a musical instruction. The existing voice search converts speech to keywords — it cannot interpret mood, context, or vibe.

The result: users who want to discover either leave to Spotify and YouTube, or give up and replay the same 40 songs. Gaana loses the session, the habit, and eventually the user. 
**74.1% of 979 real user reviews** mention this friction directly. The top repetition cause — cited in **539 reviews** — is the algorithm overfitting to history. Users explicitly name Spotify as where they go instead.

The gap is not the UI. It is the intelligence behind the input. We are building that intelligence layer.

________________________________________
What We Are Building — Gaana Vibe Search
Purpose: Prove that an AI intent layer can translate natural language mood into meaningful music recommendations — and that users will engage with it iteratively, not just once.

Business Impact:
By solving this, we increase average session length, reduce churn to competitors like Spotify, and increase the discovery of indie/niche artists (which lowers our royalty payout costs compared to mainstream top-40 hits).

________________________________________
Core User Flow (Screen 1)
The user arrives at a clean single-page app. They have two ways to start:

Path A — Free Text / Voice Input. They type or speak exactly what they feel: "Something raw and emotional but upbeat — Hindi indie or regional, not mainstream Bollywood." The AI interprets this as a musical instruction, maps it to audio descriptors, and returns 6 highly relevant recommendation cards with "Vibe Confidence" scores and 30-second previews.

Path B — Audio Seed Input ("Hum or Play"). The user taps "Hum or Play" and literally hums a tune, sings, or plays a song from another device. Our multimodal AI analyzes the audio in real-time, identifies the exact song or extracts the mood/vibe, and instantly builds a customized queue. This removes the friction of typing entirely.

________________________________________
The Refinement Loop — Where the Real Magic Is
After seeing the 6 cards on Screen 2, the user has two powerful ways to guide the AI:

1. Real-Time "Thumbs Down" Rejection: If a song misses the mark, the user taps the 👎 icon. The song is immediately dismissed from the queue and logged. This guarantees the AI learns their taste dynamically and avoids repeating mistakes, fixing the "algorithm overfitting" complaint.

2. The Conversational Pivot: The user clicks "Not quite — refine this" and gives a natural language adjustment: "Same vibe but more acoustic" or "Show me something from before 2015." The AI generates a fresh set of 6 cards. Only an LLM can do iterative, conversational intent refinement like this.

________________________________________
How We Will Measure Success (The Telemetry)
Three things worth noting for our validation:

1. The "Aha!" Moment: If a user sits through all 6 songs without touching their phone and then hits "Same vibe, 6 more songs" — that is behavioural proof that passive discovery works. That interaction pattern, logged across 50 users, is stronger evidence than any survey.
2. The Trust Metric: If users save the AI-curated queue as a playlist, it proves they trust the AI's taste enough to keep it.
3. The Discovery Metric: The "new artists count" stat on the completion screen (e.g., showing 4 new artists out of 6 songs) is the entire product argument made visible. It proves we are successfully breaking the repetition loop.

________________________________________
Appendix: Technical Implementation
Tech Stack: Groq (Llama 3.3 70B) + Gemini (fallback/audio processing) as the semantic engine, Pinecone (Vector DB) for similarity search, iTunes Search API for 30-sec previews, Supabase for logging telemetry & thumbs-down events. Next.js deployed on Vercel.