# EPIC13 Feature 2 User Story 1

## Epic
EPIC-13 — Admin, Observability & Operations

## Feature
FEATURE-02 — Centralized Logging

---

# User Story

As a platform admin,
I want to search logs by conference, service, and time range from a single interface,
so that I can reconstruct what happened during an incident without contacting engineering for each service's logs individually.

---

# Business Value

- Cuts investigation time for support and admin-driven incident reconstruction
- Removes dependency on engineering to pull logs for routine investigations
- Provides a consistent, structured view across mobile client and backend services
- Reduces duplicate effort when the same incident is investigated by multiple team members

---

# Acceptance Criteria

## Functional Criteria
- Search supports filtering by conference_id, service_name, severity, and time range
- Search results return within 3 seconds for a 24-hour window
- Log entries display service_name, severity, and a structured message body
- Saved searches can be created, named, and reused

## UX Criteria
- Filter chips are combinable and clearly show the active query
- Results list supports pagination/virtualized scrolling for large result sets
- Severity levels are visually color-coded for quick scanning

## Technical Criteria
- All log entries include mandatory correlation_id and trace_id fields at ingest
- Search queries are scoped to the admin's role permissions
- PII-adjacent fields are redacted by default in search results

---

# Preconditions

- Admin is authenticated with log search permission
- Services and mobile client are emitting structured logs to the ingestion pipeline
- The target conference/time range has completed log ingestion (not still buffering)

---

# Postconditions

- Admin has a reconstructed timeline of events for the investigated conference/incident
- Search query is optionally saved for reuse in similar future investigations
- Telemetry is recorded for search usage patterns to inform future search UX improvements

---

# Edge Cases

- A search spans a very wide date range and risks timing out against the log index
- Logs for a very recent event have not yet finished ingesting/indexing when the admin searches
- A correlation_id is missing from one service's log entry, breaking the ability to fully reconstruct the timeline
- Search results include a large volume of low-severity noise that obscures the relevant entries
- An admin without full permission attempts to search logs outside their tenant/role scope

---

# Telemetry

Track:
- `log_search_executed`
- `log_search_saved`
- `log_search_result_count`
- `log_search_timeout`
- `log_search_permission_denied`

---

# Dependencies

- Structured logging standard adopted across all services and the mobile client
- Log ingestion and indexing pipeline
- RBAC/identity platform for scoped access

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify search by conference_id returns all relevant log entries across services
2. Verify combined filter (service + severity + time range) narrows results correctly
3. Verify search completes within 3 seconds for a 24-hour window
4. Verify saved search can be recalled and re-executed
5. Verify PII-adjacent fields appear redacted in default search results
6. Verify search behavior for logs still in the ingestion buffer
7. Verify role-scoped search restricts results to permitted tenants/conferences
8. Verify wide date-range search handles gracefully without a hard failure

---

# Story Variation

This is user story variation 1 for Centralized Logging, focusing on the platform admin's functional search-and-reconstruct workflow.

---

# Notes

- Saved searches are a strong candidate for turning into reusable runbook steps for recurring incident types.
- Default redaction should be conservative; unredacted access is a separate, more restricted capability (see story 3).
