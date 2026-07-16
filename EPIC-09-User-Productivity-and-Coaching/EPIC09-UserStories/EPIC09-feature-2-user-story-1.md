# EPIC09 Feature 2 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-02 — Interaction Quality Analysis

---

# User Story

As a user,
I want each captured interaction scored for quality (depth, reciprocity, sentiment, relevance),
so that I know which conversations deserve prioritized follow-up.

---

# Business Value

- Helps users triage dozens of captured interactions down to the ones that matter most
- Surfaces relationship-strengthening or relationship-weakening patterns with recurring contacts
- Improves follow-up prioritization, increasing the odds valuable connections aren't lost
- Feeds a concrete, evidence-backed signal into the User Score and coaching engine

---

# Acceptance Criteria

## Functional Criteria
- Every interaction with a transcript of sufficient length receives a quality score within 5 minutes of capture completing
- Score breakdown includes depth, reciprocity, sentiment, and relevance components, each independently viewable
- Interactions list supports sorting and filtering by quality score
- Scores are recomputed automatically if the underlying transcript is corrected

## UX Criteria
- Quality badge appears on each interaction card with a plain-language label (e.g., "High depth")
- Expandable breakdown explains each component score in non-technical terms
- Per-contact quality trend is visible on the contact's interaction history timeline

## Technical Criteria
- `GET /interactions/{id}/quality` returns deterministic status codes and includes `model_version`
- Scoring pipeline processes interactions asynchronously without blocking capture completion
- Component scores and talk-time ratio are persisted with the interaction record

---

# Preconditions

- Interaction has been captured with a transcript of sufficient length for analysis
- Speaker diarization has completed for the interaction (EPIC-02 dependency)
- User is authenticated and owns or has access to the interaction

---

# Postconditions

- InteractionQualityRecord is persisted with all component scores
- Score is visible in the interaction detail view and contact timeline
- `interaction_quality_scored` telemetry event recorded
- Score is available as input to Conference Scoring (Feature 1) and Behavioral Coaching (Feature 4)

---

# Edge Cases

- Interaction captured as photo/notes only, with no transcript available for scoring
- Very short interaction (under 30 seconds) with insufficient signal for a reliable score
- Multi-party group conversation where turn attribution is ambiguous
- Transcript in a non-primary or code-switched language, reducing model confidence
- Diarization misattributes speaker turns, skewing the reciprocity component
- User disagrees with a score and wants to flag it as inaccurate

---

# Telemetry

Track:
- `interaction_quality_scored`
- `interaction_quality_recompute_requested`
- `interaction_quality_score_viewed`
- `interaction_list_sorted_by_quality`
- `interaction_quality_low_confidence_flagged`

---

# Dependencies

- Streaming Transcription & Speaker Diarization (EPIC-02, Features 2-3)
- Contact & Relationship Intelligence (EPIC-04)
- Conference Scoring (Feature 1, this epic)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a standard interaction with a full transcript is scored within the 5-minute SLA
2. Verify component score breakdown renders correctly in the interaction detail view
3. Verify sort/filter by quality score works correctly on the interactions list
4. Verify recomputation triggers when a transcript correction is submitted
5. Verify a photo/notes-only interaction is handled gracefully with no score or a clearly labeled "not scored" state
6. Verify a very short interaction is flagged as low-confidence rather than silently scored
7. Verify per-contact quality trend reflects historical scores accurately
8. Verify scoring does not block or delay capture completion for the user

---

# Story Variation

This is user story variation 1 for Interaction Quality Analysis, focusing on the happy-path user experience of viewing and using interaction-level quality scores.

---

# Notes

- Scoring must run asynchronously — never make the user wait on the capture flow for quality analysis to finish
- Plain-language labels matter more than raw numeric scores for user trust and comprehension
- Consider a "why this score" explainer the first time a user expands a breakdown
