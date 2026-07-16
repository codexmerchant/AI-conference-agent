# EPIC08 Feature 3 User Story 1

## Epic
EPIC-08 — Integrations & Sync Platform

## Feature
FEATURE-03 — Calendar Sync

---

# User Story

As a user,
I want my calendar events to automatically populate conference session context,
so that I don't have to manually type session titles, times, and attendee names for every meeting.

---

# Business Value

- Eliminates manual session setup, reducing friction to start capturing at the right moment
- Improves attribution accuracy by using real calendar time windows instead of guessed session boundaries
- Pre-populates expected attendees, giving richer context before a captured interaction even begins
- Increases Conference Mode activation rate by proactively suggesting sessions instead of requiring recall

---

# Acceptance Criteria

## Functional Criteria
- Connected calendar events appear as suggested sessions within one sync cycle
- Event title, time window, and location are pre-filled into the session record when the user accepts a suggestion
- User can dismiss a suggested session, and it does not resurface for the same event

## UX Criteria
- Suggested session card appears with enough lead time (5 min before event start) to be actionable
- Accept/dismiss actions are a single tap and require no additional confirmation dialog
- Calendar-sourced sessions are visually distinguished from manually created sessions

## Technical Criteria
- Sync uses Google Calendar sync tokens or Graph delta queries for incremental updates, not full re-fetches
- Event-to-session matching accounts for timezone differences between event data and device timezone
- Dismissed suggestions are recorded so the same external_event_id is not re-suggested

---

# Preconditions

- User has connected a Google or Outlook calendar via OAuth
- User has at least one upcoming event within the active conference's date range
- Calendar sync has completed at least one successful cycle

---

# Postconditions

- Accepted event creates or updates a ConferenceSession record with calendar-sourced fields
- SessionCalendarMatch record is created with match_status `accepted` or `dismissed`
- Attendee emails from the event are offered as suggested contacts for the session

---

# Edge Cases

- Recurring weekly event incorrectly suggested as a one-time conference session
- All-day event with no meaningful start/end time for session boundary matching
- Overlapping back-to-back events creating ambiguous session boundaries
- Declined or tentative RSVP event still appearing in the raw synced event feed
- Timezone mismatch between the event's stored timezone and the device's local timezone

---

# Telemetry

Track:
- `calendar_connected`
- `calendar_sync_completed`
- `session_suggestion_shown`
- `session_suggestion_accepted`
- `session_suggestion_dismissed`

---

# Dependencies

- Google Calendar API / Microsoft Graph Calendar API
- Conference session service (EPIC-01)
- Contact data store for attendee matching
- Secrets vault for token storage

---

# Priority

High

---

# Estimated Complexity

Medium

---

# QA Test Scenarios

1. Verify a connected calendar event appears as a suggested session within one sync cycle
2. Verify accepting a suggestion pre-fills session title, time, and location correctly
3. Verify dismissing a suggestion prevents it from resurfacing for the same event
4. Verify recurring events are not repeatedly suggested every occurrence without user awareness
5. Verify timezone conversion correctly aligns event time with device local time
6. Verify all-day events are excluded from or clearly flagged in session suggestions
7. Verify declined/tentative events are excluded from suggestions
8. Verify attendee emails from an accepted event populate as suggested contacts

---

# Story Variation

This is user story variation 1 for Calendar Sync, focusing on the happy-path user experience of calendar-driven session suggestion and setup.

---

# Notes

- This story is the foundation for the future "auto-start Conference Mode" enhancement noted in FEATURE-03's open questions
- Session suggestion acceptance rate is a key leading indicator for calendar sync's overall value and should be tracked closely post-launch
