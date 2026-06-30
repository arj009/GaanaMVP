Problem Statement :

Gaana's Discovery Seekers are trapped in a repetitive listening loop — not because discovery features are absent, but because neither Trending nor Made For You can understand what a user actually wants right now.

Trending serves popularity, not the individual. Made For You serves listening history, not exploration. And critically, nowhere in the app can a user say "I want something raw and upbeat, not Bollywood" and have the system understand that as a musical instruction. The existing voice search converts speech to keywords — it cannot interpret mood, context, or vibe.

The result: users who want to discover either leave to Spotify and YouTube, or give up and replay the same 40 songs. Gaana loses the session, the habit, and eventually the user. 74.1% of 979 real user reviews mention this friction directly. The top repetition cause — cited in 539 reviews — is the algorithm overfitting to history. Users explicitly name Spotify as where they go instead.
The gap is not the UI. It is the intelligence behind the input. We are building that intelligence layer.
________________________________________
What We Are Building — Full Spec for Antigravity
Feature name: Gaana Vibe Search
Type: Standalone web app (Next.js, deployed on Vercel)
Purpose: Prove that an AI intent layer can translate natural language mood into meaningful music recommendations — and that users will engage with it iteratively, not just once.
Tech Stack: Groq (Llama 3.3 70B) + Gemini (fallback) as the primary semantic recommendation engine, Pinecone (Vector DB) for embedding-based music similarity search, iTunes Search API as the audio delivery layer (30-sec previews + artwork), Supabase for logging & playlist sharing.
________________________________________
Core User Flow : screen 1
The user arrives at a clean single-page app. They have two ways to start:
Path A — Free text input. They type exactly what they feel: "Something raw and emotional but upbeat — Hindi indie or regional, not mainstream Bollywood." Groq interprets this as a musical instruction, maps it to audio descriptors and mood tags, queries iTunes Search API for matching tracks, and returns 6 recommendation cards. Each card shows the song, artist, a one-line reason ("Because you want something raw but upbeat, this artist has Arijit's vocal texture but with a harder, indie edge"), three mood tags, and a 30-second iTunes preview player. Voice input via Web Speech API is also available to fill this text input.
Path B — Seed song input. The user can't articulate their mood in words. They tap "Start from a song", type a song they know and like, then add a modifier: "More like Tum Hi Ho but darker and more acoustic." Groq uses the seed song as an anchor and uses both the song's characteristics and the user's modifier to generate recommendations. Voice input also works here.

on screen 2 - 6 rsults are displayed with play as a vibe queue hands free. and also if user don't like then we have refinement loop button in screen 2
________________________________________
The Refinement Loop — Where the Real Magic Is
After seeing 6 cards, the user sees a "Not quite — refine this" button alongside each result set in screen 2. Clicking it opens a small text input pre-filled with their original query. They can say: "Same vibe but more acoustic" or "Less sad, more energetic" or "Show me something from before 2015."
Groq takes the original intent plus the refinement instruction and generates a new set of 6 cards. This turns Vibe Search from a one-shot search into a conversation. This is the single most important feature for proving the hypothesis — because no playlist, no Trending tab, and no Made For You can do iterative intent refinement. Only an LLM can.

------------------------------------

Three things worth noting.
The post-queue screen 3 is where your most valuable research data lives. If a user sits through all 6 songs without touching their phone and then immediately hits "Same vibe, 6 more songs" — that is behavioural proof that the hypothesis works. They discovered passively and they want more. That single interaction pattern, logged across 50 users, is stronger evidence than any survey response.
The "Save this queue as playlist" button also quietly validates something important — if users save AI-curated queues, it means they trusted the AI's taste enough to want to keep it. We save this to Supabase and generate a shareable link. If they share it, that is the trust deficit hypothesis being disproved in the best possible way.
The "new artists count" stat on the completion screen (showing 4 new artists out of 6 songs) is your deck slide in miniature. That number — showing up after someone did their dishes — is the entire product argument made visible.
After song 6 ends — instead of silence or defaulting to Trending — a completion screen shows listening stats and three options: generate another queue, get 6 more of the same vibe, or save this queue as a playlist. Keeps the user inside the discovery loop.

------
we should at least be able to listen 10 seconds songs at least from the queue from the live deployment link.