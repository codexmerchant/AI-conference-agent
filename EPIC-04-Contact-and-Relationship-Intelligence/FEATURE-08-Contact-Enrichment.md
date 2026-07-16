# FEATURE-08 — Contact Enrichment

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Augment captured contact and company records with verified third-party data — LinkedIn profile details, verified email/company data providers — to fill gaps, raise confidence, and correct low-quality captured fields.

---

# 2. Problem Statement

Primary capture sources (badge OCR, voice) are fast but noisy and incomplete — they rarely include a verified email, full job history, or an accurate company domain. Without enrichment, contact profiles stay thin and low-confidence indefinitely, limiting the value of relationship scoring, company association, and follow-up drafting.

---

# 3. Feature Overview

An enrichment pipeline that takes a contact with partial or low-confidence data and queries connected third-party sources (LinkedIn, and optionally a company/contact data provider) to fill missing fields, cross-verify existing ones, and raise field-level confidence. Enrichment runs automatically on new contacts where sufficient match signal exists, and on-demand when a user requests it.

---

# 4. Key Functionalities

## Automatic post-capture enrichment
Triggers enrichment shortly after a contact is created when enough identifying signal (name + company, or email) exists to search a provider confidently.

## Field gap-filling
Populates missing fields (email, LinkedIn URL, job history, company domain) from provider results.

## Cross-verification of existing fields
Confirms or contradicts already-captured fields, feeding Contact Confidence Scoring (Feature 5).

## On-demand manual enrichment
Lets the user trigger a fresh enrichment lookup for a specific contact at any time.

## Enrichment provenance and cost tracking
Records which provider supplied each enriched field and tracks API usage/cost per enrichment call.

---

# 5. Primary Use Cases

## Use Case 1
A contact created from a badge scan with only a name and company gets an automatic LinkedIn lookup that fills in job title, profile photo, and LinkedIn URL.

## Use Case 2
An OCR-captured email with a likely typo is cross-verified against a company data provider and corrected.

## Use Case 3
User manually triggers enrichment on an older, thin contact before an important follow-up email.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want my contacts automatically filled in with verified details after I capture them,
so that I get a complete profile without manual research.

### Acceptance Criteria
- Contacts with sufficient identifying signal are automatically enriched within a few minutes of creation.
- Enriched fields are visually distinguished from originally-captured fields.
- User can accept or reject individual enriched field values.

## User Story 2
As a power user,
I want to manually trigger enrichment on a specific contact,
so that I can refresh stale data before an important follow-up.

### Acceptance Criteria
- Manual enrichment action available from the contact detail view.
- Enrichment result shows a diff against current field values before applying.
- Repeated manual enrichment requests are rate-limited to control provider cost.

---

# 7. User Workflow

1. A contact is created with at least minimal identifying signal (name + company, or email).
2. The enrichment trigger evaluates whether automatic enrichment should fire (signal sufficiency, provider budget).
3. The enrichment service queries connected providers (e.g., LinkedIn) for a matching profile.
4. Returned fields are mapped into the contact schema and scored for confidence.
5. New/changed fields are surfaced to the user as a proposed diff.
6. User accepts, edits, or rejects individual enriched fields.
7. Accepted fields update the contact record and raise associated confidence scores.

---

# 8. UI / UX Requirements

- Enrichment-in-progress state shown subtly on the contact card (not blocking).
- Enrichment diff view highlights new fields and changed fields separately.
- Enriched fields carry a distinct "verified" badge once accepted.
- Manual enrichment action is a single, discoverable button on the contact detail screen.

---

# 9. Technical Requirements

## Frontend
Enrichment diff/review component reused from the same pattern as merge preview (Feature 3); non-blocking background enrichment indicator.

## Backend
Enrichment service exposing `POST /contacts/{id}/enrich`, orchestrating calls to connected provider integrations (EPIC PRD §5.7 Plugin/Integration Layer) and applying results through the same field-write path as manual edits so confidence scoring picks them up.

## AI/ML
Profile-matching logic to select the correct third-party profile among multiple candidates (name + company + location disambiguation); field-mapping normalization from provider-specific schemas into the canonical Contact/Company schema.

## Infrastructure
Rate limiting and cost budget enforcement per user/account against third-party provider APIs; enrichment results cached to avoid redundant paid lookups for the same identity within a cooldown window.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts/{id}/enrich` | Trigger enrichment lookup for a contact |
| `GET /contacts/{id}/enrichment-history` | View past enrichment results and sources |
| LinkedIn Integration | Primary profile enrichment source |
| Company/Contact Data Provider (e.g., Clearbit-class) | Email/company verification source |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| EnrichmentRecord | enrichment_id, contact_id, provider, fields_returned (json), fields_applied[], match_confidence, cost, fetched_at |
| EnrichmentProviderConfig | provider, enabled, rate_limit, monthly_budget, last_reset_at |

---

# 12. Security & Privacy

- Enrichment only runs with the user's provider connections authorized (e.g., LinkedIn OAuth) and respects each provider's terms of use.
- Enrichment payloads containing third-party PII are encrypted at rest and covered by the same export/delete workflows as captured contact data.
- Users can disable automatic enrichment globally or per-contact.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Automatic enrichment completion (post-creation) | <5 min |
| Manual enrichment latency | <10 sec |
| Provider match accuracy (correct profile selected) | >90% |

---

# 14. Edge Cases

- LinkedIn profile matches by name but not by company (recent job change) — ambiguous match requires user confirmation rather than silent auto-apply.
- No provider match found at all for a common name with a small/unlisted company.
- Provider API rate limit or outage during automatic enrichment.
- Enrichment result contradicts a manually-verified field the user already confirmed.
- Contact enriched twice in a short window returns conflicting data due to a provider-side profile update.
- User revokes provider integration permissions after enrichment has already been applied to contacts.

---

# 15. Dependencies

- Contact Confidence Scoring (FEATURE-05), primary consumer of enrichment verification signal
- Company Association (FEATURE-07), for company-side enrichment
- Plugin/Integration Layer (PRD §5.7), for provider OAuth and API access
- Identity Resolution (FEATURE-02), to avoid enriching a contact into a false match

---

# 16. Risks

- Incorrect profile matching silently overwrites correct data with a different person's details.
- Provider API cost scales with contact volume; uncontrolled auto-enrichment could be expensive.
- Third-party provider deprecation or terms-of-service changes disrupt enrichment availability.

---

# 17. Telemetry & Analytics

Track:
- `contact_enrichment_triggered`
- `contact_enrichment_completed`
- `contact_enrichment_field_applied`
- `contact_enrichment_rejected`
- `contact_enrichment_provider_error`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| % of contacts enriched within 5 minutes of creation | >70% |
| Enriched-field acceptance rate | >80% |
| Provider match accuracy | >90% |

---

# 19. Future Enhancements

- Multi-provider consensus scoring when more than one data provider is connected.
- Scheduled re-enrichment for high-relationship-score contacts to catch job changes over time.

---

# 20. Open Questions

- Should automatic enrichment be on by default, or opt-in given provider cost and privacy sensitivity?
- How should conflicting data from two different providers be reconciled?
