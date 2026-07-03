"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, Home, Library, User, Music, Mic, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { triggerHaptic } from "@/lib/haptics";
import "./page.css";

// Feature Flag: Set to false to revert "Start from a song" to its original text-based behavior
const USE_V2_AUDIO_SEED = true;

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSeedMode, setIsSeedMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [greeting, setGreeting] = useState("Hey, Good Day ! 👋");
  const [currentTime, setCurrentTime] = useState("9:41");
  const [isListening, setIsListening] = useState(false);
  const [listenCountdown, setListenCountdown] = useState(0);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [listenStatus, setListenStatus] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [trendingSongs, setTrendingSongs] = useState(["mahooqa", "sadi sun", "boom shaka", "on the floor", "ban ja tu", "rasputin"]);
  const [hitsReloaded, setHitsReloaded] = useState([
    { title: "90s Romance", subtitle: "Udit Narayan & Alka", color: "color-4" },
    { title: "Retro Party", subtitle: "Kishore Kumar Hits", color: "color-3" }
  ]);
  const [monsoonMagic, setMonsoonMagic] = useState([]);
  const [julyTopArtists, setJulyTopArtists] = useState([]);
  const [hitsByEras, setHitsByEras] = useState([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Hey, Good Morning ! 🌅");
    else if (hour < 17) setGreeting("Hey, Good Afternoon ! ☀️");
    else if (hour < 21) setGreeting("Hey, Good Evening ! 🌆");
    else setGreeting("Hey, Good Night ! 🌙");

    const TRENDING_POOL = ["mahooqa", "sadi sun", "boom shaka", "on the floor", "ban ja tu", "rasputin", "chaleya", "tum hi ho", "kesariya", "jhoome jo pathaan", "apna bana le", "channa mereya", "saami saami", "maan meri jaan", "jalebi baby"];
    const HITS_RELOADED_POOL = [
      { title: "90s Romance", subtitle: "Udit Narayan & Alka", color: "color-4" },
      { title: "Retro Party", subtitle: "Kishore Kumar Hits", color: "color-3" },
      { title: "Sufi Evenings", subtitle: "Nusrat & Rahat", color: "color-1" },
      { title: "Indie Pop", subtitle: "Lucky Ali & Euphoria", color: "color-2" },
      { title: "Classic Duets", subtitle: "Lata & Rafi", color: "color-3" },
      { title: "Golden Era", subtitle: "Mukesh & Asha", color: "color-4" },
    ];
    const MONSOON_POOL = [
      { title: "Rim Jhim gire" },
      { title: "Tip tip barsa" },
      { title: "Baarish" },
      { title: "Bheegi sari" },
      { title: "Tum hi ho" }
    ];
    const JULY_ARTISTS_POOL = [
      { title: "Arijit Singh", image: "https://i.scdn.co/image/ab6761610000e5eb0261696c5df3be99da6ed3f3" },
      { title: "Pritam", image: "https://i.scdn.co/image/ab6761610000e5ebcb6926f44f620555ba444fca" },
      { title: "Taylor Swift", image: "https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0" },
      { title: "Ed Sheeran", image: "https://i.scdn.co/image/ab6761610000e5eb12a2ef08d00dd7451a6dbed6" },
      { title: "Shreya Ghoshal", image: "https://i.scdn.co/image/ab6761610000e5ebf89cf29654159f81df69c3c1" }
    ];
    const ERAS_POOL = [
      { title: "90s Romance", subtitle: "Kumar Sanu" },
      { title: "2000s Pop", subtitle: "Shaan, KK" },
      { title: "80s Disco", subtitle: "Bappi Lahiri" },
      { title: "Classic 70s", subtitle: "Rafi & Kishore" },
      { title: "60s Melodies", subtitle: "Lata Mangeshkar" },
      { title: "2010s Hits", subtitle: "Arijit & Neha" }
    ];

    setTrendingSongs([...TRENDING_POOL].sort(() => 0.5 - Math.random()).slice(0, 6));
    setHitsReloaded([...HITS_RELOADED_POOL].sort(() => 0.5 - Math.random()).slice(0, 2));
    setMonsoonMagic(MONSOON_POOL);
    setJulyTopArtists(JULY_ARTISTS_POOL);
    setHitsByEras([...ERAS_POOL].sort(() => 0.5 - Math.random()).slice(0, 2));

    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${minutes}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  const handleFind = () => {
    if (!query.trim()) return;
    triggerHaptic([30, 50, 30]); // success pattern
    router.push(`/results?q=${encodeURIComponent(query)}&mode=${isSeedMode ? 'seed' : 'text'}`);
  };

  const handleVoice = () => {
    triggerHaptic(50);
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

  const handleSongListen = async () => {
    triggerHaptic(50);
    
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 1. Setup Raw Audio Recorder (For device music fallback)
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      // 2. Setup Speech Recognition (For real-time lyrics)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      let accumulatedText = "";
      let capturedText = "";
      let isCountdownActive = true;

      recognition.onstart = () => {
        setIsListening(true);
        setIsSeedMode(true);
        if (!accumulatedText) setQuery("");
        setListenStatus("🎤 Listening... Sing or play a song");
      };

      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) fullTranscript += event.results[i][0].transcript + ' ';
        let rawText = (accumulatedText + ' ' + fullTranscript).trim();
        capturedText = rawText;
        setQuery(capturedText);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          isCountdownActive = false;
        }
      };

      recognition.onend = () => {
        if (isCountdownActive) {
          accumulatedText = capturedText;
          try { recognition.start(); } catch (e) {}
        }
      };

      // 3. Handle End of 15 Seconds
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
        setListenCountdown(0);

        if (capturedText.trim().length > 5) {
          // Success: We caught decent lyrics via Speech API!
          setListenStatus("Lyrics captured! Tap Find ✦ to discover songs");
          setTimeout(() => setListenStatus(""), 4000);
        } else {
          // Fallback: Speech API failed or only caught noise (likely device music). Use Gemini.
          setIsIdentifying(true);
          setListenStatus("Identifying music...");
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
            });
            reader.readAsDataURL(audioBlob);
            const audioBase64 = await base64Promise;

            const res = await fetch('/api/identify-song', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64, mimeType: 'audio/webm' })
            });
            const data = await res.json();

            if (data.identified && data.song) {
              triggerHaptic([30, 50, 30]);
              setQuery(`${data.song} — ${data.artist}`);
              setListenStatus(`Found: ${data.song} ✓`);
              setTimeout(() => setListenStatus(""), 3000);
            } else if (data.vibe && data.vibe !== 'unclear') {
              setQuery(data.vibe);
              setListenStatus("Couldn't name it exactly, but captured the vibe!");
              setTimeout(() => setListenStatus(""), 3000);
            } else {
              setListenStatus("Couldn't catch that. Try playing louder.");
              setTimeout(() => setListenStatus(""), 4000);
            }
          } catch (err) {
            console.error("Gemini Fallback failed:", err);
            setListenStatus("Couldn't identify. Try again.");
            setTimeout(() => setListenStatus(""), 3000);
          } finally {
            setIsIdentifying(false);
          }
        }
      };

      // Start everything
      mediaRecorder.start();
      recognition.start();

      let countdown = 15;
      setListenCountdown(countdown);
      const countdownInterval = setInterval(() => {
        countdown--;
        setListenCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          isCountdownActive = false;
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
          recognition.stop();
        }
      }, 1000);

    } catch (err) {
      console.error("Mic error:", err);
      alert("Microphone access was blocked or unavailable.");
      setIsListening(false);
    }
  };

  return (
    <>
      <div className="status-bar">
        <span>{currentTime}</span>
        <span>•••</span>
      </div>

      <header className="gaana-header">
        <div className="gaana-logo">
          <div className="gaana-logo-icon">
            <span style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '18px', lineHeight: 1, transform: 'translateY(-2px)', paddingRight: '1px' }}>g</span>
          </div>
          Gaana
        </div>
        <div className="header-actions">
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
            <span className="sparkle-badge">✨ New</span>
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
            {USE_V2_AUDIO_SEED ? (
              <button 
                className={`chip listen-chip ${isSeedMode ? 'active' : ''} ${isListening ? 'listening' : ''} ${isIdentifying ? 'identifying' : ''}`}
                onClick={handleSongListen}
              >
                {isListening ? (
                  <><span className="listen-pulse">●</span> {listenCountdown}s</>
                ) : isIdentifying ? (
                  <><span className="identify-spin">◌</span> Identifying...</>
                ) : (
                  <><Music size={12} className="chip-icon" /> Start from a song</>
                )}
              </button>
            ) : (
              <button 
                className={`chip ${isSeedMode ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic(40);
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
            )}
            <button className={`chip ${isRecording ? 'recording' : ''}`} onClick={handleVoice}>
              <Mic size={12} className="chip-icon" /> Voice
            </button>
          </div>

          {/* Listen status message */}
          {listenStatus && (
            <div className="listen-status">
              {listenStatus}
            </div>
          )}
        </div>

        <div className="dimmed-sections">
          <div className="section-header">
            <span className="section-title">TOP CHARTS</span>
            <button className="section-action pill-btn">View All</button>
          </div>
          <div className="trending-row">
            {["Hindi Top 50", "Punjabi All Time", "English Top 50", "Bollywood Top 50"].map((chart) => (
              <div key={chart} className="trending-item">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(chart)}/200/200`} 
                  alt={chart} 
                  className="trending-thumb" 
                />
                <span className="trending-title">{chart}</span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: '12px' }}>
            <span className="section-title">TRENDING SONGS</span>
            <button className="section-action pill-btn">
              <Play size={8} fill="currentColor" /> Play All
            </button>
          </div>
          <div className="trending-row">
            {trendingSongs.map((song, i) => (
              <div key={`${song}-${i}`} className="trending-item">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(song)}/200/200`} 
                  alt={song} 
                  className="trending-thumb" 
                />
                <span className="trending-title">{song}</span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: '12px' }}>
            <span className="section-title">HITS RELOADED</span>
            <button className="section-action pill-btn">View All</button>
          </div>
          <div className="grid-2col">
            {hitsReloaded.map((hit, i) => (
              <div key={`${hit.title}-${i}`} className="grid-card">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(hit.title)}/100/100`} 
                  alt={hit.title} 
                  className="thumb" 
                  style={{ objectFit: 'cover' }} 
                />
                <div className="flex-col">
                  <span className="card-title">{hit.title}</span>
                  <span className="card-subtitle">{hit.subtitle}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: '12px' }}>
            <span className="section-title">MONSOON MAGIC</span>
            <button className="section-action pill-btn">
              <Play size={8} fill="currentColor" /> Play All
            </button>
          </div>
          <div className="trending-row">
            {monsoonMagic.map((hit, i) => (
              <div key={`${hit.title}-${i}`} className="trending-item">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(hit.title)}/200/200`} 
                  alt={hit.title} 
                  className="trending-thumb" 
                />
                <span className="trending-title">{hit.title}</span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: '12px' }}>
            <span className="section-title">JULY TOP ARTISTS</span>
            <button className="section-action pill-btn">View All</button>
          </div>
          <div className="trending-row">
            {julyTopArtists.map((hit, i) => (
              <div key={`${hit.title}-${i}`} className="trending-item">
                <img 
                  src={hit.image || `https://picsum.photos/seed/${encodeURIComponent(hit.title)}/200/200`} 
                  alt={hit.title} 
                  className="trending-thumb" 
                  style={{ borderRadius: '50%' }}
                />
                <span className="trending-title" style={{ textAlign: 'center' }}>{hit.title}</span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: '12px' }}>
            <span className="section-title">HITS BY ERAS</span>
            <button className="section-action pill-btn">View All</button>
          </div>
          <div className="grid-2col">
            {hitsByEras.map((hit, i) => (
              <div key={`${hit.title}-${i}`} className="grid-card">
                <img 
                  src={`https://picsum.photos/seed/${encodeURIComponent(hit.title)}/100/100`} 
                  alt={hit.title} 
                  className="thumb" 
                  style={{ objectFit: 'cover' }} 
                />
                <div className="flex-col">
                  <span className="card-title">{hit.title}</span>
                  <span className="card-subtitle">{hit.subtitle}</span>
                </div>
              </div>
            ))}
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
          <span>Explore</span>
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
