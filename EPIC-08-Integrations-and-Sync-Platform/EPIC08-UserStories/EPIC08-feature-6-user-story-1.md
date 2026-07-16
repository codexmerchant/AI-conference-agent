# EPIC08 Feature 6 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-06 — Contacts Sync

---

# User Story

As a user,
I want captured conference contacts to automatically appear in my phone's native address book,
so that I can call or text them without switching to a separate app.

---

# Business Value

- Makes new connections immediately usable across every app on the user's phone, not just the conference app
- Removes the manual re-entry step users currently perform for contacts they actually want to keep
- Increases the perceived completeness of the capture-to-action pipeline
- Reduces the chance a valuable new connection is forgotten because it never left the app

---

# Acceptance Criteria

## Functional Criteria
- User can connect Google Contacts, iCloud, or Outlook People as a sync destination
- Newly captured contacts appear in the connected address book within one sync cycle
- Pushed contacts include a source/label tag identifying the originating conference

## UX Criteria
- User can choose auto-push (all captured contacts) or review-before-push per their preference
- Per-contact sync status (synced/pending/not synced) is visible on the contact card
- User can opt a specific contact out of push before it syncs

## Technical Criteria
- Duplicate detection checks email, phone, and normalized name against existing address book entries before creating a new one
- Address book writes include only fields the user has approved for export
- Sync respects OS-level address book permission state and fails gracefully if revoked

---

# Preconditions

- User has connected an address book provider and granted the relevant permission
- User has at least one captured contact eligible for push
- Push preference (auto vs. review-before-push) has been set

---

# Postconditions

- ContactSyncMapping record links the app contact to the created/updated address book entry
- Address book entry includes a conference source tag
- `contact_pushed_to_address_book` telemetry event is recorded

---

# Edge Cases

- Contact already exists in the address book from a prior conference, requiring update rather than duplicate creation
- Contact photo exceeds the provider's size limit during push
- Address book permission is revoked at the OS level between connection and the next sync attempt
- Multiple phone/email fields on the captured contact need to map into the provider's field structure without data loss
- User captures the same contact twice at the same event (duplicate badge scan)

---

# Telemetry

Track:
- `contacts_sync_connected`
- `contact_pushed_to_address_book`
- `contact_push_failed`
- `contact_duplicate_matched`
- `contact_push_opted_out`

---

# Dependencies

- Google People API / Apple Contacts framework / Microsoft Graph People API
- Contact data store and capture pipeline (EPIC-01/EPIC-02)
- Fuzzy matching/dedupe service

---

# Priority

Medium

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify successful connection to Google Contacts, iCloud, and Outlook People respectively
2. Verify a newly captured contact appears in the connected address book within one sync cycle
3. Verify pushed contacts include the correct conference source tag
4. Verify a duplicate match against an existing address book entry updates rather than duplicates
5. Verify a contact opted out of push does not sync even with auto-push enabled
6. Verify contact photo push handles the provider's size limit gracefully (resize or skip with a clear status)
7. Verify sync fails gracefully with a clear status when OS-level permission is revoked
8. Verify per-contact sync status accurately reflects synced/pending/not-synced state

---

# Story Variation

This is user story variation 1 for Contacts Sync, focusing on the happy-path user experience of pushing captured contacts to a native address book.

---

# Notes

- Duplicate detection logic here should reuse the fuzzy matching service built for CRM Sync (FEATURE-05) rather than a separate implementation
- iCloud sync is device-mediated rather than server-to-server, so its sync cycle latency may differ meaningfully from Google/Outlook
