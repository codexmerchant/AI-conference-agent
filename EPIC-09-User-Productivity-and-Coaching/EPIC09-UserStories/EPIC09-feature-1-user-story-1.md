# EPIC09 Feature 1 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-01 — Conference Scoring

---

# User Story

As a user,
I want to see a single Conference Score with a breakdown of content, network, and insight quality,
so that I can quickly judge how valuable a conference was and decide whether to attend it again.

---

# Business Value

- Gives attendees an objective basis for deciding which conferences are worth repeat investment
- Converts scattered capture data (sessions, contacts, notes) into a single digestible outcome measure
- Increases engagement with the app's post-conference summary experience
- Provides a foundation metric that downstream coaching and goal features can reference

---

# Acceptance Criteria

## Functional Criteria
- Conference Score is computed from content quality, network quality, and insight density sub-scores
- Score computation completes within 15 minutes of conference end, or is available on-demand during the event
- Score and sub-scores are persisted with `contributing_factors` and a `model_version`
- Score is recomputable when new captures (notes, contacts, transcripts) are added after initial computation
- Errors during computation are logged with correlation IDs and do not block access to raw captured data

## UX Criteria
- Score card shows the composite score and all three sub-scores at a glance
- Each sub-score is tappable to reveal the specific contributing factors and evidence
- A "provisional" badge is shown while the conference is still in progress; "final" once ended
- Score card loads in under 1 second from the conference summary screen

## Technical Criteria
- `GET /conferences/{id}/score` returns deterministic HTTP status codes (200, 404, 425 for not-yet-computed, 500)
- Score values and contributing factors are encrypted at rest
- All score requests are scoped to conferences the requesting user owns or has been shared
- Score computation events are audit-logged with `user_id`, `conference_id`, and `computed_at`

---

# Preconditions

- User has completed at least one capture (session, note, contact, or transcript) tied to the conference
- User is authenticated with a valid access token
- Conference record exists and is associated with the user
- Underlying session, contact, and transcript services have processed the relevant captures

---

# Postconditions

- ConferenceScore records exist for content_quality, network_quality, insight_density, and composite
- Score is queryable via API and visible in the conference summary UI
- `conference_score_computed` telemetry event recorded
- Score is available as evidence input to Behavioral Coaching (Feature 4)

---

# Edge Cases

- Conference with too few captured interactions to compute a statistically reliable score
- User adds a note or contact after the score was already computed, requiring recomputation
- Conference spans multiple time zones, complicating time-based insight-density calculations
- Two conferences overlap on the calendar, and captures must be correctly attributed to the right one
- Underlying contact or transcript record is deleted after scoring, leaving a dangling evidence reference
- User requests the score before any capture has completed processing

---

# Telemetry

Track:
- `conference_score_computed`
- `conference_score_recompute_requested`
- `conference_score_viewed`
- `conference_score_factor_expanded`
- `conference_score_computation_failed`

---

# Dependencies

- Session & Transcript pipeline (EPIC-02)
- Contact & Relationship Intelligence (EPIC-04)
- Follow-up Completion Tracking (Feature 3, this epic)
- Authentication and identity platform

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify score computes correctly for a conference with rich capture data (sessions, contacts, transcripts)
2. Verify score computes with a clear low-confidence indicator for sparse-data conferences
3. Verify sub-score breakdown displays the correct contributing factors
4. Verify recomputation triggers correctly when a new capture is added post-scoring
5. Verify "provisional" vs "final" badge displays correctly based on conference status
6. Verify API returns 425 when score is requested before computation completes
7. Verify score card loads within the 1-second performance target
8. Verify score data is inaccessible to a user without conference ownership/sharing

---

# Story Variation

This is user story variation 1 for Conference Scoring, focusing on the happy-path user experience of viewing and understanding a composite Conference Score.

---

# Notes

- This score is the anchor metric users are most likely to check first after a conference — treat its clarity and load time as a top UX priority
- Explainability (tap-through to factors) is critical for trust; a black-box score will be dismissed as inaccurate
- Consider a lightweight onboarding tooltip the first time a user sees the score card
