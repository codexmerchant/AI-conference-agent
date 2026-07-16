# EPIC04 Feature 6 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-06 — Meeting Association

---

# User Story

As an admin,
I want meeting associations to strictly inherit the consent and access boundaries of their underlying session recordings,
so that an association can never expose or imply interaction data the user never had permission to capture.

---

# Business Value

- Ensures the knowledge graph never contains relationship edges built on non-consented recordings
- Prevents a downstream feature (scoring, timeline) from inadvertently surfacing data that should have been excluded
- Provides a clean audit trail linking every association to a specific, consent-verified source event
- Protects against a cascading privacy violation when a source recording's consent status changes retroactively

---

# Acceptance Criteria

## Functional Criteria
- An association can only be created from a capture event whose underlying recording/session had valid consent at capture time
- If a source session's consent is later revoked or found invalid, all associations derived from it are flagged and cascaded for review or removal
- Association records are access-scoped to the owning user only, never exposed to the associated contact or other users
- Deleting a session or conversation cascades a soft-delete to its associations while preserving contact-level history integrity

## UX Criteria
- Admin console can trace any association back to its source consent record
- A consent-revocation event surfaces which associations (and downstream scores/timeline entries) are affected
- Cascading soft-deletes are visible in an auditable state, not silently applied

## Technical Criteria
- Consent status is checked at the point of association creation, not assumed from the session level alone
- Cascading consent-revocation logic is transactional and does not leave partially-updated association state
- Association audit records are immutable and retained per data-retention policy

---

# Preconditions

- Consent tracking is available at the session/recording level
- Cascading deletion/flagging logic is implemented for consent revocation
- RBAC restricts association-audit access to authorized admin roles

---

# Postconditions

- No association exists that traces back to a non-consented recording
- Consent revocation on a source session is fully reflected across all derived associations
- Association audit trail is complete and access-controlled

---

# Edge Cases

- Consent is revoked on a session after its associations have already fed relationship scores and timeline entries
- A session partially covers a period of valid consent and a period after consent lapsed (e.g., recording continued after the user paused)
- Cascading deletion needs to distinguish between the association record and the contact/timeline data it fed, which may need to persist in de-identified form
- An admin investigation requires proving a specific association was created under valid consent at the time
- A bug allows an association to be created from a capture event with ambiguous consent status
- Multiple associations reference the same revoked session and must all be processed consistently in one cascade

---

# Telemetry

Track:
- `meeting_association_consent_verified`
- `meeting_association_consent_check_failed`
- `meeting_association_consent_revocation_cascade`
- `meeting_association_audit_trace_generated`

---

# Dependencies

- Consent tracking on recordings/sessions (EPIC-01/EPIC-02)
- Cascading deletion/flagging workflow engine
- Role-based access control (RBAC) system
- Immutable audit log storage

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify an association cannot be created from a capture event lacking valid consent
2. Verify revoking consent on a session triggers a cascade that flags all derived associations
3. Verify the cascade is transactional and does not leave partially-flagged state on failure
4. Verify association records are inaccessible to any user other than the owning user
5. Verify deleting a session soft-deletes its associations while preserving contact-level history integrity
6. Verify an admin can trace an association back to its source consent record
7. Verify a session with mixed consent periods correctly excludes the non-consented portion's associations
8. Verify audit trail entries for associations are immutable once written

---

# Story Variation

This is user story variation 3 for Meeting Association, focusing on consent inheritance, cascading privacy enforcement, and auditability.

---

# Notes

- This feature is the bridge between raw recording consent (EPIC-01/02) and the persistent knowledge graph — consent enforcement must be airtight here since it's the last checkpoint before data becomes durable relationship history
- Cascading consent revocation is complex enough to warrant a dedicated design review before implementation
