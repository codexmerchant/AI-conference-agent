# EPIC08 Feature 4 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-04 — LinkedIn Enrichment

---

# User Story

As a user,
I want my captured conference contacts automatically enriched with their current LinkedIn role and company,
so that I have accurate, up-to-date professional context before I follow up.

---

# Business Value

- Replaces stale printed badge/business-card titles with current professional information
- Removes the manual step of searching LinkedIn after every conference for each new contact
- Improves follow-up personalization by surfacing mutual connections and shared context
- Increases perceived intelligence of the app by turning a bare name into a full professional profile

---

# Acceptance Criteria

## Functional Criteria
- Contacts with a high-confidence automated match are enriched without requiring user action
- Enriched fields (title, company, headline, work history) are attached to the contact record with a source label
- User can manually attach or replace a LinkedIn URL for any contact at any time

## UX Criteria
- Enrichment status (enriched/pending/not found) is visible on the contact card
- Enriched data is clearly attributed to LinkedIn with a link-out to the live profile
- Contact capture flow completes immediately without blocking on enrichment, which completes asynchronously

## Technical Criteria
- Automated matches below a defined confidence threshold are never auto-applied
- Enrichment results are cached by profile URL to avoid redundant provider queries for the same person
- Enrichment failures (not found, provider error) do not block or corrupt the underlying contact record

---

# Preconditions

- Contact has been captured with at least a name and one of company/email
- Enrichment feature is enabled for the user (opt-in or default per privacy settings)
- Enrichment provider service is reachable

---

# Postconditions

- LinkedInEnrichment record is created or updated with match confidence and source
- Contact card reflects enriched fields with LinkedIn attribution
- `linkedin_enrichment_auto_matched` or equivalent telemetry event is recorded

---

# Edge Cases

- Contact's name is common enough that no single high-confidence match exists
- Contact's LinkedIn profile is private or not indexed by the enrichment provider
- Contact recently changed jobs and the enrichment data conflicts with what they said in person
- User manually attaches a LinkedIn URL that doesn't match the captured name at all
- Enrichment provider is temporarily unavailable during a post-conference bulk-enrichment run

---

# Telemetry

Track:
- `linkedin_enrichment_requested`
- `linkedin_enrichment_auto_matched`
- `linkedin_enrichment_not_found`
- `linkedin_manual_url_attached`
- `linkedin_enrichment_cache_hit`

---

# Dependencies

- Contact data store and OCR/capture pipeline (EPIC-01/EPIC-02)
- Third-party LinkedIn enrichment provider
- Secrets vault for provider API key storage

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a captured contact with sufficient identifying data is auto-enriched when a high-confidence match exists
2. Verify enrichment status is visible and updates correctly as it transitions from pending to matched
3. Verify enriched fields display with correct LinkedIn source attribution and link-out
4. Verify a low-confidence match is not auto-applied
5. Verify manual URL attachment overrides any prior automated enrichment
6. Verify contact capture completes without waiting for enrichment to finish
7. Verify a cached profile lookup is reused rather than re-querying the provider
8. Verify enrichment provider unavailability does not corrupt or block the underlying contact record

---

# Story Variation

This is user story variation 1 for LinkedIn Enrichment, focusing on the happy-path automated enrichment experience for a captured contact.

---

# Notes

- Confidence threshold calibration is critical here; the disambiguation flow (story covered separately) exists specifically to prevent bad auto-matches from damaging trust
- Enrichment caching by profile URL should be shared infrastructure reusable if additional enrichment data types (company-level data) are added later
