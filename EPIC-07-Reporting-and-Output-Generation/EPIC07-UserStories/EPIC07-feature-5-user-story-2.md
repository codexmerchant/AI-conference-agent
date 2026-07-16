# EPIC07 Feature 5 User Story 2

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-05 — Opportunity Detection

---

# User Story

As an operator,
I want visibility into opportunity-detection precision and the health of the per-user feedback loop,
so that I can catch a model or threshold regression before it erodes trust in the review queue across the user base.

---

# Business Value

- Protects the feature's core value proposition, which depends entirely on users trusting the queue enough to keep checking it
- Provides early warning of classification drift caused by a model or prompt change
- Enables data-driven tuning of confidence thresholds instead of guesswork
- Reduces the operational cost of chasing individual user complaints about "irrelevant" flags

---

# Acceptance Criteria

## Functional Criteria
- Dismiss/pursue feedback is aggregated into a measurable precision metric per opportunity type
- A sudden drop in aggregate precision (spike in dismissal rate) triggers an alert for investigation
- Per-user threshold adjustments from feedback are logged and reversible
- Detection job failures are retried and logged with correlation IDs back to the source summary

## UX Criteria
- Operator dashboard shows precision/dismissal-rate trends by opportunity type and persona
- Dashboard supports drill-down from an aggregate precision drop to a sample of recently dismissed opportunities

## Technical Criteria
- Detection runs asynchronously and is idempotent per summary to avoid duplicate opportunity records on retry
- Feedback-driven threshold adjustments are scoped per user and do not leak into another user's detection behavior
- Precision metrics are computed on a rolling window to detect drift promptly, not just at long-interval batch reporting

---

# Preconditions

- Feedback events (pursue/dismiss/reviewed) are captured and available for aggregation
- Monitoring dashboard has access to per-type precision metrics
- Alerting thresholds for precision drift are configured

---

# Postconditions

- Precision trends are visible and queryable by opportunity type and time window
- Alerts fire when precision drops below the configured threshold
- Detection failures are retried or clearly surfaced as failed, never silently dropped

---

# Edge Cases

- A prompt/model version change causes a sudden spike in false-positive detections across many users simultaneously
- A single user's aggressive dismissal behavior skews their personal threshold too conservatively, hiding real opportunities
- Detection job backlog builds up during a high-volume conference day
- Feedback event arrives after the opportunity has already been auto-expired/archived
- Rollback of a prompt version needs to reconcile already-generated opportunities from the bad version

---

# Telemetry

Track:
- Detection job success/failure rate
- Precision (pursued+reviewed / total flagged) by opportunity type
- Dismissal rate trend by opportunity type and time window
- Per-user threshold adjustment events
- Detection job latency and backlog depth

---

# Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-03 Context Engine
- Monitoring and alerting platform
- Model/prompt version registry

---

# Priority

Medium

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify precision metric is computed correctly from aggregated pursue/dismiss/reviewed feedback
2. Verify alert fires when precision drops below the configured threshold within the rolling window
3. Verify a prompt-version rollback correctly stops further generation from the bad version
4. Verify per-user threshold adjustments do not affect other users' detection behavior
5. Verify detection job retries on transient failure without producing duplicate opportunity records
6. Verify dashboard drill-down surfaces a representative sample of recently dismissed opportunities
7. Verify detection backlog is visible and alertable during high-volume periods
8. Verify feedback arriving after an opportunity has been archived is still correctly attributed

---

# Story Variation

This is user story variation 2 for Opportunity Detection, focusing on precision monitoring, feedback-loop health, and detection pipeline reliability.

---

# Notes

- Because this feature explicitly asks users to give feedback (dismiss/pursue), the feedback loop's health is itself a first-class operational signal, not just a UX nicety.
- A precision regression here is unusually damaging because it directly undermines the feature's core trust proposition.
