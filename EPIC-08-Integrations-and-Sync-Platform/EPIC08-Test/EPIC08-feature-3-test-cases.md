# EPIC08 Feature 3 — Calendar Sync — Test Cases

## Test Overview
Comprehensive test suite for Calendar Sync covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Google Calendar Event Normalization

#### TC-F3-U1.1: Google Calendar Event Converted to Normalized CalendarEvent
**Objective**: Verify that a raw Google Calendar API event is correctly mapped to the shared `CalendarEvent` schema.

**Preconditions**:
- Raw Google Calendar event JSON with `summary`, `start`, `end`, `attendees`, `location`, `conferenceData`

**Test Steps**:
1. Pass raw Google event to `GoogleCalendarAdapter.normalize(rawEvent)`
2. Assert `title`, `startTime`, `endTime`, `attendeeEmails`, `location`, `conferenceLink` mapped correctly
3. Assert `source = 'google'`

**Expected Result**: `CalendarEvent` fully populated; all fields in ISO-8601; `source = 'google'`.

**Code Sample**:
```typescript
describe('GoogleCalendarAdapter', () => {
  it('should normalize a Google Calendar event into a CalendarEvent', () => {
    const rawEvent = {
      id: 'gcal_event_001',
      summary: 'TechConf 2026 Keynote',
      start: { dateTime: '2026-07-15T09:00:00-07:00', timeZone: 'America/Los_Angeles' },
      end: { dateTime: '2026-07-15T10:00:00-07:00', timeZone: 'America/Los_Angeles' },
      attendees: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
      location: 'Moscone Center, San Francisco',
      conferenceData: { entryPoints: [{ uri: 'https://meet.google.com/abc-defg-hij' }] },
    };

    const adapter = new GoogleCalendarAdapter();
    const event = adapter.normalize(rawEvent);

    expect(event.title).toBe('TechConf 2026 Keynote');
    expect(event.source).toBe('google');
    expect(event.attendeeEmails).toContain('alice@example.com');
    expect(event.conferenceLink).toBe('https://meet.google.com/abc-defg-hij');
  });
});
```

---

#### TC-F3-U1.2: All-Day Event Normalized Without Time Component
**Objective**: Verify that all-day Google Calendar events (using `date` rather than `dateTime`) are correctly handled as date-only events.

**Test Steps**:
1. Provide raw event with `start: { date: '2026-07-15' }` (no `dateTime`)
2. Call `adapter.normalize(rawEvent)`
3. Assert `isAllDay = true`; `startTime` is midnight UTC of the given date

**Expected Result**: `isAllDay = true`; time component defaults to midnight UTC; no parsing errors.

**Code Sample**:
```typescript
it('should normalize an all-day Google Calendar event', () => {
  const rawEvent = {
    id: 'gcal_allday_001',
    summary: 'Conference Day 1',
    start: { date: '2026-07-15' },
    end: { date: '2026-07-16' },
  };

  const event = adapter.normalize(rawEvent);

  expect(event.isAllDay).toBe(true);
  expect(event.startTime).toBe('2026-07-15T00:00:00Z');
});
```

---

#### TC-F3-U1.3: Outlook Calendar Event Normalized from Graph Response
**Objective**: Verify that a raw Microsoft Graph calendar event is normalized to the same `CalendarEvent` schema with `source = 'outlook'`.

**Test Steps**:
1. Pass raw Graph event to `OutlookCalendarAdapter.normalize(graphEvent)`
2. Assert all core fields populated; `source = 'outlook'`
3. Assert `attendeeEmails` derived from `attendees[].emailAddress.address`

**Expected Result**: Normalized event matches schema; `source = 'outlook'`; attendee emails extracted.

**Code Sample**:
```typescript
describe('OutlookCalendarAdapter', () => {
  it('should normalize a Microsoft Graph calendar event', () => {
    const graphEvent = {
      id: 'oc_event_001',
      subject: 'TechConf Opening Session',
      start: { dateTime: '2026-07-15T09:00:00', timeZone: 'Pacific Standard Time' },
      end: { dateTime: '2026-07-15T10:00:00', timeZone: 'Pacific Standard Time' },
      attendees: [
        { emailAddress: { address: 'alice@example.com' }, type: 'required' },
      ],
      location: { displayName: 'Hall A' },
      onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/...' },
    };

    const adapter = new OutlookCalendarAdapter();
    const event = adapter.normalize(graphEvent);

    expect(event.source).toBe('outlook');
    expect(event.attendeeEmails).toContain('alice@example.com');
    expect(event.conferenceLink).toContain('teams.microsoft.com');
  });
});
```

---

### 1.2 Bidirectional Conflict Resolution

#### TC-F3-U2.1: Last-Write-Wins Conflict Resolution Selects Newer Event
**Objective**: Verify that when the same event exists in both Google Calendar and Outlook with different `updatedAt` timestamps, the `LastWriteWinsResolver` selects the more recently updated version.

**Preconditions**:
- Same event (matched by `iCalUID`) exists in both calendars with different `updatedAt`

**Test Steps**:
1. Create `ConflictCandidate` with Google version `updatedAt = T+100s` and Outlook version `updatedAt = T+50s`
2. Call `LastWriteWinsResolver.resolve(candidate)`
3. Assert resolved event is the Google version

**Expected Result**: Google version selected (newer); Outlook version marked as slave copy.

**Code Sample**:
```typescript
describe('LastWriteWinsResolver', () => {
  it('should select the more recently updated version on conflict', () => {
    const base = new Date('2026-07-15T12:00:00Z').getTime();
    const candidate: ConflictCandidate = {
      iCalUID: 'cal-uid-001',
      googleVersion: { ...mockEvent, updatedAt: new Date(base + 100_000).toISOString() },
      outlookVersion: { ...mockEvent, updatedAt: new Date(base + 50_000).toISOString() },
    };

    const resolver = new LastWriteWinsResolver();
    const resolved = resolver.resolve(candidate);

    expect(resolved.source).toBe('google');
    expect(resolved.iCalUID).toBe('cal-uid-001');
  });
});
```

---

#### TC-F3-U2.2: Equal Timestamps Default to Google as Authoritative Source
**Objective**: Verify that when both calendar versions have identical `updatedAt` timestamps, the resolver defaults to Google Calendar as the authoritative source.

**Test Steps**:
1. Set both `updatedAt` to the same ISO timestamp
2. Call `LastWriteWinsResolver.resolve(candidate)`
3. Assert Google version returned

**Expected Result**: Google Calendar wins tie-break; deterministic behavior.

**Code Sample**:
```typescript
it('should default to Google Calendar when both versions have identical timestamps', () => {
  const sameTime = '2026-07-15T12:00:00Z';
  const candidate: ConflictCandidate = {
    iCalUID: 'cal-uid-002',
    googleVersion: { ...mockEvent, updatedAt: sameTime, source: 'google' },
    outlookVersion: { ...mockEvent, updatedAt: sameTime, source: 'outlook' },
  };

  const resolved = new LastWriteWinsResolver().resolve(candidate);
  expect(resolved.source).toBe('google');
});
```

---

#### TC-F3-U2.3: Attendee-Merge Strategy Unions Attendee Lists
**Objective**: Verify that the `AttendeeMergeStrategy` combines attendee lists from both calendar versions, deduplicating by email address.

**Test Steps**:
1. Google version: `[alice@ex.com, bob@ex.com]`
2. Outlook version: `[bob@ex.com, charlie@ex.com]`
3. Call `AttendeeMergeStrategy.mergeAttendees(googleVersion, outlookVersion)`
4. Assert result = `[alice@ex.com, bob@ex.com, charlie@ex.com]` (3 unique)

**Expected Result**: 3 unique attendees; `bob@ex.com` not duplicated; order deterministic.

**Code Sample**:
```typescript
describe('AttendeeMergeStrategy', () => {
  it('should union attendee lists and deduplicate by email', () => {
    const merged = AttendeeMergeStrategy.mergeAttendees(
      ['alice@ex.com', 'bob@ex.com'],
      ['bob@ex.com', 'charlie@ex.com']
    );
    expect(merged).toHaveLength(3);
    expect(merged).toContain('alice@ex.com');
    expect(merged).toContain('charlie@ex.com');
    expect(merged.filter(e => e === 'bob@ex.com')).toHaveLength(1);
  });
});
```

---

### 1.3 iCalUID Matching and Event Linking

#### TC-F3-U3.1: Events Matched Across Calendars by iCalUID
**Objective**: Verify that `CalendarSyncMatcher` correctly identifies the same event appearing in both Google and Outlook calendars by its `iCalUID`.

**Test Steps**:
1. Provide list of 5 Google events and 5 Outlook events where 3 share the same `iCalUID`
2. Call `matcher.findMatches(googleEvents, outlookEvents)`
3. Assert 3 matched pairs returned; 2 unmatched Google events; 2 unmatched Outlook events

**Expected Result**: 3 pairs matched by `iCalUID`; unmatched events in separate buckets.

**Code Sample**:
```typescript
describe('CalendarSyncMatcher', () => {
  it('should match events across calendars by iCalUID', () => {
    const { matched, unmatchedGoogle, unmatchedOutlook } = matcher.findMatches(
      buildGoogleEvents(5, { sharedUids: ['uid1', 'uid2', 'uid3'] }),
      buildOutlookEvents(5, { sharedUids: ['uid1', 'uid2', 'uid3'] })
    );

    expect(matched).toHaveLength(3);
    expect(unmatchedGoogle).toHaveLength(2);
    expect(unmatchedOutlook).toHaveLength(2);
  });
});
```

---

#### TC-F3-U3.2: Conference Event Detected by Attendee Count and Location Keywords
**Objective**: Verify that `ConferenceEventDetector` flags events as conference-related when they have ≥10 attendees OR location contains conference venue keywords.

**Test Steps**:
1. Test A: event with 15 attendees, no keywords → should be flagged
2. Test B: event with 2 attendees, location `"Moscone Center"` → should be flagged
3. Test C: event with 2 attendees, location `"My Office"` → should NOT be flagged

**Expected Result**: Tests A and B flagged; Test C not flagged.

**Code Sample**:
```typescript
describe('ConferenceEventDetector', () => {
  it('should flag events with 15 attendees as conference-related', () => {
    const event = buildEvent({ attendeeCount: 15, location: 'Conference Room' });
    expect(ConferenceEventDetector.isConferenceEvent(event)).toBe(true);
  });

  it('should flag events at a known venue even with few attendees', () => {
    const event = buildEvent({ attendeeCount: 2, location: 'Moscone Center, San Francisco' });
    expect(ConferenceEventDetector.isConferenceEvent(event)).toBe(true);
  });

  it('should not flag a private meeting at My Office', () => {
    const event = buildEvent({ attendeeCount: 2, location: 'My Office' });
    expect(ConferenceEventDetector.isConferenceEvent(event)).toBe(false);
  });
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Bidirectional Sync End-to-End

#### TC-F3-I1.1: Event Created in Google Calendar Propagated to Outlook
**Objective**: Verify that a new Google Calendar event created during a sync cycle is correctly created in the user's Outlook calendar with matching fields.

**Preconditions**:
- Google Calendar sandbox has a new event not yet in Outlook
- Valid tokens for both calendars

**Test Steps**:
1. Seed Google Calendar sandbox with a new event `'TechConf Networking Lunch'`
2. Call `CalendarSyncService.run({ userId, direction: 'bidirectional' })`
3. Query Outlook sandbox for events
4. Assert `'TechConf Networking Lunch'` exists in Outlook with matching `startTime`, `endTime`, `attendees`

**Expected Result**: Event propagated to Outlook; `iCalUID` preserved; sync metadata recorded.

**Code Sample**:
```typescript
describe('CalendarSyncService integration', () => {
  it('should propagate a new Google event to Outlook', async () => {
    seedGoogleCalendar([buildEvent({ title: 'TechConf Networking Lunch', iCalUID: 'uid-lunch-001' })]);

    await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

    const outlookEvents = await sandboxOutlookCalendar.listEvents();
    const synced = outlookEvents.find(e => e.iCalUID === 'uid-lunch-001');

    expect(synced).toBeDefined();
    expect(synced.title).toBe('TechConf Networking Lunch');
  });
});
```

---

#### TC-F3-I1.2: Event Updated in Outlook Synced Back to Google
**Objective**: Verify that updating an event title in Outlook triggers the sync to update the corresponding Google Calendar event.

**Test Steps**:
1. Establish a synced event in both calendars
2. Update event title in Outlook to `'TechConf Networking Lunch (RESCHEDULED)'`
3. Run sync
4. Assert Google Calendar event title updated to match

**Expected Result**: Google Calendar event title reflects Outlook update; `updatedAt` refreshed.

**Code Sample**:
```typescript
it('should sync an Outlook title update back to Google Calendar', async () => {
  await establishSyncedEvent('uid-lunch-001');
  await sandboxOutlookCalendar.updateEvent('uid-lunch-001', { title: 'TechConf Networking Lunch (RESCHEDULED)' });

  await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

  const googleEvent = await sandboxGoogleCalendar.getEvent('uid-lunch-001');
  expect(googleEvent.summary).toBe('TechConf Networking Lunch (RESCHEDULED)');
});
```

---

### 2.2 Conference Session Import

#### TC-F3-I2.1: Conference Agenda Imported as Calendar Events
**Objective**: Verify that importing a conference agenda (from the Session Intelligence engine) creates individual calendar events for each session.

**Test Steps**:
1. Provide a conference agenda with 5 sessions
2. Call `ConferenceCalendarImporter.import({ userId, agenda, calendarId: 'primary' })`
3. Assert 5 events created in Google Calendar sandbox
4. Assert each event has `description` containing session speakers

**Expected Result**: 5 calendar events created; speakers in descriptions; no duplicates.

**Code Sample**:
```typescript
describe('ConferenceCalendarImporter integration', () => {
  it('should create calendar events from a 5-session conference agenda', async () => {
    const agenda = buildConferenceAgenda(5);

    await ConferenceCalendarImporter.import({
      userId: 'user_1',
      agenda,
      calendarId: 'primary',
      provider: 'google',
    });

    const events = await sandboxGoogleCalendar.listEvents({ calendarId: 'primary' });
    expect(events).toHaveLength(5);
    events.forEach(e => expect(e.description).toBeDefined());
  });
});
```

---

#### TC-F3-I2.2: Re-Import Does Not Duplicate Existing Events
**Objective**: Verify that re-importing the same conference agenda does not create duplicate calendar events.

**Test Steps**:
1. Import a 5-session agenda
2. Import the same agenda again
3. Assert calendar still has exactly 5 events (not 10)

**Expected Result**: Idempotent import; existing events detected by `iCalUID`; no duplicates created.

**Code Sample**:
```typescript
it('should not duplicate events on re-import of the same agenda', async () => {
  const agenda = buildConferenceAgenda(5);

  await ConferenceCalendarImporter.import({ userId: 'user_1', agenda, calendarId: 'primary', provider: 'google' });
  await ConferenceCalendarImporter.import({ userId: 'user_1', agenda, calendarId: 'primary', provider: 'google' });

  const events = await sandboxGoogleCalendar.listEvents({ calendarId: 'primary' });
  expect(events).toHaveLength(5);
});
```

---

### 2.3 Timezone Normalization Pipeline

#### TC-F3-I3.1: Events from Multiple Timezones Stored in UTC
**Objective**: Verify that calendar events from different source timezones are all normalized to UTC before storage.

**Test Steps**:
1. Seed Google Calendar with event at `'2026-07-15T09:00:00-07:00'` (PDT)
2. Seed Outlook with event at `'2026-07-15T17:00:00+01:00'` (BST)
3. Run sync; query stored events
4. Assert both stored events have `startTime` in UTC format

**Expected Result**: Both events stored as UTC; times mathematically equivalent to original zoned times.

**Code Sample**:
```typescript
describe('Timezone normalization', () => {
  it('should normalize all event times to UTC before storage', async () => {
    seedGoogleCalendar([buildEvent({ startDateTime: '2026-07-15T09:00:00-07:00' })]);
    seedOutlookCalendar([buildEvent({ startDateTime: '2026-07-15T17:00:00+01:00' })]);

    await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

    const stored = await eventStore.findAll({ userId: 'user_1' });
    stored.forEach(e => {
      expect(e.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });
});
```

---

#### TC-F3-I3.2: IANA Timezone Names Resolved Correctly
**Objective**: Verify that `CalendarTimezoneResolver` correctly handles IANA timezone names (e.g., `America/New_York`) and Windows timezone names (e.g., `Eastern Standard Time`).

**Test Steps**:
1. Resolve `America/New_York` for timestamp `2026-07-15T12:00:00`
2. Resolve `Eastern Standard Time` for the same timestamp
3. Assert both produce the same UTC offset (`-04:00` during EDT)

**Expected Result**: Both timezone representations produce identical UTC offsets; no resolution error.

**Code Sample**:
```typescript
it('should resolve IANA and Windows timezone names to the same UTC offset', () => {
  const ianaOffset = CalendarTimezoneResolver.getUtcOffset('America/New_York', '2026-07-15T12:00:00');
  const windowsOffset = CalendarTimezoneResolver.getUtcOffset('Eastern Standard Time', '2026-07-15T12:00:00');

  expect(ianaOffset).toBe('-04:00');
  expect(windowsOffset).toBe('-04:00');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Recurring Event Handling

#### TC-F3-E1.1: Recurring Event Exception Synced Without Overwriting Master
**Objective**: Verify that a single-instance override of a recurring event (exception) is synced to the target calendar without modifying the recurring master rule.

**Preconditions**:
- A weekly recurring conference event exists in Google Calendar
- One instance on `2026-07-22` has been modified (title changed, start time shifted)

**Test Steps**:
1. Run sync
2. Assert Outlook has the recurring master with original RRULE
3. Assert Outlook also has the exception instance with modified fields
4. Assert other instances are unaffected

**Expected Result**: Recurring master intact; exception synced; other instances unmodified.

**Code Sample**:
```typescript
it('should sync a recurring event exception without overwriting the master rule', async () => {
  seedGoogleRecurringEventWithException({
    rrule: 'FREQ=WEEKLY;COUNT=4',
    exceptionDate: '2026-07-22',
    exceptionTitle: 'TechConf Weekly (Special Edition)',
  });

  await CalendarSyncService.run({ userId: 'user_1', direction: 'google-to-outlook' });

  const master = await sandboxOutlookCalendar.getEventByICalUID('recurring-uid-001');
  expect(master.recurrence).toBeDefined();

  const exception = await sandboxOutlookCalendar.getExceptionByDate('recurring-uid-001', '2026-07-22');
  expect(exception.title).toBe('TechConf Weekly (Special Edition)');
});
```

---

#### TC-F3-E1.2: Deleted Recurring Instance Not Recreated by Sync
**Objective**: Verify that when a specific instance of a recurring event is deleted in Google Calendar, sync does not recreate it in Outlook.

**Test Steps**:
1. Create recurring event in both calendars
2. Delete instance on `2026-07-22` in Google Calendar
3. Run sync
4. Assert Outlook does NOT have an event on `2026-07-22` for that series

**Expected Result**: Deletion propagated; Outlook instance removed; master series unaffected.

**Code Sample**:
```typescript
it('should propagate deletion of a recurring instance to Outlook', async () => {
  await establishSyncedRecurringEvent('recurring-uid-001', { rrule: 'FREQ=WEEKLY;COUNT=4' });
  await sandboxGoogleCalendar.deleteRecurringInstance('recurring-uid-001', '2026-07-22');

  await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

  const instance = await sandboxOutlookCalendar.getExceptionByDate('recurring-uid-001', '2026-07-22');
  expect(instance).toBeNull();
});
```

---

### 3.2 Concurrency and Sync Conflicts

#### TC-F3-E2.1: Simultaneous Edits on Both Calendars Triggers Conflict Resolution
**Objective**: Verify that when the same event is edited simultaneously in both Google and Outlook between sync cycles, the conflict resolver is invoked and produces a deterministic winner.

**Test Steps**:
1. Establish synced event; pause sync
2. Update event title in Google; update event location in Outlook (same event)
3. Resume sync
4. Assert `ConflictResolver.resolve()` called; one version wins; no data loss

**Expected Result**: Conflict detected and resolved; `conflictLog` entry created with both versions; winning version written to both calendars.

**Code Sample**:
```typescript
it('should invoke conflict resolver when the same event is edited in both calendars', async () => {
  await establishSyncedEvent('uid-conflict-001');
  await sandboxGoogleCalendar.updateEvent('uid-conflict-001', { title: 'Updated in Google' });
  await sandboxOutlookCalendar.updateEvent('uid-conflict-001', { location: 'Updated location in Outlook' });

  await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

  expect(conflictResolverSpy).toHaveBeenCalledTimes(1);
  const log = await conflictLogStore.findByICalUID('uid-conflict-001');
  expect(log).toBeDefined();
});
```

---

#### TC-F3-E2.2: Calendar Quota Exceeded Pauses Sync and Schedules Retry
**Objective**: Verify that when Google Calendar API returns a quota exceeded error, the sync pauses and schedules a retry after the quota reset window.

**Test Steps**:
1. Configure Google Calendar mock to return `403 quotaExceeded`
2. Trigger sync
3. Assert sync paused; retry job scheduled for 1 minute later
4. Assert partial progress saved

**Expected Result**: Sync paused on quota error; retry job registered; no data loss for completed operations.

**Code Sample**:
```typescript
it('should pause sync and schedule retry on Google Calendar quota exceeded error', async () => {
  mockGoogleCalendarApi.events.list.mockRejectedValue({ code: 403, errors: [{ domain: 'usageLimits', reason: 'quotaExceeded' }] });

  await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });

  expect(retrySchedulerSpy).toHaveBeenCalledWith(
    expect.objectContaining({ delayMs: expect.any(Number), userId: 'user_1' })
  );
  const state = await syncStateStore.get('user_1');
  expect(state.status).toBe('paused:quota_exceeded');
});
```

---

### 3.3 Calendar Permission and Sharing Edge Cases

#### TC-F3-E3.1: Read-Only Calendar Prevents Write Operations
**Objective**: Verify that attempting to write an event to a read-only shared calendar returns a `CalendarReadOnlyError` without attempting the API write.

**Test Steps**:
1. Configure target calendar with `accessRole = 'reader'`
2. Call `CalendarSyncService.writeEvent(event, { calendarId: 'readonly-cal' })`
3. Assert `CalendarReadOnlyError` thrown
4. Assert Google Calendar `events.insert` NOT called

**Expected Result**: Write blocked; error thrown before API call; no partial writes.

**Code Sample**:
```typescript
it('should throw CalendarReadOnlyError without calling the API for a read-only calendar', async () => {
  mockGoogleCalendarApi.calendarList.get.mockResolvedValue({ data: { accessRole: 'reader' } });

  await expect(
    CalendarSyncService.writeEvent(mockEvent, { calendarId: 'readonly-cal', userId: 'user_1' })
  ).rejects.toThrow(CalendarReadOnlyError);

  expect(mockGoogleCalendarApi.events.insert).not.toHaveBeenCalled();
});
```

---

#### TC-F3-E3.2: Invited but Not Accepted Events Excluded from Contact Extraction
**Objective**: Verify that calendar events the user was invited to but hasn't accepted are not used for conference contact extraction.

**Test Steps**:
1. Seed calendar with one `accepted` event and one `needsAction` event (uninvited)
2. Call `CalendarContactExtractor.extract({ userId })`
3. Assert only the accepted event's attendees are extracted

**Expected Result**: `needsAction` event excluded; only confirmed attendees from accepted events returned.

**Code Sample**:
```typescript
it('should exclude attendees from uninvited (needsAction) calendar events', async () => {
  seedCalendarEvents([
    buildEvent({ selfRsvpStatus: 'accepted', attendees: ['alice@ex.com'] }),
    buildEvent({ selfRsvpStatus: 'needsAction', attendees: ['mallory@ex.com'] }),
  ]);

  const contacts = await CalendarContactExtractor.extract({ userId: 'user_1' });

  expect(contacts.map(c => c.email)).toContain('alice@ex.com');
  expect(contacts.map(c => c.email)).not.toContain('mallory@ex.com');
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Event Sync Throughput

#### TC-F3-P1.1: 200 Calendar Events Synced Bidirectionally in Under 15 Seconds
**Objective**: Verify that bidirectional sync of 200 events (100 new on each side) completes in under 15 seconds.

**Preconditions**:
- 100 new events seeded in Google Calendar; 100 new events in Outlook
- No conflicts (unique `iCalUID`s)

**Test Steps**:
1. Start timer
2. Call `CalendarSyncService.run({ userId: 'user_perf', direction: 'bidirectional' })`
3. Assert elapsed < 15,000 ms
4. Assert 200 events exist in both calendars

**Expected Result**: 200-event bidirectional sync in < 15 s; all events propagated.

**Code Sample**:
```typescript
describe('CalendarSyncService performance', () => {
  it('should sync 200 events bidirectionally in under 15 seconds', async () => {
    seedGoogleCalendar(buildEvents(100));
    seedOutlookCalendar(buildEvents(100));

    const start = Date.now();
    await CalendarSyncService.run({ userId: 'user_perf', direction: 'bidirectional' });

    expect(Date.now() - start).toBeLessThan(15_000);
  }, 20_000);
});
```

---

#### TC-F3-P1.2: Incremental Sync of 10 Changed Events Faster Than Full Sync
**Objective**: Verify that an incremental sync (10 changed events) is at least 5x faster than a full re-sync of the same calendar.

**Test Steps**:
1. Measure full sync time for a 100-event calendar
2. Change 10 events; measure incremental sync time
3. Assert incremental time < full sync time / 5

**Expected Result**: Incremental sync ≥5x faster; delta mechanism confirmed effective.

**Code Sample**:
```typescript
it('should complete incremental sync 5x faster than a full sync', async () => {
  await seedCalendars(100);

  const fullStart = Date.now();
  await CalendarSyncService.run({ userId: 'user_perf', direction: 'full' });
  const fullTime = Date.now() - fullStart;

  changeCalendarEvents(10);

  const incrStart = Date.now();
  await CalendarSyncService.run({ userId: 'user_perf', direction: 'incremental' });
  const incrTime = Date.now() - incrStart;

  expect(incrTime).toBeLessThan(fullTime / 5);
});
```

---

### 4.2 Conflict Resolution Latency

#### TC-F3-P2.1: Conflict Resolution for 50 Simultaneous Conflicts Under 3 Seconds
**Objective**: Verify that resolving 50 event conflicts using the `LastWriteWinsResolver` completes in under 3 seconds.

**Test Steps**:
1. Generate 50 conflict candidates
2. Measure time to call `ConflictBatchResolver.resolveAll(candidates)`
3. Assert elapsed < 3,000 ms; 50 resolved events returned

**Expected Result**: Batch conflict resolution < 3 s; deterministic outcomes for all 50.

**Code Sample**:
```typescript
it('should resolve 50 conflicts in under 3 seconds', async () => {
  const candidates = buildConflictCandidates(50);
  const start = Date.now();

  const resolved = await ConflictBatchResolver.resolveAll(candidates);

  expect(Date.now() - start).toBeLessThan(3000);
  expect(resolved).toHaveLength(50);
});
```

---

#### TC-F3-P2.2: Conflict Log Write Does Not Block Sync Pipeline
**Objective**: Verify that writing conflict logs to the audit store is performed asynchronously and does not add more than 50 ms to sync pipeline duration per conflict.

**Test Steps**:
1. Configure conflict log store with 100 ms simulated write latency
2. Sync 10 conflicting events
3. Assert sync pipeline elapsed time is < 10 * 50 ms overhead (< 500 ms extra)

**Expected Result**: Conflict log writes non-blocking; pipeline throughput unaffected.

**Code Sample**:
```typescript
it('should write conflict logs asynchronously without blocking the sync pipeline', async () => {
  mockConflictLogStore.save.mockImplementation(() => delay(100));
  await establishConflictingEvents(10);

  const start = Date.now();
  await CalendarSyncService.run({ userId: 'user_1', direction: 'bidirectional' });
  const elapsed = Date.now() - start;

  // 10 conflicts * 50ms max overhead = 500ms extra budget
  expect(elapsed).toBeLessThan(baseline + 500);
});
```

---

### 4.3 Calendar API Connection Pool

#### TC-F3-P3.1: Connection Pool Handles 20 Concurrent Sync Operations
**Objective**: Verify that 20 concurrent per-user sync operations are handled by the connection pool without exhaustion or connection errors.

**Test Steps**:
1. Launch 20 concurrent `CalendarSyncService.run()` calls for 20 different users
2. Assert all 20 complete successfully
3. Assert peak active connections <= pool max (10); queue used for excess

**Expected Result**: All 20 syncs complete; connection pool queues excess; no `ECONNREFUSED` errors.

**Code Sample**:
```typescript
it('should handle 20 concurrent sync operations without connection pool exhaustion', async () => {
  const syncs = Array.from({ length: 20 }, (_, i) =>
    CalendarSyncService.run({ userId: `user_${i}`, direction: 'incremental' })
  );

  const results = await Promise.allSettled(syncs);
  const failures = results.filter(r => r.status === 'rejected');

  expect(failures).toHaveLength(0);
  expect(peakConnectionsSpy()).toBeLessThanOrEqual(10);
});
```

---

#### TC-F3-P3.2: Cache Hit Rate Above 80% for Repeated Calendar Metadata Requests
**Objective**: Verify that the calendar metadata cache (timezone info, calendar access roles) achieves > 80% hit rate over 100 sync operations for the same user.

**Test Steps**:
1. Run 100 sync operations for the same user
2. Query cache metrics for `calendarMetadata` cache
3. Assert hit rate > 80%

**Expected Result**: Cache reduces redundant API calls; metadata fetched from API < 20 times out of 100 operations.

**Code Sample**:
```typescript
it('should achieve >80% cache hit rate for calendar metadata over 100 syncs', async () => {
  for (let i = 0; i < 100; i++) {
    await CalendarSyncService.run({ userId: 'user_1', direction: 'incremental' });
  }

  const { hitRate } = calendarMetadataCache.getStats();
  expect(hitRate).toBeGreaterThan(0.8);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---------|--------|-----------|
| 1. Unit Tests | 3 | 9 |
| 2. Integration Tests | 3 | 6 |
| 3. Edge Case Validation | 3 | 6 |
| 4. Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~60 s | Integration ~5 min | Edge Cases ~2 min | Performance ~8 min
**Coverage Target**: ≥90% branch coverage on `GoogleCalendarAdapter`, `OutlookCalendarAdapter`, `CalendarSyncService`, `LastWriteWinsResolver`, `CalendarSyncMatcher`
