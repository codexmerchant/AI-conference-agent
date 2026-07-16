# EPIC-09 — User Productivity & Coaching Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Conference Scoring | `FEATURE-01-Conference-Scoring.md` |
| FEATURE-02 — Interaction Quality Analysis | `FEATURE-02-Interaction-Quality-Analysis.md` |
| FEATURE-03 — Follow-up Completion Tracking | `FEATURE-03-Follow-up-Completion-Tracking.md` |
| FEATURE-04 — Behavioral Coaching | `FEATURE-04-Behavioral-Coaching.md` |
| FEATURE-05 — Missed Opportunity Detection | `FEATURE-05-Missed-Opportunity-Detection.md` |
| FEATURE-06 — Time Allocation Analysis | `FEATURE-06-Time-Allocation-Analysis.md` |
| FEATURE-07 — Goal Tracking | `FEATURE-07-Goal-Tracking.md` |

## Implementation Notes
- This epic is a post-V1 fast-follow per PRD §9 (the coaching system is explicitly listed under "Defer"); every feature here assumes Conference Score inputs, interaction, contact, and follow-up data already exist from EPIC-01 through EPIC-04.
- All scoring models (Conference Score, User Score, interaction quality) must carry a `model_version` on every persisted record so historical scores stay interpretable across model/weighting changes.
- Coaching recommendation generation (Feature 4) must ground every LLM-produced statement in structured evidence from Features 1, 2, 3, 5, and 6 — no recommendation should ship without a citable source record, enforced by a guardrail layer, not prompt instructions alone.
- Missed Opportunity Detection (Feature 5) and coaching tone are the primary adoption risk in this epic — false positives and judgmental framing read as surveillance rather than assistance, so copy and confidence thresholds need deliberate calibration and user testing.
- Goal Tracking (Feature 7) is the anchor entity for the rest of the epic: scoring, missed-opportunity detection, and coaching all become materially more precise once a user has defined goals, so onboarding should nudge goal creation early rather than treating it as an optional afterthought.
