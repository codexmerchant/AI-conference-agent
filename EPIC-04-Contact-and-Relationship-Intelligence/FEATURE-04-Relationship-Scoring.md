# FEATURE-04 — Relationship Scoring

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Compute and continuously update a quantitative relationship-strength score for each contact, reflecting interaction frequency, recency, depth, and reciprocity, so the user can prioritize outreach and identify their highest-value network.

---

# 2. Problem Statement

Not every contact is equally valuable, but users have no systematic way to tell a five-minute badge-scan encounter apart from a 45-minute strategic conversation repeated across three conferences. Without a relationship score, follow-up effort and network-graph prioritization are guesswork.

---

# 3. Feature Overview

A scoring engine that ingests every interaction signal tied to a contact — meetings, conversation duration, follow-up completion, repeated encounters across events, mutual introductions — and produces a normalized relationship score (0–100) with a breakdown of contributing components. Scores recompute incrementally as new interactions occur and decay over time without renewed contact.

---

# 4. Key Functionalities

## Multi-signal score computation
Combines interaction frequency, recency, conversation depth (duration/transcript richness), and reciprocity (follow-up sent/replied) into a weighted score.

## Time decay
Applies a recency decay curve so relationships without recent interaction gradually lose score.

## Score breakdown transparency
Exposes the component contributions behind a score, not just the final number.

## Cross-event compounding
Increases score contribution when the same contact is met again at a later, separate conference.

## Threshold-based prioritization
Buckets contacts into tiers (e.g., strategic, warm, cold) to drive follow-up recommendations and network views.

---

# 5. Primary Use Cases

## Use Case 1
User met a contact once briefly; the contact's relationship score reflects a low-but-nonzero baseline.

## Use Case 2
User has met the same investor at three different conferences over a year with active email follow-up; the score reflects a strong, compounding relationship.

## Use Case 3
User wants to sort their contact list by relationship strength before a networking dinner to know who to prioritize.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see a relationship strength score on each contact,
so that I know who in my network deserves the most follow-up attention.

### Acceptance Criteria
- Every contact with at least one interaction has a visible relationship score.
- Score updates within a few minutes of a new interaction being recorded.
- Score is shown with a plain-language tier label (e.g., "Strong", "Emerging", "Cold"), not just a raw number.

## User Story 2
As a power user,
I want to understand what is driving a contact's relationship score,
so that I can trust the ranking and act on the specific gap (e.g., no follow-up sent).

### Acceptance Criteria
- Score detail view breaks down contribution by frequency, recency, depth, and reciprocity.
- User can see the specific interactions that fed into the score.
- Recommendations (e.g., "send a follow-up to boost this score") are surfaced from the weakest component.

---

# 7. User Workflow

1. An interaction event (meeting, conversation, follow-up sent/replied) is recorded against a contact.
2. The scoring engine recalculates the affected component (frequency, recency, depth, or reciprocity).
3. Time-decay is applied to all scores on a scheduled recompute pass.
4. The composite score and tier are updated on the contact record.
5. Updated score is reflected in contact list sort order and network graph node weight.
6. User can drill into a contact to see the component breakdown.
7. User acts on a low-scoring high-priority contact (e.g., sends a follow-up), which feeds back into the next recompute.

---

# 8. UI / UX Requirements

- Relationship score shown as a compact visual (e.g., a filled bar or tier badge) on contact list and detail views.
- Score detail screen shows a component breakdown chart and a "why this score" explanation.
- Sortable contact list by relationship score.
- Score changes are not intrusive — no push notifications for minor fluctuations.

---

# 9. Technical Requirements

## Frontend
Contact list and detail views render score/tier from a cached field; component breakdown fetched on-demand when the detail screen is opened.

## Backend
Relationship Scoring service exposing `GET /contacts/{id}/relationship-score` and a recompute trigger `POST /relationship-scores/recompute`; incremental recompute on interaction events plus a nightly batch decay pass.

## AI/ML
Conversation depth signal derived from transcript length/turn-count and topic density (from EPIC-03 context engine); reciprocity signal derived from follow-up send/reply tracking (EPIC output/reporting layer).

## Infrastructure
Event-driven incremental updates via the same event bus used by meeting/timeline events; batch decay job scheduled independently of interaction volume.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /contacts/{id}/relationship-score` | Retrieve current score and component breakdown |
| `POST /relationship-scores/recompute` | Trigger recomputation for a contact or batch |
| Meeting Association Service | Source of frequency/recency interaction events |
| Follow-Up/Output Layer | Source of reciprocity signal (sent/replied) |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| RelationshipScore | score_id, contact_id, user_id, composite_score, tier, frequency_component, recency_component, depth_component, reciprocity_component, computed_at |
| RelationshipScoreHistory | history_id, contact_id, composite_score, computed_at (append-only for trend charts) |

---

# 12. Security & Privacy

- Scores and their component data are visible only to the owning user; never shared across users or exposed to the scored contact.
- Score computation must not incorporate any interaction data captured without consent.
- Score history retained per the account's data retention policy and deletable on contact deletion.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Incremental score recompute latency | <5 sec after triggering interaction |
| Nightly batch decay pass (10k contacts) | <10 min |
| Score retrieval latency | <300 ms |

---

# 14. Edge Cases

- Contact with a single very long, high-depth conversation but no follow-up — component imbalance.
- Contact merged from Duplicate Merging (Feature 3) — score must recompute from the unioned interaction history, not just carry over one side's score.
- Contact met at back-to-back sessions within minutes — frequency should not be inflated by near-duplicate timestamps.
- Long gap between conferences (e.g., 18 months) — decay curve must not zero out a genuinely strong past relationship.
- Reciprocity signal unavailable because email/CRM integration isn't connected.
- Score requested for a contact with zero recorded interactions.

---

# 15. Dependencies

- Meeting Association (FEATURE-06), primary interaction signal source
- Relationship Timeline (FEATURE-09), for cross-event interaction history
- Contact Confidence Scoring (FEATURE-05), to avoid over-weighting low-confidence interaction data
- Output & Reporting Layer, for follow-up reciprocity signal

---

# 16. Risks

- Poorly tuned weights make the score feel arbitrary or untrustworthy to users.
- Decay curve too aggressive, undervaluing long-standing strategic relationships.
- Scoring model becomes a black box without the breakdown view, eroding trust.

---

# 17. Telemetry & Analytics

Track:
- `relationship_score_computed`
- `relationship_score_tier_changed`
- `relationship_score_breakdown_viewed`
- `relationship_score_recompute_failed`
- `relationship_score_decay_applied`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Score computation success rate | >99% |
| User-reported "this score feels accurate" rate | >75% |
| Follow-up action rate on low-score, high-priority contacts | +20% vs. baseline |

---

# 19. Future Enhancements

- User-adjustable weighting for what "relationship strength" means to them (e.g., deal-focused vs. advisory).
- Predictive score trend ("this relationship is cooling") rather than a point-in-time value.

---

# 20. Open Questions

- Should relationship score be visible as a raw number anywhere, or always abstracted into a tier label?
- How much weight should a single deep conversation carry relative to many shallow ones?
