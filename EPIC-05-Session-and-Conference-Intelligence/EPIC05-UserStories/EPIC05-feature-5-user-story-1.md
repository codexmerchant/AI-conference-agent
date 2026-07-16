# EPIC05 Feature 5 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-05 — Session Summarization

---

# User Story

As a user,
I want a concise, structured summary of each session I capture,
so that I can quickly recall what was discussed without rereading the full transcript.

---

# Business Value

- Saves substantial review time across a multi-day conference with dozens of captured sessions
- Makes session content accessible to users who couldn't attend a talk in person but captured it via a colleague
- Provides a consistent, scannable format that raw transcripts cannot offer
- Increases the perceived intelligence and value of the product relative to plain recording/transcription

---

# Acceptance Criteria

## Functional Criteria
- A TL;DR and structured key points are generated automatically once the transcript is ready
- Summaries are available in short, medium, and long modes
- Each summary claim is traceable to a source transcript timestamp

## UX Criteria
- Summary tab is the default view when a user opens a completed session
- Length-mode toggle is easy to discover and switch between
- Citation links from summary text jump directly to the corresponding transcript moment

## Technical Criteria
- Summary generation completes within 90 seconds after the transcript is ready for a 60-minute session
- Summary output passes a groundedness check before being shown to the user
- Summaries are versioned so a regeneration does not erase the ability to compare against a prior version

---

# Preconditions

- Session transcript segmentation has completed
- User has access to the session
- Speaker and quote context are available where possible (not strictly required)

---

# Postconditions

- `session_summary` record persisted with TL;DR, key points, and grounding references
- `SessionSummaryGenerated` event emitted for downstream consumers
- Summary tab reflects the generated content on next view

---

# Edge Cases

- Transcript is incomplete due to a connectivity drop during capture
- Session covers several unrelated topics because the agenda changed mid-session
- Non-English session requires translation before summarization
- A very short session (<5 minutes) produces a low-value summary
- Summarization is requested before diarization completes, leaving speaker context incomplete

---

# Telemetry

Track:
- `session_summary_generated`
- `session_summary_viewed`
- `session_summary_length_mode_changed`
- `session_summary_citation_clicked`
- `session_summary_low_groundedness`

---

# Dependencies

- EPIC-02 Transcript Segmentation
- FEATURE-02 Speaker Recognition
- FEATURE-03 Quote Extraction

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a TL;DR and key points are generated correctly for a standard 60-minute session
2. Verify all three length modes (short/medium/long) render distinct, appropriately-scaled content
3. Verify citation links correctly jump to the corresponding transcript timestamp
4. Verify a low-groundedness summary is flagged rather than shown as fully reliable
5. Verify summarization handles a session with an incomplete transcript gracefully
6. Verify summarization produces a reasonable output for a very short session
7. Verify summary generation completes within the 90-second SLA for a standard session
8. Verify a non-English session is correctly translated before summary generation

---

# Story Variation

This is user story variation 1 for Session Summarization, focusing on the happy-path functional experience of reading a structured session recap.

---

# Notes

- Groundedness checking is the primary safeguard against hallucinated summary content and should never be skipped for latency reasons
- Consider showing a lightweight "generating summary" state rather than blocking the whole session view during the 90-second SLA window
