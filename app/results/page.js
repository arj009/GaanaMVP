/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Pause, Home, Search, Library, User, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { logEvent } from "@/lib/logger";
import "./page.css";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || "raw emotional but upbeat — Hindi indie";
  
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [refinement, setRefinement] = useState("");
  
  const audioRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchVibe() {
      setLoading(true);
      logEvent({ event: 'vibe_searched', vibeQuery: query });
      try {
        const res = await fetch('/api/vibe-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, mode: searchParams.get('mode') || 'text' })
        });
        const data = await res.json();
        if (isMounted) {
          setSongs(data.songs || []);
          sessionStorage.setItem('vibe_queue', JSON.stringify(data.songs || []));
        }
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchVibe();
    
    return () => { isMounted = false; };
  }, [query, searchParams]);

  // Create audio element on mount, cleanup on unmount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle audio playback logic and 10-second queue skipping
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleSongEnd = () => {
      if (playingIndex === -1) return;
      logEvent({ event: 'song_completed', vibeQuery: query, songIndex: playingIndex, songName: songs[playingIndex]?.song });
      
      const nextIndex = playingIndex + 1;
      if (nextIndex < songs.length) {
        audio.src = songs[nextIndex].preview_url;
        audio.play().catch(e => console.error("Playback failed", e));
        setPlayingIndex(nextIndex);
        logEvent({ event: 'song_played', vibeQuery: query, songIndex: nextIndex, songName: songs[nextIndex].song });
      } else {
        setIsQueuePlaying(false);
        setPlayingIndex(-1);
        logEvent({ event: 'queue_completed', vibeQuery: query });
        router.push('/complete?q=' + encodeURIComponent(query));
      }
    };

    const handleTimeUpdate = () => {
      // If Vibe Queue is active, skip to next song after 10 seconds
      if (isQueuePlaying && audio.currentTime >= 10) {
        audio.currentTime = 0; // prevent multiple triggers
        audio.pause();
        handleSongEnd();
      }
    };

    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('ended', handleSongEnd);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [playingIndex, songs, isQueuePlaying, query, router]);

  useEffect(() => {
    if (playingIndex >= 0) {
      const el = document.getElementById(`song-card-${playingIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [playingIndex]);

  const togglePlay = (index) => {
    if (playingIndex === index) {
      audioRef.current.pause();
      setPlayingIndex(-1);
      setIsQueuePlaying(false);
    } else {
      audioRef.current.src = songs[index].preview_url;
      audioRef.current.play().catch(e => console.error("Playback failed", e));
      setPlayingIndex(index);
      setIsQueuePlaying(false);
      logEvent({ event: 'song_played', vibeQuery: query, songIndex: index, songName: songs[index].song });
    }
  };

  const playQueue = () => {
    if (isQueuePlaying) {
      audioRef.current.pause();
      setIsQueuePlaying(false);
      setPlayingIndex(-1);
    } else {
      setIsQueuePlaying(true);
      setPlayingIndex(0);
      audioRef.current.src = songs[0].preview_url;
      audioRef.current.play().catch(e => console.error("Playback failed", e));
      logEvent({ event: 'queue_started', vibeQuery: query });
      logEvent({ event: 'song_played', vibeQuery: query, songIndex: 0, songName: songs[0].song });
    }
  };



  return (
    <>
      <div className="status-bar">
        <span>9:42</span>
        <span>•••</span>
      </div>

      <header className="result-header">
        <button onClick={() => router.back()} className="back-btn">
          <ArrowLeft size={16} />
        </button>
        <span className="header-title">Vibe results</span>
        <span className="header-count">{songs.length} songs</span>
      </header>

      <main className="results-main">
        <div className="vibe-echo">
          <span className="echo-label">Your vibe</span>
          <span className="echo-text">&quot;{query}&quot;</span>
          
          {/* Refine UI moved here for context */}
          <div className="refine-inline" style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <input 
              type="text" 
              className="refine-input" 
              placeholder="Not quite right? Tweak it (e.g. 'make it faster')"
              value={refinement}
              onChange={e => setRefinement(e.target.value)}
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '9px', padding: '6px 8px', borderRadius: '4px' }}
            />
            <button 
              onClick={() => {
                if (refinement.trim()) {
                  logEvent({ event: 'refined', vibeQuery: query, action: refinement });
                  router.push(`/results?q=${encodeURIComponent(query + " — " + refinement)}`);
                }
              }}
              style={{ backgroundColor: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '4px', padding: '0 10px', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Refine ✨
            </button>
          </div>
        </div>

        <div className="play-queue-btn" onClick={playQueue}>
          <div className="flex items-center gap-2">
            <div className="play-circle large">
              {isQueuePlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
            </div>
            <div className="flex-col">
              <span className="queue-title">Play as Vibe Queue</span>
              <span className="queue-subtitle">All {songs.length} songs play one after another</span>
            </div>
          </div>
          <div className="flex-col items-end gap-1">
            <span className="hands-free-badge">Hands-free</span>
            <span className="queue-time">{songs.length} songs · ~{(songs.length * 4.5).toFixed(0)} min</span>
          </div>
        </div>

        <div className="song-list">
          {loading ? (
            <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>
               <div style={{animation: 'pulse 1.5s infinite'}}>Analyzing vibe and finding matches...</div>
            </div>
          ) : (
            songs.map((song, i) => (
              <div id={`song-card-${i}`} key={i} className={`song-card ${playingIndex === i ? 'playing' : ''}`}>
                <div className="song-top-row">
                  {song.artwork_url ? (
                    <img src={song.artwork_url} className="song-thumb" alt={song.song} />
                  ) : (
                    <div className={`song-thumb gradient-${(i % 4) + 1}`}></div>
                  )}
                  <div className="song-info">
                    <span className="song-name">{song.song}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="song-artist">{song.artist}</span>
                      {song.is_fresh_find && <span className="fresh-find-badge">🌱 Fresh Find</span>}
                    </div>
                  </div>
                  <button className="play-circle small" onClick={() => togglePlay(i)}>
                    {playingIndex === i ? <Pause size={10} fill="white" /> : <Play size={10} fill="white" />}
                  </button>
                </div>
              
              <div 
                className="song-reason"
                dangerouslySetInnerHTML={{ __html: song.reason }}
              />
              
              <div className="tag-row">
                {song.mood_tags?.map(tag => (
                  <span key={tag} className="tag-pill">{tag.replace(/<\/?em>/g, '')}</span>
                ))}
              </div>
            </div>
            ))
          )}
        </div>
      </main>



      <nav className="bottom-nav">
        <div className="nav-item active">
          <Home size={20} />
          <span>Home</span>
        </div>
        <div className="nav-item">
          <Search size={20} />
          <span>Search</span>
        </div>
        <div className="nav-item">
          <Library size={20} />
          <span>Library</span>
        </div>
        <div className="nav-item">
          <User size={20} />
          <span>Profile</span>
        </div>
      </nav>
    </>
  );
}

import { Suspense } from "react";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{color: 'white', padding: '20px'}}>Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
