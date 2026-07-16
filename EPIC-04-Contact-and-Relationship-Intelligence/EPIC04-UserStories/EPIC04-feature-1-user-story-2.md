# EPIC04 Feature 1 User Story 2

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-01 — Contact Creation

---

# User Story

As an operator,
I want contact creation to be reliable, idempotent, and observable across all capture sources,
so that pipeline failures don't silently produce missing or corrupted contact data.

---

# Business Value

- Prevents silent data loss that would erode trust in the product's core promise
- Enables fast diagnosis of extraction pipeline regressions before they affect many users
- Reduces support burden from "my contact never got created" reports
- Provides the operational visibility needed to tune OCR/NER extraction quality over time

---

# Acceptance Criteria

## Functional Criteria
- Every contact creation attempt (success or failure) is logged with a correlation ID tying it to its source capture event
- Failed creations trigger automatic retry with exponential backoff for transient errors (e.g., OCR service timeout)
- Duplicate capture events (retries, replayed events) never produce duplicate contacts
- Creation failures are queryable by source type, conference, and time window

## UX Criteria
- Operator dashboard surfaces contact-creation failure rate by source type
- Alert thresholds are configurable for failure-rate spikes
- Failed creations are retriable from the dashboard without re-capturing

## Technical Criteria
- Idempotency key is `capture_event_id`; retried events are no-ops against an existing contact
- Correlation IDs propagate from capture event through OCR/NER extraction to contact persistence
- Retry logic respects rate limits on downstream OCR/transcription services

---

# Preconditions

- Monitoring and alerting infrastructure is active
- Correlation ID generation is wired through the capture-to-contact pipeline
- Retry policy and backoff parameters are configured

---

# Postconditions

- All creation attempts are logged with outcome and correlation ID
- Failed creations are either auto-retried to success or surfaced for operator action
- Failure-rate metrics are available for trend analysis

---

# Edge Cases

- OCR service degraded, returning partial results for a subset of badge scans
- Contact creation succeeds but the identity-resolution pre-check times out
- Retry storm from a batch of offline-queued captures syncing simultaneously
- Correlation ID missing due to a client-side bug, breaking traceability
- Conference session ends mid-creation, orphaning the association step
- Extraction pipeline version change mid-conference alters field accuracy

---

# Telemetry

Track:
- `contact_creation_attempted`
- `contact_creation_failed`
- `contact_creation_retry_triggered`
- `contact_creation_retry_succeeded`
- `contact_creation_pipeline_latency_ms`

---

# Dependencies

- Correlation ID propagation infrastructure
- Monitoring and alerting system
- OCR Extraction and Streaming Transcription services (EPIC-02)
- Retry/backoff framework

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify correlation ID is present on every creation attempt, success or failure
2. Verify retry with exponential backoff on a simulated OCR timeout
3. Verify idempotency: replaying the same capture_event_id does not create a duplicate
4. Verify operator dashboard reflects failure rate within 1 minute of occurrence
5. Verify alert fires when failure rate exceeds configured threshold
6. Verify retry storm from bulk offline sync does not overwhelm the OCR service
7. Verify failed creation is retriable manually from the operator dashboard
8. Verify pipeline latency metric is recorded for every stage (capture, extraction, resolution, persistence)

---

# Story Variation

This is user story variation 2 for Contact Creation, focusing on operational reliability, retry behavior, and pipeline observability.

---

# Notes

- Contact creation sits at the front of the entire EPIC-04 dependency chain; failures here cascade into every downstream feature
- Retry logic must be conservative enough not to duplicate-create contacts under network flakiness
