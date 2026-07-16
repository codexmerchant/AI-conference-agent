# EPIC11 Feature 1 User Story 2

## Epic
EPIC-11 — Security, Privacy & Compliance

## Feature
FEATURE-01 — Recording Consent Management

---

# User Story

As an operator,
I want consent state changes to propagate reliably and observably to every downstream service that touches audio,
so that no recording is ever transcribed, stored, or processed without an active, correctly synced consent record.

---

# Business Value

- Prevents silent compliance gaps caused by propagation failures between services
- Gives operators a way to prove consent enforcement is working, not just assumed
- Reduces incident response time when a consent-related issue is reported
- Protects the company from liability caused by stale or lost consent state

---

# Acceptance Criteria

## Functional Criteria
- Consent grant and revoke events publish to the event bus within 500ms of the originating action
- Transcription and storage services reject or halt processing of audio lacking an active consent record
- Propagation failures trigger automatic retry with exponential backoff

## UX Criteria
- Operator dashboard shows consent event propagation latency and failure rate in real time
- Failed propagations are visibly flagged with the affected session ID for rapid triage
- Dashboard distinguishes between transient delivery failures and hard rejections

## Technical Criteria
- Consent events are delivered at-least-once with idempotent handling on the consumer side
- Consent state checks are enforced at the point of persistence, not only at capture time
- Propagation failures beyond a retry threshold page the on-call operator

---

# Preconditions

- Event bus infrastructure is provisioned and healthy
- Transcription and storage services are subscribed to consent state change events
- Monitoring and alerting thresholds are configured for propagation latency and failure rate

---

# Postconditions

- All subscribed services have an up-to-date view of consent state for every active session
- Propagation metrics are recorded for the operator dashboard
- Any unresolved propagation failure is logged and escalated per SLA

---

# Edge Cases

- Event bus experiences a brief outage during a high-traffic conference day
- A consent revoke event arrives after the corresponding audio segment has already begun processing
- Duplicate consent events are delivered due to at-least-once delivery semantics
- A downstream service is temporarily unavailable and misses a consent state change
- Propagation succeeds to some subscribers but fails for others, leaving inconsistent state
- Clock skew between services causes an out-of-order application of grant/revoke events

---

# Telemetry

Track:
- `consent_event_published`
- `consent_event_propagation_latency`
- `consent_event_delivery_failed`
- `consent_event_retry_triggered`
- `downstream_consent_state_mismatch_detected`

---

# Dependencies

- Event bus / message queue infrastructure
- Transcription and Storage services (EPIC-02, Feature 7)
- Audit Logging (Feature 5)

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify consent grant events propagate to all subscribers within SLA
2. Verify consent revoke events halt in-flight processing of the affected audio segment
3. Verify idempotent handling of duplicate consent events
4. Verify retry behavior when a downstream service is temporarily unavailable
5. Verify operator dashboard accurately reflects propagation latency and failure rate
6. Verify alerting triggers when propagation failures exceed the retry threshold
7. Verify consistent consent state across all downstream services after an event bus outage recovers
8. Verify out-of-order event delivery does not incorrectly apply a stale consent state

---

# Story Variation

This is user story variation 2 for Recording Consent Management, focusing on the reliability and observability of consent state propagation across services.

---

# Notes

- Propagation failures must fail closed (block processing) rather than fail open (allow processing without confirmed consent).
- Consider a periodic reconciliation job that compares each service's cached consent state against the source of truth.
