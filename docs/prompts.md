-------------------Prompts ---------------------------
Build a Next.js 14 app called "Gaana Vibe Search" — an AI-powered 
music discovery feature embedded inside Gaana's existing home screen.

═══════════════════════════════════════
VISUAL STYLE
═══════════════════════════════════════
Background:    #0D0D0D
Cards:         #1A1A1A background, #2A2A2A border
Accent red:    #E72C2C (Gaana brand)
Text primary:  #FFFFFF
Text secondary:#888888
Text muted:    #555555
Card radius:   10px
Font:          Inter, mobile-first, fully responsive


═══════════════════════════════════════
SCREEN 1 — HOME SCREEN
═══════════════════════════════════════
Top to bottom layout:

1. STATUS BAR
   - "9:41" left, three white dots right

2. GAANA HEADER
   - Left: red 18x18 rounded square icon (music note) + "Gaana" white text
   - Right: search icon + bell icon in #888
   - Border bottom: 0.5px #222

3. GREETING
   - "Good morning, Rahul" in #666, 9px uppercase label style
   - Padding: 8px 12px 4px

4. VIBE SEARCH CARD  ← the new feature
   - Margin: 6px 12px
   - Background: #0F0A0A
   - Border: 1px solid #E72C2C
   - Border radius: 10px
   - Padding: 10px
   - "New" badge: absolute top-right, bg #E72C2C, white text 8px

   Content inside card:
   - Title: "What are you in the mood for?" — white, 11px, 500 weight
   - Subtitle: "Describe a vibe, or start from a song you love" 
     — #666, 9px
   - Input row (flex):
       Text input: bg #0D0D0D, border 0.5px #2A2A2A, radius 6px,
       padding 5px 7px, placeholder "e.g. raw and emotional, 
       not Bollywood..." in #555, font-size 9px
       "Find ✦" button: bg #E72C2C, white, 9px, radius 6px,
       padding 5px 8px
   - Seed chips row (flex, gap 5px, margin-top 6px):
       Chip 1: "♪ Start from a song"
       Chip 2: "🎤 Speak your vibe"
       Both: bg #1A1A1A, border 0.5px #2A2A2A, radius 20px,
       padding 3px 7px, color #666, 8px

5. EXISTING SECTIONS (opacity 0.4 — dimmed, not removed)
   "Trending Now" label + horizontal scrollable pills:
   ["Bollywood Hits", "Punjabi Pop", "Sad Songs", "Party Mix"]
   Pills: bg #1A1A1A, border 0.5px #2A2A2A, radius 20px, 
   color #666, 8px

   "Made for you" label + 2-column grid of 4 cards:
   Each card: bg #1A1A1A, radius 6px, padding 6px, flex row,
   22x22 coloured thumb + title (#666, 8px) + subtitle (#444, 7px)
   Cards: "Your Daily Mix / Arijit, Jubin, KK",
          "Mood Booster / Based on your taste",
          "Throwback Mix / 2010s favourites",
          "Late Night / Chill and slow"

6. BOTTOM NAV
   4 items: Home (active, #E72C2C), Search, Library, Profile
   Active item icon + label in #E72C2C, rest in #555
   Border top: 0.5px #222, height 44px


═══════════════════════════════════════
SCREEN 2 — RESULTS SCREEN
(navigates here after user submits vibe)
═══════════════════════════════════════

1. STATUS BAR — "9:42"

2. RESULT HEADER
   - Back arrow in #E72C2C + "Vibe results" white 12px + 
     "6 songs" in #555 right-aligned

3. VIBE ECHO BOX
   - bg #1A0A0A, border-left 2px #E72C2C, radius 0 5px 5px 0
   - Margin: 8px 12px 4px
   - Label: "Your vibe" in #555, 8px
   - Text: user's vibe echoed back in #E72C2C, 9px italic

4. PLAY AS VIBE QUEUE BUTTON  ← new feature, sits here
   - Margin: 4px 12px 6px
   - bg #0F0505, border 1px #E72C2C, radius 8px, padding 8px 10px
   - Layout: flex, space-between
   - Left side:
       Red circle icon (28px, bg #E72C2C) with play icon white
       Text column: "Play as Vibe Queue" white 10px 500 weight
                    "All 6 songs play one after another" #666 8px
   - Right side:
       "Hands-free" badge: bg #E72C2C, white, 7px, radius 20px
       "6 songs · ~28 min" in #555, 8px

5. 6 RESULT CARDS (scrollable list, padding 0 12px)
   Each card:
   - bg #1A1A1A, border 0.5px #2A2A2A, radius 8px, padding 8px
   - Top row: 32x32 gradient thumb + song name (white 10px 500) + 
     artist (#666 8px) + red circle play button (24px)
   - Reason line: #555, 8px, italic. Must start "Because you want"
     and echo user's words. Key words highlighted in #E72C2C using
     <em> tags
   - Tag pills row: bg #111, border 0.5px #2A2A2A, radius 20px,
     color #555, 7px. 3 tags per card.

   Song data (hardcoded for prototype):
   1. Khaabon Ke Parinday / Mohit Chauhan
      Reason: "Because you want raw and emotional, Mohit's voice 
      has the same unpolished quality as Arijit but with an indie 
      folk edge"
      Tags: Hindi-Indie, Raw vocals, Uplifting
   2. Dooba Dooba Rehta Hoon / Silk Route
      Reason: "Because you want something not mainstream Bollywood, 
      this 90s indie-rock track has the emotional depth with a 
      harder edge"
      Tags: 90s Indie, Rock, Emotional
   3. Moh Moh Ke Dhaage / Papon
      Reason: "Because you want upbeat but raw, Papon's folk-rooted 
      voice brings energy without the over-produced sound"
      Tags: Folk-pop, Upbeat, Raw
   4. Tum Ho / Mohit Chauhan
      Reason: "Because you want emotional but upbeat, this track 
      builds gradually from raw to soaring"
      Tags: Emotional, Build-up, Indie
   5. Iktara / Kavita Seth
      Reason: "Because you want something raw, Kavita's voice is 
      unfiltered folk with deep emotional resonance"
      Tags: Folk, Raw, Soulful
   6. Channa Mereya / Arijit Singh
      Reason: "Because you want raw and emotional, this goes deeper 
      than typical Arijit — more stripped and honest"
      Tags: Raw, Acoustic, Emotional

6. REFINE BAR (pinned above bottom nav)
   - Border-top 0.5px #222, padding 6px 12px, flex row, gap 5px
   - Input: bg #1A1A1A, border 0.5px #2A2A2A, radius 6px,
     placeholder "Same vibe but more acoustic...", color #555, 8px
   - "Refine →" button: bg transparent, border 0.5px #E72C2C,
     radius 6px, color #E72C2C, 8px

7. BOTTOM NAV — same as Screen 1


═══════════════════════════════════════
SCREEN 3 — POST-QUEUE COMPLETE
(navigates here after all 6 songs finish playing)
═══════════════════════════════════════

1. STATUS BAR — "10:09"

2. GAANA HEADER
   - Left: logo same as Screen 1
   - Right: "Finished" pill — bg #1A0A0A, border 0.5px #E72C2C,
     text #E72C2C, 9px, radius 20px

3. CENTERED CONTENT (flex column, centered, padding 14px)
   - Checkmark icon (ti-checks): #E72C2C, 32px, margin-bottom 8px
   - Title: "Vibe queue complete" — white, 12px, 500
   - Subtitle: "You listened through all 6 songs for 
     'raw emotional but upbeat'" — #555, 9px, line-height 1.5
   - Margin-bottom: 12px

4. STATS ROW (3 equal cards, gap 6px)
   Each: bg #1A1A1A, radius 6px, padding 7px, text-center
   - "6" / "songs played"
   - "28m" / "listening time"  
   - "4" / "new artists"
   Number: #E72C2C, 15px, 500 weight
   Label: #555, 7px

5. BUTTONS (stacked, full width, gap 5px)
   Button 1 — Primary:
   bg #E72C2C, white, 9px, radius 7px, padding 8px
   "✦ Generate another vibe queue"

   Button 2 — Refine:
   bg #1A0A0A, border 0.5px #E72C2C, color #E72C2C, 9px, radius 7px
   "Same vibe, 6 more songs →"

   Button 3 — Secondary:
   bg transparent, border 0.5px #2A2A2A, color #666, 9px, radius 7px
   "Save this queue as playlist"


═══════════════════════════════════════
VIBE QUEUE AUDIO LOGIC
═══════════════════════════════════════
- Use iTunes 30-sec preview URLs (fetch via iTunes Search API)
- Store all 6 preview URLs in an array on queue start
- currentIndex = 0
- audio.addEventListener('ended', () => {
    currentIndex++
    if (currentIndex < songs.length) {
      audio.src = songs[currentIndex].previewUrl
      audio.play()
      updateQueueUI(currentIndex)
    } else {
      navigateToScreen3()
    }
  })
- "Play as Vibe Queue" tap: load all 6, play index 0, 
  navigate to Screen 2 now-playing view


═══════════════════════════════════════
API ROUTES
═══════════════════════════════════════

POST /api/vibe-search
Input: {
  query: string,
  mode: "text" | "seed",
  seedSong?: string,
  seedModifier?: string,
  refinement?: string,
  previousQuery?: string,
  previousSongs?: string[],
  sessionId: string
}
Steps:
1. If seed mode, detect the seed song and modifier.
2. Call Groq API to extract search keywords from the query.
3. Call iTunes Search API with extracted keywords to get candidate tracks with previewUrl and artworkUrl100.
4. Call Groq API (llama-3.3-70b-versatile) with system prompt:
   "You are Gaana's music discovery AI for Indian listeners.
   Given a vibe description and candidate iTunes tracks with metadata, 
   select the 6 best matches and return ONLY a valid JSON array:
   [{song, artist, reason, mood_tags:[3 strings], itunes_id, preview_url, artwork_url}]
   Rules:
   - reason MUST start with 'Because you want' and echo the user's exact words
   - Highlight key mood words by wrapping them in <em> tags
   - Songs must be real Indian artists
   - If previousSongs provided, do not repeat them
   - Return ONLY a raw JSON array, no markdown, no code fences, no explanation
   - Ensure valid JSON that can be parsed with JSON.parse()"
5. Implement automatic failover: If Groq returns 429 rate limit, fall back to Google Gemini (gemini-2.0-flash).
Output: 6 song objects with preview URLs and artwork URLs

POST /api/log
Input: {
  sessionId: string,
  event: "vibe_searched" | "queue_started" | "song_played" |
         "song_completed" | "queue_completed" | "refined" |
         "post_queue_action",
  vibeQuery: string,
  songIndex?: number,
  songName?: string,
  action?: string,
  timestamp: string
}
Writes to Supabase table: vibe_logs

POST /api/playlist
Input: {
  songs: object[],
  vibeQuery: string,
  sessionId: string
}
Steps:
1. Insert into Supabase table: saved_playlists
2. Generate and return a short shareable link ID (nanoid)
Output: { playlistUrl: "yourdomain.vercel.app/playlist/abc123xy" }


═══════════════════════════════════════
ENVIRONMENT VARIABLES
═══════════════════════════════════════
GROQ_API_KEY=
GEMINI_API_KEY=
ITUNES_COUNTRY=IN
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=


═══════════════════════════════════════
NAVIGATION FLOW
═══════════════════════════════════════
Screen 1 (Home)
  → User types vibe + taps "Find" → Screen 2 (Results)
  
Screen 2 (Results)
  → User taps individual play → plays that song only (audio preview)
  → User taps "Play as Vibe Queue" → plays all 6 in sequence,
    queue panel updates as each song changes
  → All 6 complete → Screen 3 (Post-queue)
  → User types refinement + taps "Refine →" → new Screen 2 
    with updated results

Screen 3 (Post-queue)
  → "Generate another vibe queue" → new Screen 2, fresh query
  → "Same vibe, 6 more songs →" → new Screen 2, same query + 
    exclude played songs
  → "Save this queue as playlist" → calls /api/playlist, shows toast "Saved! Link copied ✦"

Playlist View (/playlist/[id])
  → Read-only view of a saved playlist with all 6 songs playable


═══════════════════════════════════════
DEPLOY
═══════════════════════════════════════
Frontend on Vercel
Backend on Supabase or render (whichever is easier)