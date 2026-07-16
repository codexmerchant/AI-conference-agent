# FEATURE-01 — Contact Creation

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Automatically create a structured, normalized Contact record from any capture source — badge photo, business card, voice introduction, or calendar invite — with minimal manual entry.

---

# 2. Problem Statement

Attendees meet dozens of people per conference day. Manually typing names, titles, and companies is slow enough that it gets skipped entirely, resulting in lost contacts, blank fields, and no durable record of who was actually met.

---

# 3. Feature Overview

A source-agnostic intake pipeline that takes raw capture output (OCR text, transcript segment, calendar attendee entry, manual form) and normalizes it into a canonical Contact record. Every field is tagged with its originating source and a confidence score, a draft is checked against Identity Resolution before it is persisted, and the user gets a one-tap confirm step rather than a blank form.

---

# 4. Key Functionalities

## Multi-source contact intake
Accepts badge OCR, business card OCR, voice-introduction transcripts, calendar attendee lists, and manual entry as equally valid creation sources.

## Field normalization and parsing
Splits full names into first/last, standardizes phone/email formats, and separates job title from company name out of unstructured OCR/text blocks.

## Source provenance tagging
Every field on a new contact stores which capture event produced it and at what confidence, not just the value.

## Draft-before-save preview
Shows the user an editable draft contact card immediately after capture rather than silently committing a record.

## Auto-attach to active session
Newly created contacts are automatically linked to the currently active conference session for later meeting/timeline association.

---

# 5. Primary Use Cases

## Use Case 1
User scans a badge at registration and the app auto-creates a draft contact with name, title, and company pre-filled.

## Use Case 2
During a conversation, the user verbally introduces a new contact ("this is Maria, she runs partnerships at Acme") and the voice pipeline creates a contact stub.

## Use Case 3
A calendar meeting synced into the app auto-generates contact stubs for attendees before the meeting starts.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want a contact created automatically after I scan a badge,
so that I do not have to type in their details by hand.

### Acceptance Criteria
- Name, title, and company are extracted from the badge image with field-level confidence scores.
- A draft contact is shown for confirmation within 2 seconds of scan completion.
- User can edit any field before the contact is saved.

## User Story 2
As a power user,
I want contacts created from a voice introduction during a conversation,
so that I capture people who never had a badge or business card.

### Acceptance Criteria
- Person names are extracted from the live transcript segment via NER.
- The resulting contact is linked to the active conversation/session.
- Low-confidence or ambiguous name extractions are flagged for manual review rather than silently saved.

---

# 7. User Workflow

1. A capture event occurs (badge scan, business card photo, voice segment, or calendar sync).
2. The relevant extractor (OCR classifier or transcript NER) parses raw input into candidate fields.
3. The field normalizer standardizes name, email, phone, title, and company text.
4. Identity Resolution checks the candidate fields against existing contacts before commit.
5. If no match is found, a draft Contact record is created with source and confidence tags.
6. The user reviews and edits the draft in the capture dashboard.
7. The user confirms; the contact is persisted and attached to the active conference session.

---

# 8. UI / UX Requirements

- Draft contact card appears immediately after capture with editable fields, not a blank form.
- Visible source badge on the card ("From badge scan", "From voice", "From calendar").
- Inline confidence indicators (e.g., subtle underline or icon) on low-confidence fields.
- One-tap confirm/save action.
- Merge-suggestion banner surfaces immediately if a likely duplicate is detected during review.

---

# 9. Technical Requirements

## Frontend
SwiftUI draft-contact view with local optimistic caching so the card renders before the backend round-trip completes; reuses the camera/mic capture components already active from Conference Mode.

## Backend
A Contact Creation service consumes normalized extraction events emitted by the OCR and Transcription pipelines, exposes `POST /contacts`, and calls the Identity Resolution service synchronously before committing a new record.

## AI/ML
Named entity recognition on transcript segments to extract person names and affiliations from voice introductions; an OCR field classifier that distinguishes name vs. title vs. company vs. contact info on badge/business-card text; an LLM-based normalizer for messy or non-standard card layouts.

## Infrastructure
Event-driven pipeline triggered by OCR/transcription completion events; contact creation is idempotent, keyed by `capture_event_id`, so retried or duplicate events never produce duplicate contacts.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts` | Create a contact record from normalized fields |
| `GET /capture-events/{id}/extracted-fields` | Retrieve OCR/NER extraction output for a capture event |
| Identity Resolution Service | Pre-save duplicate check against existing contacts |
| Conference Session API | Associate the new contact with the active session |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| Contact | contact_id, user_id, full_name, first_name, last_name, job_title, company_name_raw, company_id, emails[], phone_numbers[], linkedin_url, source, source_capture_event_id, confidence_score, status, created_at, updated_at |
| CaptureEvent | capture_event_id, type (badge/business_card/voice/calendar/manual), raw_payload_ref, conference_session_id, created_at |

---

# 12. Security & Privacy

- Raw badge/business-card images are retained only for the OCR reprocessing window, then discarded.
- Email and phone fields are encrypted at rest.
- Voice-derived contacts are only created while active recording consent is in effect.
- A draft contact deleted before confirmation leaves no residual record.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Draft contact creation latency | <2 sec from capture completion |
| OCR-to-contact field accuracy | >90% |
| Identity Resolution pre-save check latency | <500 ms |

---

# 14. Edge Cases

- Badge photo is blurry or partially cropped, producing low-confidence fields.
- Business card printed in a non-Latin script.
- Voice introduction names two people in one sentence ("this is John and his colleague Sara").
- Calendar invite lists only a generic email alias with no real name.
- Two separate badge scans of the same person occur on the same day.
- Contact is created while offline with no network connectivity.

---

# 15. Dependencies

- OCR Extraction (EPIC-02 FEATURE-04)
- Streaming Transcription (EPIC-02 FEATURE-02)
- Identity Resolution (FEATURE-02 of this epic)
- Conference Session (EPIC-01 FEATURE-01)

---

# 16. Risks

- OCR misreads on stylized or low-contrast badge designs corrupt contact fields silently.
- Over-eager auto-creation from ambient voice produces contact-list clutter.
- Voice NER false positives create phantom contacts that pollute the knowledge graph.

---

# 17. Telemetry & Analytics

Track:
- `contact_created`
- `contact_creation_source_breakdown`
- `contact_draft_edited`
- `contact_creation_failed`
- `low_confidence_field_flagged`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| % of conference interactions with a contact created | >80% |
| Average field accuracy on creation | >90% |
| Manual (from-scratch) entry rate | <20% |

---

# 19. Future Enhancements

- Auto-suggest discussion topics/tags at contact creation time from the surrounding transcript.
- Bulk import from a LinkedIn connections export as a creation source.

---

# 20. Open Questions

- Should low-confidence auto-created contacts be hidden from the network graph until the user confirms them?
- What is the retention window for raw badge/business-card images prior to OCR completion?
