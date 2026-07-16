# EPIC09 Feature 4 User Story 1

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-04 — Behavioral Coaching

---

# User Story

As a user,
I want specific, evidence-backed coaching recommendations after each conference,
so that I can improve my performance at the next one instead of guessing what to change.

---

# Business Value

- Turns raw scores and analytics into concrete, actionable behavior change
- Increases the perceived value of the app beyond passive capture into active improvement
- Builds a compounding feedback loop where users get measurably better across conferences
- Differentiates the product from simple note-taking/CRM tools with genuine coaching value

---

# Acceptance Criteria

## Functional Criteria
- User receives 3-5 prioritized coaching recommendations within 24 hours of conference end
- Each recommendation cites the specific evidence (scores, interactions, patterns) that justifies it
- Recommendations are generated only from grounded evidence — no unsupported claims
- User can request on-demand pre-conference prep recommendations

## UX Criteria
- Coaching summary card presents recommendations with a one-line "why" and expandable evidence detail
- Tone is constructive and coaching-oriented, never punitive or shaming
- User can mark each recommendation as helpful, not helpful, or acted on

## Technical Criteria
- `GET /users/{id}/coaching-recommendations` returns deterministic status codes and recommendation metadata
- Recommendation generation completes within 24 hours post-conference, or 30 seconds for on-demand pre-conference requests
- Guardrail layer rejects ungrounded or off-tone recommendations before delivery

---

# Preconditions

- User has sufficient scoring, interaction quality, follow-up, or time-allocation data from at least one conference
- User has not opted out of coaching generation
- Underlying signal features (Conference Scoring, Interaction Quality, Follow-up Tracking) have completed processing

---

# Postconditions

- CoachingRecommendation records persisted with supporting evidence references
- Recommendations delivered via the appropriate channel (in-app, push, email digest)
- `coaching_recommendation_delivered` telemetry event recorded
- User feedback (if given) stored and available for future recommendation tuning

---

# Edge Cases

- First-time user with insufficient historical data to generate a meaningful recommendation
- Recommendation would conflict with the user's stated goal (e.g., suggesting more networking when the goal was focused learning)
- User dismisses every recommendation delivered, requiring reduced future delivery frequency
- Evidence underlying a recommendation is later deleted or corrected, invalidating the citation
- Multiple overlapping conferences complicate which data window the recommendation should draw from
- LLM-generated recommendation text is flagged by the guardrail layer as unsupported and must be regenerated or suppressed

---

# Telemetry

Track:
- `coaching_recommendation_generated`
- `coaching_recommendation_delivered`
- `coaching_recommendation_viewed`
- `coaching_recommendation_feedback_submitted`
- `coaching_recommendation_acted_on`
- `coaching_prep_requested`

---

# Dependencies

- Conference Scoring, Interaction Quality Analysis, Follow-up Completion Tracking, Missed Opportunity Detection, Goal Tracking (all this epic)
- LLM inference platform with grounding/guardrail tooling
- Notification platform

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify 3-5 recommendations are generated and delivered within 24 hours of conference end
2. Verify each recommendation includes a citable evidence reference
3. Verify recommendations are withheld or clearly caveated when underlying data is insufficient
4. Verify user feedback (helpful/not helpful/acted on) is captured and persisted correctly
5. Verify on-demand pre-conference recommendation generation completes within 30 seconds
6. Verify guardrail layer rejects a recommendation with unsupported claims before delivery
7. Verify tone review passes for a sample of generated recommendations (no punitive language)
8. Verify recommendations correctly avoid contradicting the user's active stated goals

---

# Story Variation

This is user story variation 1 for Behavioral Coaching, focusing on the happy-path user experience of receiving and acting on coaching recommendations.

---

# Notes

- This feature is a post-V1 fast-follow per PRD §9 — plan the launch behind an opt-in flag rather than assuming universal rollout
- Recommendation quality will make or break trust in this feature faster than any other in the epic; favor fewer, higher-confidence recommendations over volume
- Consider a lightweight "why am I seeing this" explainer tied to the guardrail's grounding evidence
