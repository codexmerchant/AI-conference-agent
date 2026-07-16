# FEATURE-07 — Graph Scoring

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Compute relationship-strength, priority, and relevance scores on nodes and edges so downstream features can rank contacts, topics, and follow-up actions instead of treating every graph connection as equally important.

---

# 2. Problem Statement

A user leaving a conference may have 150 new contacts, but not all are equally valuable to follow up with. Without a scoring model, the app cannot prioritize outreach, surface "who matters most," or explain why one contact ranks above another, leaving users to manually triage every connection.

---

# 3. Feature Overview

A scoring service that computes explainable scores — relationship "warmth," contact priority, and topic relevance — from graph structure and interaction signals (frequency, recency, reciprocity, session overlap), recalculates scores as the graph changes, and exposes a breakdown of contributing factors for transparency.

---

# 4. Key Functionalities

## Relationship strength (warmth) scoring
Combine interaction frequency, recency, reciprocity, and session overlap into a single warmth score per edge.

## Contact priority scoring
Rank contacts using warmth plus configurable business signals (e.g., target account, role seniority).

## Topic relevance scoring
Score how relevant a discussed topic is to a user's stated interests or goals.

## Score recomputation triggers
Recompute affected scores when new interactions, decay events, or manual overrides occur.

## Explainable score breakdown
Expose the weighted factors behind any given score for transparency and debugging.

---

# 5. Primary Use Cases

## Use Case 1
After a conference, the app ranks a user's new contacts by warmth score to suggest who to follow up with first.

## Use Case 2
A sales-oriented user boosts contacts from target accounts, and the priority score reflects that override alongside interaction-based warmth.

## Use Case 3
A user asks "why is this contact ranked so high" and the app shows the factor breakdown (met twice, exchanged follow-up, shared session).

---

# 6. User Stories

## User Story 1
As a user,
I want my contacts ranked by how strong and recent my relationship with them is,
so that I know who to prioritize following up with after a conference.

### Acceptance Criteria
- Every contact with at least one interaction has a computed warmth score.
- Scores update automatically as new interactions occur.
- The user can view a simple explanation of why a contact scored the way it did.

## User Story 2
As an operator responsible for scoring quality,
I want score recomputation to run reliably and consistently after graph changes,
so that stale or drifted scores don't misinform user-facing rankings.

### Acceptance Criteria
- Score recomputation is triggered automatically by relevant graph write events.
- Recomputation jobs are idempotent and safely retryable.
- Score drift (large unexplained swings) is detectable and alertable.

---

# 7. User Workflow

1. A relationship-affecting event occurs (new interaction, decay, manual override).
2. Scoring service is notified via the graph update event stream.
3. Affected node/edge scores are recomputed using the current factor weights.
4. New score and factor breakdown are persisted alongside the previous score for comparison.
5. Downstream consumers (recommendations, reporting) read the updated score.
6. On request, a user or operator can view the explainable factor breakdown for a given score.

---

# 8. UI / UX Requirements

- Contact list sortable/filterable by priority or warmth score.
- Score breakdown view showing top contributing factors in plain language.
- Manual override control for priority boosts (e.g., "mark as key account").

---

# 9. Technical Requirements

## Frontend
A scoring-aware contact list and detail view that surfaces rank, score trend, and an expandable factor breakdown.

## Backend
A scoring service subscribing to graph update events, computing weighted scores from structural and temporal signals, and persisting versioned score records with factor attribution.

## AI/ML
A calibrated weighting model (initially rule-based, evolvable to a learned model) combining frequency, recency, reciprocity, and session-overlap signals into a normalized score.

## Infrastructure
An incremental recomputation pipeline that scores only affected nodes/edges rather than recomputing the entire graph on every change.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Relationship Storage | Source edge data and provenance for scoring inputs |
| Temporal Relationship Modeling | Supplies decay-adjusted weights as scoring input |
| Interaction Graph Updates | Triggers score recomputation on new events |
| Reporting/Output Layer | Consumes scores for daily summaries and follow-up drafts |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| RelationshipScore | score_id, edge_id, score_type (warmth\|priority\|influence), value, factors{}, computed_at, model_version |
| ScoreOverride | override_id, node_id, applied_by, override_type (priority_boost\|priority_suppress), reason, applied_at |
| ScoringJob | job_id, trigger_event_id, affected_node_ids[], status, started_at, completed_at |

---

# 12. Security & Privacy

- Score factor breakdowns do not expose other users' private interaction content.
- Manual overrides are attributed and auditable per user/admin.
- Scoring models and weights are versioned so historical scores remain explainable after model changes.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Incremental score recomputation latency | <5 sec p95 per affected node |
| Full-graph batch rescoring (model version change) | <2 hours for 1M edges |
| Score staleness after triggering event | <30 sec |

---

# 14. Edge Cases

- A recompute storm follows a mass event ingestion (e.g., large conference ending).
- A contact has zero interactions and needs a defined cold-start score rather than an error.
- Conflicting factor weights are applied across two concurrently running model versions.
- Decay events and reinforcement events for the same edge race, producing an inconsistent score.
- A manual override conflicts with the computed structural score.
- Score recomputation is triggered for a node that was deleted mid-job.

---

# 15. Dependencies

- Relationship storage
- Temporal relationship modeling (decay-adjusted weights)
- Interaction graph updates (trigger source)
- Graph database read access for factor computation

---

# 16. Risks

- Poorly calibrated weights producing rankings users don't trust.
- Recompute storms overwhelming the scoring pipeline during peak conference activity.
- Score version drift making historical comparisons misleading without proper versioning.

---

# 17. Telemetry & Analytics

Track:
- `relationship_score_computed`
- `score_recompute_triggered`
- `score_override_applied`
- `score_drift_detected`
- `scoring_job_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Score recomputation success rate | >99.5% |
| User agreement with top-ranked contacts (survey) | >80% |
| Score staleness after triggering event | <30 sec p95 |

---

# 19. Future Enhancements

- Learned scoring model trained on user follow-up and outcome data.
- Industry/role-specific weighting profiles.
- Confidence intervals on scores to communicate uncertainty for sparse-data contacts.

---

# 20. Open Questions

- Should scoring weights be globally fixed or user-configurable per persona (sales vs. researcher)?
- How should cold-start scoring behave for contacts with minimal interaction history?
- Should manual overrides decay over time, or persist indefinitely until explicitly removed?
