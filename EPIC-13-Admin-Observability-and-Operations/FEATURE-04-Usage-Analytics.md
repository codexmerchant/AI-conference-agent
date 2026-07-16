# FEATURE-04 — Usage Analytics

## Epic
EPIC-13 — Admin, Observability & Operations

---

# 1. Objective

Instrument product usage across capture, contacts, sessions, and reporting so the product team can measure adoption and validate the platform's core success metrics.

---

# 2. Problem Statement

The PRD defines product metrics — percentage of interactions captured, summary accuracy, follow-up conversion rate, daily usage during conferences — that cannot be validated without a consistent usage-event pipeline. Without it, roadmap prioritization relies on anecdote rather than measured adoption and behavior.

---

# 3. Feature Overview

An event pipeline and analytics layer that captures product usage events from mobile and web clients, computes funnels/cohorts/retention, and exposes the PRD's product metrics on dashboards and to downstream BI tooling.

---

# 4. Key Functionalities

## Event ingestion and schema registry
Standardized event schema with a registry so new events are validated and documented before shipping.

## Funnel and cohort analysis
Build funnels (e.g., conference started → interaction captured → follow-up sent) and cohort retention views.

## Feature adoption dashboards
Track adoption rate of individual features (e.g., Quick Interaction Tagging, Push-to-Capture) over time.

## PRD product metric rollups
Pre-built dashboards for the PRD's named product metrics: % interactions captured, summary accuracy, follow-up conversion rate, daily conference usage.

## BI export
Scheduled export of aggregated, de-identified usage data to external BI tools for deeper analysis.

---

# 5. Primary Use Cases

## Use Case 1
The product team reviews weekly adoption of Push-to-Capture Mode to decide whether to promote it more prominently in onboarding.

## Use Case 2
An admin builds a cohort retention view comparing users who attended one conference vs. three or more.

## Use Case 3
A platform admin exports last quarter's usage data to the BI tool for a board-level product review.

---

# 6. User Stories

## User Story 1
As a product-facing platform admin,
I want dashboards of the PRD's core product metrics,
so that I can track whether the product is delivering on its stated value proposition.

### Acceptance Criteria
- Dashboard shows % interactions captured, follow-up conversion rate, and daily conference usage, each with trend over time.
- Metrics can be filtered by conference type and date range.
- Metric definitions are documented and versioned so trend breaks from definition changes are explainable.

## User Story 2
As an on-call/data operator,
I want to be alerted when the usage-event ingestion pipeline drops or delays events,
so that product metrics don't silently become inaccurate.

### Acceptance Criteria
- Pipeline health (ingestion lag, drop rate) is monitored and surfaced on an operational dashboard.
- An alert fires if event ingestion lag exceeds a configured threshold.
- Backfill tooling exists to reprocess events after an outage is resolved.

---

# 7. User Workflow

1. Mobile/web client emits a usage event against the registered schema.
2. Event is ingested, validated, and enriched (user, conference, session context).
3. Event pipeline aggregates events into metric rollups on a scheduled cadence.
4. Admin opens the Usage Analytics dashboard and selects a metric, date range, and segment.
5. Admin drills into a funnel or cohort view for deeper analysis.
6. Admin exports data to BI tooling if deeper analysis is needed outside the platform.
7. Product team reviews trend and adoption data in a recurring product review.

---

# 8. UI / UX Requirements

- Metric definitions are visible via tooltip/info icon directly on each dashboard chart.
- Funnel views show drop-off percentage at each stage.
- Cohort views support standard retention curve visualization (day/week since first use).
- Segment filters (conference type, user tenure, platform) apply consistently across all metric views.
- Export action clearly states what data is included and its de-identification level.

---

# 9. Technical Requirements

## Frontend
Analytics dashboard module (React) with funnel builder, cohort visualizer, and metric-definition tooltips; supports segment filtering consistently applied across views.

## Backend
Event ingestion API with schema validation against a central event registry; an aggregation pipeline computing rollups (daily/weekly) and funnel/cohort tables; a metrics query API serving dashboard requests.

## AI/ML
No inference is performed for analytics itself; "summary accuracy" as a product metric is sourced from the AI Model Monitoring pipeline's correction-rate data (FEATURE-03) rather than computed independently.

## Infrastructure
Event pipeline must tolerate offline mobile clients replaying batched events after reconnect without double-counting, and must scale ingestion to conference-day traffic bursts.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Event Ingestion API | Accept usage events from clients (`POST /analytics/events`) |
| Metrics Query API | Retrieve computed product metrics (`GET /analytics/metrics/{metric_key}`) |
| Cohort API | Retrieve cohort/retention data (`GET /analytics/cohorts`) |
| AI Model Monitoring Service | Source summary-accuracy proxy data |
| BI Export Service | Scheduled export to external BI tooling |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| UsageEvent | event_id, event_name, user_id, conference_id, session_id, feature_key, properties_json, client_platform, client_event_time, ingested_at |
| MetricRollup | metric_key, segment, period_start, period_end, value, computed_at |
| EventSchema | event_name, version, required_properties, owner_team, deprecated_flag |

---

# 12. Security & Privacy

- Usage events are pseudonymized for aggregate reporting; direct user identifiers are separated from analytics-ready datasets.
- BI exports exclude PII and raw transcript/media references.
- Users who submit a data-deletion request have their historical usage events removed or irreversibly aggregated out.
- Access to user-level (non-aggregated) event data is role-restricted.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Event ingestion to dashboard availability | <15 min |
| Dashboard metric query | <2 sec p95 |
| Event ingestion loss rate | <0.1% |
| Offline-replay de-duplication accuracy | >99.9% |

---

# 14. Edge Cases

- Offline mobile client replays a batch of events after reconnect, causing duplicate counting if de-duplication fails.
- Battery-optimization throttling delays event flush, biasing "daily usage during conference" toward users with better connectivity.
- Event schema changes without version bump breaks downstream dashboards silently.
- A GDPR/CCPA deletion request must remove a user's historical events while preserving aggregate metric integrity.
- Time zone misalignment between conference-local time and UTC storage skews "daily usage" metrics.
- A new feature ships without instrumentation, leaving an adoption blind spot.

---

# 15. Dependencies

- Event schema registry and governance process
- Mobile/web client SDK for event emission (including offline queuing)
- AI Model Monitoring service for summary-accuracy proxy
- Identity platform for de-identification/pseudonymization

---

# 16. Risks

- Inconsistent event instrumentation across features undermines cross-feature funnel analysis.
- Metric definition changes without versioning create misleading trend breaks.
- Analytics events becoming a de facto second source of truth diverging from operational data.

---

# 17. Telemetry & Analytics

Track:
- `analytics_event_ingested`
- `analytics_event_duplicate_detected`
- `analytics_pipeline_lag_breach`
- `dashboard_metric_viewed`
- `funnel_report_generated`
- `bi_export_requested`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Event ingestion pipeline uptime | >99.9% |
| Product metric dashboard freshness | <15 min lag |
| Event schema compliance rate | >99% of events pass validation |
| Adoption of PRD product-metric dashboards among product team | >90% monthly active |

---

# 19. Future Enhancements

- Self-serve event schema registration workflow for feature teams.
- Predictive churn/retention modeling based on usage patterns.
- Automatic funnel discovery from event sequences.

---

# 20. Open Questions

- What is the canonical definition of an "interaction captured" for the % interactions captured metric across audio, image, and manual tag sources?
- Should usage analytics and product metrics dashboards live in the same admin console as operational dashboards, or a separate product-analytics surface?
- How long should raw (pre-aggregation) usage events be retained before mandatory aggregation/deletion?
