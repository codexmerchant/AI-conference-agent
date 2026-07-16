# EPIC05 Feature 3 User Story 1

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-03 — Quote Extraction

---

# User Story

As a user,
I want the app to automatically surface the most notable quotes from a session,
so that I can quickly find and share standout statements without rereading the entire transcript.

---

# Business Value

- Saves significant review time by surfacing the most shareable moments automatically
- Increases the likelihood that captured content gets reshared, extending the platform's reach
- Gives every session a lightweight, skimmable highlight reel beyond the full transcript
- Encourages continued use of Conference Mode by rewarding capture with tangible, shareable output

---

# Acceptance Criteria

## Functional Criteria
- Top-ranked quotes are generated automatically once transcript segmentation completes
- Each quote includes speaker attribution, timestamp, and surrounding context
- Near-duplicate quotes expressing the same point are filtered before display

## UX Criteria
- Quotes tab is easy to find within the session view
- Tapping a quote highlights it in context within the full transcript
- Sharing a quote takes no more than two taps from the quotes tab

## Technical Criteria
- Extraction completes within 45 seconds of segmentation for a 60-minute session
- Quote records store `quotability_score` for ranking and future re-ranking
- Exported quote cards render correctly across supported share formats (image and text)

---

# Preconditions

- Session transcript has completed segmentation
- User has access to the session
- Speaker attribution (resolved or diarized) is available

---

# Postconditions

- `quote` records persisted with score, attribution, and context
- `QuotesExtracted` event emitted for downstream features (Session Summarization, Search)
- Quotes tab is populated and ready for user review

---

# Edge Cases

- A strong quote spans a moment of cross-talk or interruption
- The speaker's tone was sarcastic, and the quote reads misleadingly out of context
- Session is very short and produces no strong quote candidates
- Speaker explicitly asks to go "off the record"
- User manually bookmarks a quote whose timestamp drifts slightly due to capture lag

---

# Telemetry

Track:
- `quote_extraction_completed`
- `quote_viewed`
- `quote_shared`
- `quote_bookmarked_manually`
- `quote_flagged_incorrect`

---

# Dependencies

- EPIC-02 Transcript Segmentation
- EPIC-02 Speaker Diarization
- FEATURE-02 Speaker Recognition

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify top quotes are generated and ranked correctly for a standard keynote transcript
2. Verify near-duplicate quotes are filtered from the final result set
3. Verify quote cards display correct speaker attribution when identity is resolved
4. Verify quote cards fall back to a neutral label when speaker identity is unresolved
5. Verify tapping a quote correctly highlights it within the full transcript
6. Verify manual bookmarking captures the correct timestamp within acceptable drift tolerance
7. Verify export produces a correctly formatted shareable card in both image and text formats
8. Verify extraction gracefully returns an empty state for a very short session with no strong candidates

---

# Story Variation

This is user story variation 1 for Quote Extraction, focusing on the happy-path functional experience of discovering and sharing notable quotes.

---

# Notes

- Quote quality perception is highly subjective; track user accept/reject signals to continuously tune the scoring model
- Coordinate closely with Speaker Recognition so quote attribution improves as identity resolution improves
