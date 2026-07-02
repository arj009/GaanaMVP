# Gaana Vibe Search — Architecture Document

## 1. System Overview

Gaana Vibe Search is an AI-powered music discovery web app that translates natural language mood descriptions into curated 6-song playlists with playable audio previews. The system proves that an LLM intent layer can outperform traditional popularity-based and history-based recommendation engines.

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                          │
│                                                                │
│   Screen 1 (Home)  →  Screen 2 (Results)  →  Screen 3 (Done)  │
│        ↑                                                       │
│   /playlist/[id]   ←  Shareable Link                           │
└───────────┬───────────────────┬──────────────┬─────────────────┘
            │                   │              │
     POST /api/vibe-search  POST /api/log  POST /api/playlist
            │                   │              │
┌───────────▼───────────────────▼──────────────▼─────────────────┐
│                  Next.js API Routes (Vercel)                    │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ vibe-search  │  │     log      │  │     playlist      │     │
│  │   handler    │  │   handler    │  │     handler       │     │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘     │
└─────────┼─────────────────┼───────────────────┼────────────────┘
          │                 │                   │
    ┌─────▼─────┐     ┌────▼────┐         ┌────▼────┐
    │  Groq API │     │Supabase │         │Supabase │
    │  (LLM     │     │vibe_logs│         │saved_   │
    │Recommender│     └─────────┘         │playlists│
    ├───────────┤                         └─────────┘
    │  Gemini   │
    │ (fallback)│
    ├───────────┤
    │ Pinecone  │
    │(Vector DB)│
    ├───────────┤
    │  iTunes   │
    │(Audio CDN)│
    └───────────┘
```

---

## 2. Technology Stack Detail

### 2.1 Frontend — Next.js 14 (App Router)

| Aspect | Decision | Rationale |
|:---|:---|:---|
| Framework | Next.js 14 with App Router | Server-side API routes, file-based routing, Vercel-native |
| Styling | Vanilla CSS | Pixel-perfect control for Gaana's brand system |
| Typography | Inter (Google Fonts) | Matches the design system |
| State | React useState + useContext | App is simple enough — no Redux/Zustand needed |
| Audio | HTML5 `<audio>` element | Native browser support, zero dependencies |
| Voice | Web Speech API | Browser-native, free, no external service |
| Routing | App Router file conventions | `/` (home), `/results` (screen 2), `/complete` (screen 3), `/playlist/[id]` |

### 2.2 Backend — Next.js API Routes (Serverless on Vercel)

Three API routes deployed as Vercel serverless functions:

| Route | Purpose | External Calls |
|:---|:---|:---|
| `POST /api/vibe-search` | AI-powered song discovery | Groq (Recommender) → Pinecone (optional) → iTunes (audio enrichment) |
| `POST /api/identify-song` | Audio Identification (Hum/Play) | Gemini 2.0 Flash (Multimodal Audio) |
| `POST /api/log` | Event logging | Supabase |
| `POST /api/playlist` | Save + share playlist | Supabase |

### 2.3 LLM Layer — Groq + Gemini Failover

```
                    ┌─────────────────────┐
                    │   callLLM(messages)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Try: Groq API     │
                    │   llama-3.3-70b     │
                    │   versatile         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
              ┌─────│   Status === 429?   │─────┐
              │ NO  └─────────────────────┘ YES │
              │                                 │
     ┌────────▼────────┐             ┌──────────▼──────────┐
     │  Return result   │             │  Fallback: Gemini   │
     └─────────────────┘             │  gemini-2.0-flash   │
                                     └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │   Return result      │
                                     └─────────────────────┘
```

**Why this pattern:**
- Groq (Llama 3.3 70B): 30 RPM free, ultra-fast inference on LPU hardware, excellent JSON output for text queries
- Gemini (2.0 Flash): Multimodal capabilities (used natively for the "Hum or Play" audio ingestion feature), higher free RPM, reliable backup for text overflow
- Both are OpenAI-compatible for text, so the fallback code is seamless

**Rate limit budget:**
```
50 users × 5 searches × 2 LLM calls each = 500 calls/day
Groq free limit = 1,000 RPD → comfortable headroom
Gemini catches any burst spikes (10+ concurrent users in a demo)
```

### 2.4 Music Data — Hybrid Pipeline (LLM + Pinecone + iTunes)

The recommendation pipeline uses a three-tier architecture:

```
Tier 1: LLM-as-Recommender (Primary)
──────────────────────────────────────
User query: "raw emotional Hindi indie"
                    │
        ┌───────────▼────────────┐
        │  Groq/Gemini LLM       │
        │  Acts as a semantic    │
        │  recommendation engine │
        │  using its training    │
        │  knowledge of music    │
        │                        │
        │  Output: 10 specific   │
        │  real songs with       │
        │  artist names          │
        └───────────┬────────────┘
                    │
Tier 2: Pinecone Vector Search (Augmentation)
──────────────────────────────────────
                    │
        ┌───────────▼────────────┐
        │  Convert user query    │
        │  to embedding vector   │
        │  via sentence-         │
        │  transformers model    │
        │                        │
        │  Query Pinecone index  │
        │  of 919 songs across   │
        │  3 specific datasets:  │
        │  - Kaggle Audio Params │
        │  - Spotify Metadata    │
        │  - Hindi Lyrics        │
        │                        │
        │  Output: Top-K similar │
        │  songs by cosine dist  │
        └───────────┬────────────┘
                    │
        ┌───────────▼────────────┐
        │  Merge + deduplicate   │
        │  LLM recs + Pinecone   │
        │  results               │
        └───────────┬────────────┘
                    │
Tier 3: iTunes Audio Delivery
──────────────────────────────────────
                    │
        ┌───────────▼────────────┐
        │  For each recommended  │
        │  song, lookup on       │
        │  iTunes Search API:    │
        │                        │
        │  - previewUrl (30-sec) │
        │  - artworkUrl100       │
        │  - trackId             │
        │                        │
        │  Filter: only songs    │
        │  with valid previewUrl │
        │  Return top 6          │
        └────────────────────────┘
```

**Why this architecture is superior:**
- **Tier 1 (LLM):** Understands complex, nuanced queries like "monsoon evening chai melancholy" using semantic music knowledge from training on billions of tokens of music journalism and listener discussions
- **Tier 2 (Pinecone):** Provides mathematically grounded similarity matching based on 3 unified datasets (Kaggle audio parameters engineered into text, Spotify metadata, and semantic Hindi lyrics).
- **Tier 3 (iTunes):** Pure utility layer — no intelligence, just fetches the playable audio files and artwork
- **Combined:** The LLM handles creative interpretation; Pinecone handles data-driven similarity; iTunes handles delivery

### 2.5 Database — Supabase (PostgreSQL)

**Two tables:**

```sql
-- Table 1: Event Logging
CREATE TABLE vibe_logs (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  event       TEXT NOT NULL,
  -- "vibe_searched" | "queue_started" | "song_played" |
  -- "song_completed" | "queue_completed" | "refined" |
  -- "post_queue_action"
  vibe_query  TEXT,
  song_index  INT,
  song_name   TEXT,
  action      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Saved Playlists (shareable)
CREATE TABLE saved_playlists (
  id          TEXT PRIMARY KEY,  -- nanoid (8 chars)
  session_id  TEXT NOT NULL,
  vibe_query  TEXT NOT NULL,
  songs       JSONB NOT NULL,   -- array of 6 song objects
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Free tier limits:** 500 MB storage, 2 active projects, 5 GB bandwidth — more than sufficient for MVP validation with 50–100 test users.

---

## 3. Request Flow — Full Pipeline

### 3.1 Vibe Search (the core flow)

```
User types: "Something raw and emotional but upbeat, not Bollywood"
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│  Browser: POST /api/vibe-search                          │
│  Body: { query, mode: "text", sessionId }                │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Step 1: Mode Detection                                  │
│  - Check regex: /more like|similar to|like .+ but/i      │
│  - If match → seed mode, extract song name + modifier    │
│  - If no match → text mode (this case)                   │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Step 2: Keyword Extraction (LLM Call #1)                │
│  System: "Extract 5-8 music search keywords"             │
│  Input: "Something raw and emotional but upbeat..."      │
│  Output: ["raw vocals", "emotional Hindi",               │
│           "indie folk", "upbeat acoustic", "non-film"]   │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Step 3: Candidate Discovery (iTunes API)                │
│  - Fire parallel searches for each keyword               │
│  - GET itunes.apple.com/search?term={keyword}            │
│    &media=music&entity=song&country=IN&limit=10          │
│  - Deduplicate by trackId                                │
│  - Pool: ~30-50 unique candidate tracks                  │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Step 4: AI Selection + Formatting (LLM Call #2)         │
│  System prompt: "You are Gaana's music discovery AI..."  │
│  Input: user's vibe + candidate track list               │
│  Output: JSON array of 6 songs with:                     │
│    - song, artist, reason, mood_tags[3]                  │
│    - itunes_id, preview_url, artwork_url                 │
│  Rules enforced:                                         │
│    - reason starts "Because you want"                    │
│    - <em> tags on key mood words                         │
│    - No repeats from previousSongs                       │
│    - Strict JSON (no markdown wrapping)                  │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│  Step 5: Response                                        │
│  Return 6 song objects to frontend → render Screen 2     │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Refinement Loop

```
User on Screen 2 types: "Same vibe but more acoustic"
                    │
                    ▼
POST /api/vibe-search {
  query: "Something raw and emotional but upbeat, not Bollywood",
  refinement: "Same vibe but more acoustic",
  previousSongs: ["Khaabon Ke Parinday", "Dooba Dooba...", ...],
  sessionId: "abc123"
}
                    │
                    ▼
Same pipeline as above, but:
- LLM prompt includes BOTH original query + refinement
- previousSongs are excluded from results
- Returns a fresh set of 6 songs → re-renders Screen 2
```

### 3.3 Vibe Queue (Audio Playback)

```
User taps "Play as Vibe Queue"
          │
          ▼
┌─────────────────────────────────────┐
│  Load all 6 preview URLs into array │
│  currentIndex = 0                   │
│  audio.src = songs[0].preview_url   │
│  audio.play()                       │
└──────────────────┬──────────────────┘
                   │
          ┌────────▼────────┐
          │  Song ends       │
          │  (audio 'ended') │
          └────────┬────────┘
                   │
          ┌────────▼────────┐
     ┌────│ currentIndex < 6?│────┐
     │YES └─────────────────┘ NO │
     │                           │
┌────▼──────────────┐   ┌───────▼───────────┐
│ currentIndex++     │   │ Navigate to       │
│ Play next song     │   │ Screen 3          │
│ Update queue UI    │   │ (Post-Queue)      │
│ Log: song_played   │   │ Log: queue_       │
└───────────────────┘   │ completed         │
                        └───────────────────┘
```

### 3.4 Save Playlist + Share

```
User taps "Save this queue as playlist"
          │
          ▼
POST /api/playlist {
  songs: [{song, artist, preview_url, ...}, × 6],
  vibeQuery: "raw emotional but upbeat",
  sessionId: "abc123"
}
          │
          ▼
┌─────────────────────────────────┐
│ Generate nanoid (8 chars)       │
│ e.g., "kR3x9mPq"               │
│                                 │
│ INSERT INTO saved_playlists     │
│ (id, session_id, vibe_query,    │
│  songs, created_at)             │
└──────────────────┬──────────────┘
                   │
                   ▼
┌─────────────────────────────────┐
│ Return:                         │
│ { playlistUrl:                  │
│   "gaana-vibe.vercel.app/       │
│    playlist/kR3x9mPq" }        │
│                                 │
│ Frontend:                       │
│ - Copy URL to clipboard         │
│ - Show toast: "Saved! Link      │
│   copied ✦"                     │
└─────────────────────────────────┘
```

---

## 4. File Structure

```
d:\GaanaMVP\
├── ProblemStatement.md
├── prompts.md
├── ImplementationPlan.md
├── Architecture.md              ← this file
├── EdgeCases.md
├── Eval.md
│
├── app/                         ← Next.js App Router
│   ├── layout.js                ← root layout (Inter font, metadata)
│   ├── page.js                  ← Screen 1: Home
│   ├── globals.css              ← design system + all styles
│   ├── page.css                 ← Home screen styles
│   │
│   ├── results/
│   │   ├── page.js              ← Screen 2: Results + Vibe Queue
│   │   └── page.css             ← Results styles
│   │
│   ├── complete/
│   │   ├── page.js              ← Screen 3: Post-Queue Complete
│   │   └── page.css             ← Complete styles
│   │
│   ├── playlist/
│   │   └── [id]/
│   │       └── page.js          ← Shared Playlist View
│   │
│   ├── api/
│   │   ├── vibe-search/
│   │   │   └── route.js         ← AI recommendation pipeline
│   │   ├── log/
│   │   │   └── route.js         ← Event logging
│   │   └── playlist/
│   │       └── route.js         ← Save + share playlist
│
├── lib/
│   ├── llm.js                   ← LLM-as-Recommender (Groq + Gemini)
│   ├── itunes.js                ← iTunes audio enrichment layer
│   ├── supabase.js              ← Supabase client
│   ├── logger.js                ← Frontend event logging helper
│   └── pinecone.js              ← Pinecone vector search (Phase 2.5)
│
├── scripts/
│   └── ingest-embeddings.js     ← Data pipeline: 3 Kaggle datasets → Pinecone
│
├── .env.local                   ← local env vars (gitignored)
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## 5. Component Architecture

```
App (layout.js)
│
├── Screen 1: Home (page.js)
│   ├── StatusBar
│   ├── GaanaHeader
│   ├── Greeting
│   ├── VibeSearchCard
│   │   ├── TextInput (+ voice mic button)
│   │   ├── FindButton
│   │   ├── SeedChip ("♪ Start from a song")
│   │   └── VoiceChip ("🎤 Voice")
│   ├── TrendingSection (dimmed, opacity 0.4)
│   ├── MadeForYouSection (dimmed, opacity 0.4)
│   └── BottomNav
│
├── Screen 2: Results (/results)
│   ├── StatusBar
│   ├── ResultHeader (back arrow + count)
│   ├── VibeEchoBox
│   ├── VibeQueueButton
│   ├── SongCard × 6
│   │   ├── Artwork
│   │   ├── Title + Artist
│   │   ├── PlayButton
│   │   ├── ReasonLine (with <em> highlights)
│   │   └── MoodTags × 3
│   ├── RefineBar
│   └── BottomNav
│
├── Screen 3: Complete (/complete)
│   ├── StatusBar
│   ├── GaanaHeader (with "Finished" pill)
│   ├── CompletionContent
│   │   ├── CheckmarkIcon
│   │   ├── Title + Subtitle
│   │   └── StatsRow (3 stat cards)
│   ├── ActionButtons
│   │   ├── GenerateNewButton (primary)
│   │   ├── SameVibeMoreButton (outline)
│   │   └── SavePlaylistButton (ghost)
│   └── BottomNav
│
└── Shared Playlist (/playlist/[id])
    ├── StatusBar
    ├── GaanaHeader
    ├── VibeEchoBox (read-only)
    ├── SongCard × 6 (playable)
    └── BottomNav
```

---

## 6. State Management

No external state library. React's built-in tools are sufficient.

```
┌──────────────────────────────────────────────────────┐
│  App-level State (via useContext or URL params)       │
│                                                      │
│  sessionId: string       ← generated on first load   │
│  vibeQuery: string       ← user's original query      │
│  songs: Song[]           ← current 6 results          │
│  previousSongs: string[] ← all previously shown songs │
│  currentMode: "text"|"seed"                           │
│  isPlaying: boolean                                   │
│  currentSongIndex: number                             │
└──────────────────────────────────────────────────────┘
```

**Data flow between screens:**
- Screen 1 → Screen 2: Pass query + songs via URL search params or React context
- Screen 2 → Screen 3: Pass songs + stats via context
- Screen 3 → Screen 2: Pass query + previousSongs for "6 more" flow

---

## 7. Security Considerations

| Concern | Mitigation |
|:---|:---|
| API keys exposed to browser | All LLM + Supabase service calls happen server-side in API routes. Keys are never sent to the client. |
| Prompt injection | System prompt is server-only. User input is treated as data, not instructions. |
| Rate limiting abuse | iTunes has IP-based limits. Groq has key-based limits. For MVP, this is acceptable. For production: add rate limiting middleware. |
| Supabase data | Service key used only server-side. `NEXT_PUBLIC_SUPABASE_URL` is safe to expose (read-only for playlist viewing). |
| CORS | Next.js API routes handle same-origin by default. No CORS config needed. |

---

## 8. Deployment Architecture

**Unified Full-Stack Deployment Strategy:**
Because Gaana Vibe Search is built on Next.js (App Router), there is **no separate backend deployment required**. Next.js acts as a full-stack framework. When deployed to Vercel, the frontend (React components) is compiled into static assets hosted on a global Edge CDN, while the backend (API routes like `/api/vibe-search`) is automatically converted into Serverless Node.js Functions. Both are deployed simultaneously from a single GitHub push.

```
┌─────────────────────────────────────────────────┐
│                   GitHub Repo                    │
│              (gaana-vibe-search)                  │
└────────────────────┬────────────────────────────┘
                     │  push to main
                     │
┌────────────────────▼────────────────────────────┐
│              Vercel (Auto-Deploy)                │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Static Assets (/_next, /public)          │    │
│  │  → Vercel Edge CDN (global)               │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Serverless Functions                     │    │
│  │  /api/vibe-search  → Node.js runtime      │    │
│  │  /api/log          → Node.js runtime      │    │
│  │  /api/playlist     → Node.js runtime      │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Environment Variables (Dashboard):              │
│  - GROQ_API_KEY                                  │
│  - GEMINI_API_KEY                                │
│  - PINECONE_API_KEY                              │
│  - PINECONE_INDEX                                │
│  - ITUNES_COUNTRY=IN                             │
│  - NEXT_PUBLIC_SUPABASE_URL                      │
│  - SUPABASE_SERVICE_KEY                          │
└──────────────────────────────────────────────────┘
           │                    │
           │                    │
    ┌──────▼──────┐      ┌─────▼──────┐
    │  Groq Cloud  │      │  Supabase  │
    │  (LLM API)   │      │  Cloud     │
    ├──────────────┤      │  (Postgres)│
    │  Gemini API  │      └────────────┘
    │  (fallback)  │
    ├──────────────┤
    │  iTunes API  │
    │  (Apple CDN) │
    └──────────────┘
```

### Deployment Steps

```bash
# 1. Initialize Git repo
git init
git add .
git commit -m "Initial commit: Gaana Vibe Search MVP"

# 2. Push to GitHub
gh repo create gaana-vibe-search --public --push

# 3. Connect to Vercel (one-time)
# - Go to vercel.com → New Project → Import from GitHub
# - Select gaana-vibe-search repo
# - Framework: Next.js (auto-detected)
# - Add environment variables in dashboard

# 4. Every subsequent push auto-deploys
git add .
git commit -m "feature: add refinement loop"
git push origin main
# → Vercel auto-builds and deploys in ~30 seconds
```

### Vercel Free Tier Limits

| Resource | Free Limit | Our Usage |
|:---|:---|:---|
| Deployments | Unlimited | ✅ |
| Bandwidth | 100 GB/month | ✅ (way under) |
| Serverless Executions | 100 GB-hours/month | ✅ |
| Build time | 6,000 min/month | ✅ |
| Edge Functions | 500K invocations/month | ✅ |

---

## 9. Performance Budget

| Metric | Target | How |
|:---|:---|:---|
| First Contentful Paint | < 1.5s | Vercel CDN + minimal CSS |
| Vibe search response | < 3s | Groq LPU = ~0.5s per call, iTunes = ~0.3s |
| Audio preview load | < 0.5s | Apple CDN (previewUrl) |
| Total bundle size | < 150KB | No heavy dependencies |

---

## 10. Research Data Collection

The MVP is designed to collect specific behavioral signals that prove/disprove the hypothesis:

| Signal | Event Logged | What It Proves |
|:---|:---|:---|
| User submits a vibe | `vibe_searched` | Feature adoption |
| User plays the full queue | `queue_completed` | Passive discovery works |
| User refines after results | `refined` | Intent layer enables conversation |
| User taps "6 more songs" | `post_queue_action: more` | Trust in AI curation |
| User saves playlist | `post_queue_action: save` | Trust strong enough to keep |
| User shares playlist link | Shareable link click-through | Viral trust signal |
| 4+ new artists discovered | Computed from results | Discovery effectiveness |

**Key metric:** If a user completes the queue AND immediately requests "6 more" — that is behavioral proof the hypothesis works. Logged across 50 users, this is stronger than any survey.

---

## 11. Known Limitations & Future Considerations

| Limitation | Impact | Future Fix |
|:---|:---|:---|
| iTunes previews are 30 seconds only | Short listening window | Partner with streaming service for full playback |
| iTunes catalog may miss very niche indie artists | Some recommendations may lack previews | Fallback to YouTube embeds |
| Groq free tier: 1000 RPD | Caps heavy testing days | Upgrade to paid tier ($0.05/1M tokens) |
| Supabase pauses after 7 days inactivity | Need periodic pings | Cron job or upgrade to Pro |
| No user accounts | Can't track cross-session behavior | Add optional auth later |
| Web Speech API browser support | Doesn't work in all browsers | Show/hide voice chip based on feature detection |
