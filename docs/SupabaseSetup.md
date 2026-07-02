# Phase 3: Supabase Analytics & Playlist Setup

To capture real user behavioral data (for your review deck) and enable the "Share Playlist" feature, we need to set up Supabase. The code is already written in the app; we just need to create the database tables.

### 1. Create a Supabase Project
1. Go to [Supabase.com](https://supabase.com/) and create a free account/project.
2. Go to **Project Settings > API**.
3. Copy your `Project URL` and `anon public` key.
4. Paste them into your `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   SUPABASE_SERVICE_KEY=your_anon_key_here
   ```

### 2. Run this SQL to Create the Tables
In your Supabase dashboard, go to the **SQL Editor** (the `</>` icon on the left), paste the following SQL, and click **Run**:

```sql
-- Create table for tracking user behavior & search queries
-- Events include: vibe_searched, queue_started, song_played, song_completed, queue_completed, refined, post_queue_action, song_rejected
CREATE TABLE vibe_logs (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    vibe_query TEXT,
    song_index INTEGER,
    song_name TEXT,
    action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for saved & shared playlists
CREATE TABLE saved_playlists (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    vibe_query TEXT NOT NULL,
    songs_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Security policies (Optional for MVP, but good practice)
ALTER TABLE vibe_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_playlists ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (since our app has no user login)
CREATE POLICY "Allow anonymous inserts to vibe_logs" ON vibe_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous inserts to saved_playlists" ON saved_playlists FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous reads from saved_playlists" ON saved_playlists FOR SELECT TO anon USING (true);
```

### What this unlocks for your presentation:
Once this is running, every time you or a user searches, plays a song, or refines a vibe, it will be logged to `vibe_logs`. You can export this table as a CSV directly from Supabase and drop it into a slide saying: *"In our beta test, 85% of users played at least 3 recommended songs."*
