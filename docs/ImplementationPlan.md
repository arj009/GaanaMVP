# Gaana Vibe Search — Implementation Plan

## 📋 Project Summary

Build an AI-powered music discovery web app where users describe a **vibe in natural language** and get 6 song recommendations with playable 30-second audio previews. The app has 3 main screens plus a shared playlist view. Entirely free-tier infrastructure.

---

## 🏗️ Final Tech Stack (100% Free)

| Component | Technology | Cost |
|:---|:---|:---|
| Frontend Framework | Next.js 14 (App Router) | Free |
| LLM — Primary | Groq (Llama 3.3 70B Versatile) | Free |
| LLM — Fallback | Google Gemini (2.0 Flash) | Free |
| Vector DB | Pinecone (Starter) | Free |
| Music Dataset | 3 Kaggle Datasets (Audio Features, Spotify, Lyrics) | Free |
| Audio Delivery + Artwork | iTunes Search API | Free |
| Database + Logging | Supabase (PostgreSQL) | Free |
| Playlist Sharing | Supabase + nanoid short links | Free |
| Deployment | Vercel | Free |
| Voice Input | Web Speech API (browser-native) | Free |

---

## 🎯 Input Strategy

### Path A — Vibe Mode (Default)
User types a mood/feeling: *"Something raw and emotional but upbeat, not Bollywood"*

### Path B — Seed Song Mode
User taps "♪ Start from a song" chip → placeholder changes → types: *"More like Tum Hi Ho but darker and more acoustic"*
Backend auto-detects seed mode via regex patterns.

### Voice Input
"🎤 Voice" chip → Web Speech API transcribes speech → fills the same text input → flows into Path A or B.

---

## 📱 Screen Breakdown

### Screen 1: Home
- Gaana-branded header (logo, search, bell icons)
- Greeting: "Good morning, Rahul"
- **Vibe Search Card** (red border, "New" badge) — the hero feature
- Text input + "Find ✦" button
- Two chips: "♪ Start from a song" | "🎤 Voice"
- Dimmed existing sections (Trending Now, Made For You) at 40% opacity
- Bottom nav bar (Home, Search, Library, Profile)

### Screen 2: Results + Vibe Queue
- Back arrow + "Vibe results" header + "6 songs" count
- Vibe Echo Box (user's query in red italic)
- "Play as Vibe Queue" button (hands-free, plays all 6 sequentially)
- 6 result cards: artwork, title, artist, play button, AI reason, 3 mood tags
- Refine bar pinned above bottom nav
- Bottom nav bar

### Screen 3: Post-Queue Complete
- Gaana header with "Finished" pill
- Checkmark + "Vibe queue complete"
- Stats row: songs played / listening time / new artists
- 3 CTA buttons: Generate another | Same vibe 6 more | Save as playlist
- Bottom nav bar

### Shared Playlist View (/playlist/[id])
- Read-only view of saved queue with all 6 songs playable
- Shareable via URL

---

## 🚀 API Routes

### POST /api/vibe-search
**Input:** `{ query, mode, refinement?, previousQuery?, previousSongs?, sessionId }`
**Pipeline (Hybrid: LLM-as-Recommender + Pinecone):**
1. LLM (Groq/Gemini) acts as the primary semantic recommendation engine, using its deep musical knowledge to recommend 10 real songs that match the user's vibe
2. (Optional) Pinecone vector similarity search augments the results with embedding-matched tracks from a curated dataset
3. iTunes Search API enriches each recommended song with 30-sec preview URL and album artwork
4. Songs without valid iTunes previews are filtered out; top 6 are returned
5. If Groq 429 → automatic failover to Gemini
**Output:** 6 song objects with preview URLs + artwork

### POST /api/log
**Input:** `{ sessionId, event, vibeQuery, songIndex?, songName?, action?, timestamp }`
**Events:** vibe_searched, queue_started, song_played, song_completed, queue_completed, refined, post_queue_action
**Writes to:** Supabase `vibe_logs` table

### POST /api/playlist
**Input:** `{ songs, vibeQuery, sessionId }`
**Steps:** Insert into Supabase `saved_playlists` → generate nanoid → return shareable URL
**Output:** `{ playlistUrl }`

---

## 🌍 Environment Variables

```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...
ITUNES_COUNTRY=IN
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

---

## 📦 Build Phases

### Phase 1 — Foundation (UI + Static Data)
1. Initialize Next.js 14 app with App Router
2. Build all 3 screens pixel-perfect to reference screenshots
3. Hardcode 6 songs from prompts.md
4. Implement screen navigation (Home → Results → Post-Queue)
5. Wire up HTML5 `<audio>` playback with iTunes preview URLs
6. Implement Vibe Queue (auto-play 6 songs in sequence)

### Phase 2 — AI Integration (Live Recommendations)
1. Create `/api/vibe-search` API route
2. Implement LLM-as-Recommender: Groq directly recommends songs from training knowledge
3. Integrate Gemini API as automatic failover
4. iTunes Search API serves as audio delivery layer (preview URLs + artwork)
5. Handle both modes: free-text (Path A) and seed-song (Path B)
6. Implement refinement loop
7. Add Web Speech API voice input

### Phase 2.5 — Data Pipeline + Vector DB (Pinecone) [COMPLETED]
1. Source music metadata dataset (Kaggle Audio Features, Spotify Catalog, Hindi Lyrics)
2. Write embedding ingestion script to vectorize song metadata (with feature engineering numericals -> text)
3. Upload embeddings to Pinecone free-tier index (gaana-vibe-search, 3072 dim)
4. Integrate Pinecone similarity search into `/api/vibe-search` as an augmentation layer
5. Blend LLM recommendations with Pinecone vector matches for best-of-both-worlds results

### Phase 3 — Logging + Playlists [COMPLETED]
1. Set up Supabase project
2. Create `vibe_logs` table + `/api/log` route
3. Create `saved_playlists` table + `/api/playlist` route
4. Build `/playlist/[id]` shared view page
5. Implement "Save + copy link" toast flow

### Phase 4 — Deploy to Production (Unified Full-Stack)

**Note on Backend Deployment:** Because we are using Next.js, there is NO separate backend deployment. Next.js is a full-stack framework that handles both the frontend UI and the backend API routes in a single repository. Vercel automatically deploys the frontend to a global Edge CDN and provisions the backend API routes as serverless functions.

1. Push to GitHub
2. Connect to Vercel (Auto-detects Next.js and provisions serverless backend automatically)
3. Set environment variables in Vercel dashboard
4. Deploy and test end-to-end
5. Share production URL for user testing
