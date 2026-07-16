# FEATURE-05 — CRM Sync

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Bidirectionally sync conference contacts, notes, and follow-up activity with the user's CRM (Salesforce, HubSpot, or Affinity) so conference intelligence lands where sales and business development teams already work.

---

# 2. Problem Statement

Conference-captured contacts and interaction notes currently live only inside the app; sales and BD teams rely on the CRM as the system of record, so without a sync path every conference lead requires manual re-entry into Salesforce/HubSpot/Affinity, causing delays and dropped leads.

---

# 3. Feature Overview

A configurable CRM connector supporting Salesforce, HubSpot, and Affinity that pushes new/updated conference contacts and interaction summaries as CRM records (Contact/Lead, Activity/Note), pulls existing account and opportunity context to enrich in-app contact views, and manages field mapping and conflict resolution between the two systems.

---

# 4. Key Functionalities

## CRM connection setup per provider
OAuth (Salesforce, HubSpot) or API key (Affinity) connection with instance/org selection.

## Field mapping configuration
User or admin maps app contact fields to CRM object fields (standard and custom), with sensible provider-specific defaults.

## Outbound sync: contacts and interaction notes
New conference contacts and AI-generated interaction summaries are pushed to the CRM as Contact/Lead records and associated Activities/Notes.

## Inbound sync: account and opportunity context
Existing CRM account/opportunity data for a matched contact is pulled to enrich the in-app contact view (e.g., "Open Opportunity: $50K, Stage: Negotiation").

## Duplicate detection and conflict resolution
Contacts are matched against existing CRM records by email/name before creating duplicates, with a configurable last-write-wins or manual-merge policy for conflicting field values.

---

# 5. Primary Use Cases

## Use Case 1
Sales rep captures a lead at a conference, and it appears in Salesforce as a new Lead with the AI-generated conversation summary attached as an Activity within minutes.

## Use Case 2
A captured contact already exists in HubSpot as a known account contact; the app pulls the existing deal stage and displays it before the rep's follow-up meeting.

## Use Case 3
Field mapping conflict: the CRM's required custom field ("Lead Source Detail") has no equivalent in the app, and sync must not fail silently because of it.

---

# 6. User Stories

## User Story 1
As a sales rep at a conference,
I want my captured contacts to automatically appear in our CRM with conversation notes attached,
so that I don't have to manually re-enter leads after the event.

### Acceptance Criteria
- Newly captured contacts sync to the CRM as a Contact or Lead within one sync cycle.
- The AI-generated interaction summary is attached as a CRM Activity/Note linked to that record.
- Sync failures are surfaced to the user with a clear retry action, not silently dropped.

## User Story 2
As a power user managing multiple conference leads,
I want the app to detect that a captured contact already exists in the CRM,
so that I don't create duplicate Lead records for the same person.

### Acceptance Criteria
- Contact matching checks email and name/company combination against existing CRM records before creating a new one.
- When a match is found, the app updates the existing record instead of creating a duplicate.
- User is shown which CRM record a contact was matched or created against.

---

# 7. User Workflow

1. User connects a CRM (Salesforce, HubSpot, or Affinity) via OAuth or API key.
2. User confirms or adjusts default field mapping between app and CRM fields.
3. Conference contact is captured and queued for outbound sync.
4. Sync service checks the CRM for an existing matching record.
5. If matched, existing record is updated; if not, a new Contact/Lead is created.
6. Interaction summary is attached as a linked Activity/Note on the CRM record.
7. Existing account/opportunity data (if any) is pulled back and shown in the app's contact view.

---

# 8. UI / UX Requirements

- CRM connection screen listing supported providers with connect/disconnect state per provider.
- Field mapping UI with default mappings pre-filled and custom field support.
- Per-contact sync status indicator (synced / pending / conflict / failed) with a link to the CRM record.
- Conflict resolution prompt when a field value differs between app and CRM beyond the auto-resolution policy.
- Bulk "sync now" action for post-conference batch push.

---

# 9. Technical Requirements

## Frontend
CRM settings screen with provider connect flow, field mapping editor, and sync status badges surfaced on contact list/detail views.

## Backend
Provider-specific adapters (Salesforce REST/Bulk API, HubSpot CRM API, Affinity API) behind a common CRM sync interface handling create/update/match operations, respecting each provider's object model differences (Lead vs. Contact, custom objects).

## AI/ML
Fuzzy matching model for duplicate detection across email, name, and company; summarization reuse from the AI context engine to format interaction notes appropriately for CRM activity fields.

## Infrastructure
Per-provider rate-limit-aware job queue (respecting Salesforce governor limits, HubSpot API limits), retry with backoff, and a dead-letter queue for sync failures requiring manual review.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Salesforce REST/Bulk API | Create/update Lead/Contact and Activity records, query existing accounts/opportunities |
| HubSpot CRM API | Create/update Contact records and Engagements (notes), query deals |
| Affinity API | Create/update Person records and interaction notes, query organizations |
| Contact Service | Source of truth for app-side contact data being synced |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| CRMConnection | id, user_id, provider (salesforce/hubspot/affinity), instance_url, oauth_token_ref, api_key_ref, sync_status, last_synced_at, connected_at |
| CRMFieldMapping | id, connection_id, app_field, crm_object_type, crm_field_name, is_custom_field, default_value |
| CRMSyncMapping | id, connection_id, contact_id, crm_object_type, crm_record_id, last_pushed_at, last_pulled_at, sync_direction |
| CRMSyncLog | id, sync_mapping_id, operation (create/update/pull), status (success/conflict/failed), error_message, occurred_at |

---

# 12. Security & Privacy

- OAuth tokens and API keys stored only as vault references; never logged or exposed via API responses.
- Field mapping respects CRM-side field-level security; sync never writes to fields the connected user lacks permission to edit.
- Users can restrict which contact fields are eligible for outbound sync (e.g., exclude personal notes from being pushed to a shared CRM).
- CRM data pulled into the app is scoped to records the connected user has access to in the CRM itself.
- Disconnecting a CRM stops future sync but does not retroactively delete records already created in the CRM.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Outbound contact sync latency | <5 min per contact |
| Bulk post-conference sync (500 contacts) | <30 min |
| Duplicate match precision | >95% |
| Sync failure auto-recovery (retry success) | >90% |

---

# 14. Edge Cases

- Duplicate contact created via CRM sync when it already exists from a separate badge scan match.
- CRM custom required field has no mapped value, causing a create/update to fail validation.
- Salesforce governor/API limit exhausted mid-bulk-sync, requiring queued retry after the daily reset.
- CRM record deleted or merged on the CRM side after the app already stored a `crm_record_id` reference.
- Sync loop risk: a CRM webhook-triggered update causes the app to re-push the same change back to the CRM.
- User has edit access revoked in the CRM mid-session, causing previously working syncs to start failing with permission errors.

---

# 15. Dependencies

- Authentication and identity platform
- Contact data store and matching/dedupe service
- AI summarization/context engine for formatting interaction notes
- Secrets vault for token/API key storage
- Webhook framework (for CRM-side change notifications where supported)

---

# 16. Risks

- Divergent object models across Salesforce, HubSpot, and Affinity increasing mapping complexity and maintenance burden.
- Governor/rate limits on enterprise CRM instances throttling bulk sync during peak post-conference windows.
- Sync loops between CRM webhooks and app-initiated updates causing redundant writes or infinite update cycles if not deduplicated by idempotency keys.

---

# 17. Telemetry & Analytics

Track:
- `crm_connected`
- `crm_disconnected`
- `crm_contact_synced`
- `crm_contact_sync_failed`
- `crm_duplicate_matched`
- `crm_field_mapping_updated`
- `crm_bulk_sync_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| CRM connect completion rate | >65% of eligible (sales-role) users |
| Contact sync success rate | >97% |
| Duplicate creation rate | <2% |
| Time from capture to CRM visibility | <5 min median |

---

# 19. Future Enhancements

- Support for additional CRMs (Pipedrive, Zoho, Microsoft Dynamics) via a pluggable adapter interface.
- Opportunity auto-creation suggestions based on conversation sentiment and captured intent signals.
- Two-way real-time sync using CRM-native webhooks instead of scheduled polling.

---

# 20. Open Questions

- Should the app default to creating Leads or Contacts in Salesforce, and should this be configurable per organization?
- How should field-level conflicts be resolved when both systems have been edited since the last sync — last-write-wins, or a manual merge UI?
- Should CRM sync be available on individual accounts, or gated to team/enterprise plans given the admin configuration overhead?
