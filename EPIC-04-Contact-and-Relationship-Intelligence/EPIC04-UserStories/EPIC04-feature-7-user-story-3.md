# EPIC04 Feature 7 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-07 — Company Association

---

# User Story

As an admin,
I want company data access and merge operations scoped and audited as strictly as contact data,
so that company rosters cannot be used to infer or expose a user's private network to anyone else.

---

# Business Value

- Prevents company roster views from becoming an unintended cross-user data exposure vector
- Ensures company merges (which re-parent many contacts at once) carry the same audit rigor as contact merges
- Provides the governance evidence needed for enterprise customers evaluating data-handling practices
- Protects sensitive business relationship information (who works with which vendor/competitor) from leaking

---

# Acceptance Criteria

## Functional Criteria
- Company roster views (which contacts are linked to a company) are scoped strictly to the requesting user's own contacts, never showing another user's contacts even for the same real-world company
- Company merges reuse Duplicate Merging's authorization, transaction, and audit-log guarantees
- Company entity data (name, domain, industry) is treated as shared reference data, but the contact-company association itself is access-scoped and encrypted
- Deleting a contact removes the association but never deletes the shared Company entity out from under other users

## UX Criteria
- Admin console can show a company's canonical record without exposing which specific users are connected to it
- Company merge audit trail is reviewable with the same detail as contact merge history
- Access-scoping violations (e.g., an attempt to view another user's roster) are logged and alertable

## Technical Criteria
- Company entity storage is separated from the per-user ContactCompanyAssociation table, enforcing scoping at the query layer
- Company merge transactions re-parent associations atomically, consistent with Feature 3's guarantees
- Access logs record every company-roster query with requester identity

---

# Preconditions

- Company entity and association data models are separated per the access-scoping design
- RBAC is configured for company-merge authorization
- Audit logging covers both company entity changes and per-user association access

---

# Postconditions

- No company roster view has ever exposed another user's contacts
- Company merges are fully auditable and reversible per Duplicate Merging guarantees
- Access logs provide a complete trail for any company-data investigation

---

# Edge Cases

- Two users at competing firms both have contacts at the same shared vendor company entity — rosters must stay fully isolated
- A company merge re-parents associations belonging to many different users at once, requiring careful transaction scoping per user
- An admin investigation needs to confirm no cross-user data exposure occurred via a company roster bug
- Shared Company entity is queried by a user who has zero contacts there — must return an empty, not another user's, roster
- A company entity deletion request conflicts with other users' still-active associations to it
- Enterprise compliance review requests a full data-flow diagram proving company-roster isolation

---

# Telemetry

Track:
- `company_roster_access_scoped_correctly`
- `company_roster_access_violation_blocked`
- `company_merge_authorized`
- `company_entity_shared_query_logged`

---

# Dependencies

- Duplicate Merging (FEATURE-03), reused merge/audit infrastructure
- Role-based access control (RBAC) system
- Data access layer with per-user scoping enforcement
- Immutable audit log storage

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a company roster query never returns another user's contacts, even for the same canonical company
2. Verify a company merge re-parents associations correctly and atomically across potentially many users
3. Verify company merge authorization and audit trail match Duplicate Merging's guarantees
4. Verify a user with zero contacts at a shared company sees an empty roster, not an error or another user's data
5. Verify access logs capture every company-roster query with requester identity
6. Verify a simulated cross-user roster access attempt is blocked and logged
7. Verify company entity deletion is blocked or handled gracefully when other users still hold active associations
8. Verify a full data-flow trace can be produced to demonstrate roster isolation for a compliance review

---

# Story Variation

This is user story variation 3 for Company Association, focusing on cross-user data isolation and merge governance for shared company entities.

---

# Notes

- Company entities being shared reference data (unlike contacts, which are fully private) makes isolation at the association layer the critical control point
- This is a natural candidate for a dedicated security review given the shared-entity architecture
