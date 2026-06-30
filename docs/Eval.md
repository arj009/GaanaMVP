# Gaana Vibe Search — AI Evaluation Framework (Eval.md)

This document outlines how we will evaluate the performance, accuracy, and latency of the AI recommendation pipeline (LLM-as-Recommender + Pinecone Vector DB + iTunes Audio Delivery) across different phases of the project.

**Is this required?** Yes. The core hypothesis of this MVP is that an *AI intent layer* can successfully translate human mood into a structured queue. If the AI hallucinates, provides generic reasons, or ignores the user's constraints, the entire product fails.

---

## Phase 1: Pre-Launch / Prompt Engineering Eval (Manual)

Before launching to users, we need to test the prompts against a matrix of expected inputs to ensure the JSON formatting holds up and the reasoning is sound.

### 1. The Vibe Matrix (Test Cases)
Test the `POST /api/vibe-search` endpoint with these specific queries.

| Test Category | Query Example | Expected AI Behavior | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Highly Specific** | *"raw and emotional but upbeat, not Bollywood"* | Must include "indie/raw" artists, exclude mainstream film tracks. | <ul><li>[ ] No Bollywood playback singers</li><li>[ ] `reason` reflects "raw but upbeat"</li></ul> |
| **Vague/Vibe Only** | *"late night driving in the rain"* | Should extract keywords like "lofi", "chill", "rain", "acoustic". | <ul><li>[ ] Songs have low energy/tempo</li><li>[ ] Tags include "Chill" or "Late Night"</li></ul> |
| **Seed Song (Path B)**| *"More like Tum Hi Ho but faster"* | Should recognize Arijit/romantic style but select higher tempo tracks. | <ul><li>[ ] Extracts "Tum Hi Ho" correctly</li><li>[ ] Finds upbeat romantic tracks</li></ul> |
| **Negative Constraint**| *"Punjabi but NO party songs, just sad"* | Must actively avoid high-energy bangers (AP Dhillon, etc.). | <ul><li>[ ] `reason` acknowledges the constraint</li><li>[ ] Songs are sad/soulful Punjabi</li></ul> |
| **Refinement Loop** | Original: *"Sad indie"* <br> Refinement: *"Actually make it happy"* | Must pivot the mood entirely based on the new context. | <ul><li>[ ] Output mood tags change to happy</li><li>[ ] Previous songs are NOT repeated</li></ul> |

### 2. Output Strictness Eval
- **JSON Integrity:** Does the model *always* return valid JSON? Check for rogue markdown (e.g., ```json) that breaks `JSON.parse()`.
- **Reasoning Syntax:** Does every `reason` field strictly begin with *"Because you want..."* as dictated by the prompt?
- **Tag Count:** Does every song have exactly 3 `mood_tags`?

---

## Phase 2: System Performance Eval (Automated Logging)

Once the app is running, we evaluate the *systemic* performance of the LLM integration.

| Metric | Target | How We Measure | Why It Matters |
| :--- | :--- | :--- | :--- |
| **End-to-End Latency** | < 5.0 seconds | Time from user clicking "Find" to Screen 2 rendering (includes LLM call + 10 iTunes lookups). | Users abandon slow discovery tools. The parallel iTunes enrichment must be fast. |
| **LLM Recommendation Hit Rate** | > 70% | % of LLM-recommended songs that are successfully found on iTunes with valid preview URLs. | If the LLM recommends obscure/fake songs, iTunes won't find them. The LLM recommends 10 to ensure we get at least 6 with audio. |
| **Failover Rate** | < 5% | Log whenever Groq returns a 429 and Gemini is triggered. | Tells us if the Groq free tier is buckling under test traffic. |
| **Pinecone Augmentation Quality** | Subjective | Compare results with and without Pinecone augmentation for the same query. | Validates whether the vector search layer adds meaningful diversity beyond what the LLM already provides. |
| **Song Hallucination Rate** | < 10% | % of LLM-recommended songs that don't exist (verified via iTunes 0-result lookups). | Critical for trust. If the AI invents fake songs, users lose confidence immediately. |

---

## Phase 3: Post-Launch User Behavioral Eval (Hypothesis Validation)

The ultimate evaluation of the AI is whether users actually like and trust its recommendations. We measure this through the Supabase `vibe_logs`.

### 1. The "Trust Deficit" Eval
*Hypothesis: Users don't trust algorithms because they are black boxes.*
* **Metric:** % of users who read the `reason` line and proceed to listen to the song.
* **Metric:** % of completed queues that result in clicking "Save this queue as playlist". (Target: > 15%)

### 2. The "Iterative Refinement" Eval
*Hypothesis: Discovery should be a conversation.*
* **Metric:** % of sessions that include at least one `refined` event.
* **Success Signal:** If > 30% of users use the refine bar on Screen 2 instead of bouncing, it proves the chat-like interface works better than static playlists.

### 3. The "Passive Discovery" Eval
*Hypothesis: Users want to discover passively (hands-free) once they set the intent.*
* **Metric:** Queue completion rate. How many `queue_started` events result in a `queue_completed` event without the user skipping songs?
* **Success Signal:** A high completion rate validates that the LLM's initial 6-song selection was highly accurate to the user's initial prompt.

---

## How to Conduct Evals

1. **Local Dev:** Run the Vibe Matrix tests manually via Postman or the UI during Phase 2 of the build.
2. **Pinecone Validation:** After ingesting the 3 Kaggle datasets (Audio Features, Spotify, Lyrics), run 10 test queries through both the LLM-only and LLM+Pinecone pipelines and compare recommendation quality.
3. **Beta Test (5-10 users):** Monitor the failover rate, iTunes hit rate, and JSON parsing errors closely.
4. **MVP Launch (50+ users):** Pull a CSV from the Supabase `vibe_logs` table and calculate the behavioral metrics (Refinement %, Completion %, Save %).
