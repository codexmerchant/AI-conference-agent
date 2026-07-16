# FEATURE-08 — Privacy Controls

## Epic
EPIC-11 — Security, Privacy & Compliance

---

# 1. Objective

Give users direct, self-service control over their personal data through GDPR/CCPA-style rights — access, export, deletion, and correction — plus proactive controls like a do-not-record list, so privacy is something users can act on themselves, not just something the platform promises.

---

# 2. Problem Statement

Regulations like GDPR and CCPA grant individuals enforceable rights to know what data is held about them, export it, and demand its deletion, and the PRD commits to user-controlled retention. Without a dedicated, reliable privacy controls feature, these rights would require manual, ad hoc engineering support for every request — too slow to meet regulatory deadlines and too error-prone to guarantee completeness, especially for data already scattered across the knowledge graph and processing pipeline.

---

# 3. Feature Overview

A self-service privacy control center exposing data access/export, right-to-be-forgotten deletion, and a do-not-record list for people the user never wants captured again. Requests are tracked as first-class `PrivacyRequest` objects that fan out to every service holding relevant data (media storage, transcripts, contacts, knowledge graph) and are only marked complete once every dependent service confirms fulfillment.

---

# 4. Key Functionalities

## Data export (right to access/portability)
Lets a user request a complete, structured export of their personal data across all services.

## Right-to-be-forgotten deletion
Lets a user request deletion of their personal data, fanning out to every service and confirming completion.

## Do-not-record list
Lets a user mark specific people (by name, badge, or contact record) as never to be recorded or transcribed again.

## Privacy request status tracking
Shows the user the real-time status of an in-progress export or deletion request.

## Consent and data-use transparency dashboard
Shows the user what categories of data are held, for what purpose, and which are shared with which recipients.

---

# 5. Primary Use Cases

## Use Case 1
A user requests a full export of their conference data ahead of switching to a competing tool.

## Use Case 2
A user invokes their right to be forgotten after ending their use of the product.

## Use Case 3
A user adds a specific contact to their do-not-record list after that person asked not to be captured again.

---

# 6. User Stories

## User Story 1
As a user,
I want to export or delete all of my personal data with a self-service request,
so that I can exercise my privacy rights without having to contact support and wait indefinitely.

### Acceptance Criteria
- User can initiate an export or deletion request from account settings in under 3 taps.
- User receives a confirmation and an estimated completion time immediately after submitting.
- User can track request status and receives a notification when it completes.

## User Story 2
As an operator,
I want privacy requests to reliably fan out to every dependent service and only close once all confirm completion,
so that a deletion or export is never reported as done while data still exists somewhere in the system.

### Acceptance Criteria
- A `PrivacyRequest` is only marked complete after every dependent service (media, transcripts, contacts, graph) acknowledges fulfillment.
- Partial failures are retried automatically and escalated to an operator if unresolved past a defined SLA.
- An operator dashboard shows in-flight requests, per-service fulfillment status, and SLA breach risk.

---

# 7. User Workflow

1. User navigates to Privacy Controls in account settings.
2. User selects export, delete, or manage do-not-record list.
3. For export/delete, the system creates a `PrivacyRequest` and confirms scope with the user (e.g., "this includes 340 recordings and 512 contacts").
4. The request fans out to every service holding relevant data: Secure Media Storage, transcripts, contacts, knowledge graph, audit logs (where legally permissible).
5. Each service processes its portion and reports fulfillment back to the privacy request orchestrator.
6. Once every dependent service confirms, the request is marked complete and the user is notified.
7. For a do-not-record addition, the entry is immediately propagated to the Consent Management feature to block future capture of that person.

---

# 8. UI / UX Requirements

- Plain-language descriptions of what export and deletion actually include, shown before the user confirms.
- Clear warning that deletion is irreversible, with a confirmation step requiring explicit acknowledgment.
- Progress indicator for in-flight requests, not just a binary pending/complete state.
- Simple add/remove flow for the do-not-record list, reachable from a contact's profile directly.

---

# 9. Technical Requirements

## Frontend
Privacy control center screens for export, deletion, do-not-record management, and a data-use transparency dashboard; request status/progress UI.

## Backend
A privacy request orchestrator that creates `PrivacyRequest` records, fans out fulfillment tasks to dependent services, and tracks completion; a do-not-record registry consumed by the Consent Management feature.

## AI/ML
Deletion fan-out must account for data embedded in AI-derived artifacts (summaries, graph edges, embeddings) — not just raw source records — requiring the pipeline to support targeted re-processing or removal of derived data tied to a deleted subject.

## Infrastructure
A durable, retryable workflow engine coordinating multi-service fulfillment with per-service acknowledgment tracking and SLA monitoring.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| POST /gdpr/export | Initiate a data export request |
| POST /gdpr/delete | Initiate a right-to-be-forgotten deletion request |
| GET /privacy/requests/{id} | Check status of an in-progress export or deletion request |
| POST /privacy/do-not-record | Add a person to the do-not-record list |
| DELETE /privacy/do-not-record/{id} | Remove a person from the do-not-record list |
| Regional Compliance Engine | Determine applicable subject rights and response SLA for the user's jurisdiction |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| PrivacyRequest | request_id, user_id, request_type (export\|delete\|restrict), status, submitted_at, completed_at, scope, dependent_services_pending[] |
| DoNotRecordEntry | entry_id, subject_identifier, subject_reference_type (contact_id\|name\|badge_hash), added_by, added_at, scope (global\|conference) |

---

# 12. Security & Privacy

- Deletion requests check for active legal holds (Feature 3) before proceeding and notify the user if a hold delays fulfillment.
- Exports are delivered via a short-lived, encrypted, access-scoped download rather than email attachment or persistent link.
- Do-not-record entries take effect immediately across all future sessions, not just the session in which they were added.
- Deletion of a subject's data that is also embedded in another user's shared graph is handled via anonymization of the shared reference rather than silently breaking the other user's data.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Export request fulfillment time | <72 hours |
| Deletion request fulfillment time | <30 days (regulatory ceiling), target <7 days |
| Do-not-record propagation latency | <1 minute |

---

# 14. Edge Cases

- Right-to-be-forgotten request arrives while the subject's data is mid-processing in the AI pipeline (e.g., transcription in flight).
- Export request spans data stored across multiple encrypted stores with different key scopes.
- Deletion cascades into a shared knowledge graph node also referenced by another user's account.
- Do-not-record list conflicts with a fresh, explicit consent given by that same person at a later, unrelated session.
- Deletion request is submitted for a user whose data is under an active legal hold.
- User submits duplicate export or deletion requests before the first completes.

---

# 15. Dependencies

- Data Retention Policies (Feature 3) for legal hold checks
- Secure Media Storage (Feature 7)
- Regional Compliance Engine (Feature 6) for jurisdiction-specific SLAs and rights
- Recording Consent Management (Feature 1) for do-not-record enforcement
- Knowledge Graph Engine (EPIC-06) for derived-data deletion

---

# 16. Risks

- Incomplete fan-out logic could leave orphaned personal data in a derived AI artifact after a "completed" deletion.
- Regulatory SLA misses (e.g., GDPR's one-month response window) could result in fines or enforcement action.
- Do-not-record enforcement gaps at the point of capture would undermine the feature's core promise.

---

# 17. Telemetry & Analytics

Track:
- `privacy_export_requested`
- `privacy_export_completed`
- `privacy_delete_requested`
- `privacy_delete_completed`
- `do_not_record_added`
- `privacy_request_sla_breached`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Requests fulfilled within regulatory SLA | 100% |
| Deletion fan-out completeness (no orphaned data) | 100% |
| Do-not-record enforcement accuracy | 100% |

---

# 19. Future Enhancements

- Automated periodic data-use transparency digest emailed to users.
- Org-level bulk privacy request handling for enterprise offboarding.

---

# 20. Open Questions

- How do we verify deletion completeness in AI-derived artifacts like embeddings and summaries, which are harder to trace than source records?
- Should do-not-record entries be shareable/importable across an organization, or strictly personal to each user?
- What is the appeals or correction process if a user disputes the accuracy of data returned in an export?
