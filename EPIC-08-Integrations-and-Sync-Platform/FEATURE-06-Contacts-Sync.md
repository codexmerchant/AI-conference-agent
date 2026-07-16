# FEATURE-06 — Contacts Sync

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Sync captured conference contacts with the user's native device/cloud address book (Google Contacts, iCloud, Outlook People) so new connections are available system-wide — in the phone dialer, Messages, and other apps — not just inside the conference app.

---

# 2. Problem Statement

Contacts captured during a conference are trapped inside the app; users still manually re-add important people to their phone's address book to call, text, or find them in other apps, duplicating effort and risking contacts being forgotten entirely if they never get around to the manual step.

---

# 3. Feature Overview

A two-way contacts connector (Google Contacts API, Apple Contacts/CardDAV, Microsoft Graph People) that pushes newly captured conference contacts to the user's chosen address book, pulls existing contact matches to avoid duplicates, and reconciles edits made on either side.

---

# 4. Key Functionalities

## Address book connection setup
Authorize access to Google Contacts, iCloud (via device Contacts framework), or Outlook People.

## Outbound push of captured contacts
New conference contacts are created (or matched and updated) as native address book entries, tagged with a conference/source label.

## Duplicate detection against existing contacts
Before creating a new address book entry, match against existing contacts by email/phone/name to avoid duplication.

## Field-level merge on conflict
When a matched contact has conflicting field values (e.g., different phone number), present a merge choice rather than silently overwriting.

## Sync status and manual re-sync
Per-contact indicator of address-book sync state with a manual re-sync/push action.

---

# 5. Primary Use Cases

## Use Case 1
User captures a new contact via badge scan, and it appears in their phone's native Contacts app within minutes, tagged with the conference name.

## Use Case 2
A captured contact already exists in the user's address book from a prior interaction; the app updates the existing entry instead of creating a duplicate.

## Use Case 3
User edits a contact's phone number directly in their phone's Contacts app, and the app reflects that update rather than overwriting it on next sync.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want captured contacts to automatically appear in my phone's address book,
so that I can call or text them without switching apps.

### Acceptance Criteria
- Newly captured contacts appear in the connected address book within one sync cycle.
- Pushed contacts include a source/label tag identifying the originating conference.
- User can opt out of auto-push per contact before it syncs.

## User Story 2
As a power user who captures dozens of contacts per conference,
I want the sync to detect and merge duplicates against my existing address book,
so that I don't end up with multiple entries for the same person.

### Acceptance Criteria
- Matching checks email, phone, and normalized name before creating a new entry.
- When a match is found, conflicting fields are presented for merge rather than auto-overwritten.
- Merge decisions are remembered so the same conflict isn't re-prompted every sync cycle.

---

# 7. User Workflow

1. User connects an address book provider (Google, iCloud, or Outlook) in Integrations settings.
2. User sets default push behavior (auto-push all captured contacts, or review-before-push).
3. Contact is captured during a conference session.
4. Sync service checks the connected address book for an existing match.
5. If matched, conflicting fields are queued for user merge decision; if unmatched, a new entry is created.
6. Contact is written to the address book with a conference source tag.
7. Subsequent edits on either side are reconciled on the next sync cycle.

---

# 8. UI / UX Requirements

- Address book connect screen with provider choice and auto-push vs. review-before-push toggle.
- Per-contact sync status badge (synced / pending / conflict / not synced).
- Merge conflict screen showing side-by-side field comparison with a pick-one or keep-both action.
- Bulk "push all" action available post-conference for contacts not yet synced.
- Clear indication that removing a contact in the app does not delete it from the address book.

---

# 9. Technical Requirements

## Frontend
Integration settings screen, per-contact sync badge on the contact list, and a merge-conflict resolution modal.

## Backend
Provider adapters for Google People API, Apple Contacts (via device-side CardDAV/EventKit-equivalent bridge), and Microsoft Graph People API behind a common contacts-sync interface handling create/update/match.

## AI/ML
Fuzzy matching model reused from CRM sync for name/email/phone-based duplicate detection, tuned for personal address book data (nicknames, multiple phone formats).

## Infrastructure
Sync jobs scoped per-device for iCloud (since Apple Contacts sync is device-mediated, not server-to-server) and per-account for Google/Outlook, with a queue for pending merge decisions.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Google People API | Create/update/read contacts in a user's Google Contacts |
| Apple Contacts framework (on-device) | Create/update/read contacts in iCloud/local address book via the mobile OS |
| Microsoft Graph People/Contacts API | Create/update/read contacts in Outlook People |
| Contact Service | Source of truth for app-captured contact data being pushed |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ContactSyncConnection | id, user_id, provider (google/icloud/outlook), oauth_token_ref, auto_push_enabled, sync_status, last_synced_at |
| ContactSyncMapping | id, connection_id, app_contact_id, external_contact_id, last_pushed_at, last_pulled_at, sync_status (synced/pending/conflict) |
| ContactMergeConflict | id, sync_mapping_id, field_name, app_value, external_value, resolution (kept_app/kept_external/kept_both/unresolved), resolved_at |

---

# 12. Security & Privacy

- Address book access is requested with the minimum necessary scope and clearly explained before the OS-level permission prompt.
- Contacts pushed to the address book include only fields the user has approved for export (e.g., excluding private notes or AI-generated summaries from the native contact card).
- OAuth tokens for Google/Outlook stored only as vault references; iCloud/local sync uses on-device OS permission grants, not app-held credentials.
- Disconnecting sync stops future pushes but does not delete contacts already written to the address book.
- Merge conflicts never silently overwrite user-edited address book data without explicit confirmation.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Contact push latency after capture | <5 min |
| Duplicate match precision | >95% |
| Bulk post-conference push (100 contacts) | <5 min |
| Merge conflict resolution round-trip | <2 sec |

---

# 14. Edge Cases

- Duplicate contact created from address-book push vs. one already created via CRM sync for the same person.
- Contact deleted in the native address book but still referenced by the app's sync mapping.
- Multiple phone/email fields in vCard/CardDAV format mapping ambiguously to the app's single primary phone/email fields.
- Contact photo exceeds provider size limits during push.
- Address book permission revoked by the user at the OS level mid-sync.
- Same contact captured at two different conferences, requiring merge rather than duplicate creation.

---

# 15. Dependencies

- Contact data store and capture pipeline (EPIC-01/EPIC-02)
- Fuzzy matching/dedupe service (shared with CRM sync)
- Secrets vault for OAuth token storage (Google/Outlook)
- Device OS permission framework (iCloud/local contacts)

---

# 16. Risks

- Users perceiving automatic address-book writes as intrusive if auto-push is enabled by default.
- Platform-specific limitations (iOS background contact sync restrictions) delaying near-real-time push.
- Merge conflict fatigue if the matching model has a high false-positive rate on common names.

---

# 17. Telemetry & Analytics

Track:
- `contacts_sync_connected`
- `contacts_sync_disconnected`
- `contact_pushed_to_address_book`
- `contact_push_failed`
- `contact_duplicate_matched`
- `contact_merge_conflict_resolved`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Address book connect completion rate | >60% of users who start the flow |
| Contact push success rate | >98% |
| Duplicate creation rate | <2% |
| Merge conflicts requiring manual resolution | <15% of matched contacts |

---

# 19. Future Enhancements

- Smart contact grouping/labels (e.g., an iOS/Google Contacts group per conference) for easy bulk management.
- Two-way real-time sync using native contact-change notifications instead of scheduled polling.
- Suggested contact cleanup for stale conference tags after a configurable retention period.

---

# 20. Open Questions

- Should auto-push be on by default, or opt-in given the sensitivity of writing to a user's personal address book?
- How should the app handle a contact captured at multiple conferences over time — one evolving address book entry, or per-event tagging on a single entry?
- Should iCloud sync require a companion desktop/macOS presence, or is on-device iOS sync sufficient for V1?
