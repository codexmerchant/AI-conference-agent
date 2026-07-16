# EPIC07 Feature 6 User Story 3

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-06 — Action-Item Extraction

---

# User Story

As an admin,
I want access control and audit trails over action items, especially those synced to external calendars or reminders,
so that commitment data doesn't leak into external systems without proper authorization and can be traced if disputed.

---

# Business Value

- Prevents unauthorized external sync from exposing commitment content to systems outside the organization's control
- Provides an audit trail useful for resolving disputes about who committed to what and when
- Supports compliance requirements around data minimization for external integrations
- Limits the blast radius of a compromised calendar/reminders integration token

---

# Acceptance Criteria

## Functional Criteria
- Calendar/reminders sync requires explicit per-integration opt-in with minimum-scope OAuth permissions
- Every external sync event is logged with the action item ID, destination integration, and authorizing user
- Action item access is scoped to the owning user and any explicitly authorized collaborators
- Deletion of a source meeting summary correctly cascades to its derived action items

## UX Criteria
- Admin console shows external sync configuration and a log of sync events per user
- Access-scope violations are visible and alertable in the admin console

## Technical Criteria
- OAuth tokens for calendar/reminders integrations are encrypted at rest and rotated per policy
- Sync failures are retried without bypassing the explicit opt-in scope
- Audit log entries for action-item access and sync are immutable and tamper-evident

---

# Preconditions

- Admin has verified permissions to view sync configuration and audit logs
- Calendar/reminders integration OAuth scopes are minimized and reviewed
- Cascading deletion logic between summaries and action items is implemented and tested

---

# Postconditions

- All external sync events are logged and attributable to an explicit authorization
- Cascading deletion correctly removes derived action items when their source summary is deleted
- Access-scope violations are logged and alertable

---

# Edge Cases

- A user revokes calendar sync mid-conference while several due-dated items are already synced externally
- Deletion of a source meeting summary occurs after its action item has already been synced to an external calendar
- A compromised integration token is used to read action-item data before detection
- Bulk deletion request spans an entire conference's worth of action items and their external sync records
- Two collaborators with shared access to a mutual-owner item have conflicting completion actions

---

# Telemetry

Track:
- External sync configuration and revocation events
- Sync event log entries by integration and user
- Cascading deletion events
- Access-scope violation attempts
- Token rotation events for sync integrations

---

# Dependencies

- Calendar/Reminders integration (Plugin/Integration Layer)
- Key management service (KMS)
- Role-based access control (RBAC) system
- Audit logging infrastructure

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify calendar/reminders sync requires explicit opt-in and cannot be enabled implicitly
2. Verify every sync event is logged with action item ID, destination, and authorizing user
3. Verify revoking sync access stops further external writes immediately
4. Verify cascading deletion removes derived action items when the source summary is deleted
5. Verify a compromised token's access is detectable via audit log review
6. Verify bulk deletion correctly removes both action items and their external sync records
7. Verify conflicting completion actions on a mutual-owner item are resolved deterministically and logged
8. Verify OAuth tokens are encrypted at rest and never exposed via API or logs

---

# Story Variation

This is user story variation 3 for Action-Item Extraction, focusing on external-sync authorization, cascading deletion integrity, and audit compliance.

---

# Notes

- External sync is the primary data-exfiltration risk surface for this feature since action items can contain business-sensitive commitment details.
- Cascading deletion correctness matters more here than in most features because action items are a second-order derived artifact with their own external sync footprint.
