# EPIC07 Feature 5 User Story 3

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-05 — Opportunity Detection

---

# User Story

As an admin,
I want control over what opportunity data is pushed to external CRMs and who can configure persona-based detection for an account,
so that sensitive deal/opportunity signals are never exported without explicit authorization.

---

# Business Value

- Prevents accidental leakage of sensitive deal or hiring signals into a connected CRM without explicit confirmation
- Supports enterprise customers who require approval workflows before opportunity data leaves the platform
- Provides an audit trail for compliance review of what opportunity data was shared externally and by whom
- Limits configuration drift by controlling who can change persona/opportunity-type settings for managed accounts

---

# Acceptance Criteria

## Functional Criteria
- Pushing an opportunity to a connected CRM requires explicit per-push user confirmation, never automatic sync
- Admin can restrict which users/roles are permitted to configure persona-based detection settings
- Every CRM push is logged with the opportunity ID, destination CRM, and the user who authorized it
- Opportunity data at rest is encrypted and access-scoped the same as its source meeting summary

## UX Criteria
- Admin console shows a log of all opportunity-to-CRM push events, filterable by user and date
- Persona-configuration change history is visible to admins for audit purposes

## Technical Criteria
- CRM push integration enforces minimum-scope OAuth permissions and does not retain opportunity data beyond what's needed for the push
- Push failures are retried with the same explicit-confirmation guarantee (no silent auto-retry that bypasses confirmation)
- Persona-configuration changes are versioned with who made the change and when

---

# Preconditions

- Admin has verified permissions to configure CRM push policy and persona-configuration restrictions
- CRM integration OAuth scopes are minimized and reviewed
- Audit logging is active for opportunity push and configuration-change events

---

# Postconditions

- All CRM pushes are logged and attributable to an explicit user confirmation
- Persona-configuration changes are auditable with full change history
- No opportunity data leaves the platform without an explicit, logged authorization

---

# Edge Cases

- A user attempts to push an opportunity to a CRM integration that has since been revoked
- Bulk CRM push requested for many opportunities at once, requiring confirmation for each or a clearly scoped batch confirmation
- Admin restricts persona-configuration changes mid-conference while a user has an active detection session
- CRM push partially succeeds (opportunity created but a field mapping fails)
- Opportunity data pushed to a CRM needs to be later deleted/retracted following a user's deletion request

---

# Telemetry

Track:
- Opportunity-to-CRM push events with authorizing user
- Push failures and retry outcomes
- Persona-configuration change events
- Access-restriction violations (unauthorized configuration attempts)
- CRM integration token health events

---

# Dependencies

- CRM integrations (Salesforce/HubSpot/Affinity) via the Plugin/Integration Layer
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

1. Verify CRM push requires explicit per-push confirmation and cannot be triggered automatically
2. Verify every CRM push is logged with opportunity ID, destination, and authorizing user
3. Verify a user without configuration permissions cannot change persona/opportunity-type settings
4. Verify persona-configuration change history is complete and attributable
5. Verify a partially failed CRM push does not leave inconsistent state without an error surfaced
6. Verify a deletion request correctly retracts previously pushed opportunity data from the CRM where supported
7. Verify revoked CRM integration tokens block further pushes immediately
8. Verify bulk push confirmation is scoped clearly and does not silently include unintended opportunities

---

# Story Variation

This is user story variation 3 for Opportunity Detection, focusing on external data-sharing authorization, CRM push governance, and configuration access control.

---

# Notes

- Opportunity data is inherently sensitive (it often describes another party's confidential business intentions), which makes outbound CRM sharing the highest-risk data-flow in this feature.
- Explicit-confirmation-per-push is a deliberate friction point that should not be optimized away without a compensating control.
