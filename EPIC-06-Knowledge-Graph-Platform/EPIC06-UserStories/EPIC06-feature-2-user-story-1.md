# EPIC06 Feature 2 User Story 1

## Epic
EPIC-06 — Knowledge Graph Platform

## Feature
FEATURE-02 — Entity Linking

---

# User Story

As a user,
I want a business card I scan and a LinkedIn profile I later import for the same person to link to one contact instead of two,
so that my contact list stays clean and my relationship history for that person isn't split.

---

# Business Value

- Eliminates duplicate contacts that would otherwise clutter the user's network.
- Keeps relationship history (meetings, follow-ups) unified under one accurate profile.
- Reduces manual contact-management effort for the user.
- Increases trust in downstream features like follow-up prioritization that depend on accurate contact identity.

---

# Acceptance Criteria

## Functional Criteria
- A scanned business card and a later LinkedIn import for the same person resolve to a single node when a deterministic key (email or LinkedIn URL) matches.
- The user is not asked to manually confirm high-confidence matches.
- The merged contact retains evidence from both sources.

## UX Criteria
- The user can see, in the contact detail view, that a contact was linked from multiple sources.
- Low-confidence matches are surfaced for a quick one-tap confirm/reject rather than silently guessed.

## Technical Criteria
- Deterministic matching completes within the defined latency target.
- Fuzzy/embedding matching is only invoked when no deterministic key is available.
- Match decisions are logged with the method used (deterministic, fuzzy, embedding).

---

# Preconditions

- The user has an existing Person node from a prior capture (e.g., business card scan).
- A new entity mention (e.g., LinkedIn import) is submitted for linking.
- Entity linking service is operational and has access to the graph node store.

---

# Postconditions

- A single canonical Person node represents the individual, with provenance from all contributing sources.
- No duplicate node exists for the same real-world person.
- The contact's relationship edges remain attached to the single canonical node.

---

# Edge Cases

- The business card and LinkedIn profile have slightly different name spellings ("Jon" vs. "Jonathan").
- The LinkedIn import has no email but shares a matching name and company.
- The user manually rejects a suggested match that was actually correct.
- A duplicate node already exists in the graph before entity linking was introduced and needs retroactive merging.

---

# Telemetry

Track:
- `entity_mention_received`
- `entity_auto_linked`
- `entity_match_queued_for_review`
- `entity_merge_confirmed`
- `entity_merge_rejected`

---

# Dependencies

- Graph schema management (Person node type definition)
- OCR extraction and LinkedIn integration pipelines
- Embedding/similarity service for fuzzy matching

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a business card and LinkedIn import with matching email auto-link to one node.
2. Verify a business card and LinkedIn import with only name/company similarity are queued for review.
3. Verify the merged contact shows provenance from both sources.
4. Verify a user-rejected match is not re-suggested for the same mention.
5. Verify a new, genuinely distinct contact creates a new node rather than merging incorrectly.
6. Verify non-Latin name variants are still matched when a deterministic key is present.
7. Verify relationship edges remain intact after a merge.

---

# Story Variation

This is user story variation 1 for Entity Linking, focusing on the happy-path experience of contacts from multiple sources unifying automatically.

---

# Notes

- Deterministic matching should always be attempted first since it is both faster and more reliable than fuzzy matching.
- Consider showing users a lightweight "linked from 2 sources" badge for transparency without overwhelming the UI.
