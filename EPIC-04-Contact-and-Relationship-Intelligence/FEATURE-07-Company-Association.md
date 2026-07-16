# FEATURE-07 — Company Association

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Resolve the free-text company names captured with a contact into canonical Company entities, linking each contact to a deduplicated company record so the knowledge graph can answer questions like "who do I know at Acme" reliably.

---

# 2. Problem Statement

Company names arrive as inconsistent free text — "Acme", "Acme Corp", "Acme Corporation", "ACME INC." — from OCR, voice, and LinkedIn sources. Without resolving these to one canonical Company entity, the same organization fragments across the graph, breaking company-level rollups, relationship context, and enrichment.

---

# 3. Feature Overview

A company resolution and association service that normalizes a raw company string, matches it against existing Company entities (by name similarity and domain), creates a new canonical Company record when no match exists, and links the contact to that company with a role/title in context. Reuses the same matching and merge infrastructure as contact Identity Resolution and Duplicate Merging.

---

# 4. Key Functionalities

## Company name normalization
Strips legal suffixes, casing, and punctuation noise to produce a canonical comparison key ("Acme Corp." → "acme").

## Company matching against existing records
Matches a raw company string to an existing Company entity by normalized name and, where available, email domain.

## New company entity creation
Creates a canonical Company record when no confident match exists, with the same provenance/confidence tagging as contacts.

## Contact-to-company linking with role context
Associates the contact to the company along with job title and the point in time that association was captured.

## Company duplicate merging
Reuses Duplicate Merging (Feature 3) infrastructure to combine two Company records discovered to be the same organization.

---

# 5. Primary Use Cases

## Use Case 1
A badge OCR captures "Acme Corp" and the system matches it to an existing Company entity created from a prior LinkedIn scrape of "Acme Corporation."

## Use Case 2
A contact's email domain (@acme.com) is used to disambiguate between two similarly-named companies.

## Use Case 3
User discovers two Company entities for the same organization and merges them, re-parenting all linked contacts.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want the company on a contact's profile to be consistent and deduplicated,
so that I can see everyone I know at a given organization in one place.

### Acceptance Criteria
- Company field on a contact links to a canonical Company entity, not just free text.
- Company detail view lists all contacts associated with that company.
- New company variants ("Acme Corp" vs "Acme Corporation") resolve to the same entity when confidence supports it.

## User Story 2
As a power user,
I want to correct a company match if the system links a contact to the wrong organization,
so that company-level rollups stay accurate.

### Acceptance Criteria
- User can search and manually reassign a contact's company from the contact detail view.
- Manual reassignment is recorded with high confidence and excluded from future auto-rematching to a different entity.
- Company association history is preserved (e.g., a contact who changed jobs keeps their prior company on record).

---

# 7. User Workflow

1. A contact is created or edited with a raw company string.
2. The company normalizer produces a canonical comparison key.
3. The matching service checks for an existing Company entity by normalized name and email domain.
4. If matched with sufficient confidence, the contact is linked to the existing Company entity.
5. If no match, a new canonical Company record is created.
6. The contact-company association is stored with role/title and captured_at timestamp.
7. User can review, correct, or merge company associations at any time.

---

# 8. UI / UX Requirements

- Company shown as a tappable link on the contact card, navigating to a Company detail/roster view.
- Company detail view lists all associated contacts with their roles.
- Company reassignment uses a type-ahead search over existing Company entities plus a "create new" fallback.
- Visual indicator when a contact's company association is low-confidence or unverified.

---

# 9. Technical Requirements

## Frontend
Company detail/roster screen; type-ahead company picker component shared with the contact edit form.

## Backend
Company Association service exposing `POST /contacts/{id}/company` and `GET /companies/{id}`; reuses Identity Resolution's matching primitives configured for company-specific fields (name, domain) and Duplicate Merging's merge engine via `POST /companies/merge`.

## AI/ML
Name normalization (legal-suffix stripping, fuzzy matching) and domain-based disambiguation; optional enrichment lookup (Feature 8) to confirm canonical company name/domain from a third-party company database.

## Infrastructure
Company entities indexed by normalized name and domain for fast matching at contact-creation time, consistent with the sub-500ms resolution budget used for contacts.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts/{id}/company` | Associate a contact with a canonical company |
| `GET /companies/{id}` | Retrieve company profile and associated contacts |
| `GET /companies/search` | Type-ahead search over existing company entities |
| `POST /companies/merge` | Merge two duplicate company entities |
| Contact Enrichment Service | Optional third-party company data confirmation |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Company | company_id, name, normalized_name, domain, industry, size_range, linkedin_url, source, confidence_score, merged_from_ids[], created_at, updated_at |
| ContactCompanyAssociation | association_id, contact_id, company_id, job_title, captured_at, is_current, source |

---

# 12. Security & Privacy

- Company records contain business, not personal, data but the contact-company association (role/title at a point in time) is treated as PII-adjacent and encrypted at rest.
- Company matching never crosses user boundaries — each user's company graph is scoped to their own contacts.
- Deleting a contact does not delete the shared Company entity, only the association.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Company match/create latency | <500 ms |
| Company detail view load (roster) | <1 sec for up to 200 contacts |
| Company merge transaction time | <2 sec |

---

# 14. Edge Cases

- Company acquired/renamed between two capture events ("Twitter" vs "X Corp").
- Subsidiary vs. parent company ambiguity ("Acme Corp" vs "Acme Labs, a subsidiary of Acme Corp").
- Contact's email domain doesn't match their stated company (e.g., agency/consultant working on behalf of a client).
- Freelancers or founders with no formal company entity to associate with.
- Two genuinely different companies share a common short name ("Acme" exists in multiple industries).
- Company name captured only in a non-Latin script or abbreviated form.

---

# 15. Dependencies

- Identity Resolution (FEATURE-02), shared matching infrastructure
- Duplicate Merging (FEATURE-03), shared merge infrastructure for company entities
- Contact Enrichment (FEATURE-08), for third-party company data confirmation
- Contact Creation (FEATURE-01), primary source of raw company strings

---

# 16. Risks

- Over-aggressive normalization merges two distinct companies that happen to share a short name.
- Under-aggressive normalization leaves company data fragmented, undermining the "who do I know at X" use case.
- Company entity sprawl if low-confidence new-company creation isn't reviewed periodically.

---

# 17. Telemetry & Analytics

Track:
- `company_association_created`
- `company_matched_existing`
- `company_created_new`
- `company_association_corrected`
- `company_merge_completed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Company match accuracy (correct entity linked) | >90% |
| Company entity duplication rate | <5% |
| Contacts with a resolved company association | >85% of contacts with a captured company string |

---

# 19. Future Enhancements

- Company hierarchy modeling (parent/subsidiary relationships).
- Automatic company-level insights (e.g., "you know 6 people at Acme, 3 of whom you met this year").

---

# 20. Open Questions

- Should subsidiaries be modeled as distinct Company entities linked to a parent, or folded into the parent directly?
- How should a contact's company history be surfaced when they've changed jobs since first being captured?
