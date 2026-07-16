# FEATURE-02 — Centralized Logging

## Epic
EPIC-13 — Admin, Observability & Operations

---

# 1. Objective

Aggregate structured logs from mobile clients, backend services, and AI agents into one searchable, correlation-linked log store.

---

# 2. Problem Statement

Logs today would be scattered across the iOS app, cloud services, and nine independent AI agents. Diagnosing a single failed transcription requires manually cross-referencing capture logs, transcription-service logs, and diarization-agent logs with no shared identifier, which is slow and error-prone during a live conference incident.

---

# 3. Feature Overview

A centralized log ingestion and search pipeline that normalizes logs from every service and client into a structured schema keyed by correlation and trace IDs, with retention tiering and PII redaction applied at ingest time.

---

# 4. Key Functionalities

## Structured log ingestion
All services and the mobile client emit structured (JSON) logs with mandatory correlation_id, trace_id, and service_name fields.

## Correlation-based trace view
Given a correlation_id, retrieve the full ordered sequence of log entries across every service that touched that request or session.

## Full-text and faceted search
Search logs by free text, service, severity, conference_id, or time range, with saved search queries.

## PII redaction at ingest
Sensitive fields (raw transcript text, attendee names, email addresses) are automatically redacted or tokenized before indexing.

## Tiered retention
High-resolution logs retained short-term (hot), downsampled/archived logs retained long-term (cold) for compliance and trend analysis.

---

# 5. Primary Use Cases

## Use Case 1
An on-call operator pastes a correlation_id from an error alert into log search to see the full cross-service trace for that failed request.

## Use Case 2
A support engineer searches logs by conference_id and time range to reconstruct what happened during a user-reported capture failure.

## Use Case 3
A compliance admin exports redacted logs for a specific date range to satisfy a data retention audit.

---

# 6. User Stories

## User Story 1
As a support engineer,
I want to search logs by conference_id and time range,
so that I can reconstruct the sequence of events behind a user-reported issue without contacting engineering.

### Acceptance Criteria
- Search returns matching log entries within 3 seconds for a 24-hour window.
- Results are ordered chronologically and show service_name and severity per entry.
- Search supports filtering by severity (debug, info, warn, error, critical).

## User Story 2
As an on-call operator,
I want to pivot from a correlation_id to the full cross-service log trace,
so that I can diagnose multi-agent failures without manually cross-referencing each service's logs.

### Acceptance Criteria
- Trace view returns all log entries sharing a correlation_id across all services in chronological order.
- Missing spans in the trace (a service that didn't log for that correlation_id) are visually flagged.
- Trace view link is directly reachable from an alert or error group in FEATURE-07.

---

# 7. User Workflow

1. Operator receives an alert containing a correlation_id or opens a dashboard drill-down.
2. Operator opens Centralized Logging and pastes/selects the correlation_id.
3. System returns the ordered cross-service log trace.
4. Operator filters by severity or service to isolate the failure point.
5. Operator inspects redacted log payloads for root cause.
6. Operator saves the search or exports the trace to an incident ticket.
7. Operator confirms retention/redaction policy was applied correctly if PII-adjacent data was involved.

---

# 8. UI / UX Requirements

- Search bar supports both free text and structured filter chips (service, severity, conference_id, correlation_id).
- Trace view renders as a chronological timeline with per-service color coding.
- Redacted fields are visually marked (e.g., `[REDACTED]`) rather than silently omitted.
- Log detail panel supports copy-to-clipboard of raw structured payload for authorized roles.
- Saved searches appear in a sidebar for quick reuse during recurring incident types.

---

# 9. Technical Requirements

## Frontend
Admin console log search UI (React) with filter chips, a virtualized results list for high-volume queries, and a timeline-style trace view component.

## Backend
Log ingestion API accepting structured JSON from all services and the mobile client; a redaction/normalization pipeline applied before indexing; a search service backed by an inverted index supporting full-text and faceted queries at conference-peak volume.

## AI/ML
PII redaction uses a lightweight classifier/pattern pipeline to detect names, emails, and transcript fragments within free-text log messages before indexing; no generative inference is performed on log content.

## Infrastructure
Log storage is tiered: a hot, fast-search index for recent (e.g., 14-day) logs, and a cold, compressed archive for long-term retention; ingestion must handle burst volume from conference-day traffic spikes without dropping entries.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Log Ingestion API | Accept structured log entries from services/clients (`POST /logs/ingest`) |
| Log Search API | Query logs by filters/free text (`GET /logs/search`) |
| Trace API | Retrieve full cross-service trace for a correlation_id (`GET /logs/{correlation_id}/trace`) |
| Error Tracking Service | Deep-link from an error group to its underlying log trace |
| Identity/Access Service | Enforce role-based access to unredacted log detail |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| LogEntry | log_id, correlation_id, trace_id, service_name, agent_name, severity, message, redacted_flag, conference_id, user_id_hashed, timestamp |
| SavedSearch | search_id, admin_id, query_json, name, created_at |
| RetentionPolicy | policy_id, log_category, hot_retention_days, cold_retention_days, redaction_rule |

---

# 12. Security & Privacy

- Raw transcript text, attendee names, and contact details are redacted or tokenized before indexing.
- Unredacted log detail access is restricted to a limited admin role and itself audit-logged.
- Log export requires justification metadata and is recorded in the audit log.
- Retention periods comply with regional data-retention requirements and user-initiated deletion requests.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Log search query (24h window) | <3 sec p95 |
| Log ingestion throughput | Sustains conference-peak burst without drops |
| Trace retrieval by correlation_id | <1 sec p95 |
| Hot-tier log availability | 14 days minimum |

---

# 14. Edge Cases

- A correlation_id is missing or dropped when crossing a service boundary, breaking the trace chain.
- Log ingestion volume spikes during a conference-day surge and threatens to overwhelm the pipeline.
- PII leaks into a free-text log message field and bypasses the redaction pattern.
- A wide date-range search times out due to index size.
- Clock skew between services causes trace entries to appear out of chronological order.
- A deleted user's historical logs must be purged on a right-to-erasure request while preserving aggregate operational metrics.

---

# 15. Dependencies

- Structured logging standard adopted by every service and the mobile client
- PII redaction/classification pipeline
- Error tracking service (FEATURE-07) for alert-to-log linking
- Identity/access platform for role-scoped log access

---

# 16. Risks

- Inconsistent adoption of the structured log schema across services undermines correlation-based tracing.
- Aggressive redaction can strip context needed for debugging; too little redaction risks PII exposure.
- Log volume growth outpaces storage/indexing capacity without proactive tiering.

---

# 17. Telemetry & Analytics

Track:
- `log_search_executed`
- `log_trace_viewed`
- `log_correlation_id_missing`
- `log_ingestion_dropped`
- `log_export_requested`
- `pii_redaction_applied`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Traces with complete cross-service coverage | >98% |
| Log search p95 latency | <3 sec |
| Ingestion drop rate during peak load | <0.1% |
| PII redaction false-negative rate | <0.5% |

---

# 19. Future Enhancements

- Natural-language log query ("show me all diarization failures for conference X yesterday").
- Automatic anomaly detection on log pattern shifts (e.g., sudden spike in a specific error message).
- Log-to-incident auto-summarization using AI.

---

# 20. Open Questions

- What hot-tier retention window balances search performance against storage cost?
- Should mobile client logs be uploaded in real time or batched on next sync?
- Who owns approving exceptions when redaction removes data engineering needs for debugging?
