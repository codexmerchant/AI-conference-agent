# EPIC04 Feature 4 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-04 — Relationship Scoring

---

# User Story

As an operator,
I want relationship score computation to be reliable, monitored, and consistent at scale,
so that a scoring bug or performance regression doesn't silently mis-rank an entire user's network.

---

# Business Value

- Protects the credibility of a highly visible, trust-dependent feature
- Enables safe iteration on the scoring model's weights without breaking production ranking
- Ensures nightly decay processing scales as the contact base grows
- Gives operators the tools to detect and roll back a bad scoring-weight change quickly

---

# Acceptance Criteria

## Functional Criteria
- Incremental score recomputation triggers reliably on every relevant interaction event, with no missed updates
- Nightly batch decay job completes within its window even as contact volume grows, with failure alerting
- Scoring model/weight version is recorded with every computed score for rollback traceability
- Score computation failures are retried and logged, not silently dropped

## UX Criteria
- Operator dashboard shows batch decay job duration, success rate, and affected contact count
- Alert fires if the nightly decay job fails to complete or exceeds its time budget
- Score-distribution monitoring flags anomalies (e.g., a sudden spike in "cold" tier contacts after a deploy)

## Technical Criteria
- Recompute triggers are idempotent — replayed interaction events do not double-count toward frequency
- Batch decay processing is horizontally scalable and resumable if interrupted
- Weight/version changes are deployable behind a flag with the ability to roll back without a data migration

---

# Preconditions

- Event bus delivering interaction events to the scoring service is operational
- Batch decay job scheduler and worker infrastructure are provisioned
- Monitoring and alerting have access to scoring pipeline metrics

---

# Postconditions

- All eligible contacts have an up-to-date score after each batch decay cycle
- Scoring pipeline health is visible on an ongoing basis
- Any scoring anomaly is detectable within the operator's monitoring window

---

# Edge Cases

- Nightly batch decay job is interrupted partway through a large contact base and must resume cleanly
- A duplicate interaction event is replayed from the event bus and must not inflate frequency
- A scoring weight change is deployed and needs to be rolled back after an anomaly is detected
- Score computation for a specific contact fails repeatedly due to malformed interaction data
- Batch job contention with other nightly jobs (e.g., merge re-indexing) competing for the same resources
- Score distribution shifts unexpectedly after a large batch of contacts is merged

---

# Telemetry

Track:
- `relationship_score_recompute_triggered`
- `relationship_score_recompute_failed`
- `relationship_score_batch_decay_duration_ms`
- `relationship_score_batch_decay_failure`
- `relationship_score_model_version_active`

---

# Dependencies

- Event bus for interaction events
- Batch job scheduler and worker infrastructure
- Monitoring, alerting, and model-version tracking

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify every meeting-association event triggers a corresponding score recompute
2. Verify a replayed/duplicate interaction event does not inflate the frequency component
3. Verify nightly decay job resumes correctly after a mid-run interruption
4. Verify batch decay job completion is tracked and alertable on failure
5. Verify a scoring weight rollback restores prior ranking behavior without data migration
6. Verify score computation failure for one contact does not block the batch for others
7. Verify model_version is recorded and queryable on every computed score
8. Verify score distribution monitoring detects an anomalous shift after a simulated bad deploy

---

# Story Variation

This is user story variation 2 for Relationship Scoring, focusing on pipeline reliability, batch processing at scale, and safe model iteration.

---

# Notes

- Because score directly affects what the user pays attention to, a silent computation bug is a worse failure mode than a visible error
- Shadow-scoring a new weight configuration against production data before cutover is worth considering
