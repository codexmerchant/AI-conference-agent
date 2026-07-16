# FEATURE-01 — Meeting Summaries

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Automatically generate a structured summary of each individual interaction (scheduled meeting, booth conversation, hallway chat) immediately after it ends, using the finalized transcript, resolved contact identity, and context tags.

---

# 2. Problem Statement

Attendees have 15-40 short conversations per conference day and cannot reliably recall the substance of each one by evening. Manual note-taking is inconsistent, interrupts the conversation itself, and produces low-fidelity records, which in turn produces generic or missing follow-ups and a knowledge graph with thin, unusable interaction context.

---

# 3. Feature Overview

The Summarization Agent consumes the finalized transcript segment for an interaction (EPIC-02), the resolved contact and company identity (EPIC-06), and interaction/topic tags (EPIC-03), and produces a structured per-interaction summary: key points, sentiment, mentioned topics/companies, and suggested next steps. The summary is attached to the Contact's interaction timeline and becomes the primary input to Follow-Up Drafts (FEATURE-02) and downstream digests.

---

# 4. Key Functionalities

## Transcript-to-summary generation
LLM condenses the diarized transcript segment for a single interaction into 3-6 key-point bullets plus a short narrative paragraph.

## Contact and company linking
Generated summary is automatically attached to the resolved Contact record and appears in that contact's interaction history timeline.

## Confidence and completeness scoring
Each summary carries a confidence score derived from ASR confidence, diarization confidence, and transcript completeness, surfaced to the user before they act on it.

## Manual edit and regeneration
User can edit summary text inline, or trigger a regeneration with adjusted length/tone while the original AI-generated version is retained for audit.

## Topic and entity tagging
Summary is auto-tagged with topics, companies, and mentioned third parties (via the Context Engine) to support later search and filtering across all summaries from a conference.

---

# 5. Primary Use Cases

## Use Case 1
User finishes a 10-minute booth conversation and, two hours later, opens the app to find a ready summary already linked to the new contact.

## Use Case 2
A summary generated from a noisy expo-floor recording is flagged "low confidence"; the user edits the key points before it feeds into a follow-up draft.

## Use Case 3
User searches "edge inference" across all meeting summaries from the conference to recall which contacts discussed that topic.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a structured summary generated automatically after each conversation,
so that I don't have to take manual notes during the interaction.

### Acceptance Criteria
- Summary is generated and attached to the correct resolved contact within the target latency window.
- Summary includes key points, sentiment, and topics without requiring manual input.
- Low-confidence summaries are visibly flagged rather than presented as equally reliable.

## User Story 2
As a returning user reviewing a summary the next day,
I want to edit and regenerate an inaccurate summary,
so that I can correct it before sharing it or basing a follow-up on it.

### Acceptance Criteria
- Inline edits persist and are timestamped with an edit history.
- Regeneration respects any manual edits already applied where possible, or clearly replaces them with a warning.
- The original AI-generated version remains retrievable for audit even after edits.

---

# 7. User Workflow

1. An interaction (meeting, booth chat, hallway conversation) ends or is manually marked as complete.
2. Transcription and diarization finalize for that interaction segment (EPIC-02); contact identity resolves (EPIC-06).
3. Summarization Agent assembles transcript, contact profile, and context tags as generation input.
4. Versioned LLM prompt produces structured JSON (key points, narrative, sentiment, topics, next steps).
5. Summary is persisted as a `MeetingSummary` record and linked to the Contact and Interaction.
6. User receives an in-app card / push notification that the summary is ready.
7. User reviews, edits if needed, and optionally triggers Follow-Up Draft generation directly from the summary.

---

# 8. UI / UX Requirements

- Summary card appears in the contact's interaction timeline with a clear edit affordance.
- Confidence badge (low/medium/high) visible on every summary card.
- One-tap "Generate Follow-up" call-to-action directly from the summary view.
- Inline diff view when a regeneration is requested after manual edits.
- Summaries from the most recent session are cached for offline viewing.

---

# 9. Technical Requirements

## Frontend
A summary card component (SwiftUI on iOS, React on desktop) with an inline rich-text editor, confidence badge, and a diff viewer for comparing regenerated versions against the current edited text.

## Backend
A Summarization Service subscribes to interaction-end events, pulls finalized transcript segments from the EPIC-02 pipeline and resolved identity from EPIC-06, and writes `MeetingSummary` records through an idempotent, interaction-keyed write path to prevent duplicate summaries on event retry.

## AI/ML
A versioned LLM prompt template maps `{transcript, speaker_roles, context_tags}` to a structured JSON summary schema; a lightweight confidence model combines ASR confidence, diarization confidence, and transcript length/gaps into a single completeness score.

## Infrastructure
Generation runs as an async job on a queue (backpressure-aware, autoscaled for expo-floor peak interaction volume) behind a status-polling API so the client is never blocked waiting on LLM latency.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Transcription Service (EPIC-02) | Supplies the finalized, diarized transcript segment for the interaction |
| Identity Resolution (EPIC-06) | Supplies the resolved Contact/Company for the interaction |
| Context Engine (EPIC-03) | Supplies interaction-type and topic tags used in the prompt |
| LLM Inference Gateway | Generates the structured summary text and topic/sentiment extraction |
| Notification Service | Alerts the user when a summary is ready for review |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| MeetingSummary | summary_id, interaction_id, contact_id, conference_id, session_id, transcript_segment_id, key_points (array), narrative_text, sentiment, topics (array), next_steps (array), confidence_score, model_version, prompt_version, status (pending/generated/edited/failed), generated_at, edited_at, edited_by |

---

# 12. Security & Privacy

- Summaries are only generated from interactions recorded with explicit consent (per EPIC-01 recording consent workflow).
- Overheard PII not relevant to the interaction (e.g., a third party's phone number) is redacted before storage unless explicitly tagged by the user.
- Summary access is scoped to the owning user; sharing a summary requires an explicit share action, never implicit exposure.
- Summary content is encrypted at rest and in transit alongside the source transcript.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Summary generation latency (P50) | <30 sec after interaction end |
| Summary generation latency (P99) | <2 min after interaction end |
| Regeneration latency | <15 sec |
| Generation success rate | >98% |

---

# 14. Edge Cases

- Interaction has no clear start/end boundary (continuous multi-person conversation across a booth visit).
- Low-confidence transcript from noisy expo-floor audio.
- Summary generation triggers before contact identity has finished resolving.
- Interaction spans multiple languages within the same transcript segment.
- User manually ends the interaction mid-sentence, truncating the transcript.
- Duplicate summary generation requests from event-delivery retries.

---

# 15. Dependencies

- EPIC-02 transcription and diarization pipeline
- EPIC-03 Context Engine topic/interaction tagging
- EPIC-06 identity resolution and knowledge graph
- LLM inference gateway
- Notification service

---

# 16. Risks

- LLM hallucinates details not present in the source transcript.
- Over-reliance on the summary causes users to lose the nuance of the original conversation.
- Generation latency spikes during high-density interaction periods (expo floor, networking hour).

---

# 17. Telemetry & Analytics

Track:
- `meeting_summary_generated`
- `meeting_summary_generation_failed`
- `meeting_summary_edited`
- `meeting_summary_regenerated`
- `meeting_summary_low_confidence_flagged`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Summary generation success rate | >98% |
| User edit rate (proxy for AI quality) | <20% |
| Time-to-summary (P50) | <30 sec |

---

# 19. Future Enhancements

- Multi-party group-meeting summaries with per-speaker attribution.
- Voice playback of the summary for hands-free review while walking the expo floor.
- Automatic comparison of the AI summary against any manual calendar notes the user took.

---

# 20. Open Questions

- Should summary generation begin before or after the user explicitly confirms the interaction boundary?
- How long should a low-confidence summary be retained before prompting the user to discard or manually rewrite it?
- Should users be able to set a default summary length/tone preference that applies across all future summaries?
