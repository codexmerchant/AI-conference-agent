# FEATURE-04 — Slide-to-Topic Linking

## Epic
EPIC-05 — Session & Conference Intelligence

---

# 1. Objective

Align extracted slide images and their OCR text with the corresponding spoken transcript segments to map each slide to the topic being discussed while it was shown.

---

# 2. Problem Statement

Slides and transcript are captured independently. Without linking, users cannot tell which slide a speaker was referencing at a given moment, or find the slide that matches a topic they remember hearing about.

---

# 3. Feature Overview

Slide-to-Topic Linking uses slide capture timestamps and OCR text (EPIC-02 slide extraction/OCR) together with segmented, timestamp-synced transcript (EPIC-02 transcript segmentation) to compute a time-aligned mapping between slides and spoken topics, combining timestamp proximity with semantic similarity between OCR text and transcript text.

---

# 4. Key Functionalities

## Timestamp-Proximity Matching
Match a slide's capture time to the nearest candidate transcript segment window.

## Semantic Similarity Refinement
Compare OCR text to transcript segment text to validate or improve the timestamp-based match.

## Slide Deck Reconstruction
Order linked slides into a navigable, synced deck-timeline for the session.

## Orphan Slide Handling
Flag slides with no confident transcript match for manual review.

## Topic Label Propagation
Apply the matched transcript segment's topic label to the linked slide.

---

# 5. Primary Use Cases

## Use Case 1
User taps a captured slide and jumps directly to the moment it was discussed.

## Use Case 2
User searches "roadmap" and finds both the transcript segment and the matching slide.

## Use Case 3
User reviews the session as a synced slide-plus-transcript deck after the talk ends.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want each captured slide linked to the part of the talk where it was discussed,
so that I can review visuals and narration together.

### Acceptance Criteria
- Each slide displays a linked transcript excerpt
- Tapping a slide jumps the transcript view to that timestamp
- Slides with no confident match are visually flagged as unmatched

## User Story 2
As a user building session notes,
I want slides automatically grouped by topic,
so that I can quickly locate the visual for a specific idea.

### Acceptance Criteria
- Slides display the propagated `topic_label`
- Slides are sortable and filterable by topic
- Low-confidence links are visually marked for review

---

# 7. User Workflow

1. `SlideExtractionCompleted` and `TranscriptSegmented` events received
2. Linking worker fetches slide timestamps and transcript segment boundaries
3. A timestamp-proximity candidate window is computed per slide
4. OCR text is compared against candidate transcript segment text via embedding similarity
5. The best-match segment is selected and a match confidence is computed
6. The matched segment's topic label is propagated to the slide
7. Orphan slides below the confidence threshold are flagged for manual linking
8. `SlideTopicLinked` event emitted and links persisted

---

# 8. UI / UX Requirements

- Synced slide/transcript viewer with a shared timeline scrubber
- Slide thumbnail strip annotated with topic labels
- "Unmatched" badge on orphan slides with a manual link control
- Tapping a slide jumps the transcript; tapping transcript text highlights the active slide

---

# 9. Technical Requirements

## Frontend
A synced slide/transcript viewer component, a timeline scrubber, and a manual link editor for orphan slides.

## Backend
A linking worker triggered when both upstream pipelines complete, a confidence scoring service, and a manual override API.

## AI/ML
A text embedding similarity model comparing OCR text to transcript text, and a timestamp-window heuristic for candidate selection.

## Infrastructure
Event-driven triggering that waits on both `SlideExtractionCompleted` and `TranscriptSegmented`, plus a reprocessing queue for relinking after upstream corrections.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| GET /sessions/{id}/slide-links | Retrieve the slide-to-transcript link map |
| PATCH /slide-links/{id} | Manually correct a slide-to-segment link |
| POST /sessions/{id}/slide-links/relink | Re-run linking after an upstream correction |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| slide_topic_link | id, session_id, slide_id, transcript_segment_id, topic_label, match_confidence, match_method, created_at |

---

# 12. Security & Privacy

- Slide images inherit the session's existing access/visibility permissions
- Linking introduces no additional PII; OCR text is already governed by EPIC-02 policies
- Manual link corrections are audit logged with the editing user

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Linking latency | <30 sec after both upstream pipelines complete |
| Match accuracy | >85% correct slide-to-topic assignment |
| Orphan slide rate | <10% per session |

---

# 14. Edge Cases

- Speaker discusses a slide before or after it was actually captured (capture lag)
- Multiple slides shown in rapid succession (lightning-round format)
- A recap slide is shown again later, creating a duplicate/ambiguous match
- No slides were captured for an audio-only session
- OCR text too sparse for semantic matching (image-heavy slide)
- Slide link attempted before transcript segmentation has completed

---

# 15. Dependencies

- EPIC-02 Slide Extraction
- EPIC-02 OCR Extraction
- EPIC-02 Transcript Segmentation
- EPIC-02 Timestamp Synchronization

---

# 16. Risks

- Incorrect links could misrepresent what a speaker said about a specific slide
- Rapid slide changes may overwhelm the matching heuristic and degrade accuracy

---

# 17. Telemetry & Analytics

Track:
- `slide_topic_linking_started`
- `slide_topic_linking_completed`
- `slide_orphaned`
- `slide_link_manually_corrected`
- `slide_link_low_confidence`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Match accuracy | >85% |
| Orphan rate | <10% |
| Manual correction rate | <15% |

---

# 19. Future Enhancements

- Auto-detect slide re-shows and link them to every relevant discussion instance, not just the first
- Visual similarity clustering to detect near-duplicate slides across sessions

---

# 20. Open Questions

- Should recap/repeated slides link to every discussion instance or only the first occurrence?
- How should the auto-link confidence threshold be tuned per session type (workshop vs. keynote)?
