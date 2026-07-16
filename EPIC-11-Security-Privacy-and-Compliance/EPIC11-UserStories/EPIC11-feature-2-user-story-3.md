# EPIC11 Feature 2 User Story 3

## Epic
EPIC-11 — Security, Privacy & Compliance

## Feature
FEATURE-02 — Encryption Platform

---

# User Story

As an admin,
I want to configure and control customer-managed encryption keys (CMK) for my organization, including irreversible key revocation,
so that I can meet my enterprise's data sovereignty requirements and guarantee crypto-shredding on demand.

---

# Business Value

- Meets enterprise procurement requirements for customer-controlled encryption keys
- Enables guaranteed, irreversible data destruction independent of application-layer deletion logic
- Supports data residency and sovereignty commitments for regulated customers
- Provides auditable evidence of encryption key governance for SOC 2 and enterprise security reviews

---

# Acceptance Criteria

## Functional Criteria
- Admin can register a customer-managed KEK from their own KMS/HSM and assign it to their org's key scope
- Admin can revoke a CMK, which immediately and irreversibly renders all objects wrapped by it undecryptable
- CMK revocation is a distinct, explicitly confirmed action separate from standard data deletion

## UX Criteria
- Admin console clearly warns that CMK revocation is irreversible before allowing confirmation
- CMK status (active, rotating, revoked) is visible at all times in the admin console
- Admin receives a summary of the scope of data affected before confirming revocation

## Technical Criteria
- CMK registration validates the provided key's permissions and reachability before activation
- Revocation is logged to Audit Logging synchronously as an irreversible security event
- Active AI processing jobs holding objects wrapped by a revoked CMK fail gracefully rather than crashing

---

# Preconditions

- Admin has org-level permissions verified through the Access Control Framework
- Customer's external KMS/HSM is reachable and properly configured for key sharing
- No conflicting rotation job is in progress for the target key scope

---

# Postconditions

- CMK registration or revocation status is reflected accurately across all dependent services
- Revocation event and its full scope are permanently recorded in the audit trail
- Any object wrapped by a revoked CMK becomes permanently inaccessible, consistent with crypto-shredding intent

---

# Edge Cases

- Admin revokes a CMK while active AI processing jobs still hold objects wrapped by that key
- Customer's external KMS becomes unreachable during a CMK registration attempt
- CMK revocation is triggered accidentally and the admin requests review of the confirmation workflow
- A rotation job for the org's key scope is in progress when a revocation request arrives
- Customer revokes a CMK covering data currently under a legal hold
- Multiple admins with CMK management permissions attempt conflicting actions simultaneously

---

# Telemetry

Track:
- `cmk_registered`
- `cmk_revoked`
- `cmk_registration_failed`
- `cmk_scope_impact_calculated`
- `cmk_revocation_confirmed`

---

# Dependencies

- Customer-hosted KMS/HSM
- Access Control Framework (Feature 4)
- Audit Logging (Feature 5)
- Data Retention Policies (Feature 3) for legal hold conflicts

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify CMK registration validates key reachability and permissions before activation
2. Verify CMK revocation immediately renders wrapped objects undecryptable
3. Verify revocation requires an explicit, distinct confirmation step separate from standard deletion
4. Verify revocation event is synchronously written to the audit log with full scope detail
5. Verify active AI jobs holding revoked-key objects fail gracefully with a clear error
6. Verify revocation is blocked or flagged when the target scope includes data under legal hold
7. Verify concurrent CMK actions by multiple admins do not corrupt key state
8. Verify CMK status is accurately reflected in the admin console at all times
9. Verify audit trail captures the complete scope of data affected by a revocation

---

# Story Variation

This is user story variation 3 for Encryption Platform, focusing on enterprise-grade customer-managed key governance and irreversible crypto-shredding controls.

---

# Notes

- CMK revocation should be treated with the same operational rigor as an irreversible account deletion — multi-step confirmation and clear scope disclosure.
- Consider requiring a cooling-off period or secondary approval for CMK revocation on large enterprise scopes.
