# FEATURE-02 — Identity Resolution

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Determine, before a new contact is persisted, whether it represents a person already known to the user — matching across name, email, phone, LinkedIn URL, and company signals — so the knowledge graph never accumulates avoidable duplicates.

---

# 2. Problem Statement

The same person is frequently captured through multiple channels (a badge scan at registration, a LinkedIn connection the next day, a voice introduction at a happy hour), each producing slightly different, noisy data. Without resolution, every capture becomes a new contact, fragmenting relationship history and making the "who have I met" question unanswerable.

---

# 3. Feature Overview

A matching service that scores a candidate contact against the user's existing contact set using deterministic signals (exact email, exact phone, exact LinkedIn URL) and probabilistic signals (fuzzy name match, company match, title similarity), returning either an auto-match, a suggested-match requiring confirmation, or no match. Runs synchronously on every contact creation and can also be re-run in batch.

---

# 4. Key Functionalities

## Deterministic matching
Exact-match rules on high-trust identifiers: email address, phone number, LinkedIn profile URL.

## Probabilistic fuzzy matching
Name similarity (accounting for nicknames, transliteration, OCR typos) combined with company and title similarity to produce a weighted match score.

## Match confidence tiering
Classifies each candidate pair into auto-merge, suggest-to-user, or no-match based on score thresholds.

## Cross-source signal fusion
Combines signals captured across different sources (badge OCR, LinkedIn scrape, voice) for the same candidate before scoring against existing contacts.

## Resolution audit trail
Records every match decision, its score, and the signals that drove it for later review or dispute.

---

# 5. Primary Use Cases

## Use Case 1
A badge scan produces "Jon Smith, Acme Corp" and the system matches it to an existing "Jonathan Smith, Acme Inc." contact with 0.91 confidence.

## Use Case 2
A LinkedIn profile scraped after the event matches an existing contact by name but the company differs (job change), and the system surfaces it as a suggested match rather than auto-merging.

## Use Case 3
A voice-introduced contact with only a first name and no company produces no confident match and is created as a new contact.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want the app to automatically recognize when a new capture is someone I already know,
so that I never end up with five separate entries for the same person.

### Acceptance Criteria
- High-confidence matches (score ≥ 0.90) are auto-linked without interrupting the user.
- Medium-confidence matches (0.60–0.89) are surfaced as a suggested match for one-tap confirm/reject.
- Low-confidence matches (<0.60) result in a new contact with no interruption.

## User Story 2
As a power user,
I want to see why the system thinks two contacts are the same person,
so that I can trust or override the decision confidently.

### Acceptance Criteria
- Suggested-match UI lists the specific matched fields (e.g., "same email", "similar name + same company").
- User can reject a suggested match, which suppresses that pairing from future auto-suggestions.
- Rejected matches are logged and excluded from re-scoring unless underlying data changes.

---

# 7. User Workflow

1. A candidate contact's normalized fields are submitted to the Identity Resolution service.
2. Deterministic rules check for exact matches on email, phone, and LinkedIn URL.
3. If no deterministic match, probabilistic matching scores name/company/title similarity against candidate contacts in the same user's contact set.
4. The highest-scoring candidate is classified into auto-merge, suggest, or no-match.
5. Auto-merge candidates are linked immediately and logged.
6. Suggest candidates are surfaced to the user with matched-field explanations.
7. The resolution outcome (and its signals) is recorded in the audit trail regardless of tier.

---

# 8. UI / UX Requirements

- Suggested-match card shows both candidate profiles side by side with matched fields highlighted.
- Single-tap "Same person" / "Different person" actions.
- No interruption to capture flow for auto-merge or no-match outcomes.
- Confidence score shown as a simple visual indicator (not a raw decimal) on suggested matches.

---

# 9. Technical Requirements

## Frontend
Suggested-match review component embedded in the capture dashboard and contact detail view; non-blocking toast/banner pattern so resolution never stalls the capture flow.

## Backend
Identity Resolution service exposed via `POST /contacts/resolve`, invoked synchronously from Contact Creation (FEATURE-01) and available for on-demand batch re-scoring via a background job.

## AI/ML
Fuzzy string matching (e.g., Jaro-Winkler / embedding-based name similarity) combined with a lightweight learned scoring model that weights field-match signals; model is retrained periodically on user-confirmed/rejected match outcomes.

## Infrastructure
Per-user contact index (in-memory or search-index-backed) to keep candidate lookup sub-second as contact counts grow into the thousands.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts/resolve` | Score a candidate contact against existing contacts |
| `GET /contacts/{id}/duplicates` | List current suggested-match candidates for a contact |
| `POST /contacts/{id}/resolve-decision` | Record a user's accept/reject decision on a suggested match |
| Contact Creation Service | Synchronous pre-save resolution check |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ResolutionCandidate | candidate_id, contact_id_a, contact_id_b, match_score, matched_fields[], tier (auto/suggest/none), created_at |
| ResolutionDecision | decision_id, candidate_id, decided_by, decision (accept/reject), decided_at |
| ResolutionAuditLog | log_id, contact_id, signals_evaluated (json), outcome, model_version, evaluated_at |

---

# 12. Security & Privacy

- Matching operates only within a single user's own contact set; no cross-user identity matching.
- Audit logs store matched-field names, not full raw PII values, where possible.
- Rejected-match suppressions are user-scoped and never shared or used to train cross-user models without consent.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Resolution check latency (per new contact) | <500 ms |
| Auto-merge precision (auto-tier false-positive rate) | <2% |
| Suggested-match recall | >85% |

---

# 14. Edge Cases

- Two badge scans produce near-duplicate but not identical names ("Jon Smith" vs "Jonathan Smith").
- LinkedIn profile matches by name but not by company (recent job change).
- Common name collision (e.g., "Michael Chen") with no other distinguishing signal.
- Contact re-encountered a year later with a stale company/title on file.
- Name transliteration mismatch (e.g., OCR renders a non-Latin name inconsistently across two captures).
- User explicitly rejects a match that a later capture re-suggests.

---

# 15. Dependencies

- Contact Creation (FEATURE-01)
- Company Association (FEATURE-07), for company-signal matching
- Contact Confidence Scoring (FEATURE-05), to weight low-trust source fields down in matching

---

# 16. Risks

- Aggressive auto-merge thresholds silently combine two different people who share a name and employer.
- Overly conservative thresholds push too many low-value confirmations onto the user, causing suggestion fatigue.
- Matching model drift over time without a feedback loop from user decisions.

---

# 17. Telemetry & Analytics

Track:
- `identity_resolution_checked`
- `identity_resolution_auto_matched`
- `identity_resolution_suggested`
- `identity_resolution_user_decision`
- `identity_resolution_false_positive_reported`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Auto-merge precision | >98% |
| Suggested-match acceptance rate | >70% |
| Duplicate contact rate (post-resolution) | <5% of total contacts |

---

# 19. Future Enhancements

- Cross-event resolution that considers a contact met at a prior conference as a stronger prior signal.
- Active learning loop that retrains the scoring model weekly from accept/reject decisions.

---

# 20. Open Questions

- Should auto-merge ever be allowed without any user-visible trace, or should every auto-merge remain reviewable?
- How should the system handle two legitimately different people who share nearly identical identifying details?
