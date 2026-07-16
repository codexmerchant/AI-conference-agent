# EPIC13 Feature 1 User Story 2

## Epic
EPIC-13 — Admin, Observability & Operations

## Feature
FEATURE-01 — Monitoring Dashboards

---

# User Story

As an on-call operator,
I want real-time throughput and latency dashboards that I can trust during peak conference hours,
so that I can catch pipeline backlogs and cascading failures before attendees notice missing captures.

---

# Business Value

- Shortens incident detection time during the highest-risk operational windows (live conferences)
- Builds operator trust in dashboard data so real incidents aren't dismissed as noise
- Reduces the chance of a backlog silently growing into a full outage
- Provides a reliable first stop for triage before escalating to logs or paging

---

# Acceptance Criteria

## Functional Criteria
- Dashboard widgets refresh on a configurable interval (10–30 seconds) without manual reload
- Queue depth and processing latency are visible per pipeline stage (capture, transcription, graph update)
- Dashboard clearly distinguishes "degraded" from "down" rather than a single binary state
- Drill-down from a backlog widget reaches the specific conference sessions affected

## UX Criteria
- Widgets remain interactive and readable during high-refresh-rate conditions
- A visibly stale data indicator appears if the metrics pipeline itself falls behind
- Dashboard is usable on a secondary monitor / TV-mode display for a NOC-style view

## Technical Criteria
- Dashboard availability is maintained (served from last-known-good cache) during a metrics-backend outage
- Widget queries are optimized to avoid timeout under conference-peak query load
- Dashboard state changes tied to thresholds are cross-linked to the alerting pipeline (FEATURE-07)

---

# Preconditions

- On-call operator has an active shift and dashboard access
- Metrics pipeline is instrumented for every pipeline stage with per-conference tagging
- Threshold bands are pre-configured for each critical metric

---

# Postconditions

- Operator has a real-time, trustworthy picture of pipeline health throughout the shift
- Any threshold breach observed is either self-resolved or escalated with dashboard context attached
- Dashboard viewing activity during the incident window is available for post-incident review

---

# Edge Cases

- A metrics pipeline lag causes dashboards to under-report an active backlog during exactly the window it matters most
- Widget query timeout occurs against a high-cardinality metric during peak conference-day load
- Dashboard refresh rate set too aggressively degrades browser performance during a long on-call shift
- A backlog widget shows an alarming spike that is actually expected end-of-session batch processing, not a real incident
- Time zone mismatch between the operator's browser and the conference's local time confuses "live" data interpretation

---

# Telemetry

Track:
- `dashboard_widget_refresh_lag_detected`
- `dashboard_query_timeout`
- `dashboard_backlog_threshold_breached`
- `dashboard_stale_data_indicator_shown`
- `dashboard_viewed_during_active_incident`

---

# Dependencies

- Metrics pipeline with per-pipeline-stage and per-conference tagging
- Alerting/escalation service (FEATURE-07) for threshold-triggered notifications
- Time-series storage with sufficient resolution for near-real-time queries

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify widget refresh occurs automatically on the configured interval without user action
2. Verify queue depth and latency are visible per pipeline stage
3. Verify degraded vs. down states are visually distinguishable
4. Verify drill-down from a backlog widget reaches the affected conference sessions
5. Verify stale-data indicator appears when the metrics pipeline itself lags
6. Verify dashboard remains viewable from cache during a metrics-backend outage
7. Verify widget query performance under simulated conference-peak load
8. Verify threshold breach on a dashboard widget triggers a linked alert
9. Verify NOC/TV-mode display renders correctly on a secondary monitor

---

# Story Variation

This is user story variation 2 for Monitoring Dashboards, focusing on the on-call operator's reliability and real-time-trust perspective during live, high-load conference windows.

---

# Notes

- Trust in dashboard freshness is as important as the data itself — a stale "healthy" reading is worse than an honest "unknown."
- Consider a dedicated NOC/TV-mode layout distinct from the interactive admin dashboard for shift-long visibility.
