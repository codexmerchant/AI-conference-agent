# EPIC04 Feature 2 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-02 — Identity Resolution

---

# User Story

As a user,
I want the app to automatically recognize when a new capture is someone I've already met,
so that I never end up with multiple separate entries for the same person.

---

# Business Value

- Keeps the contact list clean and trustworthy without manual dedup work
- Preserves a single, complete interaction history per real person
- Reduces the "which one is the real record" confusion that undermines trust in the product
- Improves the accuracy of every downstream feature that depends on a clean contact graph

---

# Acceptance Criteria

## Functional Criteria
- Deterministic matches (exact email, phone, or LinkedIn URL) auto-link without user interruption
- Probabilistic matches (fuzzy name + company/title similarity) in the 0.60–0.89 range are surfaced as a suggested match
- Matches below 0.60 confidence result in a new, distinct contact with no prompt
- Every resolution outcome, matched or not, is logged with its contributing signals

## UX Criteria
- Suggested-match review is a single-tap accept/reject, not a form
- Matched fields are explained in plain language (e.g., "same email address")
- Resolution never blocks or delays the capture flow itself

## Technical Criteria
- Resolution check completes within 500ms of a new candidate contact being submitted
- Auto-merge tier has a false-positive rate under 2%
- Rejected suggestions are suppressed from reappearing unless underlying data changes

---

# Preconditions

- User has at least one existing contact to match against
- Candidate contact has passed through normalization (Feature 1)
- Matching service has access to the user's full contact index

---

# Postconditions

- Auto-matched candidates are linked to the existing contact, not created as new
- Suggested matches await a user decision
- Resolution outcome and signals are recorded in the audit trail

---

# Edge Cases

- Two badge scans produce near-duplicate but not identical names ("Jon Smith" vs "Jonathan Smith")
- LinkedIn profile matches by name but not by company due to a recent job change
- Common name collision with no other distinguishing signal
- Contact re-encountered a year later with stale company/title on file
- Name transliteration mismatch across two captures of the same non-Latin name
- User rejects a match that a later capture re-suggests with new signal

---

# Telemetry

Track:
- `identity_resolution_checked`
- `identity_resolution_auto_matched`
- `identity_resolution_suggested`
- `identity_resolution_user_decision`

---

# Dependencies

- Contact Creation (FEATURE-01)
- Company Association (FEATURE-07)
- Contact Confidence Scoring (FEATURE-05)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify exact email match auto-links without user prompt
2. Verify fuzzy name + company match in the suggest tier surfaces a review card
3. Verify low-confidence candidate creates a new contact with no interruption
4. Verify matched-field explanation is accurate and human-readable
5. Verify rejected match is suppressed on subsequent identical captures
6. Verify resolution check completes within 500ms under normal load
7. Verify resolution runs correctly against a contact list of several thousand entries
8. Verify audit log entry is created for every resolution outcome, matched or not

---

# Story Variation

This is user story variation 1 for Identity Resolution, focusing on the happy-path experience of automatic and suggested duplicate detection.

---

# Notes

- This feature is the primary defense against duplicate contacts; Duplicate Merging (Feature 3) is the fallback, not the first line
- Matched-field transparency is what makes users trust auto-merge enough to not double-check every one
