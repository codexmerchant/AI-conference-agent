# EPIC05 Feature 4 User Story 3

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-04 — Slide-to-Topic Linking

---

# User Story

As an admin,
I want manual slide-link corrections and slide content access to be permission-controlled and auditable,
so that potentially sensitive slide content (e.g., unreleased roadmaps, confidential data) is not exposed or altered outside authorized access.

---

# Business Value

- Prevents unauthorized viewing of slide content that may contain confidential or embargoed information
- Provides an auditable record of who corrected which slide-to-topic link and when
- Ensures slide access permissions stay consistent with the underlying session's visibility rules as they change
- Reduces risk of a manual correction silently misrepresenting what was actually discussed for a sensitive slide

---

# Acceptance Criteria

## Functional Criteria
- Slide and link access is enforced by the same ownership/role model as the parent session
- Every manual link correction is recorded with actor identity, timestamp, and prior value
- Slides marked confidential (if flagged) require elevated permission for access, distinct from general session viewing

## UX Criteria
- Admin audit view lists all manual link corrections chronologically with before/after state
- Confidential slide flags, when present, are visibly indicated in both viewer and admin views
- Bulk permission changes to a session correctly cascade to its linked slide content

## Technical Criteria
- RBAC checks for slide-link access and correction are enforced server-side
- Audit log entries for corrections are immutable and stored independently of the mutable link state
- Slide content deletion (e.g., right-to-be-forgotten request) cascades correctly to its associated links

---

# Preconditions

- Admin role has content-governance permissions for slide/link data
- Session and its slide-topic links exist
- Organizational access control policy is configured

---

# Postconditions

- Audit log entry created for every manual correction, viewable by authorized admins
- Access attempts outside the permitted scope are denied and logged
- Permission cascades correctly apply to all linked slide content when session sharing changes

---

# Edge Cases

- A user with general session-view access attempts to correct a link without edit permission
- A slide contains confidential information but was not properly flagged before initial sharing
- A session's visibility is downgraded (public to private) after slide links were already indexed for Search
- Deletion of a single slide needs to cleanly remove its link without breaking the deck-timeline ordering for remaining slides
- Cross-organization sharing requires re-evaluating slide-level (not just session-level) access scope

---

# Telemetry

Track:
- `slide_link_access_denied`
- `slide_link_manually_corrected`
- `slide_marked_confidential`
- `slide_content_deleted`
- `slide_link_permission_changed`

---

# Dependencies

- Authentication and identity/RBAC platform
- Audit logging infrastructure
- Session-level sharing/visibility policy (shared with EPIC-01/EPIC-02)

---

# Priority

Medium

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify a user without edit permission cannot submit a manual link correction
2. Verify a manual correction creates an immutable audit log entry with correct before/after values
3. Verify a confidential-flagged slide requires elevated permission beyond general session access
4. Verify a session visibility downgrade correctly restricts previously indexed slide-link search results
5. Verify deleting a single slide removes its link without corrupting the remaining deck-timeline order
6. Verify RBAC denies slide-link access even when the requester has partial session permissions
7. Verify audit history accurately reflects a chronological record of all corrections for a session
8. Verify a right-to-be-forgotten deletion request cascades correctly to all associated slide-topic links

---

# Story Variation

This is user story variation 3 for Slide-to-Topic Linking, focusing on access control, confidentiality flagging, and audit governance of slide content.

---

# Notes

- Slide content carries a distinct confidentiality risk profile compared to spoken transcript, since a single captured image can leak an entire unreleased roadmap slide
- Coordinate confidential-flag design with EPIC-02's slide extraction/OCR features so the flag can be set as early as capture time
