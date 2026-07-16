# FEATURE-07 — Executive Summaries

## Epic
EPIC-07 — Reporting & Output Generation

---

# 1. Objective

Produce a short, audience-appropriate distillation of a conference's outcomes — for the user themselves, a manager, or leadership — condensing the full Conference Report into a high-signal digest sized for a time-constrained reader.

---

# 2. Problem Statement

A full Conference Report is thorough but too long for stakeholders who need the headline outcomes in under a minute — a VC reporting to partners, a sales lead reporting to a VP, an employee justifying travel spend to a manager. Without a purpose-built short form, users either skip reporting upward entirely or spend time manually rewriting the long report into a summary themselves.

---

# 3. Feature Overview

The Executive Summary Service compresses a `ConferenceReport` (optionally supplemented by the conference's `DailySummary` records) into a short-form narrative sized and tailored to a selected audience tier, highlighting the top few outcomes, key relationships formed, and recommended next actions, with an option to generate a shareable, presentation-ready version.

---

# 4. Key Functionalities

## Audience-tier templating
Generates content tuned to who will read it — self (personal recap), manager (team-relevant outcomes), leadership/board (strategic highlights only).

## Length-constrained generation
Enforces a target length per tier (e.g., 5 bullets, one page, or a slide-ready outline) rather than truncating a longer draft.

## Highlight ranking
Selects the top 3-5 outcomes from the full report by relevance/impact rather than including everything.

## Shareable output
Generates a shareable link or exportable file (ties to FEATURE-08) scoped to only the content appropriate for that audience tier.

## Regeneration per tier
Same underlying conference data can be regenerated into a different audience tier without re-running full report generation.

---

# 5. Primary Use Cases

## Use Case 1
A VC generates a board-tier executive summary highlighting the two most promising deal opportunities from the conference.

## Use Case 2
A sales lead generates a manager-tier summary listing new pipeline contacts and next steps to share in a Monday standup.

## Use Case 3
User generates a self-tier summary as a personal quick-reference recap before their next 1:1 with the same contacts.

---

# 6. User Stories

## User Story 1
As a conference attendee reporting outcomes upward,
I want a short, audience-appropriate summary generated from my full conference report,
so that I can share results without manually rewriting a long report into a digest.

### Acceptance Criteria
- User can select an audience tier (self/manager/leadership) when generating the summary.
- Generated content respects the length constraint for the selected tier.
- Summary highlights are drawn from the underlying Conference Report data, not freshly re-derived from raw transcripts.

## User Story 2
As a user sharing results with stakeholders who don't need full contact-level detail,
I want sensitive relationship details filtered out of higher-level tiers,
so that I can share a board-tier summary without exposing contact-level specifics inappropriately.

### Acceptance Criteria
- Leadership/board tier omits raw contact-level detail present in lower tiers unless explicitly included.
- User can preview exactly what will be shared before generating a shareable link.
- Sharing action requires explicit confirmation separate from generation.

---

# 7. User Workflow

1. Conference Report (FEATURE-04) has been generated for the conference.
2. User selects "Generate Executive Summary" and chooses an audience tier and length tier.
3. Executive Summary Service pulls the relevant sections from the Conference Report (and Daily Summaries if needed).
4. Highlight-ranking step selects the top outcomes appropriate to the tier.
5. Length-constrained LLM prompt generates the tiered narrative.
6. `ExecutiveSummary` record is created and presented for review.
7. User optionally shares via link or exports (FEATURE-08).

---

# 8. UI / UX Requirements

- Tier selector (self/manager/leadership) with a live preview of estimated length.
- Clear indication of what content is included vs. omitted per tier before sharing.
- One-tap regenerate for a different tier from the same underlying report.
- Share action distinct from generate action, requiring explicit confirmation.
- Slide-ready view option for direct use in a presentation.

---

# 9. Technical Requirements

## Frontend
Tier/length selector UI with live preview, and a share-confirmation modal showing exactly what will be included in the shared version.

## Backend
Executive Summary Service reads a completed `ConferenceReport`, applies a tier-specific content filter, and calls a length-constrained generation step; sharing creates a scoped, permissioned share record separate from the underlying full report.

## AI/ML
Versioned prompt templates per audience tier enforce a token/length budget and a redaction rule set (e.g., no raw contact PII in leadership tier unless the user explicitly opts to include it).

## Infrastructure
Generation is synchronous given the bounded input size (a finished Conference Report rather than raw transcripts); sharing links are tokenized and expirable.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Conference Reports Service (FEATURE-04) | Supplies the source report content to compress |
| Daily Summaries Service (FEATURE-03) | Optionally supplies supporting day-by-day detail |
| Sharing/Permissions Service | Manages scoped, expirable share links for generated summaries |
| Report Export Service (FEATURE-08) | Supplies PDF/DOCX/slide-ready export of the executive summary |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| ExecutiveSummary | exec_summary_id, conference_id, user_id, source_report_id, audience_tier (self/manager/leadership/board), length_tier (bullets/one_pager/slide), content_sections (array), generated_at, status, shared_with (array), share_link_token, share_link_expires_at |

---

# 12. Security & Privacy

- Higher audience tiers default to redacted contact-level detail unless the user explicitly opts to include it.
- Share links are tokenized, expirable, and revocable by the user at any time.
- Executive summaries are encrypted at rest and access-logged the same as the source Conference Report.
- Board/leadership tier content is flagged for an explicit second confirmation step before sharing given its outward-facing nature.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Generation latency | <15 sec |
| Regeneration for a different tier | <10 sec |
| Generation success rate | >98% |

---

# 14. Edge Cases

- Conference data too sparse for a meaningful executive summary (fewer than a handful of interactions).
- Conflicting emphasis needed between two audience tiers generated from the same underlying data.
- Executive summary requested before the source Conference Report has finished generating.
- Multi-conference roll-up requested (out of single-conference scope for this feature).
- Sensitive contact detail flagged as inappropriate for board-level sharing but present in the source report.
- Share link accessed after expiration.

---

# 15. Dependencies

- FEATURE-04 Conference Reports
- FEATURE-03 Daily Summaries
- Sharing/permissions service
- FEATURE-08 Report Export

---

# 16. Risks

- Over-redaction makes higher tiers feel vague and low-value.
- Under-redaction accidentally exposes contact-level detail inappropriate for the audience.
- Length constraints force omission of genuinely important context, leading to a misleading summary.

---

# 17. Telemetry & Analytics

Track:
- `executive_summary_generated`
- `executive_summary_tier_selected`
- `executive_summary_shared`
- `executive_summary_share_revoked`
- `executive_summary_regenerated`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Generation success rate | >98% |
| Share-link usage rate (shared summaries actually opened by recipient) | >60% |
| User satisfaction with tier accuracy (feedback rating) | >4.0/5.0 |

---

# 19. Future Enhancements

- Auto-suggested audience tier based on the user's role/persona configuration.
- Native export to presentation software (Google Slides/PowerPoint) beyond static slide-ready format.
- Recipient view analytics (was the shared summary opened, by whom).

---

# 20. Open Questions

- Should recipients of a shared executive summary need an account, or should link-based anonymous viewing be supported?
- What is the default redaction policy for the leadership/board tier, and should it be user-configurable per organization?
- Should executive summaries support multi-conference roll-ups in V1, or strictly single-conference scope?
