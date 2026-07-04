/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Pause, Home, Search, Library, User, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { logEvent } from "@/lib/logger";
import { triggerHaptic } from "@/lib/haptics";
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
  const [currentTime, setCurrentTime] = useState("");
  const [rejectedSongs, setRejectedSongs] = useState([]);
  const [isRediscovering, setIsRediscovering] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  const mode = searchParams.get('mode');
  const isAudioIdentified = mode === 'audio' && searchParams.get('identified') === 'true';
  const isAudioFailed = mode === 'audio' && searchParams.get('identified') === 'false';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours() % 12;
      hours = hours ? hours : 12;
      let minutes = now.getMinutes();
      minutes = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);
  
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

  // Show nudge when results first load
  useEffect(() => {
    if (!loading && songs.length > 0) {
      // Small delay so songs render first, then nudge slides in
      const timer = setTimeout(() => setShowNudge(true), 800);
      const autoHide = setTimeout(() => {
        setShowNudge(false);
      }, 9000); // auto-dismiss after 9s
      return () => { clearTimeout(timer); clearTimeout(autoHide); };
    }
  }, [loading, songs.length]);

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
    triggerHaptic(30);
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
    triggerHaptic([30, 50]);
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

  const dismissSong = (index) => {
    triggerHaptic(20);
    const song = songs[index];
    setRejectedSongs(prev => [...prev, song.song]);
    
    // Stop playback if this song is playing
    if (playingIndex === index) {
      audioRef.current.pause();
      setPlayingIndex(-1);
      setIsQueuePlaying(false);
    }
    
    // Remove the song from the list with a brief delay for animation
    setTimeout(() => {
      setSongs(prev => prev.filter((_, i) => i !== index));
      // Adjust playing index if needed
      if (playingIndex > index) {
        setPlayingIndex(prev => prev - 1);
      }
    }, 300);
    
    logEvent({ event: 'song_rejected', vibeQuery: query, songName: song.song, songArtist: song.artist });
  };

  const handleRediscover = async () => {
    triggerHaptic([30, 50, 30]);
    setIsRediscovering(true);
    try {
      const res = await fetch('/api/vibe-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query + ` — NOT like: ${rejectedSongs.join(', ')}`,
          mode: searchParams.get('mode') || 'text',
          previousSongs: rejectedSongs
        })
      });
      const data = await res.json();
      setSongs(data.songs || []);
      setRejectedSongs([]);
      sessionStorage.setItem('vibe_queue', JSON.stringify(data.songs || []));
      logEvent({ event: 'rediscovered', vibeQuery: query, rejectedCount: rejectedSongs.length });
    } catch (err) {
      console.error("Re-discover failed", err);
    } finally {
      setIsRediscovering(false);
    }
  };


  return (
    <>
      <div className="status-bar">
        <span>{currentTime}</span>
        <span>•••</span>
      </div>

      <header className="result-header">
        <button onClick={() => { triggerHaptic(20); router.back(); }} className="back-btn">
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
                triggerHaptic([30, 50, 30]);
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

        {/* Nudge tooltip */}
        {showNudge && !isAudioIdentified && !isAudioFailed && (
          <div className="nudge-tooltip" onClick={() => setShowNudge(false)}>
            <span className="nudge-emoji">👎</span>
            <span className="nudge-text">Don&apos;t vibe with a song? Tap the thumbs down to remove it. We&apos;ll learn your taste!</span>
            <span className="nudge-dismiss">Got it</span>
          </div>
        )}

        {isAudioFailed && (
          <div className="empty-state" style={{margin: '12px', padding: '16px', background: 'rgba(255, 65, 108, 0.1)', border: '1px solid rgba(255, 65, 108, 0.3)', borderRadius: '12px'}}>
            <h3 style={{color: 'white', fontSize: '14px', marginBottom: '8px'}}>Couldn&apos;t identify exact match</h3>
            <p style={{color: '#aaa', fontSize: '10px'}}>But we captured the vibe! Here are some songs with a similar feel.</p>
          </div>
        )}

        {isAudioIdentified && songs.length > 0 && (
          <div className="section-header" style={{marginTop: '20px', padding: '0 12px'}}>
            <span className="section-title" style={{color: '#FF416C', fontSize: '11px', letterSpacing: '1px'}}>🎶 IDENTIFIED SONG</span>
          </div>
        )}

        <div className="song-list">
          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton-status">Analyzing your vibe...</div>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="skeleton-row">
                    <div className="skeleton-thumb shimmer"></div>
                    <div className="skeleton-info">
                      <div className="skeleton-line shimmer" style={{ width: '65%' }}></div>
                      <div className="skeleton-line shimmer" style={{ width: '40%', height: '6px' }}></div>
                    </div>
                    <div className="skeleton-play shimmer"></div>
                  </div>
                  <div className="skeleton-line shimmer" style={{ width: '90%', marginTop: '8px' }}></div>
                  <div className="skeleton-tags">
                    <div className="skeleton-tag shimmer"></div>
                    <div className="skeleton-tag shimmer" style={{ width: '40px' }}></div>
                    <div className="skeleton-tag shimmer" style={{ width: '50px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : songs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔮</div>
              <h3>The vibe is too elusive</h3>
              <p>We couldn&apos;t find perfect matches for this specific mood. Try tweaking your description or making it a bit broader.</p>
              <button className="empty-state-btn" onClick={() => router.push('/')}>
                Try another vibe
              </button>
            </div>
          ) : (
            songs.map((song, i) => (
              <>
              <div id={`song-card-${i}`} key={i} className={`song-card ${playingIndex === i ? 'playing' : ''} ${rejectedSongs.includes(song.song) ? 'dismissed' : ''} ${isAudioIdentified && i === 0 ? 'identified-highlight' : ''}`}>
                <div className="song-top-row">
                  {song.artwork_url ? (
                    <img src={song.artwork_url} className="song-thumb" alt={song.song} />
                  ) : (
                    <div className={`song-thumb gradient-${(i % 4) + 1}`}></div>
                  )}
                  <div className="song-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="song-name">{song.song}</span>
                      {song.vibe_match && (
                        <span className={`vibe-dot ${song.vibe_match >= 9 ? 'perfect' : 'good'}`}
                          title={`${song.vibe_match * 10}% vibe match`}>
                          {song.vibe_match >= 9 ? '●' : '●'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="song-artist">{song.artist}</span>
                      {song.is_fresh_find && <span className="fresh-find-badge">🌱 Fresh Find</span>}
                      {song.vibe_match && (
                        <span className={`vibe-badge ${song.vibe_match >= 9 ? 'perfect' : 'good'}`}>
                          {song.vibe_match >= 9 ? 'Perfect match' : 'Good match'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="dismiss-btn" onClick={(e) => { e.stopPropagation(); dismissSong(i); }} title="Not my vibe">
                    <span className="dismiss-emoji">👎</span>
                  </button>
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
            
            {isAudioIdentified && i === 0 && (
              <div className="section-header" style={{marginTop: '24px', marginBottom: '12px', padding: '0 12px'}}>
                <span className="section-title" style={{color: '#aaa', fontSize: '11px', letterSpacing: '1px'}}>🎧 SIMILAR VIBES</span>
              </div>
            )}
            </>
            ))
          )}
        </div>

        {/* Re-discover banner — appears after 2+ rejected songs */}
        {rejectedSongs.length >= 2 && (
          <div className="rediscover-banner">
            <div className="rediscover-info">
              <span className="rediscover-count">{rejectedSongs.length} songs didn&apos;t fit your vibe</span>
              <span className="rediscover-hint">We&apos;ll find better matches, avoiding those styles</span>
            </div>
            <button 
              className="rediscover-btn" 
              onClick={handleRediscover}
              disabled={isRediscovering}
            >
              {isRediscovering ? (
                <><RefreshCw size={12} className="spin" /> Finding...</>
              ) : (
                <>Re-discover ✦</>
              )}
            </button>
          </div>
        )}
      </main>

      {playingIndex >= 0 && songs[playingIndex] && (
        <div className="mini-player">
          <div className="mini-player-info">
            {songs[playingIndex].artwork_url ? (
              <img src={songs[playingIndex].artwork_url} className="mini-player-thumb" alt="" />
            ) : (
              <div className={`mini-player-thumb gradient-${(playingIndex % 4) + 1}`}></div>
            )}
            <div className="mini-player-text">
              <span className="mini-player-song">{songs[playingIndex].song}</span>
              <span className="mini-player-artist">{songs[playingIndex].artist}</span>
            </div>
          </div>
          <div className="mini-player-controls">
            {isQueuePlaying && <span className="mini-player-counter">{playingIndex + 1}/{songs.length}</span>}
            <button className="play-circle small" onClick={() => togglePlay(playingIndex)}>
              <Pause size={10} fill="white" />
            </button>
          </div>
        </div>
      )}

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
