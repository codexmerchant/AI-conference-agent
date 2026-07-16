# EPIC07 Feature 3 User Story 3

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-03 — Daily Summaries

---

# User Story

As an admin,
I want control over digest data retention, delivery-channel security, and access to digest history,
so that daily rollups of potentially sensitive interaction data are governed the same as their underlying source records.

---

# Business Value

- Ensures aggregated digest content doesn't become a compliance blind spot separate from the source summaries it's built from
- Protects delivery channels (email/push) from being an unintended data-leakage vector
- Supports data-retention and deletion policy consistently across both raw and aggregated artifacts
- Provides audit visibility into who can access historical digests for a user or account

---

# Acceptance Criteria

## Functional Criteria
- Digest access inherits the same access-control scope as the underlying source summaries
- Digest delivered via email never includes raw transcript text, only generated summary-level content
- Deleting a source meeting summary correctly removes or redacts its contribution from any already-generated digest
- Digest history respects the account's configured data-retention window

## UX Criteria
- Admin console shows digest delivery-channel configuration and can audit which channels are active per user
- Deletion/redaction propagation to historical digests is visible and confirmable in the admin console

## Technical Criteria
- Email delivery transport is encrypted end-to-end (TLS) and does not persist digest content in third-party mail-relay logs beyond required delivery metadata
- Retention auto-purge applies consistently to `DailySummary` records alongside their source `MeetingSummary` records
- Redaction propagation is auditable with a record of what was removed and when

---

# Preconditions

- Admin has verified permissions to view delivery-channel configuration and retention settings
- Retention and redaction policies are defined at the account level
- Audit logging is active for digest access and modification events

---

# Postconditions

- Digest access and delivery are fully auditable
- Redaction of a deleted source summary is reflected in any dependent digest within a bounded time window
- Retention policy is enforced consistently across summaries and digests

---

# Edge Cases

- A source meeting summary is deleted after its content already appears in a delivered digest
- Retention window expires for a `MeetingSummary` still referenced by an undeleted `DailySummary`
- Email delivery channel is misconfigured to route through an unapproved third-party relay
- Bulk retention purge spans an entire conference's digest history
- Admin revokes a user's access mid-digest-generation

---

# Telemetry

Track:
- Digest access events by user and role
- Redaction propagation events
- Retention auto-purge events for digests
- Delivery-channel configuration changes
- Access violations on digest history

---

# Dependencies

- FEATURE-01 Meeting Summaries (source data and deletion cascade)
- Data deletion/redaction workflow engine
- Encrypted email delivery infrastructure
- Audit logging infrastructure

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify digest access is restricted to the same scope as its underlying source summaries
2. Verify email-delivered digests never contain raw transcript text
3. Verify deleting a source summary triggers redaction propagation to dependent digests
4. Verify retention auto-purge applies consistently across summaries and digests
5. Verify redaction propagation is logged with what was removed and when
6. Verify bulk retention purge completes correctly for an entire conference's digest history
7. Verify delivery-channel configuration changes are logged and auditable
8. Verify access revoked mid-generation does not leave an accessible orphaned digest

---

# Story Variation

This is user story variation 3 for Daily Summaries, focusing on retention governance, redaction propagation, and delivery-channel security.

---

# Notes

- Redaction propagation is the trickiest governance requirement here — an aggregated digest must not become a way to retain data a user has otherwise deleted at the source.
- Delivery-channel security matters because digests are pushed outward (email) rather than only pulled inward, increasing exposure surface.
