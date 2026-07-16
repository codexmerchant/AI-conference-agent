# FEATURE-05 — Contact Confidence Scoring

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Attach a per-field and per-contact confidence score to every piece of captured contact data, reflecting how trustworthy the source and extraction method were, so downstream features can weight, surface, or suppress low-quality data appropriately.

---

# 2. Problem Statement

Contact data arrives from sources of wildly different reliability — a verified LinkedIn API pull, a clean calendar invite, a blurry badge photo, or a mumbled voice introduction. Treating all of these as equally trustworthy corrupts identity resolution, relationship scoring, and the contact profile itself with silently wrong data.

---

# 3. Feature Overview

A confidence-scoring layer that runs at the point of extraction and is re-evaluated whenever a field is edited or enriched. Each field carries its own confidence score and source; a rolled-up contact-level confidence score summarizes overall data quality and drives UI treatment (e.g., flagging fields for review) and gating for downstream automation (e.g., auto-merge eligibility).

---

# 4. Key Functionalities

## Per-field confidence scoring
Every individual field (name, title, company, email, phone) gets its own confidence score at capture time.

## Source-based base confidence
Each source type (LinkedIn API, calendar, OCR, voice NER, manual entry) has a calibrated base confidence that the extraction-specific score is adjusted from.

## Contact-level confidence rollup
Aggregates field-level scores into a single contact confidence score for at-a-glance data-quality signal.

## Confidence-triggered review prompts
Fields below a threshold are visually flagged and surfaced for user confirmation.

## Confidence recalibration on correction
User edits or enrichment confirmations feed back into recalibrating both the field and the source's baseline confidence.

---

# 5. Primary Use Cases

## Use Case 1
A badge OCR produces "Company: Acnne Corp" with 62% confidence; the field is visually flagged for the user to confirm or correct.

## Use Case 2
A LinkedIn enrichment pull confirms a phone number originally captured via low-confidence OCR, raising that field's confidence to near-certain.

## Use Case 3
A contact's overall confidence score is low enough that Identity Resolution declines to auto-merge it against a candidate duplicate, requiring user confirmation instead.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want to see which parts of a contact's info might be wrong,
so that I know what to double-check before relying on it.

### Acceptance Criteria
- Low-confidence fields are visually distinguished on the contact detail view.
- Tapping a flagged field shows the source and why confidence is low.
- Confirming or correcting a flagged field immediately updates its confidence.

## User Story 2
As a power user,
I want overall data quality on a contact to be visible at a glance,
so that I can decide whether to trust it for something important, like a follow-up email.

### Acceptance Criteria
- Contact-level confidence score/tier is visible on the contact card.
- Score reflects the weighted rollup of all field-level scores, not just an average.
- Score updates automatically as fields are corrected or enriched.

---

# 7. User Workflow

1. A field is captured from a source (OCR, voice, calendar, manual, enrichment).
2. The extractor emits a raw confidence signal (e.g., OCR character-level confidence, NER entity confidence).
3. The confidence-scoring service applies source-based calibration to produce a final field confidence score.
4. Field-level scores roll up into a contact-level confidence score.
5. Fields below the review threshold are flagged in the UI.
6. User confirms or corrects flagged fields.
7. Confirmation/correction updates the field's confidence and feeds the source-calibration model.

---

# 8. UI / UX Requirements

- Flagged (low-confidence) fields use a distinct, non-alarming visual treatment (e.g., dotted underline).
- Contact-level confidence shown as a simple indicator (high/medium/low), not a raw percentage, in list views.
- Tapping a flagged field reveals source and a one-tap "looks right" / "fix" action.
- No blocking modals — confidence review is always optional and asynchronous.

---

# 9. Technical Requirements

## Frontend
Field-level confidence rendering reused across contact draft (Feature 1), contact detail, and merge review (Feature 3) screens via a shared component.

## Backend
Confidence Scoring service exposing `GET /contacts/{id}/confidence`; invoked inline during Contact Creation and Contact Enrichment, and on every manual field edit.

## AI/ML
Source-specific calibration models (e.g., OCR character confidence to field confidence mapping, NER entity confidence to field confidence mapping) trained/tuned from historical correction rates per source.

## Infrastructure
Confidence scores stored alongside field provenance so they can be queried without recomputation; recalibration jobs run periodically against aggregated correction telemetry.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `GET /contacts/{id}/confidence` | Retrieve contact-level and field-level confidence scores |
| `POST /contacts/{id}/fields/{field}/confirm` | User confirms a flagged field, raising its confidence |
| OCR Extraction Service | Source of raw per-field extraction confidence |
| Voice NER Service | Source of raw entity-extraction confidence |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| FieldConfidence | field_confidence_id, contact_id, field_name, value, confidence_score, source, source_capture_event_id, last_confirmed_at |
| ContactConfidenceRollup | contact_id, overall_confidence_score, tier, computed_at |
| SourceCalibrationProfile | source_type, base_confidence, correction_rate, last_recalibrated_at |

---

# 12. Security & Privacy

- Confidence metadata is stored alongside, not instead of, encrypted field values — it never exposes raw PII on its own.
- Correction telemetry used for recalibration is aggregated and de-identified before being used to tune source-level models.
- Users can view but not be blocked by confidence flags — no field is hidden solely for low confidence.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Confidence scoring latency at capture time | <200 ms added to extraction pipeline |
| Contact-level rollup computation | <100 ms |
| Recalibration job frequency | Weekly |

---

# 14. Edge Cases

- All fields on a contact are low confidence (fully OCR-sourced from a poor-quality photo).
- A high-confidence field is later contradicted by a higher-trust source (e.g., manual entry conflicts with LinkedIn).
- User repeatedly corrects the same source's output, indicating that source's calibration is miscalibrated.
- Field confidence must be recomputed after a merge (Feature 3) combines two differently-sourced values.
- A field has no source (legacy import) and needs a default confidence assignment.
- Confidence flag is dismissed by the user without an actual correction ("looks right" on a wrong value).

---

# 15. Dependencies

- Contact Creation (FEATURE-01), primary point of initial confidence scoring
- OCR Extraction and Streaming Transcription (EPIC-02), sources of raw extraction confidence
- Identity Resolution (FEATURE-02), which consumes confidence to gate auto-merge eligibility
- Contact Enrichment (FEATURE-08), which can raise confidence via third-party verification

---

# 16. Risks

- Miscalibrated source baselines cause users to distrust accurate data or over-trust inaccurate data.
- Confidence-flag fatigue if too many fields are flagged, causing users to ignore all flags.
- Recalibration feedback loop reinforces existing bias if correction telemetry is sparse for a source.

---

# 17. Telemetry & Analytics

Track:
- `field_confidence_scored`
- `low_confidence_field_flagged`
- `low_confidence_field_confirmed`
- `low_confidence_field_corrected`
- `source_calibration_recomputed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Field-level confidence calibration accuracy | Within 10% of observed correction rate |
| Low-confidence field correction rate | >60% within 7 days of flagging |
| Contact-level confidence score correlates with actual user-reported accuracy | >0.7 correlation |

---

# 19. Future Enhancements

- Confidence-aware search/filter ("show me contacts with unverified emails").
- Per-source confidence dashboards visible to the user for transparency.

---

# 20. Open Questions

- Should confidence scores ever be shown as raw numeric percentages to advanced users?
- How aggressively should a single user correction shift a source's global calibration baseline?
