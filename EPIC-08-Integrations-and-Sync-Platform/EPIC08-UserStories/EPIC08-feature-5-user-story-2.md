# EPIC08 Feature 5 User Story 2

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-05 — CRM Sync

---

# User Story

As an operator,
I want to monitor CRM sync failure rates, duplicate creation rates, and governor-limit throttling across all connected CRM instances,
so that I can catch a sync loop or bulk-sync overload before it degrades a customer's CRM data quality or hits their API limits.

---

# Business Value

- Prevents sync loops (webhook-triggered update re-pushed back to the CRM) from causing runaway API usage
- Protects customers' Salesforce governor limits and HubSpot/Affinity rate limits from being exhausted by our bulk sync jobs
- Reduces CRM data quality complaints caused by undetected duplicate record creation
- Provides the operational visibility needed to safely schedule large post-conference bulk-sync windows

---

# Acceptance Criteria

## Functional Criteria
- Operator dashboard surfaces per-connection sync success/failure rate, duplicate-match rate, and API usage against provider limits
- Sync loops (the same record updated back-and-forth beyond a defined threshold within a short window) are detected and automatically paused for review
- Bulk sync jobs are queued and rate-limited per provider's governor/API limits rather than bursting

## UX Criteria
- Dashboard flags connections approaching their provider's daily API limit before it is exhausted
- Sync-loop detection surfaces the specific record and field causing the loop
- Duplicate-creation rate is shown as a trend so a regression in the matching model is visible quickly

## Technical Criteria
- Idempotency keys prevent a CRM webhook-triggered update from being re-pushed as a new outbound sync
- Rate-limited queue enforces provider-specific quota rules with backoff on throttling responses (e.g., Salesforce `REQUEST_LIMIT_EXCEEDED`)
- Sync-loop detection logic is based on update frequency per record within a rolling time window, not a fixed count

---

# Preconditions

- CRM sync is deployed and actively syncing contacts for at least one connected instance
- Provider account has defined API/governor limits
- Observability/monitoring stack is configured to receive integration metrics

---

# Postconditions

- Sync health, duplicate rate, and API usage metrics are available on the operator dashboard on a rolling basis
- Detected sync loops are automatically paused and flagged for manual review
- Alerts fire when API usage or duplicate rate cross defined thresholds

---

# Edge Cases

- A CRM-side workflow rule modifies a synced field immediately after sync, triggering a webhook that looks like a legitimate sync loop but is actually expected CRM automation
- Bulk post-conference sync for a large event (500+ contacts) approaches a customer's daily Salesforce API limit
- Duplicate-match rate spikes due to a CRM-side data cleanup that merged records the app's mapping still references individually
- Multiple app users share write access to the same CRM instance, complicating per-connection attribution of sync volume
- A provider outage causes retries to queue up, and once the provider recovers, the retry burst itself risks tripping rate limits

---

# Telemetry

Track:
- `crm_sync_success_rate`
- `crm_sync_loop_detected`
- `crm_sync_loop_paused`
- `crm_duplicate_rate_rolling`
- `crm_api_limit_warning`

---

# Dependencies

- Salesforce REST/Bulk API, HubSpot CRM API, Affinity API and their respective rate/governor limits
- Observability/monitoring and alerting stack
- Rate-limited job queue infrastructure
- Webhook framework (for CRM-side change notifications)

---

# Priority

High

---

# Estimated Complexity

Medium-High

---

# QA Test Scenarios

1. Verify operator dashboard displays sync success/failure rate per CRM connection
2. Verify API usage against provider limits is tracked and a warning fires before exhaustion
3. Verify a simulated sync loop (repeated back-and-forth updates) is detected and automatically paused
4. Verify legitimate CRM-side workflow automation is not mistakenly flagged as a sync loop
5. Verify a bulk sync job throttles itself to stay within provider governor limits
6. Verify duplicate-match rate is computed correctly and a regression triggers an alert
7. Verify a retry burst after a provider outage recovery does not itself trip rate limits
8. Verify sync-loop pause requires explicit operator action to resume, not automatic re-enable

---

# Story Variation

This is user story variation 2 for CRM Sync, focusing on operational reliability, sync-loop prevention, and API/governor-limit management.

---

# Notes

- Sync-loop detection must be tuned carefully to avoid false positives against legitimate CRM automation (workflow rules, validation rules) that also modify synced fields
- Governor-limit awareness is especially important for Salesforce given its strict daily API call caps relative to HubSpot/Affinity
