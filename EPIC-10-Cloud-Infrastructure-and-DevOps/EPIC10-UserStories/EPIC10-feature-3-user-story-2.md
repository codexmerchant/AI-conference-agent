# EPIC10 Feature 3 User Story 2

## Epic
EPIC-10 — Cloud Infrastructure & DevOps

## Feature
FEATURE-03 — CI/CD Pipeline

---

# User Story

As an operator,
I want to trigger a full production rollback in under three minutes with a single action,
so that a bad release doesn't cause extended downtime or lost captures during a live conference.

---

# Business Value

- Minimizes downtime and data-loss risk from a bad production release during a high-stakes event window
- Reduces cognitive load on the on-call operator during a stressful incident
- Builds organizational confidence to ship faster, knowing rollback is fast and reliable
- Provides a clear audit trail of what was rolled back, when, and by whom

---

# Acceptance Criteria

## Functional Criteria
- Operator can trigger a rollback to the last known-good version via a single dashboard action or CLI command.
- Rollback restores all affected service replicas to the previous stable image/version.
- Rollback completes and is confirmed healthy within the 3-minute target.

## UX Criteria
- Rollback control is prominently available on the pipeline dashboard during an active incident view.
- Operator receives real-time progress feedback during the rollback operation.

## Technical Criteria
- Rollback works correctly even if triggered mid-canary or mid-traffic-shift.
- Rollback action is logged with the triggering operator, timestamp, and reason.
- Rollback does not require access to raw deployment manifests or manual `kubectl`/`helm` commands.

---

# Preconditions

- A previous known-good version exists and is retained in the deployment history.
- Operator has rollback permissions for the affected environment.
- Pipeline and container platform are both operational enough to execute the rollback.

---

# Postconditions

- Affected service is running the previous stable version and passing health checks.
- Rollback event is logged and linked to the incident that triggered it.
- Alerting reflects the resolved state once health checks pass.

---

# Edge Cases

- Rollback is triggered while a canary rollout is only partially complete, requiring consistent state across mixed replica versions.
- The "last known-good" version itself has an unrelated issue, requiring a rollback to an even earlier version.
- Rollback is triggered for a service with an in-flight database migration that isn't backward compatible.
- Network or cluster degradation slows the rollback operation beyond the 3-minute target.
- Two operators attempt to trigger conflicting rollback/rollforward actions simultaneously during an incident.

---

# Telemetry

Track:
- `rollback_triggered`
- `rollback_completed`
- `rollback_failed`
- `rollback_duration_ms`

---

# Dependencies

- Container platform (Feature 2) for executing the rollback deployment
- Database infrastructure (Feature 7) for migration-compatibility awareness
- Monitoring and observability stack (Feature 8) for post-rollback health confirmation

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify rollback restores the previous stable version across all affected replicas.
2. Verify rollback completes within the 3-minute target under normal conditions.
3. Verify rollback triggered mid-canary results in a consistent final state.
4. Verify rollback event is logged with operator identity, timestamp, and reason.
5. Verify rollback to an even earlier version works if the immediate prior version is also unhealthy.
6. Verify rollback behavior when a non-backward-compatible database migration is involved.
7. Verify conflicting simultaneous rollback/rollforward requests are safely serialized.
8. Verify alerting reflects resolution once rollback health checks pass.

---

# Story Variation

This is user story variation 2 for CI/CD Pipeline, focusing on the on-call operator's incident-response and rollback-reliability perspective.

---

# Notes

- Rollback should be tested as part of regular game-day/chaos exercises, not just built and left unverified.
- Database migration compatibility should be a pre-flight check surfaced before a risky deploy, not discovered during rollback.
