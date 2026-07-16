# EPIC07 Feature 7 User Story 3

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-07 — Executive Summaries

---

# User Story

As an admin,
I want enforceable redaction policy and revocable, audited sharing controls for executive summaries,
so that leadership/board-tier content can never expose contact-level PII inappropriately and every share can be traced and revoked.

---

# Business Value

- Prevents the single highest-exposure artifact in the reporting layer (an outward-shared summary) from leaking contact PII
- Supports enterprise/organizational policy requiring a second confirmation step before board-level sharing
- Provides the audit trail required to demonstrate compliant handling of shared business intelligence
- Enables immediate revocation of a share if it was sent in error or to the wrong recipient

---

# Acceptance Criteria

## Functional Criteria
- Leadership/board tier defaults to redacted contact-level detail unless the user explicitly opts to include it, with that opt-in itself logged
- Sharing action requires a distinct, explicit confirmation step separate from generation, showing exactly what will be shared
- Share links are tokenized, expirable, and revocable by the user or an admin at any time
- Revoking a share link immediately invalidates access, including for anyone who already opened it previously

## UX Criteria
- Admin console shows all active and revoked share links with their audience tier and redaction status
- Preview-before-share view is mandatory and cannot be bypassed for leadership/board tier

## Technical Criteria
- Redaction policy is enforced server-side at generation time, not just hidden in the client UI
- Revocation is enforced at the token-validation layer so a cached or offline copy of the link cannot bypass it going forward
- All share and revocation actions are recorded in an immutable audit log with actor identity

---

# Preconditions

- Admin has verified permissions to view and revoke share links
- Redaction policy is defined and versioned for each audience tier
- Audit logging is active for share/revoke actions

---

# Postconditions

- All shares and revocations are immutably logged with actor identity and timestamp
- Redaction policy is consistently enforced server-side regardless of client
- Revoked links are unusable immediately, with no bypass path

---

# Edge Cases

- User opts to include contact-level detail in a board-tier share, requiring an explicit additional confirmation and audit entry
- Admin revokes a share link while the recipient's browser tab is still open with cached content
- A share link is forwarded beyond the intended recipient before revocation
- Redaction policy version changes between when a summary was generated and when it is later re-shared
- Bulk revocation is requested across all active share links for a departing employee's account

---

# Telemetry

Track:
- Share and revocation events with actor identity
- Explicit opt-in-to-include-PII events
- Redaction policy version per shared summary
- Post-revocation access attempts (should be blocked and logged)
- Bulk revocation events

---

# Dependencies

- Sharing/permissions service
- Redaction-rule engine
- Role-based access control (RBAC) system
- Audit logging infrastructure

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify leadership/board tier redacts contact-level PII by default
2. Verify explicit opt-in to include PII is logged with actor identity
3. Verify the preview-before-share step cannot be bypassed for leadership/board tier
4. Verify revocation immediately blocks access, including for previously opened links
5. Verify a post-revocation access attempt is blocked and logged
6. Verify redaction policy is enforced server-side even if client-side rendering is bypassed
7. Verify bulk revocation correctly invalidates all active share links for a specified account
8. Verify audit log captures complete share/revoke history with correct actor attribution
9. Verify redaction-policy version is recorded and retrievable for any previously shared summary

---

# Story Variation

This is user story variation 3 for Executive Summaries, focusing on redaction enforcement, share revocation, and audit compliance for outward-facing content.

---

# Notes

- Server-side redaction enforcement is non-negotiable — client-side-only redaction would be trivially bypassable and unacceptable for board-tier content.
- Revocation must defeat already-cached client views, which has real implementation cost (short-lived signed URLs, server-side validation on every fetch) that should be planned for explicitly.
