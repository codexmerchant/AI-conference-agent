# EPIC04 Feature 1 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-01 — Contact Creation

---

# User Story

As an admin,
I want contact creation to enforce strict PII handling, access control, and retention limits on raw capture media,
so that the product stays compliant while building its core dataset of third-party personal information.

---

# Business Value

- Protects the company from regulatory exposure (GDPR/CCPA) given contacts are third-party PII collected without the contact's direct consent to the app
- Establishes defensible data-retention practices for raw badge/business-card images
- Builds customer trust that captured personal data is handled responsibly
- Provides the audit trail needed to respond to data-subject access or deletion requests

---

# Acceptance Criteria

## Functional Criteria
- Raw badge/business-card images are auto-purged after the OCR reprocessing window expires
- All PII fields (email, phone) are encrypted at rest with a documented key-management scheme
- Contact creation requests are logged with user_id, source, and timestamp for audit purposes
- Data deletion requests cascade to delete the contact, its capture events, and any raw media

## UX Criteria
- Admin console shows PII retention status per capture source
- Data deletion/export requests are trackable to completion
- Admins can view (not edit) audit logs of contact-creation activity for compliance review

## Technical Criteria
- Encryption uses industry-standard algorithms (AES-256) with rotation support
- Raw media storage has an enforced TTL, not a manual cleanup process
- Audit logs are immutable and tamper-evident
- Access to raw capture media is restricted to the OCR processing service, not general application code paths

---

# Preconditions

- Encryption keys are provisioned and rotation is scheduled
- Data retention policy for raw media is defined and configured
- Admin role and audit-log access are provisioned

---

# Postconditions

- Raw media is deleted per policy after processing
- Every contact-creation event has a corresponding audit log entry
- Deletion requests produce an immutable deletion record

---

# Edge Cases

- Deletion request arrives while a contact is still mid-enrichment or mid-merge
- Raw media TTL expires before OCR processing completes due to a backlog
- Encryption key rotation occurs while capture events are in flight
- Audit log storage approaches capacity during a high-volume conference
- Cross-region data residency requirement for a specific user's captured data
- Admin needs to produce a full export of a user's contact-creation history for a compliance request

---

# Telemetry

Track:
- `raw_media_purged`
- `pii_encryption_applied`
- `contact_creation_audit_logged`
- `data_deletion_request_completed`
- `retention_policy_violation_detected`

---

# Dependencies

- Key management service (e.g., AWS KMS, Azure Key Vault)
- Immutable audit log storage
- Data deletion/export workflow engine
- Role-based access control (RBAC) system

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify raw badge image is purged after the configured retention window
2. Verify PII fields are encrypted at rest and unreadable without the decryption key
3. Verify every contact-creation request produces an audit log entry
4. Verify deletion request cascades to contact, capture events, and raw media
5. Verify encryption key rotation does not disrupt in-flight contact creation
6. Verify admin console accurately reflects retention status per source
7. Verify audit logs are immutable (cannot be edited or deleted by any role)
8. Verify data export request produces a complete, correctly-scoped record set
9. Verify access to raw media storage is restricted to the OCR processing path only

---

# Story Variation

This is user story variation 3 for Contact Creation, focusing on security, compliance, and administrative data governance.

---

# Notes

- Because contacts represent third parties who never opted into the app directly, retention and deletion discipline here carries more regulatory weight than most other product data
- Consider whether raw media purge timing needs to be configurable per region for data-residency requirements
