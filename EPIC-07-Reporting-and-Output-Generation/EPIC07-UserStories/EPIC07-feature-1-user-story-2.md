# EPIC07 Feature 1 User Story 2

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-01 — Meeting Summaries

---

# User Story

As an operator,
I want the meeting summary generation pipeline to be reliable, retryable, and fully auditable,
so that downstream digests and reports built on top of it remain accurate and any failure can be traced and resolved quickly.

---

# Business Value

- Prevents silent data loss in the highest-volume, most foundational output of the reporting layer
- Reduces mean-time-to-resolution for generation incidents during peak conference load
- Provides the audit trail needed to diagnose quality regressions tied to a specific prompt/model version
- Protects SLA commitments around summary delivery latency

---

# Acceptance Criteria

## Functional Criteria
- Failed generation attempts are retried with exponential backoff before being dead-lettered
- Every generation attempt is logged with a correlation ID linking it to the source interaction and transcript
- Model_version and prompt_version are recorded on every generated summary, including failed attempts
- Stuck or repeatedly failing jobs are automatically flagged for operator review

## UX Criteria
- Operator dashboard shows real-time queue depth, failure rate, and P50/P99 generation latency
- Alert thresholds for failure rate and queue backlog are configurable
- Dashboard supports drill-down from an aggregate failure spike to individual failed interaction IDs

## Technical Criteria
- Generation requests are idempotent, keyed on interaction_id, to survive at-least-once event delivery
- LLM gateway outages trigger a circuit breaker rather than cascading retries that worsen an outage
- Dead-lettered jobs are queryable and manually replayable by an operator

---

# Preconditions

- Monitoring and alerting infrastructure is active
- Operator holds dashboard and dead-letter-queue access permissions
- Retry and circuit-breaker policies are configured

---

# Postconditions

- Complete audit trail exists for every generation attempt, success or failure
- Failures are either automatically resolved via retry or escalated to an operator
- Alerts fire when failure rate or backlog exceeds configured thresholds

---

# Edge Cases

- LLM inference gateway is rate-limited during peak expo-floor interaction volume
- Transcript arrives partially due to an upstream transcription service hiccup
- Contact-resolution service (EPIC-06) is temporarily unavailable mid-generation
- Duplicate interaction-end events are delivered by the upstream event bus
- Generated summary JSON fails schema validation due to a malformed LLM response

---

# Telemetry

Track:
- Queue depth over time
- Generation failure rate by error type
- Retry attempt count and retry success rate
- Dead-letter queue size
- P50/P95/P99 generation latency

---

# Dependencies

- Event bus / message queue infrastructure
- LLM inference gateway with circuit-breaker support
- Monitoring and alerting platform
- Dead-letter queue storage

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify retry with exponential backoff on a transient LLM gateway failure
2. Verify circuit breaker opens after repeated gateway failures and stops cascading retries
3. Verify duplicate interaction-end events do not produce duplicate summaries
4. Verify dead-lettered jobs are queryable and manually replayable
5. Verify correlation IDs propagate from interaction event through to the final summary record
6. Verify alert fires when failure rate crosses the configured threshold
7. Verify dashboard queue-depth and latency metrics update in near real time
8. Verify schema-invalid LLM responses are caught and do not corrupt the summary store

---

# Story Variation

This is user story variation 2 for Meeting Summaries, focusing on operational reliability, retry handling, and auditability of the generation pipeline.

---

# Notes

- Meeting summaries are the highest-volume artifact in the reporting layer and the root dependency for Feature 2, 3, and 6; pipeline reliability here has outsized downstream impact.
- Dead-letter replay should preserve original event ordering where feasible to avoid confusing downstream timelines.
