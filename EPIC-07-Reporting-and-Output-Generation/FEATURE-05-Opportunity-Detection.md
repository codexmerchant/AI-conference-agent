# FEATURE-05 — Opportunity Detection

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Automatically identify and surface potential business opportunities — deals, partnerships, hiring leads, investment leads, speaking opportunities — from the language used in captured interactions and sessions, scored and queued for user review.

---

# 2. Problem Statement

Valuable signals ("we're raising a seed round," "we're hiring a Head of Growth," "we'd love to explore a partnership") surface constantly in casual conference conversation but are easy to miss because no one actively screens every conversation for opportunity language in real time. Opportunities are lost simply because they weren't noticed as opportunities.

---

# 3. Feature Overview

An opportunity-signal extraction model scans meeting summaries and transcripts for language patterns matching the user's configured opportunity types (persona-dependent: a VC screens for deal/investment signals, a sales lead screens for buying signals, a recruiter screens for hiring signals), scores candidate opportunities by confidence, and surfaces them in a review queue distinct from the general summary flow.

---

# 4. Key Functionalities

## Signal extraction
Detects opportunity-indicating phrases and context (stated needs, funding stage, role/seniority, hiring intent) within summary and transcript text.

## Persona-aware classification
Classifies detected signals into opportunity types relevant to the user's configured persona/role, avoiding irrelevant noise (e.g., not flagging hiring signals for a pure investor persona).

## Confidence scoring
Each opportunity carries a confidence score combining signal strength, source transcript confidence, and speaker context.

## Review queue and actions
Presents candidate opportunities in a dedicated queue where the user can mark them pursued, reviewed, or dismissed.

## Active learning from feedback
Dismiss/pursue actions feed back into signal-detection tuning to reduce false positives for that user over time.

---

# 5. Primary Use Cases

## Use Case 1
A VC's app flags "we're raising our Series A next quarter" from a booth conversation as a high-confidence investment opportunity.

## Use Case 2
A sales lead's app flags a prospect stating "our current vendor isn't scaling with us" as a mid-confidence deal opportunity.

## Use Case 3
User dismisses a flagged opportunity that was actually a hypothetical ("if we ever needed to raise, we'd..."), teaching the model to weight hedging language lower.

---

# 6. User Stories

## User Story 1
As a conference attendee with a specific professional goal (investing, selling, hiring, recruiting),
I want potential opportunities automatically flagged from my conversations,
so that I don't miss a signal buried in casual conversation.

### Acceptance Criteria
- Detected opportunities are classified into a type relevant to the user's configured persona.
- Each opportunity links back to the specific interaction and quoted signal phrase it was derived from.
- User can mark an opportunity as pursued, reviewed, or dismissed from the review queue.

## User Story 2
As a user refining what counts as a real opportunity for me,
I want my dismiss/pursue feedback to improve future detection,
so that the review queue gets more relevant over time instead of staying noisy.

### Acceptance Criteria
- Dismissed opportunities of a similar pattern are flagged less frequently after repeated dismissal.
- Feedback is scoped to the individual user and does not affect other users' detection thresholds.
- User can view why an opportunity was flagged (the specific signal phrase) to give informed feedback.

---

# 7. User Workflow

1. Meeting summary or session summary is generated (FEATURE-01 / EPIC-05).
2. Opportunity-signal extraction runs over the new summary/transcript text.
3. Detected candidates are classified by opportunity type and scored for confidence.
4. Opportunities above the review threshold are written to the review queue.
5. User is notified of new high-confidence opportunities.
6. User reviews each candidate, viewing the source quote and interaction context.
7. User marks the opportunity pursued, reviewed, or dismissed; feedback is logged for tuning.

---

# 8. UI / UX Requirements

- Dedicated Opportunities queue, separate from the general summary/contact timeline.
- Each card shows opportunity type, confidence, the quoted signal phrase, and a link to the source contact/interaction.
- Quick actions: Pursue, Dismiss, Snooze.
- Persona/opportunity-type configuration accessible in settings.
- Visual distinction between high- and low-confidence opportunities in the queue ordering.

---

# 9. Technical Requirements

## Frontend
Opportunity queue view (React/SwiftUI) with card-based review UI, quick-action buttons, and a settings screen for configuring persona/opportunity types of interest.

## Backend
Opportunity Detection Service runs as a post-processing step after summary generation, writing `Opportunity` records; review actions (pursue/dismiss) are captured as structured feedback events.

## AI/ML
A classification model (fine-tuned or prompt-based) trained on persona-specific opportunity signal patterns, combined with the Context Engine's intent inference (EPIC-03); feedback events feed a per-user threshold adjustment layer rather than retraining a shared global model in V1.

## Infrastructure
Detection runs asynchronously immediately after summary generation completes; review-queue writes must be idempotent to avoid duplicate opportunity entries when a summary is regenerated.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Meeting Summaries Service (FEATURE-01) | Supplies summary text scanned for opportunity signals |
| Context Engine (EPIC-03) | Supplies intent-inference signals used in classification |
| Knowledge Graph Engine (EPIC-06) | Supplies company/contact context (stage, role, seniority) for scoring |
| CRM (Salesforce/HubSpot/Affinity) | Pushes pursued opportunities into the user's CRM pipeline |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Opportunity | opportunity_id, conference_id, contact_id, company_id, source_interaction_id, opportunity_type (deal/partnership/hire/investment/speaking), signal_phrases (array), confidence_score, status (new/reviewed/pursued/dismissed), detected_at, reviewed_at, reviewed_by |

---

# 12. Security & Privacy

- Opportunity detection only runs over interactions captured with recording consent.
- Signal phrases displayed to the user are quoted directly from their own recorded summary, never inferred content not actually said.
- Opportunity data pushed to a connected CRM requires explicit per-push user confirmation, not automatic sync.
- Persona configuration and detection feedback are stored per-user and not shared across accounts.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Detection latency after summary generation | <15 sec |
| False-positive rate (dismissed / total flagged) | <25% after first week of use |
| Detection job success rate | >98% |

---

# 14. Edge Cases

- Sarcastic or hypothetical statement misclassified as a genuine opportunity signal.
- Opportunity mentioned by a third party in the room rather than the primary contact.
- Duplicate opportunity flagged across repeated conversations with the same contact.
- Low-confidence opportunities flooding the review queue and reducing signal-to-noise.
- User's persona configuration doesn't match their actual goals, producing consistently irrelevant flags.
- Opportunity signal spans a language the extraction model wasn't tuned for.

---

# 15. Dependencies

- FEATURE-01 Meeting Summaries
- EPIC-03 Context Engine (intent inference)
- EPIC-06 Knowledge Graph Engine
- CRM integrations (Plugin/Integration Layer)

---

# 16. Risks

- Over-flagging erodes user trust in the queue and causes them to ignore it entirely.
- Under-flagging causes missed real opportunities, undermining the feature's core value proposition.
- Persona misconfiguration at onboarding produces a poor first-week experience before feedback tuning kicks in.

---

# 17. Telemetry & Analytics

Track:
- `opportunity_detected`
- `opportunity_reviewed`
- `opportunity_pursued`
- `opportunity_dismissed`
- `opportunity_pushed_to_crm`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Opportunities marked pursued or reviewed (vs. ignored) | >60% |
| False-positive rate | <25% |
| Time from detection to user review | <24h median |

---

# 19. Future Enhancements

- Cross-conference opportunity trend view (recurring signals from the same contact/company over time).
- Team-shared opportunity queue for sales/investment teams attending together.
- Suggested next action per opportunity type (e.g., auto-suggest a follow-up draft tuned to the opportunity).

---

# 20. Open Questions

- Should opportunity detection be on by default, or opt-in during onboarding given its persona-specific nature?
- What confidence threshold should gate a push notification vs. a silent queue addition?
- How should the system handle a user with multiple personas (e.g., both investor and hiring manager)?
