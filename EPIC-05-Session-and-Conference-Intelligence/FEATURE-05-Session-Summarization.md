# FEATURE-05 — Session Summarization

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Generate a structured, concise summary of each conference session (panel, talk, or presentation) from its transcript and linked artifacts.

---

# 2. Problem Statement

Attendees cannot attend every session and rarely have time to review a full transcript. Existing personal notes lack a consistent structure that supports quick scanning across many sessions.

---

# 3. Feature Overview

An LLM-based summarization pipeline consumes segmented transcript, resolved speakers, quotes, and slide-topic links to produce a structured summary — TL;DR, key points, and per-speaker highlights — for each session, with claims traceable back to source transcript timestamps.

---

# 4. Key Functionalities

## TL;DR Generation
Produce a one-paragraph, high-level summary of the session.

## Structured Key-Point Extraction
Generate a bulleted list of main points in chronological or topical order.

## Speaker Highlight Rollup
Summarize each speaker's individual contribution within the session.

## Multi-Length Summary Modes
Support short, medium, and long summary variants.

## Regeneration on Correction
Re-summarize automatically when upstream transcript or speaker data is corrected.

---

# 5. Primary Use Cases

## Use Case 1
User missed a session and reads the summary instead of the full transcript.

## Use Case 2
User scans summaries across every session attended to write a trip report.

## Use Case 3
User wants a longer, detailed summary for a session directly relevant to their work.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a concise summary of each session I capture,
so that I can quickly recall what was discussed without rereading the transcript.

### Acceptance Criteria
- TL;DR and key points are generated within the defined SLA
- The summary references relevant topics and speakers
- Short, medium, and long summary modes are all available

## User Story 2
As a user preparing a trip report,
I want to export summaries across multiple sessions,
so that I can compile a conference recap quickly.

### Acceptance Criteria
- Bulk export across a selected set of sessions is supported
- Each exported summary includes session metadata (title, date, speakers)
- Export output is usable as both copy/paste text and a downloadable file

---

# 7. User Workflow

1. `TranscriptSegmented`, `SpeakerIdentityResolved`, and `QuotesExtracted` events received (summarization waits on a configurable subset)
2. Summarization worker assembles segmented transcript plus speaker and quote context
3. LLM generates the TL;DR, key points, and speaker highlights
4. Summary is validated against length/format rules and a groundedness/hallucination check
5. Summary is persisted with references to its source segments
6. `SessionSummaryGenerated` event emitted
7. Re-summarization is triggered automatically when an upstream correction event occurs

---

# 8. UI / UX Requirements

- Summary tab as the default view when opening a session
- Expand/collapse control for short/medium/long modes
- Inline citations linking summary claims back to transcript timestamps
- Regenerate control with a last-updated indicator

---

# 9. Technical Requirements

## Frontend
A summary tab, a length-mode toggle, and inline citation links from summary text to transcript timestamps.

## Backend
A summarization orchestration worker, a grounding/citation service, and a listener that triggers regeneration on upstream correction events.

## AI/ML
An LLM summarization pipeline with retrieval-augmented grounding against the segmented transcript, plus a hallucination/groundedness checker.

## Infrastructure
An async job queue for summarization and versioned summary storage to support regeneration history.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/summary | Retrieve a session summary (supports a length parameter) |
| POST /sessions/{id}/summary/regenerate | Force re-summarization |
| GET /sessions/export?ids= | Bulk export summaries across sessions |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| session_summary | id, session_id, transcript_id, version, tldr, key_points, speaker_highlights, length_mode, grounding_refs, generated_at |

---

# 12. Security & Privacy

- Summary access follows the underlying session's visibility permissions
- Grounding references must not expose transcript content beyond the requesting user's access
- LLM prompts exclude PII the requesting user is not already entitled to see

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Summary generation latency | <90 sec after transcript ready (60-min session) |
| Groundedness score | >90% of claims traceable to source transcript |
| Regeneration latency | <60 sec |

---

# 14. Edge Cases

- Transcript is incomplete due to a connectivity loss during capture
- Session covers multiple unrelated topics (agenda changed mid-session)
- Non-English session requires translation before summarization
- Extremely short session (<5 min) yields a low-value summary
- Summarization requested before diarization completes (missing speaker context)
- Conflicting corrections applied while a regeneration is already in progress

---

# 15. Dependencies

- EPIC-02 Transcript Segmentation
- FEATURE-02 Speaker Recognition
- FEATURE-03 Quote Extraction
- LLM inference/orchestration layer

---

# 16. Risks

- Hallucinated summary content misrepresents what was actually said in the session
- Summarization compute cost scales with conference size and needs cost controls

---

# 17. Telemetry & Analytics

Track:
- `session_summary_requested`
- `session_summary_generated`
- `session_summary_regenerated`
- `session_summary_low_groundedness`
- `session_summary_exported`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Summary generation success rate | >98% |
| User satisfaction rating | >4.3/5 |
| Groundedness score | >90% |

---

# 19. Future Enhancements

- Cross-session summary comparing multiple talks on the same topic
- Audio narration of summaries for hands-free review

---

# 20. Open Questions

- What is the acceptable hallucination tolerance before a summary is blocked from display?
- Should summaries auto-regenerate on every minor correction, or batch corrections into a single regeneration?
