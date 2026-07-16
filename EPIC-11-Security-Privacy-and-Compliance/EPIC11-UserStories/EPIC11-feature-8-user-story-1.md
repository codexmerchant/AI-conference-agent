# EPIC11 Feature 8 User Story 1

## Epic
EPIC-11 — Security, Privacy & Compliance

## Feature
FEATURE-08 — Privacy Controls

---

# User Story

As a user,
I want to export or delete all of my personal data with a self-service request, and maintain a do-not-record list for specific people,
so that I can exercise my privacy rights and respect others' preferences without contacting support.

---

# Business Value

- Gives users direct, self-service control over their own data, honoring the product's privacy commitments
- Reduces support burden from manual data access, export, and deletion requests
- Respects the preferences of people who ask not to be recorded again
- Builds long-term user trust through visible, working privacy controls

---

# Acceptance Criteria

## Functional Criteria
- User can initiate an export or deletion request from account settings in 3 taps or fewer
- User can add a specific contact to a do-not-record list directly from that contact's profile
- Do-not-record entries block future capture of that person across all future sessions, not just the current one

## UX Criteria
- Plain-language description of exactly what an export or deletion includes is shown before confirmation
- Deletion requires an explicit, distinct confirmation step given its irreversibility
- User receives a notification when their export or deletion request completes

## Technical Criteria
- Export and deletion requests create a trackable `PrivacyRequest` with real-time status
- Do-not-record propagation to the Consent Management feature completes within 1 minute
- Deletion fan-out covers raw media, transcripts, contacts, and derived AI artifacts referencing the user

---

# Preconditions

- User is authenticated and has existing captured data or contacts
- Regional Compliance Engine has resolved the user's applicable jurisdiction and rights

---

# Postconditions

- Export or deletion request is created, tracked, and eventually fulfilled or reported as blocked
- Do-not-record entries are active and enforced across future sessions
- User is notified of the final outcome of their request

---

# Edge Cases

- User submits a deletion request for data still under an active legal hold
- User adds someone to the do-not-record list who has already given fresh, explicit consent at a later, separate session
- User submits duplicate export requests before the first one completes
- Do-not-record entry references a contact with no strong unique identifier (name-only match)
- User requests export while some of their data is mid-processing in the AI pipeline
- User deletes their own account while an export they requested is still being generated

---

# Telemetry

Track:
- `privacy_export_requested_by_user`
- `privacy_delete_requested_by_user`
- `do_not_record_added_by_user`
- `privacy_request_status_viewed`
- `privacy_request_completion_notified`

---

# Dependencies

- Recording Consent Management (Feature 1) for do-not-record enforcement
- Data Retention Policies (Feature 3) for legal hold checks
- Regional Compliance Engine (Feature 6)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a user can initiate an export request in 3 taps or fewer from account settings
2. Verify a deletion request requires an explicit, distinct confirmation step
3. Verify a do-not-record entry blocks future capture of that person across sessions
4. Verify do-not-record propagation to Consent Management completes within the defined latency budget
5. Verify a deletion request against data under legal hold is correctly blocked with a clear explanation
6. Verify duplicate export requests are handled without producing conflicting or wasted work
7. Verify the user receives a notification when their request completes
8. Verify plain-language scope description accurately reflects what will be exported or deleted

---

# Story Variation

This is user story variation 1 for Privacy Controls, focusing on the everyday self-service experience of exercising personal privacy rights.

---

# Notes

- Do-not-record entries should be treated as a strong signal but may need a documented exception process for cases where the person later gives fresh, explicit consent.
- Consider showing a data-volume preview (e.g., "this includes 340 recordings") before a user confirms a deletion request.
