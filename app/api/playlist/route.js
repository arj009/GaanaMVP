import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(req) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { songs, vibeQuery, sessionId } = body;

    const playlistId = nanoid(10);

    const { error } = await supabase
      .from('saved_playlists')
      .insert([
        {
          id: playlistId,
          session_id: sessionId,
          vibe_query: vibeQuery,
          songs_data: songs,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ playlistUrl: `/playlist/${playlistId}` });
  } catch (error) {
    console.error("Playlist Save Error:", error);
    return NextResponse.json({ error: "Failed to save playlist" }, { status: 500 });
  }
}
