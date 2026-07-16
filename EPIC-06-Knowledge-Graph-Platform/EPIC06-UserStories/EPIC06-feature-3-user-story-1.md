# EPIC06 Feature 3 User Story 1

## Epic
EPIC-06 — Knowledge Graph Platform

## Feature
FEATURE-03 — Relationship Storage

---

# User Story

As a user,
I want every conversation I have and every session I attend to be recorded as a relationship without creating duplicates,
so that my contact history stays accurate even when both my phone and the transcription pipeline report the same interaction.

---

# Business Value

- Prevents inflated or misleading interaction counts on a contact's profile.
- Keeps relationship data trustworthy across multiple capture sources.
- Reduces confusion from seeing the same conversation logged twice.
- Preserves a clean evidence trail supporting accurate follow-up prioritization.

---

# Acceptance Criteria

## Functional Criteria
- Submitting the same interaction from two different sources (mobile app, transcription pipeline) results in one edge, not two.
- Each edge accumulates provenance from every contributing source.
- Edge weight reflects the combined strength of evidence, not a duplicated count.

## UX Criteria
- The contact detail view shows a single, coherent interaction history.
- The user is never shown duplicate "you met at Conference X" entries for the same event.

## Technical Criteria
- Idempotency key computation is deterministic across producers for the same logical interaction.
- Edge writes are retried safely without creating duplicates on transient failure.
- Provenance merge preserves all original source references for later audit.

---

# Preconditions

- The user has an active conference session with capture enabled.
- Two or more producers (mobile capture, transcription pipeline) report evidence of the same interaction.
- Relationship storage service is operational.

---

# Postconditions

- A single relationship edge exists for the interaction with merged provenance.
- Edge weight and confidence reflect the combined evidence appropriately.
- The user's contact view reflects the deduplicated interaction accurately.

---

# Edge Cases

- The mobile app and transcription pipeline report slightly different timestamps for the same interaction.
- One source reports a `met_at` interaction while another reports `discussed` for the same conversation — both must be stored as distinct but linked edges.
- A retried write arrives after the original request already succeeded.
- The user manually deletes an interaction that still has pending evidence from a second source.

---

# Telemetry

Track:
- `relationship_edge_created`
- `relationship_edge_updated`
- `relationship_edge_duplicate_detected`
- `relationship_edge_soft_deleted`

---

# Dependencies

- Entity linking (resolved node identities)
- Mobile capture platform and transcription pipeline as edge-write producers
- Graph database with transactional upsert support

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify the same interaction reported twice from different sources produces one edge.
2. Verify provenance from both sources is visible on the merged edge.
3. Verify edge weight reflects combined evidence without double-counting.
4. Verify a retried write does not create a duplicate.
5. Verify `met_at` and `discussed` edges for the same conversation are stored as distinct edges.
6. Verify user-initiated deletion soft-deletes rather than hard-deletes the edge.
7. Verify the contact view shows a single coherent interaction entry.

---

# Story Variation

This is user story variation 1 for Relationship Storage, focusing on the happy-path experience of deduplicated, trustworthy interaction history.

---

# Notes

- Idempotency key design is the crux of this story — it must be stable regardless of which producer writes first.
- Distinguish clearly between "duplicate evidence of the same edge" and "multiple distinct relationship types between the same pair."
