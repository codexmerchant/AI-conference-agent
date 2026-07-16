# FEATURE-01 — Conference Scoring

## Epic
EPIC-09 — User Productivity & Coaching

---

# 1. Objective

Compute a composite Conference Score for each conference a user attends, quantifying the quality of content engaged with, the strength of the network built, and the density of actionable insights captured, so the user has an objective measure of how valuable a conference was for them.

---

# 2. Problem Statement

Attendees leave conferences with a gut feeling about whether the trip was "worth it" but no quantitative way to compare conferences, justify travel budget, or identify which events reliably deliver value. Without a score, poor-ROI conferences keep getting re-booked and high-ROI conferences go unrecognized.

---

# 3. Feature Overview

Conference Scoring aggregates signals from captured sessions, transcripts, notes, contacts met, and follow-up outcomes into three sub-scores — content quality, network quality, insight density — and a weighted composite Conference Score, refreshed as new data arrives during and after the event.

---

# 4. Key Functionalities

## Content quality scoring
Scores the depth and relevance of session/content engagement using transcript coverage, note density, and topic relevance to the user's stated interests.

## Network quality scoring
Scores the caliber and diversity of contacts met using role seniority, company fit, and interaction depth.

## Insight density scoring
Scores the ratio of actionable insights (decisions, ideas, follow-up items) captured per hour attended.

## Composite score computation
Combines the three sub-scores with configurable weights into a single 0-100 Conference Score.

## Score history & trend view
Persists score snapshots so users can compare performance across conferences over time.

---

# 5. Primary Use Cases

## Use Case 1
User finishes a 3-day conference and views a Conference Score breakdown to decide whether to attend next year.

## Use Case 2
User compares Conference Scores across the last 5 conferences to identify which event series delivers the best ROI.

## Use Case 3
Team lead reviews aggregate Conference Scores across attendees to justify travel budget to leadership.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see a single Conference Score with a breakdown by content, network, and insight quality,
so that I can quickly judge how valuable this event was for me.

### Acceptance Criteria
- Score is computed within 15 minutes of conference end (or on-demand during the event)
- Score breakdown shows the three sub-scores and top contributing factors
- Score is re-computable if new captures are added after initial computation

## User Story 2
As a repeat attendee,
I want to compare Conference Scores across multiple past conferences,
so that I can decide which recurring events are worth re-attending.

### Acceptance Criteria
- User can view a trend chart of Conference Scores across their last N conferences
- Comparison view highlights the strongest and weakest sub-score per conference
- Data exports to CSV for offline analysis

---

# 7. User Workflow

1. User completes conference capture (sessions, notes, contacts, transcripts)
2. System aggregates captured artifacts tied to the conference
3. Scoring engine computes content, network, and insight sub-scores
4. Composite Conference Score is calculated and persisted
5. User opens the conference summary and views the score card
6. User drills into a sub-score to see contributing factors
7. User compares the score against prior conferences in trend view

---

# 8. UI / UX Requirements

- Score card with composite score (0-100) and three sub-score gauges
- Tap-through from each sub-score to the underlying evidence (sessions, contacts, notes)
- Trend chart across past conferences
- Clear "provisional" badge while conference is still in progress vs. "final" after end
- Explainability tooltip describing how the score was derived

---

# 9. Technical Requirements

## Frontend
Score card and trend chart components (SwiftUI on mobile, React on desktop) that poll or subscribe to score computation status and render sub-score breakdowns with drill-down navigation.

## Backend
A scoring service that aggregates data from the session, transcript, contact, and follow-up services, computes weighted sub-scores, persists ConferenceScore records, and emits recomputation events when contributing data changes.

## AI/ML
An LLM/heuristic hybrid model scores content relevance and insight density from transcripts and notes; network quality uses a rules-based model over contact metadata (seniority, company match, interaction count) blended with an ML-derived relationship-strength signal.

## Infrastructure
Asynchronous, event-driven recomputation triggered by new captures; scores cached with invalidation on data changes; batch nightly recompute job as a consistency backstop.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Session/Transcript Service | Source content coverage and topic relevance signals |
| Contact & Relationship Service | Source network quality signals (roles, companies, interaction depth) |
| Follow-up Completion Tracking (Feature 3) | Source insight-to-action conversion signals |
| GET /conferences/{id}/score | Retrieve current Conference Score and breakdown |
| POST /scores/recompute | Trigger on-demand score recomputation |
| GET /scores/{score_id}/factors | Retrieve contributing factors behind a score |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ConferenceScore | score_id, user_id, conference_id, score_type (content_quality, network_quality, insight_density, composite), score_value, contributing_factors, computed_at, model_version |
| ScoreFactor | factor_id, score_id, factor_name, factor_weight, factor_value, evidence_reference_id |

---

# 12. Security & Privacy

- Score computations access only conferences owned by or shared with the requesting user
- Contributing factor evidence links respect the same access controls as the underlying artifact
- Score data encrypted at rest; no scoring data shared across organizations without explicit consent
- Aggregate/team-level score views require explicit manager-level authorization

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Score computation latency (post-conference) | <15 min |
| On-demand recompute latency | <30 sec |
| Score card load time | <1 sec |
| Score computation success rate | >99% |

---

# 14. Edge Cases

- Conference with insufficient interaction data to compute a reliable score
- User attends overlapping/concurrent conferences
- Score recomputation triggered mid-edit while user is still adding notes
- Conference spans multiple time zones, skewing time-based factors
- Contact data deleted after score was computed (dangling evidence reference)
- User disputes a low score and requests a manual explanation

---

# 15. Dependencies

- Session & Transcript pipeline (EPIC-02)
- Contact & Relationship Intelligence (EPIC-04)
- Follow-up Completion Tracking (Feature 3, this epic)
- Authentication and identity platform

---

# 16. Risks

- Scoring model perceived as unfair or opaque, eroding trust
- Weighting choices favor quantity of interactions over genuine quality
- Sparse-data conferences produce misleadingly low scores
- Score becomes a vanity metric users try to game rather than a coaching input

---

# 17. Telemetry & Analytics

Track:
- `conference_score_computed`
- `conference_score_recompute_requested`
- `conference_score_viewed`
- `conference_score_factor_expanded`
- `conference_score_comparison_viewed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Score computation success rate | >99% |
| Users viewing score within 24h of conference end | >60% |
| Score-to-recommendation click-through | >30% |
| User-reported score accuracy (survey) | >4.0/5.0 |

---

# 19. Future Enhancements

- Peer-benchmarked scores (anonymous comparison against similar attendees)
- Predictive pre-conference score estimate based on agenda and attendee list
- Custom weighting of sub-scores per user's personal goals

---

# 20. Open Questions

- Should sub-score weights be user-configurable or fixed?
- How should the score handle conferences with virtual/hybrid attendance?
- Should low scores trigger an automatic coaching prompt, or remain passive?
