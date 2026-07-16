# EPIC07 Feature 5 User Story 1

## Epic
EPIC-07 — Reporting & Output Generation

## Feature
FEATURE-05 — Opportunity Detection

---

# User Story

As a user,
I want potential business opportunities automatically flagged from my conversations based on my professional goals,
so that I don't miss a signal buried in casual conversation on a busy conference floor.

---

# Business Value

- Surfaces high-value signals (funding, hiring, partnership, deal interest) that would otherwise be lost in the noise of dozens of daily conversations
- Turns passive conversation capture into active pipeline generation
- Reduces the cognitive load of manually screening every conversation for opportunity language
- Directly supports the persona-specific ROI case for investors, sales leads, and recruiters

---

# Acceptance Criteria

## Functional Criteria
- Detected opportunities are classified into a type relevant to the user's configured persona (deal/partnership/hire/investment/speaking)
- Each opportunity links back to the specific interaction and quoted signal phrase it was derived from
- User can mark an opportunity as pursued, reviewed, or dismissed from a dedicated review queue

## UX Criteria
- Opportunity queue is visually distinct from the general summary/contact timeline
- Confidence level is visible on each opportunity card
- Quick actions (pursue/dismiss/snooze) are available directly from the card

## Technical Criteria
- Detection runs automatically after summary generation without requiring manual review of every summary
- Opportunity records are deduplicated across repeated mentions of the same underlying signal
- Persona configuration correctly filters which opportunity types are surfaced

---

# Preconditions

- User has configured at least one opportunity type/persona of interest
- A `MeetingSummary` exists for the interaction being scanned
- Context Engine intent-inference tags are available for the interaction

---

# Postconditions

- `Opportunity` record is created and available in the review queue
- User is notified of new high-confidence opportunities
- Review action (pursue/dismiss/reviewed) is recorded against the opportunity

---

# Edge Cases

- A sarcastic or hypothetical statement is misclassified as a genuine opportunity signal
- The same opportunity is mentioned across multiple separate conversations with the same contact
- User's persona configuration doesn't match their actual goals, producing consistently irrelevant flags
- A third party in the conversation states the opportunity signal, not the primary contact
- Opportunity signal phrasing is in a language the extraction model wasn't tuned for

---

# Telemetry

Track:
- `opportunity_detected`
- `opportunity_reviewed`
- `opportunity_pursued`
- `opportunity_dismissed`
- `opportunity_queue_opened`

---

# Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-03 Context Engine (intent inference)
- EPIC-06 Knowledge Graph Engine

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify an opportunity is correctly classified according to the user's configured persona
2. Verify the opportunity links to the correct source interaction and quoted phrase
3. Verify pursue/dismiss/reviewed actions are correctly recorded and reflected in the queue
4. Verify duplicate mentions of the same opportunity across conversations are deduplicated
5. Verify persona misconfiguration is correctable from settings and immediately affects future detection
6. Verify a hypothetical statement is either correctly excluded or flagged with appropriately low confidence
7. Verify notification is sent for high-confidence opportunities only, not every detection
8. Verify the queue correctly orders opportunities by confidence

---

# Story Variation

This is user story variation 1 for Opportunity Detection, focusing on the happy-path user experience of persona-relevant, actionable opportunity flagging.

---

# Notes

- This feature's value is highly dependent on correct persona configuration at onboarding; a mismatched persona is the most likely cause of early user disengagement with the review queue.
- Confidence-threshold tuning should favor precision over recall initially to preserve user trust in the queue.
