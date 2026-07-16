# EPIC08 Feature 5 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-05 — CRM Sync

---

# User Story

As a user,
I want my captured conference contacts to automatically appear in my CRM with the AI-generated conversation summary attached,
so that I don't have to manually re-enter leads after the event.

---

# Business Value

- Eliminates manual data entry, the single biggest source of dropped conference leads
- Ensures conversation context (not just a name/title) reaches the CRM, improving downstream follow-up quality
- Reduces time-to-CRM-visibility from days (post-event data entry) to minutes
- Increases the perceived ROI of conference attendance by making leads immediately actionable in existing sales tools

---

# Acceptance Criteria

## Functional Criteria
- User can connect Salesforce, HubSpot, or Affinity via OAuth or API key
- Newly captured contacts sync to the CRM as a Contact or Lead within one sync cycle
- The AI-generated interaction summary is attached as a CRM Activity/Note linked to the correct record

## UX Criteria
- Per-contact sync status (synced/pending/failed) is visible with a link to the CRM record
- Sync failures show a clear, actionable error rather than failing silently
- User can trigger a manual "sync now" for a specific contact or in bulk

## Technical Criteria
- Default field mapping is pre-configured per provider and covers standard fields (name, email, company, title)
- Sync respects field-level permissions in the CRM; it never attempts to write to a field the connected account cannot edit
- Every sync attempt is logged with a correlation ID for troubleshooting

---

# Preconditions

- User has connected a supported CRM (Salesforce, HubSpot, or Affinity)
- User has at least one captured contact with an AI-generated interaction summary
- Default or custom field mapping has been confirmed

---

# Postconditions

- CRMSyncMapping record links the app contact to the created/updated CRM record
- CRM record contains the pushed contact fields and linked interaction summary Activity/Note
- `crm_contact_synced` telemetry event is recorded

---

# Edge Cases

- CRM custom required field has no mapped value, causing the create/update to fail validation
- User's CRM account lacks edit permission on a mapped field
- Sync attempted while the CRM connection's OAuth token is expired
- Contact has incomplete data (no email) that the CRM requires for record creation
- CRM API is temporarily unavailable during the sync attempt

---

# Telemetry

Track:
- `crm_connected`
- `crm_contact_synced`
- `crm_contact_sync_failed`
- `crm_manual_sync_triggered`
- `crm_field_mapping_confirmed`

---

# Dependencies

- Salesforce REST/Bulk API, HubSpot CRM API, or Affinity API
- Contact data store
- AI summarization/context engine
- Secrets vault for token/API key storage

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify successful CRM connection via OAuth (Salesforce/HubSpot) and API key (Affinity)
2. Verify a captured contact syncs to the CRM as a Contact/Lead within one sync cycle
3. Verify the interaction summary is attached as a correctly linked Activity/Note
4. Verify sync failure due to a missing required custom field shows a clear, actionable error
5. Verify sync failure due to insufficient CRM field permissions does not corrupt the local sync mapping
6. Verify manual "sync now" correctly re-triggers a failed sync
7. Verify default field mapping populates standard fields correctly for each supported provider
8. Verify sync status indicator updates correctly through pending/synced/failed states

---

# Story Variation

This is user story variation 1 for CRM Sync, focusing on the happy-path user experience of pushing a captured contact and its summary to a connected CRM.

---

# Notes

- Field-level permission handling is critical since sales users often have restricted edit access to certain CRM fields depending on their role
- This story assumes default mapping; custom field mapping configuration is covered as part of the broader feature but not re-tested here
