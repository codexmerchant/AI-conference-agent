# EPIC14 Feature 1 User Story 1

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-01 — Transcript Review Workspace

---

# User Story

As a user,
I want to review and correct my session transcripts alongside synchronized audio playback on my Mac,
so that my conference reports and contact notes are built on accurate source material.

---

# Business Value

- Improves accuracy of downstream summaries, contact notes, and knowledge graph data
- Reduces trust erosion caused by AI transcription/diarization errors reaching final outputs
- Gives users a fast, desktop-scale way to fix errors mobile screens can't support
- Captures human corrections as quality signal for the transcription pipeline

---

# Acceptance Criteria

## Functional Criteria

- User can open any completed session transcript and see segments with timestamps and speaker labels
- User can edit segment text inline and the edit saves without a manual "save" step
- User can reassign or merge speaker labels across one or more segments
- Original AI-generated text remains retrievable after an edit via a diff view
- Marking a transcript "Reviewed" updates its status visibly across the app

## UX Criteria

- Clicking a segment seeks the audio player to that exact timestamp
- Playback auto-scrolls the transcript to keep the active segment in view
- Edited segments are visually distinguished from unedited ones

## Technical Criteria

- Segment edits are persisted via `PATCH /desktop/transcripts/{session_id}/segments/{segment_id}`
- Edits are attributed to the editing user with a timestamp
- Autosave completes within 500 ms under normal network conditions

---

# Preconditions

- User is authenticated and owns or has access to the conference session
- Transcript processing has completed for the session
- Audio file is available in object storage for streaming

---

# Postconditions

- Segment edits are persisted with full original-text history retained
- Transcript review status reflects the user's latest action
- Corrected segments are available to downstream summarization and graph updates

---

# Edge Cases

- User opens a transcript that is still mid-processing and only partially available
- Segment spans a cross-talk moment with two overlapping speakers
- Audio file fails to load while transcript text is otherwise available
- User edits a segment that was also just corrected via mobile quick-tag
- Very long session (3+ hours) requires paginated segment loading without breaking playback sync
- Network drop mid-edit leaves an unsynced local change

---

# Telemetry

Track:
- `transcript_review_opened`
- `segment_edited`
- `speaker_relabeled`
- `transcript_marked_reviewed`
- `audio_playback_seek`

---

# Dependencies

- EPIC-02 AI Transcription & Media Pipeline (source transcript and audio)
- EPIC-05 Session & Conference Intelligence (segment confidence scores)
- Desktop authentication and sync service

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify segment text edit saves and displays correctly
2. Verify speaker relabel applies across all selected segments
3. Verify clicking a segment seeks audio to the correct timestamp
4. Verify diff view shows original vs. edited text
5. Verify "Reviewed" status updates and persists across app restarts
6. Verify long session transcript paginates without losing scroll/playback sync
7. Verify edit made while transcript is still processing is handled gracefully
8. Verify autosave behavior under simulated network latency

---

# Story Variation

This is user story variation 1 for Transcript Review Workspace, focusing on the happy-path functional experience of reviewing and correcting a transcript.

---

# Notes

- Corrections should be visually distinct from AI-original text to build user trust in what's been verified
- Consider surfacing an edit-count badge per transcript to signal review completeness at a glance
