export async function logEvent(eventData) {
  try {
    let sessionId = getSessionId();
    
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...eventData, sessionId })
    });
  } catch (error) {
    // Non-blocking logging per EdgeCases.md
    console.error("Failed to log event", error);
  }
}

export function getSessionId() {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('vibe_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('vibe_session_id', sessionId);
    }
    return sessionId;
  }
  return null;
}
