# Gaana Vibe Search — Edge Cases & Error Handling

This document outlines potential edge cases across the user experience, API integrations, and audio playback, along with the planned mitigation strategies for the MVP.

## 1. User Input Edge Cases

| Edge Case | Scenario | Mitigation Strategy |
| :--- | :--- | :--- |
| **Empty Input** | User clicks "Find ✦" without typing anything. | Disable the button or show a subtle validation shake animation. Do not fire the API. |
| **Gibberish / Non-Musical Input** | User types "asdfghjkl" or "I want a pizza". | **LLM Fallback:** Instruct the LLM in the system prompt to return a specific JSON flag or a polite fallback message if the intent cannot be mapped to music. The UI should display: *"I couldn't quite catch a vibe from that. Try describing a mood or naming a song."* |
| **Extremely Long Input** | User pastes an entire paragraph. | **Frontend limit:** Cap the text input `maxLength` to 150 characters to prevent prompt bloat and keep the UI clean. |
| **Unrecognized Seed Song** | User enters an extremely obscure song that iTunes cannot find. | If the iTunes API returns 0 results for the seed song, gracefully fallback to text mode using the user's modifier, or prompt the user: *"We couldn't find that specific song. Try another one or just describe the vibe."* |
| **Voice Input Not Supported** | User is on a browser that doesn't support the Web Speech API (e.g., Firefox without flags). | **Feature Detection:** Check for `window.SpeechRecognition` or `window.webkitSpeechRecognition` on mount. If absent, hide the "🎤 Voice" chip entirely. |
| **Voice Input Denied** | User blocks microphone access. | Catch the `NotAllowedError` and show a temporary toast: *"Microphone access denied. You can still type your vibe."* |

## 2. API & Network Edge Cases

| Edge Case | Scenario | Mitigation Strategy |
| :--- | :--- | :--- |
| **Groq Rate Limit (429)** | High traffic causes Groq API to return HTTP 429. | **Automatic Failover:** Catch the 429 error and transparently retry the request using the Gemini API. The user should not notice the switch. |
| **Both LLMs Fail / Timeout** | Groq and Gemini both fail or take longer than 15 seconds. | **Graceful Failure:** Show an error state on Screen 2 (or a toast on Screen 1) saying: *"Our AI is taking a breather. Please try again in a moment."* |
| **LLM Hallucinated Song** | The LLM recommends a song that doesn't actually exist. | **iTunes Verification:** Each LLM-recommended song is verified against iTunes Search API. Songs not found on iTunes are silently filtered out. The LLM recommends 10 songs, and we only need 6 with valid iTunes matches. |
| **iTunes Lookup Fails / 0 Matches** | The LLM-recommended songs cannot be found on iTunes (artist name mismatch, regional catalog gap). | **Graceful Degradation:** If fewer than 6 songs have iTunes matches, return what we have. If 0 matches, return the LLM recommendations without audio and show a message. |
| **LLM Returns Invalid JSON** | The LLM hallucinates markdown or invalid JSON despite the strict prompt. | **Backend Parsing:** Try to strip markdown fences (e.g., remove \`\`\`json and \`\`\`) before parsing. If `JSON.parse` still fails, fall back to the Gemini failover, or return a generic error. |
| **Pinecone Index Unreachable** | The vector database is down or the API key is expired. | **Non-blocking:** Pinecone is an augmentation layer, not the primary recommender. If Pinecone fails, the LLM-only pipeline still returns high-quality results. Fail silently and log the error. |
| **Pinecone Returns Low-Quality Matches** | The embedding similarity scores are too low (cosine distance > 0.8). | **Threshold Filtering:** Only merge Pinecone results with similarity score above a configurable threshold. Below threshold, discard and rely solely on LLM recommendations. |
| **Supabase Unreachable** | The database is paused or unreachable during a log or save action. | **Non-blocking logging:** Wrap `/api/log` calls in `try/catch` and fail silently. Analytics should not break the core user experience. For playlists, show an error toast: *"Couldn't save playlist right now. Try again."* |

## 3. Audio & Playback Edge Cases

| Edge Case | Scenario | Mitigation Strategy |
| :--- | :--- | :--- |
| **Missing Preview URL** | iTunes returns a track without a `previewUrl`. | **Backend Filter:** The backend must explicitly filter out any candidate tracks from iTunes that do not have a valid `previewUrl` *before* sending the list to the LLM. |
| **Audio Format Unsupported** | Browser cannot play the provided M4A/AAC preview stream. | HTML5 `<audio>` handles standard formats well, but wrap the `play()` promise in a `catch`. If playback fails, skip to the next song automatically. |
| **Autoplay Blocked** | Browser blocks autoplay when "Play as Vibe Queue" is clicked. | Since the user explicitly clicks the button, the browser's autoplay policy should allow it. Ensure the `audio.play()` call happens synchronously within the click event handler. |
| **Network Drop During Queue** | User loses internet connection while a song is playing. | The `<audio>` element will fire an `error` or `stalled` event. Catch this and pause the queue, showing a loading/buffering state or a toast: *"Connection lost. Waiting for network..."* |

## 4. UI & Navigation Edge Cases

| Edge Case | Scenario | Mitigation Strategy |
| :--- | :--- | :--- |
| **Rapid Clicking** | User spam-clicks the "Find ✦" button. | Disable the button and show a loading spinner immediately upon the first click until the API responds. |
| **Back Button Navigation** | User hits the browser back button from Screen 3 to Screen 2. | **State Hydration:** Ensure the React state for Screen 2 (results) is preserved or fetched from Context/URL params so the user doesn't see a blank screen or trigger a new API call unnecessarily. |
| **Invalid Playlist ID** | User visits `/playlist/invalid123`. | **404 State:** Query Supabase; if no playlist is found, render a friendly error screen: *"This vibe queue doesn't exist or has expired. Let's create a new one!"* with a button back to Home. |
