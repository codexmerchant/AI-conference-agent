# FEATURE-06 — Meeting Association

## Epic
EPIC-04 — Contact & Relationship Intelligence

---

# 1. Objective

Link every contact to the specific meetings, conversations, panels, or chance encounters in which they were involved, creating the `met_at` relationship edges that anchor the knowledge graph and feed relationship scoring.

---

# 2. Problem Statement

A contact record alone ("Jane Doe, Acme Corp") says nothing about how or when the user actually engaged with them. Without a structured link between a contact and the specific session/conversation/interaction, there is no way to answer "what did we discuss" or "how many times have I met this person," and relationship scoring has no interaction data to compute from.

---

# 3. Feature Overview

An association service that creates a `met_at` edge between a Contact and a Session/Conversation record whenever they co-occur in a capture — a voice conversation, a panel Q&A, a scanned badge during a specific session window. Each association carries an interaction type (meeting, panel, chance encounter), timestamp, and a link back to the source transcript/media.

---

# 4. Key Functionalities

## Automatic association from capture context
Links a contact to the active conference session/conversation at the moment of capture (badge scan, voice introduction).

## Interaction type classification
Tags each association with a type — scheduled meeting, panel/Q&A, chance encounter, follow-up call — consistent with EPIC-03's context tagging.

## Manual association editing
Lets the user attach or reassign a contact to a different session/conversation if auto-association was wrong.

## Multi-contact session linking
Associates multiple contacts present in the same group conversation or panel to that single session.

## Association-driven timeline feed
Every new association becomes a source event for the Relationship Timeline (Feature 9).

---

# 5. Primary Use Cases

## Use Case 1
User has a 20-minute conversation at a booth; the two contacts present are both linked to that conversation session with an interaction type of "chance encounter."

## Use Case 2
A panel session with audience Q&A links the identified questioner to the panel session as a "panel" interaction type.

## Use Case 3
User manually re-links a contact from the wrong overlapping session after two conversations happened back-to-back in the same room.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want each contact automatically linked to the meeting or conversation where I met them,
so that I can later recall the context without re-typing it.

### Acceptance Criteria
- A contact created or recognized during an active session is automatically associated with that session.
- The association records interaction type and timestamp.
- Association is visible on both the contact profile and the session/conversation detail view.

## User Story 2
As a power user,
I want to correct a meeting association if the app linked a contact to the wrong conversation,
so that my contact's history stays accurate.

### Acceptance Criteria
- User can reassign a contact's association to a different session from the contact detail view.
- Reassignment updates relationship scoring and timeline data immediately.
- Original (incorrect) association is retained in an edit history, not silently deleted.

---

# 7. User Workflow

1. A capture event (badge scan, voice segment, panel Q&A) occurs within an active session.
2. The association service identifies which contact(s) and which session/conversation co-occurred.
3. An interaction type is inferred from context (using EPIC-03 interaction-type classification).
4. A `met_at` association record is created linking contact_id to session_id/conversation_id.
5. The association appears on both the contact profile and the session detail view.
6. The association event is emitted to Relationship Scoring and Relationship Timeline.
7. User can review and correct the association if needed.

---

# 8. UI / UX Requirements

- Contact profile shows a chronological list of associated meetings/sessions with type icons.
- Session/conversation detail view shows all associated contacts.
- Reassignment flow is a simple picker of nearby sessions within a reasonable time window.
- Interaction type shown with a clear icon/label (meeting, panel, chance encounter).

---

# 9. Technical Requirements

## Frontend
Contact detail and session detail views share a reusable "associated meetings" list component with reassignment affordance.

## Backend
Association service exposing `POST /contacts/{id}/meetings` and `GET /sessions/{id}/contacts`; consumes session/conversation boundary events from EPIC-01/EPIC-03.

## AI/ML
Interaction-type inference reused from EPIC-03 Context Engine's interaction classification; co-occurrence detection uses timestamp overlap between capture event and active session window.

## Infrastructure
Association writes are idempotent per (contact_id, session_id) pair to avoid duplicate edges from repeated captures within the same session.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| `POST /contacts/{id}/meetings` | Create a meeting/session association for a contact |
| `GET /contacts/{id}/meetings` | List all sessions a contact has been associated with |
| `GET /sessions/{id}/contacts` | List all contacts associated with a session |
| `PATCH /meeting-associations/{id}` | Reassign or correct an existing association |
| EPIC-03 Interaction Classification | Source of interaction-type tagging |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| MeetingAssociation | association_id, contact_id, session_id, conversation_id, conference_id, interaction_type, occurred_at, source_capture_event_id, corrected_from_association_id |

---

# 12. Security & Privacy

- Associations inherit the same access/consent boundaries as the underlying session/conversation recording.
- Reassignment history is retained for audit but not exposed to any party other than the owning user.
- Deleting a session/conversation cascades a soft-delete to its associations, preserving contact-level history integrity.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Association creation latency | <1 sec from capture event |
| Association query latency (contact or session view) | <300 ms |
| Duplicate-association suppression accuracy | >99% |

---

# 14. Edge Cases

- Two conversations happen in immediate succession in the same physical location, causing ambiguous session boundaries.
- A contact is present in a group conversation with five other people captured simultaneously.
- Badge scan occurs after the associated conversation session has technically ended.
- Panel Q&A questioner is never formally introduced, only identified by voice.
- Contact association needs correction after a later Duplicate Merge (Feature 3) combines two contacts that were both linked to the same session.
- Offline capture creates an association that must reconcile against session boundaries once synced.

---

# 15. Dependencies

- Conference Session (EPIC-01 FEATURE-01) and Session Switching (EPIC-01 FEATURE-10)
- Interaction-Type Classification (EPIC-03)
- Contact Creation (FEATURE-01)
- Relationship Timeline (FEATURE-09), primary consumer of association events

---

# 16. Risks

- Incorrect session-boundary inference misattributes a contact to the wrong conversation.
- High-density networking events (many people, many overlapping conversations) stress co-occurrence detection accuracy.
- Manual correction burden if auto-association accuracy is low, undermining the "invisible to use" goal.

---

# 17. Telemetry & Analytics

Track:
- `meeting_association_created`
- `meeting_association_corrected`
- `meeting_association_type_inferred`
- `meeting_association_duplicate_suppressed`
- `meeting_association_creation_failed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Auto-association accuracy (no correction needed) | >85% |
| Association creation latency | <1 sec |
| Contacts with at least one meeting association | >90% of created contacts |

---

# 19. Future Enhancements

- Location/proximity-based co-occurrence detection (e.g., Bluetooth/UWB) to improve group-conversation attribution.
- Automatic detection of "introduced by" relationships when a third contact is present at the same association.

---

# 20. Open Questions

- How should overlapping sessions in the same time window be disambiguated by default?
- Should chance encounters below a minimum interaction duration threshold create an association at all?
