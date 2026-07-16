# EPIC04 Feature 5 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-05 — Contact Confidence Scoring

---

# User Story

As a user,
I want to see which parts of a contact's information might be wrong,
so that I know what to double-check before relying on it for something important.

---

# Business Value

- Builds trust in auto-captured data by being honest about its uncertainty instead of presenting everything as equally reliable
- Reduces embarrassing mistakes (e.g., misspelled name in a follow-up email) from unverified OCR data
- Gives users an efficient way to triage which fields are actually worth reviewing
- Improves data quality over time as low-confidence fields get corrected

---

# Acceptance Criteria

## Functional Criteria
- Every field captured from OCR, voice, or enrichment carries an individual confidence score
- Fields below the review threshold are visually flagged on the contact detail view
- Tapping a flagged field shows its source and the reason confidence is low
- Confirming or correcting a flagged field immediately raises its confidence

## UX Criteria
- Flagged fields use a distinct, non-alarming visual treatment
- Contact-level confidence is shown as a simple high/medium/low indicator on list views
- Reviewing flagged fields is always optional, never a blocking modal

## Technical Criteria
- `GET /contacts/{id}/confidence` returns both field-level and contact-level confidence data
- Confidence scoring runs inline at capture time, adding no more than 200ms to the extraction pipeline
- Field confirmation updates propagate to the contact-level rollup immediately

---

# Preconditions

- Contact has at least one field captured from a non-manual source
- Source-based calibration profiles exist for OCR, voice NER, and enrichment sources
- Confidence scoring service is integrated into the capture pipeline

---

# Postconditions

- Contact detail view accurately reflects current field- and contact-level confidence
- User-confirmed fields show elevated confidence going forward
- Confidence data is available to downstream features (matching, merging) that need to weight it

---

# Edge Cases

- All fields on a contact are low confidence because the source photo was poor quality
- A high-confidence manually-entered field is later contradicted by a lower-confidence OCR re-capture
- User dismisses a flagged field without actually correcting it ("looks right" on a wrong value)
- A field has no recorded source (legacy import) and needs a default confidence assignment
- Confidence must be recomputed after a merge combines two differently-sourced field values
- Repeated low confidence on the same field across multiple capture attempts

---

# Telemetry

Track:
- `field_confidence_scored`
- `low_confidence_field_flagged`
- `low_confidence_field_confirmed`
- `low_confidence_field_corrected`

---

# Dependencies

- Contact Creation (FEATURE-01)
- OCR Extraction and Streaming Transcription (EPIC-02)
- Identity Resolution (FEATURE-02)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a field extracted from a blurry badge photo receives a low confidence score
2. Verify the flagged-field indicator appears correctly on the contact detail view
3. Verify tapping a flagged field surfaces its source and reason for low confidence
4. Verify confirming a flagged field raises its confidence score immediately
5. Verify correcting a flagged field's value updates both the value and its confidence
6. Verify contact-level confidence rollup reflects the weighted state of all field scores
7. Verify a manually entered field starts with high confidence by default
8. Verify confidence scoring adds no more than 200ms to the capture pipeline under normal load

---

# Story Variation

This is user story variation 1 for Contact Confidence Scoring, focusing on the day-to-day experience of surfacing and resolving uncertain data.

---

# Notes

- Confidence flags should feel like a helpful assistant, not a nag — over-flagging will train users to ignore all flags
- This feature is what makes auto-captured contact data trustworthy enough for the user to act on directly
