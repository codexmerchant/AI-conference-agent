# EPIC08 Feature 6 User Story 2

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-06 — Contacts Sync

---

# User Story

As an operator,
I want to monitor merge-conflict rates and push failure rates across all connected address book providers,
so that I can detect a matching model regression or a provider-specific push failure pattern before it erodes trust in auto-push.

---

# Business Value

- Protects the value proposition of auto-push by catching duplicate-creation regressions early
- Reduces user-visible failures during high-volume post-conference bulk pushes
- Surfaces provider-specific quirks (e.g., iCloud device-sync latency) that need different SLAs than server-to-server providers
- Prevents merge-conflict fatigue that would otherwise erode confidence in the auto-push feature

---

# Acceptance Criteria

## Functional Criteria
- Operator dashboard surfaces per-provider push success rate, duplicate-match rate, and merge-conflict rate
- Bulk push failures during a post-conference sync are grouped and surfaced as a single incident rather than N individual alerts
- Operator can drill into a specific failed push to see the underlying provider error

## UX Criteria
- Dashboard distinguishes iCloud (device-mediated) sync latency from Google/Outlook (server-to-server) sync latency
- Merge-conflict rate trend is visible so a regression in the fuzzy matching model is caught quickly
- Alerts link directly to the affected connection's detail view

## Technical Criteria
- Push failures are logged with provider-specific error codes, not a generic failure message
- Merge-conflict rate is computed as a rolling metric from `contact_merge_conflict_resolved` events
- Bulk push jobs are queued with backoff so a provider-side rate limit does not cascade into a full batch failure

---

# Preconditions

- Contacts sync is deployed and actively pushing contacts for at least one connected provider
- Observability/monitoring stack is configured to receive integration metrics
- Operator has access to the integrations admin dashboard

---

# Postconditions

- Push success, duplicate, and merge-conflict metrics are available on the operator dashboard on a rolling basis
- Grouped bulk-failure incidents are surfaced distinctly from isolated individual failures
- Alerts fire when any rate crosses a defined threshold

---

# Edge Cases

- A large post-conference bulk push (100+ contacts) hits a provider rate limit partway through, requiring the operator view to show partial completion clearly
- iCloud device-mediated sync appears "stuck" from the server's perspective even though it will complete once the user's device comes online
- Merge-conflict rate spikes due to a batch of contacts with unusually similar names (e.g., a large delegation from one company)
- A provider changes their API response format, causing push failures to be miscategorized until the parser is updated
- Multiple address book providers connected simultaneously for one user complicate per-provider attribution of failures

---

# Telemetry

Track:
- `contact_push_success_rate`
- `contact_push_failed`
- `contact_duplicate_match_rate_rolling`
- `contact_merge_conflict_rate_rolling`
- `contact_bulk_push_incident_grouped`

---

# Dependencies

- Google People API / Apple Contacts framework / Microsoft Graph People API
- Observability/monitoring and alerting stack
- Fuzzy matching/dedupe service (shared with CRM Sync)
- Rate-limited job queue infrastructure

---

# Priority

Medium

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify operator dashboard displays push success rate, duplicate-match rate, and merge-conflict rate per provider
2. Verify a bulk push hitting a provider rate limit shows partial completion rather than a blanket failure
3. Verify iCloud device-mediated sync latency is displayed distinctly from Google/Outlook sync latency
4. Verify a merge-conflict rate spike is detected and flagged within the monitoring window
5. Verify push failures include provider-specific error codes in the operator-facing log
6. Verify grouped bulk-failure incidents are presented as a single incident rather than fragmented alerts
7. Verify per-provider attribution is correct when a user has multiple address book providers connected
8. Verify a simulated provider API format change is caught by monitoring rather than silently miscategorized

---

# Story Variation

This is user story variation 2 for Contacts Sync, focusing on operational reliability, provider-specific failure patterns, and merge-conflict monitoring.

---

# Notes

- iCloud's device-mediated sync model is architecturally different from Google/Outlook's server-to-server model and needs its own latency expectations in monitoring, not a shared SLA
- Merge-conflict rate is a useful proxy metric for fuzzy-matching model health across both Contacts Sync and CRM Sync since they share matching infrastructure
