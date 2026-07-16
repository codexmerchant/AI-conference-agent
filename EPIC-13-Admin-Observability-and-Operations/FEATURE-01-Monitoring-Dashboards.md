# FEATURE-01 — Monitoring Dashboards

## Epic
EPIC-13 — Admin, Observability & Operations

---

# 1. Objective

Give platform admins and on-call operators a single, real-time view of system health across the capture, transcription, graph, and integration pipeline.

---

# 2. Problem Statement

The platform runs nine distinct AI agents plus mobile clients and integration syncs across iOS, cloud, and third-party services. Without a consolidated view, an operator has to check each service independently to notice degradation, and by the time a user reports a missing transcript or a failed sync, the underlying issue has often been live for hours.

---

# 3. Feature Overview

A configurable dashboarding surface that renders live and historical metrics (throughput, latency, error rate, queue depth) per service and per agent, with drill-down from a global health view down to a single conference session's pipeline status.

---

# 4. Key Functionalities

## Global service health overview
Single-screen status grid showing up/degraded/down state for each backend service and AI agent, refreshed on a short polling interval.

## Per-conference operational view
Drill-down dashboard showing the live pipeline state (capture → transcription → graph → reporting) for one active conference session.

## Custom widget dashboards
Admins can compose dashboards from a library of metric widgets (time series, heatmap, single-stat, top-N table) and save/share them.

## Historical trend comparison
Time-range selection and overlay of current vs. prior period (e.g., this conference vs. last conference of the same type) for the same metric.

## Dashboard alerting thresholds
Widgets can have visual threshold bands (warning/critical) that link into the alerting system in FEATURE-07.

---

# 5. Primary Use Cases

## Use Case 1
An on-call operator opens the global health dashboard at the start of a high-attendance conference to confirm all pipeline stages are green before the event begins.

## Use Case 2
A platform admin builds a custom dashboard to monitor a newly launched integration's sync throughput during its first week.

## Use Case 3
A support engineer drills into a specific conference's operational dashboard after a user reports a missing session summary.

---

# 6. User Stories

## User Story 1
As a platform admin,
I want a single-pane dashboard of service and agent health,
so that I can detect degradation before it becomes a user-facing incident.

### Acceptance Criteria
- Dashboard renders health state for all nine agents and core backend services within 3 seconds of load.
- Health state updates automatically without a manual page refresh.
- Admin can save a custom dashboard layout and reload it on next login.

## User Story 2
As an on-call operator,
I want to drill down from a global health alert into the specific conference session and pipeline stage causing it,
so that I can diagnose and resolve incidents quickly during a live event.

### Acceptance Criteria
- Clicking a degraded service on the global view navigates to a filtered, service-scoped dashboard.
- Per-conference dashboards show pipeline stage status (queued, processing, completed, failed) for capture, transcription, and graph updates.
- Drill-down preserves the original time range and correlation ID context.

---

# 7. User Workflow

1. Operator logs into the admin console and opens the Monitoring Dashboards module.
2. Global health grid loads, showing status for each service/agent.
3. Operator identifies a degraded or red status indicator.
4. Operator clicks into the affected service to see a scoped time-series dashboard.
5. Operator narrows to a specific conference or time window.
6. Operator reviews related logs/errors via cross-linked panels.
7. Operator saves or shares the dashboard view with the incident channel.

---

# 8. UI / UX Requirements

- Status colors follow a consistent green/amber/red convention across all widgets.
- Widgets support both light and dark admin-console themes.
- Dashboard load and refresh must not block interaction with already-rendered widgets (progressive rendering).
- Drag-and-drop layout editor for custom dashboards, with autosave.
- Shareable deep links that preserve applied filters and time range.

---

# 9. Technical Requirements

## Frontend
Admin console web app (React) rendering dashboard widgets from a metrics query API; supports drag-and-drop layout editing, saved views per admin user, and deep-linkable URL state for filters and time range.

## Backend
Dashboard service exposing CRUD for dashboard/widget definitions and a metrics query proxy that fans out to the metrics time-series store; enforces RBAC so dashboards can be scoped to admin, on-call, or read-only support roles.

## AI/ML
No inference performed directly; dashboards surface AI/ML quality signals (confidence, drift) sourced from FEATURE-03's model monitoring pipeline as read-only widgets.

## Infrastructure
Metrics are collected via a time-series pipeline (e.g., Prometheus-compatible scrape/push) with a retention-tiered store (high-resolution short-term, downsampled long-term) to keep dashboard queries fast during conference-peak load.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Metrics Query API | Query time-series data for widgets (`GET /metrics/query`) |
| Dashboard Service | Persist and retrieve dashboard/widget definitions |
| Error Tracking Service | Cross-link degraded widgets to open error groups |
| AI Model Monitoring Service | Surface model confidence/drift widgets |
| Auth/RBAC Service | Enforce role-scoped dashboard visibility |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Dashboard | dashboard_id, name, owner_admin_id, visibility, layout_json, created_at, updated_at |
| DashboardWidget | widget_id, dashboard_id, widget_type, metric_query, threshold_warning, threshold_critical, position |
| MetricSeries | metric_key, service_name, agent_name, conference_id, timestamp, value, tags |

---

# 12. Security & Privacy

- Dashboard access is role-scoped; read-only support roles cannot edit shared/global dashboards.
- Metric queries must not expose raw PII (transcripts, attendee names) — only aggregate operational metrics.
- Dashboard sharing links are access-controlled, not publicly resolvable without authentication.
- All dashboard configuration changes are captured in the audit log (FEATURE-08).

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Global dashboard initial load | <3 sec |
| Widget refresh interval | 10–30 sec configurable |
| Metrics query p95 latency | <500 ms |
| Dashboard availability during partial outage | >99% (served from cached/last-known metrics) |

---

# 14. Edge Cases

- Metrics pipeline lag causes a dashboard to show stale "healthy" status during an active incident.
- Widget query times out against a high-cardinality metric (e.g., per-conference tags) on a large tenant.
- Two admins editing the same shared dashboard concurrently overwrite each other's layout changes.
- Metric cardinality explosion from per-conference or per-session tagging degrades query performance platform-wide.
- Dashboard must remain viewable (from a cached snapshot) during a full metrics-backend outage.
- Time zone mismatch between operator's browser and conference-local time confuses "today's" data.

---

# 15. Dependencies

- Metrics collection and time-series storage pipeline
- Auth/RBAC service for admin console
- Error tracking service (FEATURE-07) for cross-linking
- AI model monitoring service (FEATURE-03) for quality widgets

---

# 16. Risks

- Dashboard sprawl (too many ad hoc custom dashboards) reduces signal for real incidents.
- Over-reliance on dashboards without automated alerting delays incident detection outside business hours.
- High-cardinality metrics degrade query performance if not pre-aggregated.

---

# 17. Telemetry & Analytics

Track:
- `dashboard_viewed`
- `dashboard_created`
- `dashboard_widget_added`
- `dashboard_drill_down_clicked`
- `dashboard_query_timeout`
- `dashboard_shared`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Mean time to detect (MTTD) service degradation | <5 min |
| Dashboard adoption among on-call operators | >90% weekly active |
| Dashboard query timeout rate | <1% |
| Stale-data incidents (health shown green during real outage) | 0 per quarter |

---

# 19. Future Enhancements

- Anomaly-aware widgets that auto-highlight statistically unusual patterns.
- AI-generated incident summaries composed from dashboard state at alert time.
- Public status-page generation derived from dashboard health data.

---

# 20. Open Questions

- Should conference-scoped dashboards auto-expire after the conference ends, or persist indefinitely for post-mortems?
- What is the maximum number of widgets per dashboard before we enforce pagination or splitting?
- Should read-only support roles see cost data on shared dashboards, or is that admin-only?
