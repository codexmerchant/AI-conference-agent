# EPIC14 Feature 3 User Story 2

## Epic
EPIC-14 — Desktop Analysis Workspace

## Feature
FEATURE-03 — Conference Intelligence Dashboard

---

# User Story

As an operator,
I want reliable, monitored snapshot generation for conference dashboards,
so that users never see stale, incomplete, or silently failed score data.

---

# Business Value

- Ensures dashboard data users rely on for decision-making is trustworthy and current
- Reduces support tickets caused by "my score looks wrong" or "my dashboard is empty"
- Provides early detection of upstream score-computation failures before users notice
- Keeps snapshot generation cost predictable at scale across many concurrent conferences

---

# Acceptance Criteria

## Functional Criteria

- Snapshot generation jobs are monitored for success/failure per conference
- Failed or partial snapshot generations trigger automatic retry with backoff
- Snapshot staleness (time since last successful generation) is tracked and alertable
- Operators can manually force snapshot regeneration for a specific conference

## UX Criteria

- Operator dashboard shows snapshot generation health across all active conferences
- Alerts distinguish between a slow generation and a fully failed generation

## Technical Criteria

- Snapshot jobs are idempotent and safe to retry without duplicating metrics
- Generation failures are logged with the failing sub-component (e.g., score service vs. session aggregation)
- Snapshot freshness metric is exposed for alerting thresholds

---

# Preconditions

- Monitoring and alerting infrastructure is operational
- Snapshot generation pipeline is deployed and scheduled
- Score computation dependencies (EPIC-05, EPIC-07, EPIC-09) are reachable

---

# Postconditions

- Snapshot generation health is continuously tracked and reported
- Failed generations are retried automatically or escalated to on-call
- Manually forced regenerations complete and are logged with the triggering operator

---

# Edge Cases

- Score computation service is degraded, causing partial snapshots across many conferences simultaneously
- A very high-volume, multi-track conference causes snapshot generation to exceed its time budget
- Snapshot generation succeeds but produces statistically implausible values (e.g., negative counts)
- Manual regeneration is triggered while an automatic scheduled generation is already in progress
- Snapshot pipeline backlog grows during a period of many concurrent large conferences
- A conference is deleted mid-snapshot-generation

---

# Telemetry

Track:
- `snapshot_generation_started`
- `snapshot_generation_succeeded`
- `snapshot_generation_failed`
- `snapshot_staleness_minutes`
- `manual_regeneration_triggered`
- `operator_alert_triggered`

---

# Dependencies

- EPIC-05 Session & Conference Intelligence
- EPIC-07 Reporting & Output Generation
- EPIC-09 performance/coaching scoring system
- Background job scheduling and monitoring infrastructure

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify snapshot generation succeeds and is logged for a standard test conference
2. Verify failed generation triggers automatic retry with backoff
3. Verify staleness metric increments correctly when generation is delayed
4. Verify alert fires when staleness exceeds the configured threshold
5. Verify manual regeneration completes and updates the dashboard immediately
6. Verify concurrent manual and scheduled regeneration do not produce duplicate or conflicting snapshots
7. Verify implausible score values are flagged rather than silently displayed
8. Verify snapshot generation for a deleted conference fails gracefully without orphaned data

---

# Story Variation

This is user story variation 2 for Conference Intelligence Dashboard, focusing on operational reliability of snapshot generation and monitoring.

---

# Notes

- Sanity-checking generated metrics (e.g., no negative counts, scores within expected ranges) catches silent data-quality bugs before users do
- Snapshot generation SLAs should scale with conference size rather than being a fixed constant
