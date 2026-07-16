# EPIC09 Feature 5 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-05 — Missed Opportunity Detection

---

# User Story

As a user,
I want to be shown specific opportunities I likely missed during a conference,
so that I can course-correct next time and possibly still act on some of them.

---

# Business Value

- Surfaces blind spots users can't see on their own (who they didn't talk to, what they skipped)
- Increases realized ROI from a conference by recovering still-actionable missed opportunities
- Provides concrete, specific evidence for the Behavioral Coaching feature to draw on
- Helps justify future conference attendance by showing what was and wasn't captured

---

# Acceptance Criteria

## Functional Criteria
- Missed opportunities are detected and surfaced within 24 hours of conference end
- Each flagged instance includes its type, related entity, and a confidence score
- Detection covers unengaged high-value contacts, skipped relevant sessions, incomplete conversations, and unactioned introductions
- User can dismiss a flagged instance with a specific reason

## UX Criteria
- Review queue presents each instance with a type icon, confidence indicator, and one-line explanation
- Framing is constructive ("you might have missed...") rather than accusatory
- User can filter the queue by opportunity type
- User can initiate a follow-up directly from a still-actionable flagged instance

## Technical Criteria
- `GET /users/{id}/missed-opportunities` returns deterministic status codes and supports type/status filters
- Detection scan completes within 24 hours of conference end for standard-size conferences
- Confidence threshold is enforced so only sufficiently confident instances surface by default

---

# Preconditions

- Conference has ended or is far enough along for meaningful detection
- User has at least minimal goal, agenda, or contact data available for relevance matching
- Underlying interaction and contact data has completed processing

---

# Postconditions

- MissedOpportunity records persisted with type, confidence, and status
- Confirmed instances feed into Behavioral Coaching (Feature 4) as evidence
- `missed_opportunity_detected` telemetry event recorded
- Actionable instances can trigger a new FollowUpTask (Feature 3) when the user chooses to act

---

# Edge Cases

- Attendee list is unavailable or incomplete, limiting contact-based detection
- User intentionally skipped a session for a valid personal reason that shouldn't read as a "miss"
- Duplicate flags raised for the same underlying missed opportunity across different detection types
- Detected instance is already stale/unactionable by the time it's surfaced to the user
- User has no defined goals, reducing detection precision to generic relevance heuristics
- High-value contact criteria are stale relative to the user's currently active goals

---

# Telemetry

Track:
- `missed_opportunity_detected`
- `missed_opportunity_confirmed`
- `missed_opportunity_dismissed`
- `missed_opportunity_actioned`
- `missed_opportunity_queue_viewed`

---

# Dependencies

- Goal Tracking (Feature 7, this epic)
- Contact & Relationship Intelligence (EPIC-04)
- Context & Intelligence Engine session/agenda data (EPIC-03)
- Follow-up Completion Tracking (Feature 3, this epic)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify an unengaged high-value contact is correctly detected when attendee data is available
2. Verify a skipped relevant session is correctly flagged based on goal/interest matching
3. Verify an incomplete conversation (interest signals with no captured next step) is correctly flagged
4. Verify dismissal with a reason removes the instance from the active queue
5. Verify confidence scoring correctly suppresses low-confidence instances from the default view
6. Verify a user can initiate a follow-up directly from a flagged instance
7. Verify detection scan completes within the 24-hour SLA for a standard conference
8. Verify duplicate flags for the same underlying miss are merged or clearly linked

---

# Story Variation

This is user story variation 1 for Missed Opportunity Detection, focusing on the happy-path user experience of reviewing and acting on flagged missed opportunities.

---

# Notes

- Tone and framing matter enormously here — user testing should specifically probe whether flagged instances feel helpful or invasive
- Detection quality depends heavily on attendee-list availability, which will vary widely by conference/venue
- Consider limiting default queue size to the highest-confidence instances to avoid overwhelming users with marginal flags
