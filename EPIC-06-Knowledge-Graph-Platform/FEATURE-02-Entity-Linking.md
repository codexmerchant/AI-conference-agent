# FEATURE-02 — Entity Linking

## Epic
EPIC-06 — Knowledge Graph Platform

---

# 1. Objective

Resolve entity mentions arriving from many sources (business cards, LinkedIn imports, transcript speaker labels, badge scans, CRM records) to a single canonical graph node, so the same person or company is never duplicated across the graph.

---

# 2. Problem Statement

The same person shows up differently across sources — an OCR'd badge reads "Jon Smyth," a LinkedIn import reads "Jonathan Smith," and a transcript diarization labels them "Speaker 2." Without entity linking, the graph accumulates duplicate Person and Company nodes, splitting relationship history and undermining every downstream feature that depends on an accurate contact graph.

---

# 3. Feature Overview

An entity resolution pipeline that matches incoming entity mentions against existing graph nodes using deterministic keys (email, LinkedIn URL, phone) first, then probabilistic matching (name similarity, company overlap, embedding similarity) with a confidence score. High-confidence matches auto-link; low-confidence matches are queued for human review; unmatched mentions create new nodes.

---

# 4. Key Functionalities

## Deterministic matching
Match on unique identifiers such as email address, LinkedIn URL, or phone number for instant, high-confidence linking.

## Probabilistic/fuzzy matching
Score candidate matches using name similarity, company/title overlap, and text-embedding similarity when deterministic keys are absent.

## New node creation
Create a new canonical Person or Company node when no acceptable match candidate exists.

## Merge/unmerge review workflow
Route ambiguous matches to a human review queue and support reversing an incorrect merge.

## Cross-source provenance tracking
Preserve the original mention and its source on every node so linking decisions remain explainable and auditable.

---

# 5. Primary Use Cases

## Use Case 1
An OCR'd business card for "Jon Smyth, Acme Corp" is matched to the existing "Jonathan Smith, Acme Corporation" node.

## Use Case 2
A transcript speaker label ("Speaker 2") is resolved to a known Person node using diarization output plus session attendee context.

## Use Case 3
Two independently created Person nodes for the same individual are merged after a LinkedIn import reveals a shared email address.

---

# 6. User Stories

## User Story 1
As a user,
I want new contacts I capture at a conference to automatically link to the right person even if the name is spelled differently across sources,
so that I see one unified contact instead of duplicates.

### Acceptance Criteria
- High-confidence matches (deterministic key match) are linked automatically without user action.
- The user can see and correct a low-confidence match suggestion.
- Newly created nodes for genuinely new contacts are indistinguishable in quality from linked ones.

## User Story 2
As a power user managing hundreds of contacts,
I want to review and confirm ambiguous entity matches in one place,
so that I don't have to hunt through my contact list for duplicates.

### Acceptance Criteria
- Ambiguous matches surface in a single review queue ranked by confidence.
- Confirming or rejecting a match updates the graph immediately.
- Rejected matches are not re-suggested for the same mention.

---

# 7. User Workflow

1. New entity mention arrives (from OCR, transcript, LinkedIn import, or CRM sync).
2. Deterministic key extraction attempts a direct match (email, LinkedIn URL, phone).
3. If no deterministic match, probabilistic matching scores candidate nodes.
4. High-confidence match auto-links the mention to the existing node.
5. Low-confidence match is queued for human review.
6. Reviewer confirms, rejects, or manually links the mention.
7. Node is updated with new provenance, or a new node is created if unmatched.

---

# 8. UI / UX Requirements

- Review queue showing candidate matches side by side with source evidence.
- Confidence score displayed per candidate match.
- One-tap confirm/reject actions for ambiguous matches.
- Visible undo/unmerge action after a confirmed merge.

---

# 9. Technical Requirements

## Frontend
A lightweight review-queue UI (mobile and web) surfacing pending entity-linking decisions with source snippets and confidence scores.

## Backend
An entity resolution service that runs deterministic key lookup, fuzzy/embedding-based candidate scoring, and merge/unmerge orchestration against the graph store.

## AI/ML
Name and company similarity scoring (fuzzy string matching plus embedding-based semantic similarity) and a calibrated confidence model trained on historical merge/unmerge outcomes.

## Infrastructure
A candidate-matching index (e.g., approximate nearest neighbor index over name/company embeddings) kept in sync with the graph node store.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Graph DB | Read candidate nodes and write merge/link decisions |
| OCR Extraction (EPIC-02) | Source of business-card entity mentions |
| Speaker Diarization (EPIC-02) | Source of transcript speaker mentions |
| CRM Integrations | Source of external contact records for matching |
| Embedding Service | Compute name/company similarity vectors |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| EntityMention | mention_id, raw_text, source_system, source_ref, extracted_fields{}, received_at |
| EntityMatchCandidate | candidate_id, mention_id, node_id, match_score, match_method (deterministic\|fuzzy\|embedding), status (pending\|confirmed\|rejected) |
| MergeDecision | decision_id, mention_id, target_node_id, decided_by (system\|user_id), decision (auto_linked\|confirmed\|rejected\|unmerged), decided_at |

---

# 12. Security & Privacy

- PII used for matching (email, phone) is processed in-memory and not logged in plaintext.
- Review queue access restricted to the owning user or authorized operators.
- Unmerge action preserves an auditable history of the prior linked state.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Deterministic match latency | <200ms p95 |
| Fuzzy/embedding match latency | <1.5 sec p95 |
| Auto-link precision | >95% |

---

# 14. Edge Cases

- Two different people share an identical name and company.
- A match candidate falls just below the auto-link confidence threshold.
- Concurrent pipelines submit conflicting merge requests for the same mention.
- A confirmed merge is later found to be incorrect and must be unmerged.
- Non-Latin script names produce transliteration variants that fuzzy matching misses.
- A mention references a node that was deleted or tombstoned after a prior merge.

---

# 15. Dependencies

- Graph schema management (node/edge type definitions)
- OCR and speaker diarization pipelines
- Embedding/similarity service
- Human review queue infrastructure

---

# 16. Risks

- False-positive merges silently corrupting relationship history.
- Review queue backlog during high-volume conference capture.
- Bias in name-matching heuristics against non-Western naming conventions.

---

# 17. Telemetry & Analytics

Track:
- `entity_mention_received`
- `entity_auto_linked`
- `entity_match_queued_for_review`
- `entity_merge_confirmed`
- `entity_merge_rejected`
- `entity_unmerged`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Auto-link precision | >95% |
| Duplicate node rate | <2% of active Person nodes |
| Review queue resolution time | <24 hours median |

---

# 19. Future Enhancements

- Active-learning loop that retrains the confidence model from reviewer decisions.
- Cross-conference identity linking (same contact met at multiple events over years).
- Company entity linking using domain-based canonicalization (e.g., subsidiaries under a parent).

---

# 20. Open Questions

- What confidence threshold should trigger auto-link versus human review, and should it be user-configurable?
- Should entity linking run synchronously at capture time or asynchronously in a batch pipeline?
- How should the system handle contacts who intentionally use different identities across contexts (e.g., personal vs. work email)?
