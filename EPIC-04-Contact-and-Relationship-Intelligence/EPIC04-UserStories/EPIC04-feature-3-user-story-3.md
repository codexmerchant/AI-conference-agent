# EPIC04 Feature 3 User Story 3

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-03 — Duplicate Merging

---

# User Story

As an admin,
I want merge and undo operations to be fully access-controlled and auditable,
so that data-loss incidents can be investigated and irreversible mistakes are prevented.

---

# Business Value

- Prevents unauthorized or accidental merges from destroying relationship history
- Provides the audit evidence needed to investigate a data-loss complaint
- Enforces that only the contact owner (or an authorized delegate) can trigger a merge
- Ensures merge snapshots are retained and protected long enough to make undo a real guarantee, not just a UI promise

---

# Acceptance Criteria

## Functional Criteria
- Merge and undo actions require the same ownership/authorization as editing either source contact
- Merge snapshots are encrypted at rest and access-logged when retrieved for an undo or investigation
- Permanent deletion of a merged-away record is a separate, explicitly-authorized action from the merge itself
- Merge history is retained per the account's data retention policy and is exportable for compliance requests

## UX Criteria
- Admin console shows a full merge history per contact, including who performed each merge and when
- Data-loss investigation view can reconstruct the exact pre-merge state from the snapshot
- Merge/undo actions performed by an admin on behalf of a user are clearly attributed and distinguishable from user-initiated actions

## Technical Criteria
- Authorization checks occur server-side on every merge/undo request, not just in the client UI
- Snapshot storage uses the same encryption and key-management scheme as primary contact data
- Merge history entries are immutable and cannot be altered after the fact

---

# Preconditions

- RBAC is configured for merge/undo authorization
- Snapshot storage encryption and retention policy are configured
- Admin audit console has access to merge history data

---

# Postconditions

- Every merge/undo action has a complete, attributable audit record
- Snapshot access for investigation purposes is itself logged
- Permanent deletion of merged-away data only occurs through an explicit, separately-authorized step

---

# Edge Cases

- A support admin merges contacts on behalf of a user during a support interaction — must be clearly attributed, not appear as user-initiated
- Undo is requested outside the retention window and the snapshot has already been purged
- A data-loss investigation requires reconstructing state from a snapshot taken mid-transaction
- Two admins attempt conflicting actions (one merges, another undoes) on the same contact concurrently
- A deletion request arrives for a contact that has pending merge history referencing it
- Snapshot storage encryption key is rotated between merge and a later undo request

---

# Telemetry

Track:
- `duplicate_merge_authorized`
- `duplicate_merge_unauthorized_attempt_blocked`
- `duplicate_merge_snapshot_accessed`
- `duplicate_merge_permanent_deletion_authorized`
- `duplicate_merge_history_exported`

---

# Dependencies

- Role-based access control (RBAC) system
- Encrypted snapshot storage with key management
- Immutable audit/merge-history log
- Data deletion and export workflow engine

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a user cannot merge a contact they do not own
2. Verify an admin-performed merge is clearly attributed as admin-initiated, not user-initiated
3. Verify snapshot access for an undo or investigation is logged with requester identity
4. Verify permanent deletion of a merged-away record requires a separate explicit authorization step
5. Verify merge history entries cannot be modified after creation
6. Verify concurrent merge/undo requests on the same contact are safely serialized
7. Verify snapshot encryption key rotation does not break a subsequent undo within the retention window
8. Verify merge history export produces a complete, correctly-scoped compliance record
9. Verify unauthorized merge/undo attempts are blocked server-side even if the client UI is bypassed

---

# Story Variation

This is user story variation 3 for Duplicate Merging, focusing on authorization, auditability, and data-loss prevention.

---

# Notes

- Merge is the highest-risk destructive-adjacent operation in EPIC-04; its access control and audit trail deserve the same rigor as account deletion
- Consider requiring a confirmation step for admin-initiated merges performed on behalf of a user
