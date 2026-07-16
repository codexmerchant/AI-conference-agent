# FEATURE-03 — Calendar Sync

## Epic
EPIC-08 — Integrations & Sync Platform

---

# 1. Objective

Sync a user's Google Calendar and/or Outlook Calendar so conference agenda context (sessions, meetings, room, attendees) automatically informs Conference Mode and captured interactions, without manual entry.

---

# 2. Problem Statement

Users currently must manually tell the app which session or meeting they are in; without calendar context the app cannot pre-populate session titles, expected attendees, or automatically suggest starting Conference Mode when a scheduled conference event begins.

---

# 3. Feature Overview

A calendar connection (Google Calendar API and/or Microsoft Graph Calendar) that imports relevant events, matches them to active or upcoming conference sessions, and supplies agenda metadata (title, time window, location, attendee list) to the capture and context layers.

---

# 4. Key Functionalities

## OAuth connect for Google/Outlook Calendar
Authorize read access to the user's primary calendar (and optionally secondary/shared calendars).

## Incremental event sync
Use Google Calendar `events.list` sync tokens or Graph delta queries to pull only new/changed/deleted events.

## Event-to-session matching
Match calendar events to conference sessions/interactions by time window, location, and title similarity.

## Auto-suggest Conference Mode start
Detect an imminent or in-progress calendar event tagged as a conference session and prompt the user to start Conference Mode.

## Attendee list import
Pull attendee email addresses from matched events to pre-populate expected contacts for a session.

---

# 5. Primary Use Cases

## Use Case 1
User's calendar shows "Keynote: AI in Healthcare, 9:00–10:00" and the app auto-suggests starting Conference Mode at 8:55.

## Use Case 2
User has a 1:1 meeting on their calendar during the conference, and the app pre-populates expected attendee contact info before the meeting starts.

## Use Case 3
User declines a calendar invite, and that event is excluded from suggested sessions.

---

# 6. User Stories

## User Story 1
As a conference attendee,
I want my calendar events to automatically populate session context,
so that I don't have to manually type session titles and attendee names.

### Acceptance Criteria
- Connected calendar events appear as suggested sessions within one sync cycle.
- Event title, time window, and location are pre-filled into the session record when accepted.
- User can dismiss a suggested session without it recurring for the same event.

## User Story 2
As a power user with a packed conference schedule,
I want back-to-back calendar events to each map to a distinct session,
so that captured interactions are attributed to the correct meeting.

### Acceptance Criteria
- Overlapping or back-to-back events are each represented as separate session candidates.
- Session boundaries respect actual event start/end times, not just the sync timestamp.
- Timezone differences between event data and device timezone are resolved correctly.

---

# 7. User Workflow

1. User taps "Connect Calendar" in Integrations settings and chooses Google or Outlook.
2. OAuth consent screen requests calendar read access.
3. App performs initial sync of upcoming events within the active conference date range.
4. App matches events to potential conference sessions using time/location/title heuristics.
5. As an event's start time approaches, app surfaces a "Start Conference Mode?" prompt.
6. User accepts or dismisses; accepted events pre-populate session title, time, and attendees.
7. Background incremental sync keeps events current as the user's calendar changes.

---

# 8. UI / UX Requirements

- Calendar connect screen listing which calendar(s) will be synced, with per-calendar toggle for shared/secondary calendars.
- Upcoming-session suggestion card with accept/dismiss actions.
- Visual distinction between calendar-sourced sessions and manually created sessions.
- Clear indicator when calendar sync is stale or has failed.
- Attendee list shown as suggested contacts, editable before confirming.

---

# 9. Technical Requirements

## Frontend
Calendar connect flow, upcoming-session suggestion banner/notification, and session detail screen showing calendar-sourced fields as editable pre-fills.

## Backend
Google Calendar API and Microsoft Graph Calendar API clients supporting sync-token/delta-query incremental sync, plus an event-to-session matching service using time-window overlap and fuzzy title matching.

## AI/ML
Lightweight heuristic/ML classifier distinguishes likely "conference session" events (keynote, workshop, meeting with external attendees) from personal/unrelated calendar events to avoid over-suggesting.

## Infrastructure
Scheduled sync jobs per connected calendar, push notification support (Google Calendar watch, Graph subscriptions) where available, with polling fallback.

---

# 10. APIs / Integrations

| Integration | Purpose |
|---|---|
| Google Calendar API | Read events, attendees, and incremental sync via sync tokens |
| Microsoft Graph Calendar API | Read events, attendees, and incremental sync via delta queries |
| Conference Session Service | Create/update session records from matched calendar events |
| Contact Service | Resolve attendee emails to existing contact records |

---

# 11. Data Model

| Entity | Fields |
|---|---|
| CalendarConnection | id, user_id, provider (google/outlook), calendar_id, oauth_token_ref, sync_token_cursor, sync_status, last_synced_at |
| CalendarEvent | id, connection_id, external_event_id, title, start_time, end_time, timezone, location, attendee_emails, response_status, is_recurring, recurrence_id |
| SessionCalendarMatch | id, calendar_event_id, conference_session_id, match_confidence, match_status (suggested/accepted/dismissed) |

---

# 12. Security & Privacy

- Request read-only calendar scopes only; never request calendar write/delete access.
- Attendee email addresses from private/personal events are not imported unless the event is explicitly linked to a conference session by the user.
- OAuth tokens stored only as vault references; never logged.
- User can exclude specific calendars (e.g., a personal calendar) from sync at connect time.
- Disconnecting calendar sync stops all future imports and removes cached un-accepted event suggestions.

---

# 13. Performance Requirements

| Metric | Target |
|---|---|
| Initial calendar sync (30-day window) | <15 sec |
| Incremental sync latency | <5 min |
| Session suggestion accuracy | >85% precision |
| Auto-suggest prompt lead time | 5 min before event start |

---

# 14. Edge Cases

- Recurring events (weekly team sync) incorrectly suggested as conference sessions repeatedly.
- Timezone mismatch between event data, device, and conference venue.
- All-day events with no meaningful start/end time for session matching.
- Declined or tentative RSVP events still appearing in the raw event feed.
- Calendar event deleted externally after already being accepted as a session.
- Overlapping events creating ambiguous session boundaries for capture attribution.

---

# 15. Dependencies

- Authentication and identity platform
- Conference session service (EPIC-01/EPIC-03)
- Contact data store and matching service
- Secrets vault for token storage

---

# 16. Risks

- Over-aggressive session suggestions creating notification fatigue and reducing trust in the feature.
- Calendar data sparsity (users who don't put conference sessions on their calendar) limiting feature value.
- Sync token invalidation (410 Gone from Google) requiring a full re-sync that temporarily disrupts suggestions.

---

# 17. Telemetry & Analytics

Track:
- `calendar_connected`
- `calendar_disconnected`
- `calendar_sync_completed`
- `calendar_sync_failed`
- `session_suggestion_shown`
- `session_suggestion_accepted`
- `session_suggestion_dismissed`

---

# 18. Success Metrics

| Metric | Goal |
|---|---|
| Calendar connect completion rate | >70% of users who start the flow |
| Session suggestion acceptance rate | >60% |
| Sync error rate | <2% of sync cycles |
| Time saved on manual session setup | >50% reduction |

---

# 19. Future Enhancements

- Automatic Conference Mode auto-start (not just suggestion) based on user preference and calendar confidence.
- Cross-referencing conference organizer's published agenda with the user's personal calendar for richer session metadata.
- Meeting-room/location-based session matching using venue floor maps.

---

# 20. Open Questions

- Should auto-start of Conference Mode be opt-in by default given the privacy implications of automatic recording?
- How should the app handle conference-provided calendar feeds (ICS subscriptions) distinct from a user's personal calendar?
- Should declined/tentative events ever be surfaced as low-confidence suggestions, or excluded entirely?
