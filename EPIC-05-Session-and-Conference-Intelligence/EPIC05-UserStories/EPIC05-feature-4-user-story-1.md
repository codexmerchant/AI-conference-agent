# EPIC05 Feature 4 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-04 — Slide-to-Topic Linking

---

# User Story

As a user,
I want each captured slide linked to the moment in the talk when it was discussed,
so that I can review the visual and the narration together instead of scrubbing audio and images separately.

---

# Business Value

- Turns two disconnected capture streams (slides and transcript) into a single, coherent review experience
- Increases the recall value of captured slides by giving them spoken context
- Reduces time spent manually matching a screenshot to the point in the talk it belongs to
- Strengthens the case for capturing slides at all, since they become genuinely more useful when linked

---

# Acceptance Criteria

## Functional Criteria
- Each slide is matched to its most likely transcript segment using timestamp proximity and semantic similarity
- Slides with no confident match are flagged as orphaned rather than force-matched
- The matched segment's topic label propagates to the slide

## UX Criteria
- Tapping a slide jumps the transcript view to the linked timestamp
- Tapping a transcript segment highlights the currently associated slide
- Orphaned slides are visually distinguishable with a manual-link option

## Technical Criteria
- Linking completes within 30 seconds after both slide extraction and transcript segmentation are available
- `match_confidence` and `match_method` are stored for every link
- Manual corrections to a link are persisted and do not get silently overwritten by a later automatic relink

---

# Preconditions

- Slide extraction and OCR have completed for the session
- Transcript segmentation has completed for the session
- User has access to the session

---

# Postconditions

- `slide_topic_link` records persisted for each slide with confidence and method
- `SlideTopicLinked` event emitted for downstream features (Search, Session Summarization)
- Synced slide/transcript viewer is available to the user

---

# Edge Cases

- Speaker discusses a slide slightly before or after it was actually captured
- Several slides are shown in rapid succession during a lightning-round segment
- A recap slide shown again later in the talk creates an ambiguous second match
- No slides exist for an audio-only session
- OCR text is too sparse (image-heavy slide) to support semantic matching

---

# Telemetry

Track:
- `slide_topic_linking_completed`
- `slide_link_viewed`
- `slide_orphaned`
- `slide_link_manually_corrected`
- `slide_link_low_confidence`

---

# Dependencies

- EPIC-02 Slide Extraction
- EPIC-02 OCR Extraction
- EPIC-02 Transcript Segmentation
- EPIC-02 Timestamp Synchronization

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a slide captured at a clear, unambiguous point links to the correct transcript segment
2. Verify a rapid succession of slides is linked without cross-assignment errors
3. Verify an orphaned slide displays the correct "unmatched" indicator and manual-link control
4. Verify a recap slide shown twice links sensibly rather than overwriting the original link
5. Verify the synced viewer correctly jumps transcript position when a slide is tapped
6. Verify the synced viewer correctly highlights the active slide as transcript playback/scroll progresses
7. Verify linking gracefully completes with zero links for an audio-only session
8. Verify manual link corrections persist across a subsequent automatic relink trigger

---

# Story Variation

This is user story variation 1 for Slide-to-Topic Linking, focusing on the happy-path functional experience of reviewing synced slides and narration.

---

# Notes

- Confidence threshold tuning should differ by session type (e.g., workshops with dense slides vs. keynotes with sparse ones)
- Consider surfacing match method (timestamp vs. semantic vs. manual) to help users judge link reliability
