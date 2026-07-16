# FEATURE-04 — Behavioral Coaching

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Generate personalized, actionable coaching recommendations that help users improve how they engage at conferences, drawing on their Conference Score, interaction quality, follow-up completion, and time allocation data.

---

# 2. Problem Statement

Users don't naturally know how to improve their conference performance — they lack an objective coach who can point out patterns like "you talk too much in first meetings" or "you never follow up within 48 hours." Raw scores and dashboards alone don't translate into behavior change.

---

# 3. Feature Overview

Behavioral Coaching synthesizes signals from scoring, interaction quality, follow-up tracking, missed-opportunity detection, and goal tracking into a small set of prioritized, specific recommendations delivered before, during, and after conferences, framed as coaching rather than criticism.

---

# 4. Key Functionalities

## Recommendation generation
Produces a ranked list of behavioral recommendations from aggregated performance signals using an LLM reasoning layer with guardrails.

## Evidence-backed suggestions
Each recommendation cites the specific data points (scores, interactions, patterns) that justify it.

## Contextual delivery timing
Surfaces pre-conference prep tips, in-conference nudges, and post-conference retrospective coaching at appropriate moments.

## Feedback loop
Captures user reactions (helpful/not helpful, dismissed, acted on) to refine future recommendations.

## Recommendation prioritization
Ranks recommendations by expected impact and relevance to the user's stated goals.

---

# 5. Primary Use Cases

## Use Case 1
User receives a post-conference coaching summary highlighting "you completed 40% of follow-ups within 48h vs. your 70% average — consider batching follow-ups the evening of each day."

## Use Case 2
Before a conference, user receives a prep tip based on past behavior: "You tend to skip networking breaks — block 30 minutes on your calendar."

## Use Case 3
User dismisses a recommendation as not applicable, and the system deprioritizes similar recommendations going forward.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want specific, evidence-backed coaching recommendations after each conference,
so that I can improve my performance at the next one.

### Acceptance Criteria
- User receives 3-5 prioritized recommendations within 24 hours of conference end
- Each recommendation links to the underlying evidence (scores, interactions, patterns)
- User can mark a recommendation as helpful, not helpful, or acted on

## User Story 2
As a returning user,
I want coaching recommendations to adapt based on my feedback and progress,
so that I'm not shown the same advice repeatedly if I've already addressed it.

### Acceptance Criteria
- Recommendations the user marks "acted on" are not repeated verbatim in subsequent conferences
- Recommendation relevance improves measurably (tracked via feedback rate) over 3+ conferences
- User can view a history of past recommendations and their outcomes

---

# 7. User Workflow

1. Conference Score, interaction quality, follow-up completion, time allocation, and missed-opportunity data are aggregated
2. Coaching engine identifies patterns and gaps against the user's goals and historical baseline
3. LLM reasoning layer drafts candidate recommendations with supporting evidence
4. Guardrail/ranking layer filters and prioritizes the top 3-5 recommendations
5. Recommendations are delivered via the appropriate channel (in-app summary, notification, email digest)
6. User reviews each recommendation and provides feedback or marks it acted on
7. Feedback is stored and factored into future recommendation generation

---

# 8. UI / UX Requirements

- Coaching summary card with 3-5 prioritized recommendations, each with a one-line "why"
- Expandable evidence view per recommendation
- Helpful/not-helpful and "mark as acted on" controls
- Tone calibrated as constructive coaching, never punitive or shaming language
- History view of past recommendations and outcomes

---

# 9. Technical Requirements

## Frontend
Coaching summary and history views render recommendation cards with evidence drill-down and feedback controls, delivered through in-app, push, and email digest surfaces.

## Backend
A coaching orchestration service aggregates inputs from scoring, interaction quality, follow-up, time allocation, and missed-opportunity services, invokes the recommendation generation pipeline, persists CoachingRecommendation records, and manages delivery scheduling.

## AI/ML
An LLM-based recommendation generator drafts candidate coaching text grounded in structured evidence (not free hallucination), passed through a guardrail layer that enforces tone, factual grounding to cited evidence, non-repetition, and goal-conflict checks before ranking and delivery.

## Infrastructure
Batch generation job triggered post-conference; on-demand generation endpoint for pre-conference prep; feedback events stored for periodic model/prompt tuning.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Conference Scoring (Feature 1) | Source composite and sub-scores as coaching evidence |
| Interaction Quality Analysis (Feature 2) | Source interaction-level patterns |
| Follow-up Completion Tracking (Feature 3) | Source execution-gap evidence |
| Missed Opportunity Detection (Feature 5) | Source missed-opportunity evidence |
| Goal Tracking (Feature 7) | Source goal-relevance context for recommendations |
| Notification Service | Deliver coaching summaries and nudges |
| GET /users/{id}/coaching-recommendations | Retrieve current recommendations |
| POST /coaching/recommendations | Generate recommendations on-demand |
| POST /coaching/recommendations/{id}/feedback | Submit helpful/not-helpful/acted-on feedback |
| PATCH /coaching/recommendations/{id}/dismiss | Dismiss a recommendation |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| CoachingRecommendation | recommendation_id, user_id, conference_id, category (behavioral, missed_opportunity, time_allocation, goal), recommendation_text, priority_rank, supporting_evidence_refs, delivery_channel, delivered_at, status (active, dismissed, acted_on), model_version |
| CoachingFeedback | feedback_id, recommendation_id, user_id, feedback_type (helpful, not_helpful, acted_on), comment, submitted_at |

---

# 12. Security & Privacy

- Recommendations and evidence are visible only to the individual user unless explicitly shared with a manager/coach
- LLM prompts exclude other parties' personally identifiable transcript content beyond what's needed for evidence citation
- Coaching feedback data anonymized before use in prompt/model tuning
- Users can opt out of coaching generation entirely without losing scoring/tracking features

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Post-conference recommendation generation latency | <24 hours |
| On-demand pre-conference generation latency | <30 sec |
| Recommendation generation success rate | >98% |
| Guardrail rejection rate (ungrounded/off-tone output) | <2% |

---

# 14. Edge Cases

- Insufficient data to generate a meaningful recommendation (first-time user, sparse conference)
- Coaching recommendation conflicts with user's stated goals (e.g., recommends more networking when user's goal was focused learning)
- User consistently dismisses all recommendations, requiring reduced delivery frequency
- Recommendation references evidence that was later deleted or corrected
- LLM produces a recommendation with unsupported/hallucinated claims, caught by guardrail
- Multiple conferences overlap, complicating which data window to coach against

---

# 15. Dependencies

- Conference Scoring, Interaction Quality Analysis, Follow-up Completion Tracking, Missed Opportunity Detection, Goal Tracking (all this epic)
- LLM inference platform with guardrail/grounding tooling
- Notification platform

---

# 16. Risks

- Recommendations feel generic or repetitive, reducing trust and engagement
- Tone missteps land as judgmental, causing user disengagement
- Guardrails insufficiently catch hallucinated evidence citations
- Coaching becomes noise if delivered too frequently without clear value

---

# 17. Telemetry & Analytics

Track:
- `coaching_recommendation_generated`
- `coaching_recommendation_delivered`
- `coaching_recommendation_viewed`
- `coaching_recommendation_feedback_submitted`
- `coaching_recommendation_dismissed`
- `coaching_recommendation_acted_on`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Recommendation "helpful" feedback rate | >60% |
| Recommendation act-on rate | >35% |
| Recommendation repetition rate (same advice 2+ conferences after acted-on) | <10% |
| User opt-out rate | <10% |

---

# 19. Future Enhancements

- Peer-benchmarked coaching ("attendees in similar roles average X follow-up rate")
- Voice-delivered in-conference coaching nudges via wearable/earbuds
- Manager-visible team coaching digest (opt-in)

---

# 20. Open Questions

- Should coaching be always-on by default or opt-in given it's a post-V1 fast-follow?
- How much recommendation history should influence future generations vs. starting fresh each conference?
- Should recommendations ever be delivered in real-time during a conference, or strictly pre/post?
