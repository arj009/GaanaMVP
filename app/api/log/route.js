import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    if (!supabase) {
      return NextResponse.json({ message: "Supabase not configured, skipping log" }, { status: 200 });
    }

    const body = await req.json();
    const { sessionId, event, vibeQuery, songIndex, songName, action, timestamp } = body;

    const { error } = await supabase
      .from('vibe_logs')
      .insert([
        {
          session_id: sessionId,
          event_type: event,
          vibe_query: vibeQuery,
          song_index: songIndex,
          song_name: songName,
          action: action,
          created_at: timestamp || new Date().toISOString()
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logging Error:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
