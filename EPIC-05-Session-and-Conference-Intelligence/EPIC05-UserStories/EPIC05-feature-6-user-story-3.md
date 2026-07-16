# EPIC05 Feature 6 User Story 3

## Epic
EPIC-05 — Session & Conference Intelligence

## Feature
FEATURE-06 — Key Insight Extraction

---

# User Story

As an admin,
I want to control which insights are eligible for knowledge graph export and audit attribution of typed claims/predictions,
so that unverified or misattributed AI-generated claims do not propagate into shared organizational knowledge without oversight.

---

# Business Value

- Prevents unverified predictions or claims from being treated as authoritative once exported to the knowledge graph
- Provides an auditable record connecting every exported insight back to its source evidence and speaker attribution
- Ensures insight export respects the same sharing/visibility boundaries as the underlying session
- Reduces the risk of a misattributed claim propagating into downstream reporting or team-shared knowledge

---

# Acceptance Criteria

## Functional Criteria
- Insight export to the knowledge graph is permission-checked against the session's visibility settings
- Insights attributed to an unresolved speaker are exported with an explicit "unattributed" marker, never a guessed identity
- Admins can flag an insight type (e.g., "prediction") as requiring manual review before export

## UX Criteria
- Admin review queue lists insights pending manual approval with full evidence context
- Export audit view shows who/what approved each export (automatic vs. manual review)
- Flagging an insight as disputed is available from the same view as the export audit trail

## Technical Criteria
- Export API enforces both permission and review-status checks server-side
- Audit log entries for exports and reviews are immutable
- A disputed or retracted insight's export status is revocable, with the retraction propagated to the knowledge graph

---

# Preconditions

- Admin role has content-governance permissions
- Session and its extracted insights exist
- Organizational policy defines which insight types require manual review before export

---

# Postconditions

- Every export decision (automatic or manual) is recorded in an immutable audit log
- Export attempts outside the permitted scope are denied and logged
- Retraction of a disputed insight propagates to the knowledge graph within a defined SLA

---

# Edge Cases

- A prediction insight is exported automatically before a manual-review policy is applied retroactively
- A speaker disputes an insight's accuracy after it has already propagated into the knowledge graph
- An admin attempts to bulk-approve a backlog of pending insights without individually reviewing evidence
- A retraction request arrives after downstream reports have already referenced the exported insight
- Cross-organization sharing requires re-evaluating export eligibility for insights tied to a shared session

---

# Telemetry

Track:
- `insight_export_denied`
- `insight_flagged_for_review`
- `insight_manually_approved`
- `insight_retracted`
- `insight_export_audit_viewed`

---

# Dependencies

- Session-level sharing/visibility policy
- Knowledge Graph Engine (PRD 5.6) ingestion and retraction API
- Audit logging infrastructure

---

# Priority

Medium-High

---

# Estimated Complexity

High

---

# QA Test Scenarios

1. Verify export is denied for a user without access to the underlying session
2. Verify an unresolved-speaker insight exports with an explicit unattributed marker, never a guessed name
3. Verify an insight type flagged for manual review is blocked from automatic export
4. Verify manual approval correctly unblocks export and records the approving admin
5. Verify retraction of a disputed insight propagates to the knowledge graph within the defined SLA
6. Verify bulk-approve actions still require individual evidence acknowledgment per policy
7. Verify audit log entries for export decisions are immutable and complete
8. Verify a cross-organization sharing change correctly re-evaluates export eligibility for affected insights

---

# Story Variation

This is user story variation 3 for Key Insight Extraction, focusing on export governance, review workflows, and retraction handling for AI-generated claims.

---

# Notes

- Prediction and claim-type insights carry the highest dispute risk and should default to stricter review policy than data-point or trend insights
- Retraction propagation design should account for the fact that exported insights may already be referenced by other epics (e.g., reporting features) by the time a dispute arises
