# EPIC04 Feature 6 User Story 1

## Epic
EPIC-04 — Contact & Relationship Intelligence

## Feature
FEATURE-06 — Meeting Association

---

# User Story

As a user,
I want each contact automatically linked to the meeting, panel, or conversation where I met them,
so that I can recall the context later without re-typing it.

---

# Business Value

- Anchors every contact to real context instead of a name floating with no history
- Powers the "what did we talk about" recall that makes follow-ups feel personal
- Feeds relationship scoring and timeline with the interaction data they depend on
- Removes the manual step of tagging who was in which conversation

---

# Acceptance Criteria

## Functional Criteria
- A contact created or recognized during an active session is automatically associated with that session
- The association records an interaction type (meeting, panel, chance encounter) and timestamp
- Multiple contacts present in the same group conversation are all linked to that single session
- Association appears on both the contact profile and the session/conversation detail view

## UX Criteria
- Contact profile shows a chronological list of associated meetings with type icons
- Session detail view shows all associated contacts
- No manual tagging step is required for the common case

## Technical Criteria
- `POST /contacts/{id}/meetings` creates the association idempotently per (contact_id, session_id) pair
- Interaction type is inferred using EPIC-03's interaction classification
- Association creation completes within 1 second of the triggering capture event

---

# Preconditions

- An active conference session or conversation exists
- A contact has been created or recognized during that session
- Interaction-type classification service is available

---

# Postconditions

- A MeetingAssociation record links the contact to the session with type and timestamp
- The association is visible on both the contact and session views
- The association event is emitted for Relationship Scoring and Relationship Timeline to consume

---

# Edge Cases

- Two conversations happen in quick succession in the same physical location
- A contact is present in a group conversation with five other people captured simultaneously
- Badge scan occurs slightly after the associated conversation session has technically ended
- Panel Q&A questioner is identified only by voice, never formally introduced
- Offline-captured association must reconcile against session boundaries once synced
- Association needs correction after two contacts linked to the same session are later merged

---

# Telemetry

Track:
- `meeting_association_created`
- `meeting_association_type_inferred`
- `meeting_association_viewed`

---

# Dependencies

- Conference Session (EPIC-01 FEATURE-01) and Session Switching (EPIC-01 FEATURE-10)
- Interaction-Type Classification (EPIC-03)
- Contact Creation (FEATURE-01)

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a contact created during an active session is automatically associated with it
2. Verify the association records the correct interaction type based on context
3. Verify multiple contacts in a group conversation all link to the same session
4. Verify the association is visible on both contact and session detail views
5. Verify association creation completes within 1 second of the triggering event
6. Verify a badge scan slightly after session end still associates correctly to the right session
7. Verify offline-captured associations reconcile correctly against session boundaries after sync
8. Verify duplicate association attempts for the same (contact, session) pair do not create duplicate records

---

# Story Variation

This is user story variation 1 for Meeting Association, focusing on the automatic, invisible linking of contacts to the interactions where they were met.

---

# Notes

- This is the primary event source feeding both Relationship Scoring (Feature 4) and Relationship Timeline (Feature 9)
- Accuracy here compounds — a wrong association quietly corrupts two downstream features at once
