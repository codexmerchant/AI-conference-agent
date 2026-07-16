# EPIC05 Feature 1 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-01 — Panel Mode Analysis

---

# User Story

As a user,
I want the panel transcript automatically organized by panelist role and Q&A boundary,
so that I can quickly find each panelist's contributions and locate the audience Q&A without scrubbing the full recording.

---

# Business Value

- Turns an undifferentiated panel transcript into a navigable, role-structured artifact
- Reduces time spent reviewing panel sessions after the conference ends
- Surfaces talk-time balance across panelists, adding analytical value beyond raw transcription
- Increases engagement with captured panel content by making it scannable, not just searchable

---

# Acceptance Criteria

## Functional Criteria
- Each transcript segment is labeled with a role (moderator, panelist, or audience)
- The Q&A boundary is detected and clearly separated from prepared discussion
- Panelist talk-time percentages are computed and displayed accurately

## UX Criteria
- Panel view groups segments by panelist with name/avatar once identity is resolved
- Q&A section is visually distinct and collapsible
- Talk-time chart renders without noticeable delay after the panel view loads

## Technical Criteria
- Panel analysis completes within 60 seconds of `DiarizationCompleted` for a 60-minute session
- API responses return deterministic status codes (200, 202 while processing, 404, 500)
- Panel analysis results are versioned so reanalysis does not silently overwrite prior state without a record

---

# Preconditions

- Session transcript has completed speaker diarization
- Session is classified or self-identified as a panel format
- User has access to the session

---

# Postconditions

- `panel_analysis` record persisted with role labels, Q&A boundary, and talk-time metrics
- `PanelAnalysisCompleted` event emitted for downstream consumers (summarization, insights)
- Panel view is available to the user with grouped, navigable content

---

# Edge Cases

- Session mislabeled as a panel when it is actually a single-speaker talk
- Moderator also functions as an active panelist for part of the discussion
- No verbal cue signals the start of Q&A
- More than 6 panelists causes label churn in role classification
- Audience questions are too quiet or overlapping to transcribe accurately

---

# Telemetry

Track:
- `panel_analysis_started`
- `panel_analysis_completed`
- `panel_view_opened`
- `panelist_talk_time_viewed`
- `qa_section_expanded`

---

# Dependencies

- EPIC-02 Speaker Diarization
- EPIC-02 Transcript Segmentation
- Session metadata / panelist roster ingestion

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify role labels are correctly applied for a standard 3-panelist + moderator session
2. Verify Q&A boundary is detected when a clear transition phrase is used
3. Verify Q&A boundary detection gracefully degrades when no clear phrase is present
4. Verify talk-time percentages sum to 100% and match ground-truth timing within tolerance
5. Verify panel view renders correctly for a single-panelist fireside chat (no false panel structure)
6. Verify panel view updates after a diarization correction changes speaker count
7. Verify panel view handles a session with more than 6 panelists without UI breakage
8. Verify accessibility of the panel view grouping and Q&A toggle controls

---

# Story Variation

This is user story variation 1 for Panel Mode Analysis, focusing on the happy-path functional experience of a conference attendee reviewing a structured panel transcript.

---

# Notes

- Role classification accuracy directly affects trust in downstream features like talk-time analytics and Speaker Recognition handoff
- Consider allowing users to manually correct a mislabeled role, feeding back into future classification tuning
