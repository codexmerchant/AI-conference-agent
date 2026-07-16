# EPIC09 Feature 7 User Story 2

## Epic
EPIC-09 — User Productivity & Coaching

## Feature
FEATURE-07 — Goal Tracking

---

# User Story

As an operator,
I want reliable, monitored auto-progress tracking with detection of miscounts,
so that goal progress data stays accurate and trustworthy for the features that depend on it.

---

# Business Value

- Protects the accuracy of the anchor metric the rest of the epic depends on (scoring, missed-opportunity, coaching)
- Detects double-counting or missed-matching bugs before they silently corrupt goal outcomes at scale
- Reduces support escalations from users disputing incorrect progress counts
- Provides operational visibility into which goal types have reliable vs. unreliable auto-tracking

---

# Acceptance Criteria

## Functional Criteria
- Every GoalProgressEvent is logged with its source type, source reference, and increment value for auditability
- Duplicate-matching detection flags cases where the same source activity was counted toward the same goal more than once
- At-risk evaluation jobs run on the configured cadence (every 30 min during an active conference) and log completion status
- Miscounts identified via user correction are tracked as a proxy accuracy signal per goal type

## UX Criteria
- Operator dashboard shows auto-tracking accuracy by goal type, duplicate-detection rate, and at-risk job completion rate
- Alerts configurable for accuracy dropping below the 85% target or at-risk job failures
- Miscounted goals are flagged with enough context (source events) for rapid triage

## Technical Criteria
- Progress-matching logic is idempotent — replaying the same source event does not double-increment progress
- At-risk evaluation jobs are monitored for timeliness against the 30-minute cadence SLA
- Correlation IDs link a GoalProgressEvent to its triggering interaction, session, or follow-up event

---

# Preconditions

- Operator has monitoring and remediation permissions
- Goal-matching logic is instrumented with per-event logging
- Alerting system connected to goal-tracking pipeline health metrics

---

# Postconditions

- Auto-tracking accuracy and duplicate-detection metrics visible on the operator dashboard
- Miscounted goals flagged and queued for remediation or user notification
- At-risk evaluation job health tracked against its SLA
- Incident history retained for post-mortem review

---

# Edge Cases

- A large multi-track conference produces a burst of simultaneous interaction events, stressing the progress-matching pipeline
- A retried event (e.g., after a transient failure) is reprocessed and risks double-incrementing progress if idempotency isn't enforced correctly
- At-risk evaluation job falls behind its 30-minute cadence during peak conference load, delaying at-risk notifications
- A goal-matching rule change causes a systematic miscount across many goals of the same type simultaneously
- User manually corrects a miscounted goal, and the correction itself must be distinguished from legitimate auto-tracked progress in later audits
- Concurrent updates to the same goal's progress from two different source events race and produce an inconsistent final count

---

# Telemetry

Track:
- `goal_progress_event_recorded`
- `goal_progress_duplicate_detected`
- `goal_progress_accuracy_computed`
- `goal_at_risk_evaluation_completed`
- `goal_at_risk_evaluation_delayed`
- `operator_goal_tracking_dashboard_viewed`

---

# Dependencies

- Event-driven progress-matching pipeline
- Scheduled job orchestration for at-risk evaluation
- Contact & Relationship Intelligence, Follow-up Completion Tracking, Interaction Quality Analysis as upstream event sources
- Monitoring and alerting platform

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify a replayed source event does not double-increment goal progress
2. Verify duplicate-matching detection correctly flags a genuine double-count case
3. Verify at-risk evaluation jobs run on the configured 30-minute cadence and log completion
4. Verify a burst of simultaneous events during peak load is processed without dropped or duplicated progress
5. Verify concurrent progress updates to the same goal resolve deterministically without data races
6. Verify operator dashboard accurately reflects auto-tracking accuracy by goal type
7. Verify alert fires when accuracy drops below the 85% target for any goal type
8. Verify manual corrections are distinguishable from auto-tracked progress in the audit trail

---

# Story Variation

This is user story variation 2 for Goal Tracking, focusing on operational reliability of auto-progress tracking and miscount detection.

---

# Notes

- Idempotency of progress-matching is the single highest-risk correctness issue in this feature — prioritize test coverage for event replay scenarios
- Peak-load bursts (many interactions captured within minutes at a large conference) should be explicitly load-tested
- Track accuracy per goal type since auto-tracking reliability will vary significantly between, e.g., "meetings" (well-instrumented) and "custom" (inherently manual)
