# EPIC05 Feature 6 User Story 2

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-06 — Key Insight Extraction

---

# User Story

As an operator,
I want to monitor insight extraction throughput, deduplication effectiveness, and knowledge graph export success rate,
so that I can catch pipeline degradation before it produces noisy or incomplete knowledge graph data.

---

# Business Value

- Protects the integrity of the Knowledge Graph Engine, which depends on clean, deduplicated insight input
- Prevents export failures from silently leaving a user's knowledge base incomplete
- Provides visibility into extraction quality trends that inform model retuning priorities
- Reduces the operational cost of manually investigating why a session's insights never reached the graph

---

# Acceptance Criteria

## Functional Criteria
- Extraction job success/failure rate is tracked per conference and globally
- Deduplication merge rate is tracked as a quality signal
- Knowledge graph export success rate is tracked with automatic retry on transient failure

## UX Criteria
- Operator dashboard surfaces extraction latency, deduplication rate, and export failure trends
- Alerts fire when export failure rate or deduplication rate falls outside expected bounds
- Failed exports are drillable to the specific insight and failure reason

## Technical Criteria
- Every extraction job logs `session_id`, `correlation_id`, candidate count, and final insight count
- Export failures are retried with backoff and escalated to a dead-letter queue after repeated failures
- Deduplication effectiveness is measurable via a tracked duplicate-rate metric distinct from within-session and cross-session duplication

---

# Preconditions

- Operator has access to the insight extraction monitoring dashboard
- Extraction and export pipelines are instrumented with job-level telemetry
- Alert thresholds are configured

---

# Postconditions

- Extraction and export health metrics are recorded and queryable historically
- Alerts are dispatched when failure rate or quality metrics breach thresholds
- Dead-lettered export failures are visible for manual remediation

---

# Edge Cases

- A knowledge graph service outage causes a backlog of pending exports across many sessions
- A deduplication model regression causes an unexpected spike in near-duplicate insights reaching users
- A burst of sessions at conference-day close causes extraction queue backlog
- A malformed evidence reference (pointing to a since-deleted transcript segment) causes an export failure
- Cross-session duplicate detection incorrectly merges two genuinely distinct insights from different speakers

---

# Telemetry

Track:
- `insight_extraction_job_failed`
- `insight_deduplication_rate`
- `insight_export_failed`
- `insight_export_retried`
- `insight_export_dead_lettered`

---

# Dependencies

- Knowledge Graph Engine (PRD 5.6) ingestion API
- Observability stack (metrics, dashboards, alerting)
- EPIC-02 Transcript Segmentation

---

# Priority

Medium-High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify extraction job failures are correctly logged with session and correlation identifiers
2. Verify deduplication rate metric is accurately computed and distinguishes within-session from cross-session merges
3. Verify export failures are retried with backoff before being dead-lettered
4. Verify a knowledge graph service outage is correctly reflected as a backlog spike in the dashboard
5. Verify a malformed evidence reference produces a clear, actionable export failure reason
6. Verify alert fires when export failure rate exceeds the configured threshold
7. Verify dead-lettered exports are visible and retriable from the operator dashboard
8. Verify a cross-session over-merging scenario is detectable via a deduplication rate anomaly

---

# Story Variation

This is user story variation 2 for Key Insight Extraction, focusing on operational monitoring of extraction quality and knowledge graph export reliability.

---

# Notes

- Export reliability is this feature's highest-leverage operational concern, since a failed export silently degrades the user's knowledge base without an obvious symptom
- Track within-session and cross-session deduplication as separate metrics; they have different failure modes and different tuning levers
