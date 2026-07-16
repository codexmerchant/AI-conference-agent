# EPIC05 Feature 3 User Story 3

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-03 — Quote Extraction

---

# User Story

As an admin,
I want to control who can export and publicly share extracted quotes and enforce attribution rules,
so that the organization is not exposed to misattribution, out-of-context sharing, or unauthorized publication risk.

---

# Business Value

- Reduces legal and reputational exposure from quotes shared without proper attribution or consent
- Ensures quote sharing respects the same visibility rules as the underlying session
- Provides an auditable record of what was shared, by whom, and when
- Enables rapid takedown/correction if a shared quote is later disputed

---

# Acceptance Criteria

## Functional Criteria
- Quote export/share actions are permission-checked against the session's visibility settings
- Every share action is logged with actor identity, quote ID, and destination format
- Quotes attributed to an unresolved speaker cannot be exported with a fabricated name

## UX Criteria
- Admin view lists all externally shared quotes with their attribution and share history
- A takedown/correction action is available and propagates to any cached export artifacts
- Sharing permission settings are discoverable from the same location as general session sharing controls

## Technical Criteria
- Export API enforces attribution rules server-side, not only in client UI
- Audit log entries for shares/exports are immutable
- Takedown requests trigger invalidation of any generated shareable card assets tied to the quote

---

# Preconditions

- Admin role has content-governance permissions
- Quote export/share functionality is enabled for the organization
- Session-level sharing permissions are configured

---

# Postconditions

- Every share/export action is recorded in an immutable audit log
- Unauthorized export attempts are denied and logged
- Takedown actions successfully invalidate previously generated share artifacts

---

# Edge Cases

- A user attempts to export a quote from a session they no longer have access to after permissions changed
- A speaker later disputes a quote's accuracy after it has already been shared externally
- An unresolved-speaker quote is exported before the attribution rule blocks it, requiring retroactive cleanup
- A takedown request arrives after a share artifact has already been cached by a third-party platform
- Bulk export of quotes across many sessions needs the same per-session permission check applied individually

---

# Telemetry

Track:
- `quote_export_denied`
- `quote_shared_externally`
- `quote_takedown_requested`
- `quote_takedown_completed`
- `quote_attribution_rule_blocked`

---

# Dependencies

- Session-level sharing/visibility policy
- Audit logging infrastructure
- Shareable card generation and asset storage service

---

# Priority

High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify export is denied for a user without access to the underlying session
2. Verify a share action is fully logged with actor, quote ID, and destination
3. Verify export is blocked for an unresolved-speaker quote attempting to use a fabricated name
4. Verify a takedown action invalidates the previously generated shareable card asset
5. Verify bulk export applies per-session permission checks individually rather than in aggregate
6. Verify audit log entries for shares are immutable and cannot be edited post-hoc
7. Verify a permission change (access revoked) correctly blocks subsequent export attempts
8. Verify the admin view accurately lists all externally shared quotes with complete share history

---

# Story Variation

This is user story variation 3 for Quote Extraction, focusing on export governance, attribution enforcement, and takedown/compliance workflows.

---

# Notes

- Attribution enforcement must be server-side; a client-only check is insufficient for compliance guarantees
- Coordinate takedown workflow design with legal/compliance stakeholders given the external-sharing risk profile
