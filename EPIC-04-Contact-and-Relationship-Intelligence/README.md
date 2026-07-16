# EPIC-04 — Contact & Relationship Intelligence Feature Files

| Feature | File |
|---|---|
| FEATURE-01 — Contact Creation | `FEATURE-01-Contact-Creation.md` |
| FEATURE-02 — Identity Resolution | `FEATURE-02-Identity-Resolution.md` |
| FEATURE-03 — Duplicate Merging | `FEATURE-03-Duplicate-Merging.md` |
| FEATURE-04 — Relationship Scoring | `FEATURE-04-Relationship-Scoring.md` |
| FEATURE-05 — Contact Confidence Scoring | `FEATURE-05-Contact-Confidence-Scoring.md` |
| FEATURE-06 — Meeting Association | `FEATURE-06-Meeting-Association.md` |
| FEATURE-07 — Company Association | `FEATURE-07-Company-Association.md` |
| FEATURE-08 — Contact Enrichment | `FEATURE-08-Contact-Enrichment.md` |
| FEATURE-09 — Relationship Timeline | `FEATURE-09-Relationship-Timeline.md` |

## Implementation Notes

- Identity resolution must run synchronously (or near-synchronously, <500ms) before any new contact is committed, so duplicate contacts never reach the knowledge graph in the first place — merging after the fact is strictly a fallback, not the primary defense.
- Every contact and company field must carry field-level provenance (`source`, `source_capture_event_id`) and a confidence score, since inputs arrive from wildly different-quality channels (OCR on a blurry badge vs. a verified LinkedIn API pull) and downstream features (relationship scoring, enrichment, reporting) must be able to discount low-trust data.
- Merges must be reversible: an `undo` window and immutable merge-history log are required so a bad automatic or user-initiated merge can be rolled back without losing the pre-merge state of either contact.
- Relationship and confidence scores are recomputed signals, not source-of-truth data — they must be derivable at any time from the underlying interaction/enrichment history so the scoring model can be revised without a destructive backfill.
- All contact and company PII (emails, phone numbers, enrichment payloads) must be encrypted at rest and covered by export/delete workflows, since this epic is the primary store of third-party personal data in the product and is the most GDPR/CCPA-sensitive surface in the system.
- Company and contact resolution share the same identity-resolution and merge infrastructure (Features 2, 3, 7) — company matching should reuse the matching/merge service rather than fork a parallel implementation.
