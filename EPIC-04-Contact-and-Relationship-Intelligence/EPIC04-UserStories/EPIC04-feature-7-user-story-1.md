# EPIC04 Feature 7 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-07 — Company Association

---

# User Story

As a user,
I want the company on each contact's profile to be consistent and deduplicated,
so that I can see everyone I know at a given organization in one place.

---

# Business Value

- Turns scattered company mentions into a queryable "who do I know at X" view
- Improves the accuracy of company-level insights and reporting
- Removes the clutter of near-duplicate company entries ("Acme Corp" vs "Acme Corporation")
- Makes it easier to spot a whole cluster of relationships at a target account

---

# Acceptance Criteria

## Functional Criteria
- A contact's raw company text resolves to a canonical Company entity, not free text
- Existing Company entities are matched by normalized name and, where available, email domain
- A new Company entity is created only when no confident match exists
- Company detail view lists all contacts associated with that company

## UX Criteria
- Company name is a tappable link on the contact card, navigating to the company roster
- User can manually reassign a contact's company via a type-ahead search
- Low-confidence company associations are visually distinguished

## Technical Criteria
- `POST /contacts/{id}/company` associates a contact with a canonical company within 500ms
- Company matching reuses Identity Resolution's matching primitives configured for company fields
- Manual reassignment is recorded with high confidence and excluded from future auto-rematching

---

# Preconditions

- A contact has a captured raw company string
- Company matching/normalization service is available
- Contact has passed through Contact Creation (Feature 1)

---

# Postconditions

- The contact is linked to a canonical Company entity via a ContactCompanyAssociation record
- The company's roster view reflects the new association
- Association confidence and source are recorded

---

# Edge Cases

- Company acquired or renamed between two capture events ("Twitter" vs "X Corp")
- Contact's email domain doesn't match their stated company (e.g., an agency working on behalf of a client)
- Freelancers or founders with no formal company entity to associate with
- Two genuinely different companies share a common short name
- Company name captured only in abbreviated or non-Latin form
- Subsidiary vs. parent company ambiguity

---

# Telemetry

Track:
- `company_association_created`
- `company_matched_existing`
- `company_created_new`
- `company_association_corrected`

---

# Dependencies

- Identity Resolution (FEATURE-02)
- Contact Creation (FEATURE-01)
- Contact Enrichment (FEATURE-08)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a contact's company string matches to an existing canonical Company entity when confidence supports it
2. Verify a new Company entity is created when no confident match exists
3. Verify company detail view lists all contacts correctly associated with it
4. Verify manual company reassignment updates the association and is excluded from future auto-rematching
5. Verify company matching completes within the 500ms performance target
6. Verify two near-duplicate company name variants resolve to the same canonical entity
7. Verify a company name captured in abbreviated form still matches its full-name canonical entity when appropriate
8. Verify email-domain signal is used to disambiguate between similarly-named companies

---

# Story Variation

This is user story variation 1 for Company Association, focusing on the day-to-day experience of consistent, deduplicated company linking.

---

# Notes

- This feature directly enables one of the PRD's core value propositions: seeing your whole network at a target account in one view
- Reuses Identity Resolution and Duplicate Merging infrastructure rather than forking a parallel matching system
