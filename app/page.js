"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Home, Library, User, Music, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import "./page.css";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSeedMode, setIsSeedMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [greeting, setGreeting] = useState("Good Day Aunkar ! 👋");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning Aunkar ! 🌅");
    else if (hour < 17) setGreeting("Good Afternoon Aunkar ! ☀️");
    else if (hour < 21) setGreeting("Good Evening Aunkar ! 🌆");
    else setGreeting("Good Night Aunkar ! 🌙");
  }, []);

  const handleFind = () => {
    if (!query.trim()) return;
    router.push(`/results?q=${encodeURIComponent(query)}&mode=${isSeedMode ? 'seed' : 'text'}`);
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Set language to Indian English for better recognition of Hindi/English mix
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    
    recognition.onstart = () => {
      console.log("Mic activated");
      setIsRecording(true);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(prev => prev + (prev ? " " : "") + transcript);
      setIsRecording(false);
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access was blocked! Please click the camera/mic icon in your browser URL bar and 'Allow' access.");
      } else if (event.error === 'no-speech') {
        alert("I didn't hear anything. Please try speaking again.");
      } else {
        alert("Voice error: " + event.error);
      }
      setIsRecording(false);
    };
    
    recognition.onend = () => setIsRecording(false);
    
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  return (
    <>
      <div className="status-bar">
        <span>9:41</span>
        <span>•••</span>
      </div>

      <header className="gaana-header">
        <div className="gaana-logo">
          <div className="gaana-logo-icon">
            <Music size={14} />
          </div>
          Gaana
        </div>
        <div className="header-actions">
          <Search size={20} />
          <Bell size={20} />
        </div>
      </header>

      <div className="greeting">{greeting}</div>

      <main className="main-content">
        <div className="vibe-card">
          <div className="vibe-card-header">
            <div className="flex-col">
              <span className="vibe-card-title">What are you in the mood for?</span>
              <span className="vibe-card-subtitle">Describe a vibe, or start from a song you love</span>
            </div>
            <span className="new-badge">New</span>
          </div>

          <div className="vibe-input-row">
            <input 
              type="text" 
              className="vibe-input" 
              placeholder={isSeedMode ? "e.g. More like Tum Hi Ho but darker..." : "e.g. raw and emotional, not Bollywood..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
            />
            <button className="find-button" onClick={handleFind}>Find ✦</button>
          </div>

          <div className="vibe-chips">
            <button 
              className={`chip ${isSeedMode ? 'active' : ''}`}
              onClick={() => {
                setIsSeedMode(!isSeedMode);
                if (!isSeedMode && query === "") {
                  setQuery("More like ");
                } else if (isSeedMode && query === "More like ") {
                  setQuery("");
                }
              }}
            >
              <Music size={12} className="chip-icon" /> Start from a song
            </button>
            <button className={`chip ${isRecording ? 'recording' : ''}`} onClick={handleVoice}>
              <Mic size={12} className="chip-icon" /> Voice
            </button>
          </div>
        </div>

        <div className="dimmed-sections">
          <div className="section-title">TOP CHARTS</div>
          <div className="pills-scroll">
            {["Hindi Top 50", "Punjabi All Time 50", "English Top 50", "Bollywood Top 50"].map(pill => (
              <span key={pill} className="pill">{pill}</span>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: '20px' }}>MADE FOR YOU</div>
          <div className="grid-2col">
            <div className="grid-card">
              <div className="thumb color-1"></div>
              <div className="flex-col">
                <span className="card-title">Your Daily Mix</span>
                <span className="card-subtitle">Arijit, Jubin, KK</span>
              </div>
            </div>
            <div className="grid-card">
              <div className="thumb color-2"></div>
              <div className="flex-col">
                <span className="card-title">Mood Booster</span>
                <span className="card-subtitle">Based on your taste</span>
              </div>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: '20px' }}>TRENDING SONGS</div>
          <div className="grid-3col">
            {["mahooqa", "sadi sun", "boom shaka", "on the floor", "ban ja tu", "rasputin"].map((song, i) => (
              <div key={song} className="trending-item">
                <div className={`trending-thumb gradient-${(i % 4) + 1}`}></div>
                <span className="trending-title">{song}</span>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: '20px' }}>HITS RELOADED</div>
          <div className="grid-2col">
            <div className="grid-card">
              <div className="thumb color-4"></div>
              <div className="flex-col">
                <span className="card-title">90s Romance</span>
                <span className="card-subtitle">Udit Narayan & Alka</span>
              </div>
            </div>
            <div className="grid-card">
              <div className="thumb color-3"></div>
              <div className="flex-col">
                <span className="card-title">Retro Party</span>
                <span className="card-subtitle">Kishore Kumar Hits</span>
              </div>
            </div>
          </div>
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
