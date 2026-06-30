"use client";

import { CheckCircle2, Home, Search, Library, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music } from "lucide-react";
import "./page.css";
import { useState, Suspense } from "react";
import { logEvent, getSessionId } from "@/lib/logger";

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || "raw emotional but upbeat";
  
  const [toastMessage, setToastMessage] = useState("");

  const handleGenerateAnother = () => {
    logEvent({ event: 'post_queue_action', action: 'generate_another', vibeQuery: query });
    router.push('/');
  };

  const handleSameVibe = () => {
    logEvent({ event: 'post_queue_action', action: 'same_vibe', vibeQuery: query });
    router.push(`/results?q=${encodeURIComponent(query)}`);
  };

  const handleVibeShift = () => {
    logEvent({ event: 'post_queue_action', action: 'vibe_shift', vibeQuery: query });
    router.push('/results?q=Surprise me with a completely different vibe');
  };

  const handleSavePlaylist = async () => {
    setToastMessage("Saving...");
    try {
      const songs = JSON.parse(sessionStorage.getItem('vibe_queue') || "[]");
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs,
          vibeQuery: query,
          sessionId: getSessionId()
        })
      });
      const data = await res.json();
      if (data.playlistUrl) {
        const url = window.location.origin + data.playlistUrl;
        navigator.clipboard.writeText(url);
        setToastMessage("Saved! Link copied ✦");
        logEvent({ event: 'post_queue_action', action: 'save_playlist', vibeQuery: query });
      } else {
        setToastMessage("Couldn't save playlist right now. Try again.");
      }
    } catch(err) {
      setToastMessage("Couldn't save playlist right now. Try again.");
    }
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <>
      <div className="status-bar">
        <span>10:09</span>
        <span>•••</span>
      </div>

      <header className="gaana-header">
        <div className="gaana-logo">
          <div className="gaana-logo-icon">
            <Music size={14} />
          </div>
          Gaana
        </div>
        <div className="finished-pill">Finished</div>
      </header>

      <main className="complete-main">
        <div className="centered-content">
          <CheckCircle2 size={32} color="#E72C2C" className="check-icon" />
          <h1 className="complete-title">Vibe queue complete</h1>
          <p className="complete-subtitle">
            You listened through all 6 songs for &quot;{query}&quot;
          </p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">6</div>
            <div className="stat-label">songs played</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">28m</div>
            <div className="stat-label">listening time</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">4</div>
            <div className="stat-label">new artists</div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={handleSameVibe}>
            ✦ Same vibe, 6 more songs
          </button>
          <button className="btn-magic" onClick={handleVibeShift}>
            ✨ Vibe Shift: Surprise Me
          </button>
          <button className="btn-ghost" onClick={handleSavePlaylist}>
            Save this queue as playlist
          </button>
        </div>
      </main>

      {toastMessage && (
        <div className="toast">
          {toastMessage}
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

export default function CompletePage() {
  return (
    <Suspense fallback={<div style={{color: 'white', padding: '20px'}}>Loading...</div>}>
      <CompleteContent />
    </Suspense>
  );
}
