# EPIC04 Feature 1 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-01 — Contact Creation

---

# User Story

As a user,
I want a contact created automatically from a badge scan, business card, voice introduction, or calendar invite,
so that I don't have to manually type in details for every person I meet.

---

# Business Value

- Removes the single biggest adoption barrier to conference contact capture: manual data entry
- Increases the percentage of real-world interactions that become durable records
- Produces cleaner downstream data for relationship scoring and follow-up drafting
- Reduces time-to-value — a usable contact profile exists within seconds of meeting someone

---

# Acceptance Criteria

## Functional Criteria
- Contact creation accepts badge OCR, business card OCR, voice-transcript, calendar, and manual sources
- Name, title, and company fields are extracted and normalized (name split, title/company separated) with per-field confidence
- New contact is checked against Identity Resolution before being persisted as a distinct record
- Contact is auto-attached to the currently active conference session

## UX Criteria
- Draft contact card is shown within 2 seconds of capture completion
- User can edit any field inline before confirming
- Source of the contact (badge/voice/calendar/manual) is visibly labeled on the card

## Technical Criteria
- `POST /contacts` returns a deterministic success/failure status
- Contact creation is idempotent per `capture_event_id`
- Field-level confidence scores are persisted alongside each value

---

# Preconditions

- User has an active conference session
- Relevant capture permission (camera or microphone) has been granted
- OCR/transcription pipeline has completed processing for the source capture event

---

# Postconditions

- A Contact record exists with normalized fields and source provenance
- The contact is linked to the active conference session
- Telemetry event `contact_created` is recorded with source breakdown

---

# Edge Cases

- Badge photo is blurry, producing low-confidence or missing fields
- Voice introduction names two people in a single sentence
- Business card in a non-Latin script
- Calendar invite attendee has only a generic email alias, no real name
- Contact captured while offline, queued for sync
- Duplicate badge scan of the same person later the same day

---

# Telemetry

Track:
- `contact_created`
- `contact_creation_source_breakdown`
- `contact_draft_edited`
- `contact_creation_failed`

---

# Dependencies

- OCR Extraction (EPIC-02 FEATURE-04)
- Streaming Transcription (EPIC-02 FEATURE-02)
- Identity Resolution (FEATURE-02)
- Conference Session (EPIC-01 FEATURE-01)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify contact creation from a clear badge photo produces high-confidence fields
2. Verify contact creation from a blurry badge photo flags low-confidence fields
3. Verify voice-introduced contact links to the active conversation
4. Verify calendar-sourced contact stub is created before the meeting starts
5. Verify draft contact card appears within 2 seconds of capture
6. Verify user edits to draft fields are saved on confirm
7. Verify offline-captured contact syncs correctly once network returns
8. Verify duplicate capture events do not create duplicate contacts

---

# Story Variation

This is user story variation 1 for Contact Creation, focusing on the happy-path, functional experience of turning a raw capture into a usable contact record.

---

# Notes

- This is the entry point for nearly every other EPIC-04 feature — its accuracy and speed set the ceiling for downstream data quality
- Draft-before-save is a deliberate friction-reducer: it avoids blank forms while still giving the user a veto point
