# EPIC-04 User Stories — Contact & Relationship Intelligence

This folder contains user stories for EPIC-04 (Contact & Relationship Intelligence), covering all 9 features with 3 story variations each (27 total): a user (functional) perspective, an operator (reliability/monitoring) perspective, and an admin (security/compliance) perspective.

## Feature 1: Contact Creation
Automatically create a structured contact from a badge scan, business card, voice introduction, or calendar invite.
- **EPIC04-feature-1-user-story-1.md** — User: automatic draft-contact creation from any capture source
- **EPIC04-feature-1-user-story-2.md** — Operator: pipeline reliability, idempotency, and retry behavior
- **EPIC04-feature-1-user-story-3.md** — Admin: PII handling, raw-media retention, and audit logging

## Feature 2: Identity Resolution
Detect when a new capture is someone already known before a duplicate contact is created.
- **EPIC04-feature-2-user-story-1.md** — User: automatic and suggested duplicate detection
- **EPIC04-feature-2-user-story-2.md** — Operator: matching precision monitoring and model rollback
- **EPIC04-feature-2-user-story-3.md** — Admin: cross-user data isolation and audit access control

## Feature 3: Duplicate Merging
Safely and reversibly combine duplicate contact records into one canonical record.
- **EPIC04-feature-3-user-story-1.md** — User: merge preview, conflict resolution, and undo
- **EPIC04-feature-3-user-story-2.md** — Operator: transactional reliability and bulk-merge observability
- **EPIC04-feature-3-user-story-3.md** — Admin: authorization, snapshot protection, and data-loss prevention

## Feature 4: Relationship Scoring
Compute a relationship-strength score from interaction frequency, recency, depth, and reciprocity.
- **EPIC04-feature-4-user-story-1.md** — User: score visibility, tiering, and sorting
- **EPIC04-feature-4-user-story-2.md** — Operator: scoring pipeline reliability and batch decay at scale
- **EPIC04-feature-4-user-story-3.md** — Admin: consent-gated scoring inputs and access isolation

## Feature 5: Contact Confidence Scoring
Attach a trust score to every captured field based on its source and extraction quality.
- **EPIC04-feature-5-user-story-1.md** — User: field-level confidence flags and correction
- **EPIC04-feature-5-user-story-2.md** — Operator: source-calibration monitoring and recalibration
- **EPIC04-feature-5-user-story-3.md** — Admin: privacy-preserving correction telemetry

## Feature 6: Meeting Association
Link contacts to the specific meetings, panels, or conversations where they were met.
- **EPIC04-feature-6-user-story-1.md** — User: automatic met_at linking to sessions and conversations
- **EPIC04-feature-6-user-story-2.md** — Operator: association accuracy monitoring across venue conditions
- **EPIC04-feature-6-user-story-3.md** — Admin: consent inheritance and cascading revocation

## Feature 7: Company Association
Resolve free-text company names into canonical, deduplicated Company entities.
- **EPIC04-feature-7-user-story-1.md** — User: consistent company linking and roster views
- **EPIC04-feature-7-user-story-2.md** — Operator: match accuracy and entity-duplication monitoring
- **EPIC04-feature-7-user-story-3.md** — Admin: cross-user roster isolation and merge governance

## Feature 8: Contact Enrichment
Fill gaps and verify contact data using connected third-party providers (e.g., LinkedIn).
- **EPIC04-feature-8-user-story-1.md** — User: automatic enrichment and diff-based review
- **EPIC04-feature-8-user-story-2.md** — Operator: provider cost, rate limits, and match-accuracy monitoring
- **EPIC04-feature-8-user-story-3.md** — Admin: provider authorization governance and opt-out enforcement

## Feature 9: Relationship Timeline
Present a unified, chronological, cross-conference interaction history per contact.
- **EPIC04-feature-9-user-story-1.md** — User: full interaction history in one view
- **EPIC04-feature-9-user-story-2.md** — Operator: aggregation reliability and merge re-indexing at scale
- **EPIC04-feature-9-user-story-3.md** — Admin: consent-linked deletion and data-subject rights

## Key Themes

- **Identity resolution accuracy** — Features 1, 2, 3, and 7 all depend on the same matching/merge infrastructure staying precise as contact and company volume grows; a regression here cascades into every other feature.
- **PII and consent handling** — Contacts and companies are third-party personal data captured without the subject's direct consent to the app, making retention limits, encryption, and consent-cascade logic (Features 1, 5, 6, 8, 9) a recurring, non-optional theme.
- **Confidence-score calibration** — Field- and score-level confidence (Feature 5) underpins how much every other feature (matching, scoring, merging) can trust a given piece of data, so calibration drift is treated as an operational metric, not a one-time setting.
- **Reversibility over silent automation** — Merges (Feature 3) and enrichment (Feature 8) favor reviewable diffs and undo windows over irreversible auto-apply, reflecting that this epic's data is durable and hard to reconstruct if lost.
- **Cross-user data isolation** — Because company entities and matching indexes could plausibly be shared or compared across users, every admin-perspective story reinforces that each user's contact and relationship graph stays strictly private to them.
