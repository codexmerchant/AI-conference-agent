# FEATURE-01 — Transcript Review Workspace

## Epic
EPIC-14 — Desktop Analysis Workspace

---

# 1. Objective

Give users a desktop-optimized environment to review, correct, and annotate session and interaction transcripts produced by the transcription and session-intelligence pipelines before those transcripts feed reports and the knowledge graph.

---

# 2. Problem Statement

Mobile-captured audio yields transcripts with diarization errors, misheard terms, and low-confidence segments; there is no focused desktop surface for a user to efficiently verify and correct a full transcript against its audio, so uncorrected errors propagate into summaries, contact notes, and the graph.

---

# 3. Feature Overview

A synchronized transcript-and-audio review interface where segments are displayed as an editable, timestamped list alongside a waveform scrubber. Users can relabel speakers, edit misrecognized text, flag low-confidence passages, and mark a transcript reviewed, with every change versioned and attributable.

---

# 4. Key Functionalities

## Synchronized audio-transcript playback
Waveform scrubber stays in lockstep with the active transcript segment; clicking a segment seeks the audio, and playback auto-scrolls the transcript.

## Inline speaker relabeling
Users can rename, merge, or reassign speaker labels across one or more segments without leaving the transcript view.

## Segment text correction with history
Any segment's text can be edited in place; the original AI output, editor identity, and timestamp are retained for rollback.

## Low-confidence segment triage
Segments below a confidence threshold are visually flagged and surfaced in a dedicated review queue so users can prioritize likely errors.

## Annotation and highlighting
Users can highlight passages and attach short notes that carry through to downstream summarization as source references.

---

# 5. Primary Use Cases

## Use Case 1
User reviews yesterday's panel transcript on the desktop app and corrects three misattributed speaker segments before the session summary is finalized.

## Use Case 2
User works through the low-confidence queue for a noisy expo-floor recording, confirming or correcting each flagged segment in sequence.

## Use Case 3
User jumps directly to the timestamp behind a quote cited in a draft report to verify the transcript matches what was actually said.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to review and correct my session transcripts on my Mac,
so that my reports and contact notes are built on accurate source material.

### Acceptance Criteria
- User can open any completed transcript and edit segment text or speaker labels inline.
- Edits are saved automatically and reflected immediately in the transcript view.
- Original AI-generated text remains recoverable after an edit.

## User Story 2
As a power user,
I want a queue of only the low-confidence transcript segments,
so that I can focus my review time on the parts most likely to be wrong.

### Acceptance Criteria
- Segments below the configured confidence threshold are listed in a dedicated queue view.
- Confirming a segment as correct clears it from the queue and records the confirmation.
- Queue updates in real time as new transcripts complete processing.

---

# 7. User Workflow

1. User opens a conference from the desktop dashboard and selects a session.
2. Transcript Review Workspace loads the segment list and streams the associated audio.
3. User plays back audio or jumps to flagged low-confidence segments.
4. User edits segment text and/or reassigns speaker labels as needed.
5. Changes autosave with edit attribution and a diff against the original AI output.
6. User marks the transcript "Reviewed" once satisfied.
7. Reviewed status and any corrections propagate to session summarization and the knowledge graph.

---

# 8. UI / UX Requirements

- Split-pane layout: segment list/editor on one side, waveform and playback controls on the other.
- Visual confidence indicator (color-coded) per segment.
- Keyboard shortcuts for play/pause, next/previous segment, and next low-confidence segment.
- Inline diff view toggle showing original vs. edited text.
- Persistent autosave indicator and explicit "Reviewed" action.
- Search-within-transcript field that scrolls to and highlights matches.

---

# 9. Technical Requirements

## Frontend
SwiftUI desktop view with an AppKit-backed waveform/audio component for scrub-accurate playback; virtualized list rendering for transcripts exceeding a few thousand segments to keep scrolling smooth.

## Backend
Transcript segments and edit history are served and persisted through desktop-specific read/write endpoints that wrap the same session-intelligence data store used by mobile and reporting, ensuring a single source of truth.

## AI/ML
No new inference is performed in this feature; it consumes existing transcription/diarization confidence scores and, on segment edit, can optionally trigger re-scoring of downstream summaries that cited the corrected passage.

## Infrastructure
Audio is streamed via range-request-capable object storage URLs with local caching so scrubbing does not re-fetch the full file; edit events are queued for sync when offline (see Feature 9).

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /desktop/transcripts/{session_id}` | Fetch full segment list and metadata for a session |
| `PATCH /desktop/transcripts/{session_id}/segments/{segment_id}` | Edit segment text, speaker, or review status |
| `POST /desktop/transcripts/{session_id}/speakers/merge` | Merge two speaker labels across the transcript |
| `GET /desktop/transcripts/{session_id}/audio-stream` | Range-request audio stream for playback |
| Session Intelligence Service (EPIC-05) | Source of transcript segments and confidence scores |
| Knowledge Graph Service (EPIC-06) | Receives propagated corrections affecting linked entities |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| TranscriptSegment | id, session_id, speaker_id, start_ms, end_ms, text, original_text, confidence_score, edited_by, edited_at, review_status |
| TranscriptReviewSession | id, user_id, session_id, cursor_position_ms, opened_at, closed_at, segments_reviewed_count |
| SpeakerLabel | id, session_id, display_name, merged_into_id, contact_id |

---

# 12. Security & Privacy

- Audio streams are served via short-lived signed URLs, never permanent public links.
- Segment edits require an authenticated session and are attributed to the editing user.
- Local audio/transcript caches on disk are encrypted at rest using the device keychain.
- Edit history is retained for audit but excluded from any export unless explicitly requested.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Transcript load time (60-minute session) | <1.5 sec |
| Waveform scrub-to-audio latency | <100 ms |
| Autosave round-trip | <500 ms |
| Low-confidence queue refresh | <1 sec |

---

# 14. Edge Cases

- More than 30% of a transcript falls below the confidence threshold, overwhelming the review queue.
- Overlapping speaker segments from cross-talk that don't map cleanly to a single speaker label.
- User opens a transcript that is still being processed by the transcription pipeline.
- Session exceeds 3 hours, requiring segment pagination without breaking playback sync.
- A quick-tag edit from the mobile app arrives for the same segment while it's open for desktop review.
- Underlying audio file is missing or corrupted, but transcript text still exists.

---

# 15. Dependencies

- EPIC-02 AI Transcription & Media Pipeline (source transcripts and audio)
- EPIC-05 Session & Conference Intelligence (segment confidence, summarization triggers)
- EPIC-06 Knowledge Graph Platform (propagation of corrected speaker/contact links)
- Desktop authentication and sync service
- Object storage with range-request streaming support

---

# 16. Risks

- Manual corrections drifting out of sync with re-run AI transcription if the pipeline reprocesses audio later.
- Large audio files streaming poorly over slow conference-venue Wi-Fi.
- Review queue fatigue on long, noisy multi-day conferences discouraging full review.

---

# 17. Telemetry & Analytics

Track:
- `transcript_review_opened`
- `segment_edited`
- `speaker_relabeled`
- `transcript_marked_reviewed`
- `low_confidence_segment_viewed`
- `low_confidence_segment_confirmed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Transcripts reviewed within 48 hours of capture | >70% |
| Segment correction rate on reviewed transcripts | <15% |
| Average time to review a 30-minute session | <8 min |
| Low-confidence queue clear rate per session | >90% |

---

# 19. Future Enhancements

- AI-suggested corrections presented as one-click accept/reject.
- Real-time multi-user co-review for team-attended sessions.
- Voice-command navigation ("go to next low-confidence segment").

---

# 20. Open Questions

- Should segment edits automatically trigger re-summarization, or queue for user-approved regeneration?
- Should corrections retroactively update the knowledge graph immediately or require a separate confirmation step?
- What confidence threshold should default the low-confidence queue, and should it be user-configurable?
