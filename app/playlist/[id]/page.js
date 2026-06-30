"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Play, Pause, Music } from "lucide-react";
import "../../results/page.css"; // Reuse results CSS

export default function PlaylistView() {
  const { id } = useParams();
  const router = useRouter();
  
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const audioRef = useRef(null);

  useEffect(() => {
    async function fetchPlaylist() {
      const { data, error } = await supabase
        .from('saved_playlists')
        .select('*')
        .eq('id', id)
        .single();
        
      if (!error && data) {
        setPlaylist(data);
      }
      setLoading(false);
    }
    fetchPlaylist();
  }, [id]);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => setPlayingIndex(-1));
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (index) => {
    if (playingIndex === index) {
      audioRef.current.pause();
      setPlayingIndex(-1);
    } else {
      audioRef.current.src = playlist.songs_data[index].preview_url;
      audioRef.current.play().catch(e => console.error(e));
      setPlayingIndex(index);
    }
  };

  if (loading) return <div style={{padding: '40px', color: 'white', textAlign: 'center'}}>Loading playlist...</div>;

  if (!playlist) {
    return (
      <div style={{padding: '40px', textAlign: 'center', flex: 1}}>
        <h2 style={{color: 'white', marginBottom: '10px'}}>Playlist not found</h2>
        <p style={{color: '#888', marginBottom: '20px'}}>This vibe queue doesn't exist or has expired. Let's create a new one!</p>
        <button onClick={() => router.push('/')} style={{color: 'var(--accent-red)', padding: '10px 20px', border: '1px solid var(--accent-red)', borderRadius: '20px', background: 'transparent'}}>Return Home</button>
      </div>
    );
  }

  return (
    <>
      <header className="result-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="gaana-logo" style={{ color: 'white' }}>
          <div className="gaana-logo-icon"><Music size={14} /></div>
          Gaana
        </div>
      </header>

      <main className="results-main" style={{ paddingBottom: '40px' }}>
        <div className="vibe-echo" style={{ margin: '20px 12px' }}>
          <span className="echo-label">Saved Vibe Queue</span>
          <span className="echo-text">&quot;{playlist.vibe_query}&quot;</span>
        </div>

        <div className="song-list">
          {playlist.songs_data.map((song, i) => (
            <div key={i} className={`song-card ${playingIndex === i ? 'playing' : ''}`}>
              <div className="song-top-row">
                {song.artwork_url ? (
                  <img src={song.artwork_url} className="song-thumb" alt={song.song} />
                ) : (
                  <div className={`song-thumb gradient-${(i % 4) + 1}`}></div>
                )}
                <div className="song-info">
                  <span className="song-name">{song.song}</span>
                  <span className="song-artist">{song.artist}</span>
                </div>
                <button className="play-circle small" onClick={() => togglePlay(i)}>
                  {playingIndex === i ? <Pause size={10} fill="white" /> : <Play size={10} fill="white" />}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{textAlign: 'center', marginTop: '30px'}}>
           <button onClick={() => router.push('/')} style={{backgroundColor: 'var(--accent-red)', color: 'white', padding: '12px 24px', borderRadius: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer'}}>
             Create your own vibe
           </button>
        </div>
      </main>
    </>
  );
}
