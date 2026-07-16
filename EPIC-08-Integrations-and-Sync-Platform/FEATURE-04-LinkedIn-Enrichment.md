# FEATURE-04 — LinkedIn Enrichment

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Enrich captured conference contacts with professional profile data (current title, company, work history, mutual connections) sourced from LinkedIn, so a name and badge scan becomes a complete professional profile without manual lookup.

---

# 2. Problem Statement

A badge scan or business-card capture typically yields only a name, company, and title as printed, which is often stale (people change roles constantly); users manually search LinkedIn after every conference to verify current role and find shared context, which is slow and frequently skipped.

---

# 3. Feature Overview

An enrichment pipeline that takes a captured contact's name/company/email and resolves a matching LinkedIn profile — either via a user-supplied/scanned LinkedIn URL or a third-party enrichment provider (given LinkedIn's own public API does not support arbitrary profile lookup) — to populate current role, company, headline, work history, and mutual connections, with a confidence score and manual override.

---

# 4. Key Functionalities

## LinkedIn URL capture and manual link
User can paste, scan (from a badge QR code), or select a LinkedIn profile URL to attach to a contact directly.

## Automated profile matching
When no URL is provided, an enrichment provider is queried using name, company, and email to find the best-match profile.

## Profile data enrichment
Populate current title, company, headline, work history, education, and skills onto the contact record.

## Mutual connection surfacing
Where available, show mutual connections or shared groups to add conversational context.

## Confidence scoring and manual correction
Every automated match includes a confidence score; low-confidence matches are flagged for user confirmation rather than auto-applied.

---

# 5. Primary Use Cases

## Use Case 1
User scans a badge, and the app automatically finds and attaches the matching LinkedIn profile with high confidence.

## Use Case 2
Automated matching returns two plausible profiles for a common name, and the user is prompted to pick the correct one.

## Use Case 3
User manually pastes a LinkedIn URL for a contact the automated match failed to find.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want my captured contacts automatically enriched with their current LinkedIn role and company,
so that I have accurate, up-to-date context before I follow up.

### Acceptance Criteria
- Contacts with a high-confidence match are enriched automatically without user action.
- Enriched fields are clearly labeled as sourced from LinkedIn with a link to the profile.
- User can manually edit or remove enrichment data at any time.

## User Story 2
As a power user meeting someone with a common name,
I want to be asked to confirm the correct LinkedIn profile when the match is ambiguous,
so that I don't attach the wrong person's professional history to my contact.

### Acceptance Criteria
- Matches below a defined confidence threshold are never auto-applied.
- User is shown up to 3 candidate profiles with distinguishing details (photo, company, location) to choose from.
- User can dismiss all candidates and leave the contact unenriched.

---

# 7. User Workflow

1. Contact is captured (badge scan, business card, or manual entry).
2. Enrichment pipeline attempts to resolve a LinkedIn profile using name, company, and email.
3. If confidence is high, profile data is attached automatically.
4. If confidence is ambiguous, candidate profiles are queued for user confirmation.
5. User reviews and confirms, corrects, or dismisses the suggested match.
6. Confirmed enrichment data populates the contact card and feeds contact scoring/context features.
7. User can manually re-trigger enrichment or attach a different URL later.

---

# 8. UI / UX Requirements

- Enrichment status indicator on contact card (enriched / pending / needs confirmation / not found).
- Candidate profile picker showing photo, headline, company, and location for disambiguation.
- Clear "Source: LinkedIn" attribution with link-out to the live profile.
- Manual "Attach LinkedIn URL" action always available regardless of automated match status.
- Non-blocking: contact capture flow completes even if enrichment is still pending.

---

# 9. Technical Requirements

## Frontend
Contact detail screen showing enrichment fields, candidate disambiguation modal, and manual URL entry field with basic URL format validation.

## Backend
Enrichment service that normalizes captured contact fields, queries a third-party enrichment provider API (e.g., a LinkedIn-data enrichment vendor operating within LinkedIn's terms) or resolves a directly supplied profile URL, and writes results with confidence scores.

## AI/ML
Fuzzy name/company matching and confidence scoring model to rank candidate profiles; deduplication logic to avoid re-querying a profile already resolved for an existing contact.

## Infrastructure
Rate-limited queue for enrichment requests respecting provider quotas, with caching of previously resolved profiles (keyed by profile URL) to avoid redundant lookups and cost.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Third-party LinkedIn enrichment provider (e.g., Proxycurl-class API) | Resolve name/company/email to a LinkedIn profile and fetch profile fields |
| Manual LinkedIn URL input | User-supplied ground-truth profile link, bypassing automated matching |
| Contact Service | Attach enrichment results to the correct contact record |
| Badge/Business Card OCR (EPIC-02) | Supply raw name/company/title used as matching input |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| LinkedInEnrichment | id, contact_id, linkedin_profile_url, headline, current_title, current_company, work_history, education, skills, mutual_connections_count, enrichment_source (auto/manual), match_confidence, enrichment_status (pending/matched/needs_confirmation/not_found), enriched_at |
| EnrichmentCandidate | id, contact_id, linkedin_profile_url, display_name, headline, company, location, photo_url, confidence_score, presented_at |

---

# 12. Security & Privacy

- Enrichment queries send only the minimum identifying fields (name, company, email domain) required for matching, never full captured notes or transcripts.
- Enrichment results are stored as structured fields tied to contact ownership, not raw scraped HTML.
- Users can disable automated enrichment entirely in privacy settings.
- Enrichment provider usage complies with the provider's terms and applicable data protection regulations (e.g., GDPR right to erasure propagates to deleting cached enrichment data).
- No enrichment data is shared with third parties beyond the enrichment provider itself.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Enrichment latency (cached profile) | <1 sec |
| Enrichment latency (fresh provider lookup) | <5 sec |
| Auto-match precision at high-confidence threshold | >90% |
| Enrichment coverage (contacts with a resolved profile) | >70% |

---

# 14. Edge Cases

- Common name collision (e.g., "John Smith") returning multiple equally plausible candidates.
- Contact's LinkedIn profile is private or has restricted search visibility.
- Enrichment provider rate limit exceeded during a post-conference bulk-enrichment run.
- Vanity URL vs. numeric profile ID formats both need to resolve to the same cached profile.
- Contact changed jobs recently and cached enrichment data is stale relative to what they said in person.
- Provider returns a different person than intended due to overly permissive fuzzy matching.

---

# 15. Dependencies

- Contact data store and OCR/capture pipeline (EPIC-01/EPIC-02)
- Third-party LinkedIn enrichment provider account and API credentials
- Secrets vault for provider API key storage
- Privacy/consent settings service

---

# 16. Risks

- LinkedIn's terms of service and anti-scraping enforcement limiting which enrichment providers remain viable over time.
- Enrichment provider data staleness or coverage gaps for non-US/regional profiles.
- Incorrect auto-matches damaging user trust if confidence thresholds are miscalibrated.

---

# 17. Telemetry & Analytics

Track:
- `linkedin_enrichment_requested`
- `linkedin_enrichment_auto_matched`
- `linkedin_enrichment_needs_confirmation`
- `linkedin_enrichment_user_confirmed`
- `linkedin_enrichment_user_rejected`
- `linkedin_enrichment_not_found`
- `linkedin_manual_url_attached`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Enrichment coverage across captured contacts | >70% |
| Auto-match precision | >90% |
| User correction rate on auto-matches | <10% |
| Median enrichment latency | <5 sec |

---

# 19. Future Enhancements

- Periodic re-enrichment to catch job changes for high-value contacts.
- Company-level enrichment (funding stage, headcount) alongside individual profile data.
- Browser extension to enrich a contact directly from an open LinkedIn tab.

---

# 20. Open Questions

- Which enrichment provider(s) should be the primary source, and what is the fallback if the primary is unavailable or under contract renegotiation?
- Should the app support LinkedIn's official partner APIs if/when broader access becomes available, in addition to or instead of third-party providers?
- What confidence threshold should trigger auto-apply vs. mandatory user confirmation, and should it be user-configurable?
