# EPIC04 Feature 9 — Relationship Timeline — Test Cases

## Test Overview
Comprehensive test suite for Relationship Timeline covering unit tests, integration tests, edge cases, and performance validation. The relationship timeline aggregates all interactions between two contacts into a chronological activity stream, providing a complete history of emails, meetings, shared events, and relationship milestones. Tests cover event ingestion, timeline construction, filtering, pagination, milestone detection, and timeline rendering performance.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Timeline Event Construction

#### TC-F9-U1.1: Email interaction is correctly constructed as a timeline event
**Objective**: Verify that a raw email record is transformed into a correctly structured `TimelineEvent` of type `EMAIL`.

**Preconditions**:
- A raw email record with `from`, `to`, `subject`, `date`, and `messageId` is available.

**Test Steps**:
1. Call `timelineEventBuilder.fromEmail(rawEmail)`.
2. Assert event `type === 'EMAIL'`.
3. Assert event `timestamp` equals `rawEmail.date`.
4. Assert event `participants` contains both `from` and `to` contact IDs.

**Expected Result**: Correctly typed and timestamped `EMAIL` timeline event.

**Code Sample**:
```typescript
import { TimelineEventBuilder } from '@/services/timeline/timeline-event-builder';

it('should construct an EMAIL timeline event from raw email record', () => {
  const builder = new TimelineEventBuilder();
  const raw = {
    from: 'alice@x.com',
    to: 'bob@x.com',
    subject: 'Re: Proposal',
    date: new Date('2026-06-15T10:00:00Z'),
    messageId: '<msg-001>',
  };

  const event = builder.fromEmail(raw);

  expect(event.type).toBe('EMAIL');
  expect(event.timestamp).toEqual(raw.date);
  expect(event.participants).toEqual(expect.arrayContaining(['alice@x.com', 'bob@x.com']));
});
```

---

#### TC-F9-U1.2: Meeting event is constructed with correct duration and location fields
**Objective**: Verify that a meeting record produces a `MEETING` timeline event with `duration` and `location` fields populated.

**Preconditions**:
- A meeting record with `startTime`, `endTime`, and `location` is available.

**Test Steps**:
1. Call `timelineEventBuilder.fromMeeting(rawMeeting)`.
2. Assert event `type === 'MEETING'`.
3. Assert `event.duration` equals the difference between `endTime` and `startTime` in minutes.
4. Assert `event.location` matches the meeting record.

**Expected Result**: `MEETING` event has correct type, duration, and location.

**Code Sample**:
```typescript
it('should construct a MEETING timeline event with duration', () => {
  const builder = new TimelineEventBuilder();
  const meeting = {
    startTime: new Date('2026-06-15T09:00:00Z'),
    endTime: new Date('2026-06-15T10:00:00Z'),
    location: 'Conference Room A',
    attendees: ['alice@x.com', 'bob@x.com'],
  };

  const event = builder.fromMeeting(meeting);

  expect(event.type).toBe('MEETING');
  expect(event.duration).toBe(60); // minutes
  expect(event.location).toBe('Conference Room A');
});
```

---

#### TC-F9-U1.3: Milestone event is constructed when relationship score crosses a threshold
**Objective**: Verify that when a relationship score crosses the `STRONG_RELATIONSHIP` threshold (0.80), a `MILESTONE` timeline event is constructed.

**Preconditions**:
- Previous score: 0.78. New score: 0.82.
- `STRONG_RELATIONSHIP_THRESHOLD = 0.80`.

**Test Steps**:
1. Call `milestoneDetector.detect({ previousScore: 0.78, newScore: 0.82 })`.
2. Assert a `MILESTONE` event is returned with `milestoneType: 'STRONG_RELATIONSHIP_REACHED'`.

**Expected Result**: Milestone event generated when threshold is crossed.

**Code Sample**:
```typescript
import { MilestoneDetector } from '@/services/timeline/milestone-detector';

it('should detect STRONG_RELATIONSHIP milestone on score threshold crossing', () => {
  const detector = new MilestoneDetector({ strongRelationshipThreshold: 0.80 });
  const milestone = detector.detect({ previousScore: 0.78, newScore: 0.82 });

  expect(milestone).not.toBeNull();
  expect(milestone?.type).toBe('MILESTONE');
  expect(milestone?.milestoneType).toBe('STRONG_RELATIONSHIP_REACHED');
});
```

---

### 1.2 Chronological Ordering and Deduplication

#### TC-F9-U2.1: Timeline events are sorted in reverse chronological order by default
**Objective**: Verify that the timeline service returns events with the most recent first.

**Preconditions**:
- 5 events with distinct timestamps (out of order in raw data).

**Test Steps**:
1. Build a timeline from 5 shuffled events.
2. Assert events are sorted with `events[0].timestamp >= events[1].timestamp` etc.

**Expected Result**: Events in descending timestamp order.

**Code Sample**:
```typescript
import { TimelineBuilder } from '@/services/timeline/timeline-builder';

it('should return timeline events in reverse chronological order', () => {
  const builder = new TimelineBuilder();
  const events = buildShuffledEvents(5);
  const timeline = builder.build(events);

  for (let i = 1; i < timeline.events.length; i++) {
    expect(timeline.events[i - 1].timestamp.getTime())
      .toBeGreaterThanOrEqual(timeline.events[i].timestamp.getTime());
  }
});
```

---

#### TC-F9-U2.2: Duplicate events from multiple sources are deduplicated in the timeline
**Objective**: Confirm that if the same meeting is present in both the calendar source and the manual source, it appears only once in the timeline.

**Preconditions**:
- Calendar event ID and manual import reference the same meeting.

**Test Steps**:
1. Build a timeline from two events referencing the same meeting (different source IDs, same `externalId`).
2. Assert the timeline contains exactly one event for that meeting.

**Expected Result**: Duplicate meeting event deduplicated in the timeline.

**Code Sample**:
```typescript
it('should deduplicate same-meeting events from multiple sources', () => {
  const builder = new TimelineBuilder({ deduplicationKey: 'externalId' });
  const calendarEvent = { type: 'MEETING', externalId: 'mtg-001', source: 'calendar', timestamp: new Date() };
  const manualEvent = { type: 'MEETING', externalId: 'mtg-001', source: 'manual', timestamp: new Date() };

  const timeline = builder.build([calendarEvent, manualEvent]);
  expect(timeline.events.filter((e) => e.externalId === 'mtg-001')).toHaveLength(1);
});
```

---

#### TC-F9-U2.3: Ascending chronological order is supported via sort parameter
**Objective**: Verify that the timeline can be sorted ascending (oldest first) when configured.

**Preconditions**:
- `TimelineBuilder` supports `order: 'asc'` parameter.

**Test Steps**:
1. Build a timeline with 5 events and `order: 'asc'`.
2. Assert `events[0].timestamp <= events[1].timestamp` etc.

**Expected Result**: Events in ascending timestamp order when requested.

**Code Sample**:
```typescript
it('should support ascending sort order', () => {
  const builder = new TimelineBuilder();
  const events = buildShuffledEvents(5);
  const timeline = builder.build(events, { order: 'asc' });

  for (let i = 1; i < timeline.events.length; i++) {
    expect(timeline.events[i - 1].timestamp.getTime())
      .toBeLessThanOrEqual(timeline.events[i].timestamp.getTime());
  }
});
```

---

### 1.3 Filtering and Faceting

#### TC-F9-U3.1: Filtering by event type returns only matching events
**Objective**: Verify that applying a `type: 'MEETING'` filter returns only meeting events.

**Preconditions**:
- Timeline contains a mix of EMAIL, MEETING, and MILESTONE events.

**Test Steps**:
1. Build a mixed timeline.
2. Apply filter `{ type: 'MEETING' }`.
3. Assert all returned events have `type === 'MEETING'`.

**Expected Result**: Only MEETING events in the filtered result.

**Code Sample**:
```typescript
it('should return only MEETING events when filtered by type', () => {
  const builder = new TimelineBuilder();
  const events = [
    ...buildEvents('EMAIL', 3),
    ...buildEvents('MEETING', 4),
    ...buildEvents('MILESTONE', 1),
  ];
  const filtered = builder.filter(events, { type: 'MEETING' });
  expect(filtered.every((e) => e.type === 'MEETING')).toBe(true);
  expect(filtered).toHaveLength(4);
});
```

---

#### TC-F9-U3.2: Date range filter returns only events within the specified window
**Objective**: Confirm that filtering by `dateRange: { from, to }` excludes events outside that window.

**Preconditions**:
- Timeline contains events in Jan, Mar, and Jun 2026.
- Filter: `{ from: '2026-02-01', to: '2026-05-01' }`.

**Test Steps**:
1. Apply the date range filter.
2. Assert only the March events are returned.

**Expected Result**: Events outside the date range are excluded.

**Code Sample**:
```typescript
it('should exclude events outside the date range filter', () => {
  const builder = new TimelineBuilder();
  const jan = buildEventAt(new Date('2026-01-15'));
  const mar = buildEventAt(new Date('2026-03-15'));
  const jun = buildEventAt(new Date('2026-06-15'));

  const filtered = builder.filter([jan, mar, jun], {
    dateRange: { from: new Date('2026-02-01'), to: new Date('2026-05-01') },
  });

  expect(filtered).toHaveLength(1);
  expect(filtered[0]).toBe(mar);
});
```

---

#### TC-F9-U3.3: Combining multiple filters applies AND logic
**Objective**: Verify that filtering by both `type: 'MEETING'` and a date range returns only events matching both criteria.

**Preconditions**:
- Timeline has: MEETING in March, EMAIL in March, MEETING in June.

**Test Steps**:
1. Filter by `{ type: 'MEETING', dateRange: { from: Feb, to: May } }`.
2. Assert only the March MEETING is returned.

**Expected Result**: AND logic applied; only the March MEETING matches both filters.

**Code Sample**:
```typescript
it('should apply AND logic when combining filters', () => {
  const builder = new TimelineBuilder();
  const events = [
    buildEvent('MEETING', new Date('2026-03-10')),
    buildEvent('EMAIL', new Date('2026-03-15')),
    buildEvent('MEETING', new Date('2026-06-20')),
  ];

  const filtered = builder.filter(events, {
    type: 'MEETING',
    dateRange: { from: new Date('2026-02-01'), to: new Date('2026-05-01') },
  });

  expect(filtered).toHaveLength(1);
  expect(filtered[0].type).toBe('MEETING');
  expect(filtered[0].timestamp.getMonth()).toBe(2); // March = 2
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Timeline Construction Pipeline

#### TC-F9-I1.1: Full timeline constructed from all interaction sources for a contact pair
**Objective**: Verify the end-to-end pipeline builds a complete timeline by aggregating emails, meetings, and calls for a given contact pair.

**Preconditions**:
- 3 emails, 2 meetings, and 1 call between contacts A and B are in the respective stores.

**Test Steps**:
1. Call `timelineService.getTimeline(contactA.id, contactB.id)`.
2. Assert timeline has exactly 6 events.
3. Assert event types include EMAIL (3), MEETING (2), CALL (1).

**Expected Result**: All 6 cross-source events appear in the timeline.

**Code Sample**:
```typescript
it('should aggregate events from all sources into one timeline', async () => {
  await seedEmails(contactA.id, contactB.id, 3);
  await seedMeetings(contactA.id, contactB.id, 2);
  await seedCalls(contactA.id, contactB.id, 1);

  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);

  expect(timeline.events).toHaveLength(6);
  expect(timeline.events.filter((e) => e.type === 'EMAIL')).toHaveLength(3);
  expect(timeline.events.filter((e) => e.type === 'MEETING')).toHaveLength(2);
  expect(timeline.events.filter((e) => e.type === 'CALL')).toHaveLength(1);
});
```

---

#### TC-F9-I1.2: New interaction is reflected in the timeline within 1 second
**Objective**: Verify that after a new email interaction is recorded, it appears in the relationship timeline within 1 second.

**Preconditions**:
- Existing timeline for A↔B has 4 events.
- Timeline uses an event-driven update mechanism.

**Test Steps**:
1. Record a new email between A and B.
2. Poll the timeline for up to 1 second.
3. Assert the timeline now has 5 events.

**Expected Result**: New interaction reflected in timeline within 1 s.

**Code Sample**:
```typescript
it('should reflect new interaction in timeline within 1 second', async () => {
  await seedEmails(contactA.id, contactB.id, 4);
  await interactionStore.recordEmail({ from: contactA.id, to: contactB.id, date: new Date() });

  await waitFor(
    async () => (await timelineService.getTimeline(contactA.id, contactB.id)).events.length === 5,
    1000
  );
  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);
  expect(timeline.events).toHaveLength(5);
});
```

---

### 2.2 Milestone Detection and Persistence

#### TC-F9-I2.1: First meeting milestone is created when contacts meet for the first time
**Objective**: Verify that a `FIRST_MEETING` milestone event is created and stored in the timeline when two contacts share their first meeting.

**Preconditions**:
- A and B have interacted only via email. No prior meeting.

**Test Steps**:
1. Create a meeting with both A and B as attendees.
2. Retrieve the timeline for A↔B.
3. Assert a `FIRST_MEETING` milestone event exists.

**Expected Result**: `FIRST_MEETING` milestone appears in the timeline.

**Code Sample**:
```typescript
it('should create a FIRST_MEETING milestone on first shared meeting', async () => {
  await seedEmails(contactA.id, contactB.id, 2); // email history only
  await meetingService.createMeeting({ attendeeIds: [contactA.id, contactB.id] });

  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);
  const milestones = timeline.events.filter((e) => e.type === 'MILESTONE');

  expect(milestones.some((m) => m.milestoneType === 'FIRST_MEETING')).toBe(true);
});
```

---

#### TC-F9-I2.2: Relationship anniversary milestone is created on yearly recurrence
**Objective**: Verify that a `RELATIONSHIP_ANNIVERSARY` milestone is created on the anniversary of the first interaction.

**Preconditions**:
- First interaction was 1 year ago (within ±3 days of today).

**Test Steps**:
1. Run the milestone detection job for A↔B.
2. Assert an `ANNIVERSARY` milestone event is created with `year: 1`.

**Expected Result**: 1-year anniversary milestone detected and stored.

**Code Sample**:
```typescript
it('should detect 1-year relationship anniversary milestone', async () => {
  await setFirstInteractionDate(contactA.id, contactB.id, subDays(new Date(), 365));
  await milestoneJob.run();

  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);
  const anniversary = timeline.events.find(
    (e) => e.type === 'MILESTONE' && e.milestoneType === 'RELATIONSHIP_ANNIVERSARY'
  );
  expect(anniversary?.data.year).toBe(1);
});
```

---

### 2.3 Pagination

#### TC-F9-I3.1: Timeline supports cursor-based pagination
**Objective**: Verify that the timeline API supports cursor-based pagination and returns events in consistent order across pages.

**Preconditions**:
- Timeline has 100 events. Page size = 20.

**Test Steps**:
1. Fetch first page: `getTimeline(A, B, { limit: 20 })`.
2. Use `nextCursor` to fetch second page.
3. Assert no events appear in both pages.
4. Repeat until all pages exhausted.
5. Assert total unique events = 100.

**Expected Result**: 100 events returned across 5 pages with no duplicates.

**Code Sample**:
```typescript
it('should paginate timeline events without duplicates', async () => {
  await seedTimeline(contactA.id, contactB.id, 100);
  const allIds = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await timelineService.getTimeline(contactA.id, contactB.id, { limit: 20, cursor });
    for (const event of page.events) allIds.add(event.id);
    cursor = page.nextCursor;
  } while (cursor);

  expect(allIds.size).toBe(100);
});
```

---

#### TC-F9-I3.2: Filtered timeline pagination respects the filter across pages
**Objective**: Confirm that applying a type filter to a paginated timeline returns only filtered events across all pages.

**Preconditions**:
- Timeline has 60 MEETING events and 40 EMAIL events. Page size = 20.

**Test Steps**:
1. Fetch all pages with filter `{ type: 'MEETING' }`.
2. Collect all events across pages.
3. Assert total = 60 and all are MEETING type.

**Expected Result**: Exactly 60 MEETING events across paginated result; no EMAIL events.

**Code Sample**:
```typescript
it('should apply filter consistently across pagination pages', async () => {
  await seedTimeline(contactA.id, contactB.id, 60, { type: 'MEETING' });
  await seedTimeline(contactA.id, contactB.id, 40, { type: 'EMAIL' });

  const allEvents: TimelineEvent[] = [];
  let cursor: string | undefined;

  do {
    const page = await timelineService.getTimeline(contactA.id, contactB.id, {
      limit: 20,
      cursor,
      filter: { type: 'MEETING' },
    });
    allEvents.push(...page.events);
    cursor = page.nextCursor;
  } while (cursor);

  expect(allEvents).toHaveLength(60);
  expect(allEvents.every((e) => e.type === 'MEETING')).toBe(true);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Empty and Single-Event Timelines

#### TC-F9-E1.1: Timeline for a contact pair with no interactions returns an empty event list
**Objective**: Verify that requesting a timeline for two contacts who have never interacted returns an empty list, not an error.

**Preconditions**:
- Contacts A and Z exist but have never shared a meeting, email, or call.

**Test Steps**:
1. Call `timelineService.getTimeline(contactA.id, contactZ.id)`.
2. Assert `timeline.events` is an empty array.
3. Assert no exception is thrown.

**Expected Result**: Empty timeline returned gracefully.

**Code Sample**:
```typescript
it('should return empty timeline for contacts with no shared history', async () => {
  const z = await svc.createContact({ firstName: 'Zero', email: 'zero@x.com' });
  const timeline = await timelineService.getTimeline(contactA.id, z.id);

  expect(timeline.events).toHaveLength(0);
  expect(timeline.totalCount).toBe(0);
});
```

---

#### TC-F9-E1.2: Timeline with a single event returns that event with correct metadata
**Objective**: Confirm that a single-event timeline returns the correct event without pagination artifacts.

**Preconditions**:
- Exactly one email exists between A and B.

**Test Steps**:
1. Seed one email interaction.
2. Fetch the timeline.
3. Assert `events.length === 1` and `nextCursor === null`.

**Expected Result**: Single event returned; no spurious pagination cursor.

**Code Sample**:
```typescript
it('should return single event timeline correctly', async () => {
  await seedEmails(contactA.id, contactB.id, 1);
  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);

  expect(timeline.events).toHaveLength(1);
  expect(timeline.nextCursor).toBeNull();
});
```

---

### 3.2 Concurrent Modifications

#### TC-F9-E2.1: Timeline remains consistent when a new event is added mid-pagination
**Objective**: Verify that if a new event is added between two page fetches, it does not cause an event to appear twice or disappear from the paginated result.

**Preconditions**:
- Timeline has 40 events; page size = 20.

**Test Steps**:
1. Fetch first page (events 1-20).
2. Insert a new event (event 41).
3. Fetch second page using the first page's cursor.
4. Assert events on page 2 are events 21-40 (the new one is either appended or excluded consistently).
5. Assert no event appears on both pages.

**Expected Result**: Cursor-based pagination is snapshot-consistent; no duplicates or gaps from concurrent inserts.

**Code Sample**:
```typescript
it('should remain consistent when event added between page fetches', async () => {
  await seedTimeline(contactA.id, contactB.id, 40);
  const page1 = await timelineService.getTimeline(contactA.id, contactB.id, { limit: 20 });
  const page1Ids = new Set(page1.events.map((e) => e.id));

  // Insert event mid-pagination
  await interactionStore.recordEmail({ from: contactA.id, to: contactB.id, date: new Date() });

  const page2 = await timelineService.getTimeline(contactA.id, contactB.id, { limit: 20, cursor: page1.nextCursor! });
  const page2Ids = new Set(page2.events.map((e) => e.id));

  const overlap = [...page1Ids].filter((id) => page2Ids.has(id));
  expect(overlap).toHaveLength(0);
});
```

---

#### TC-F9-E2.2: Concurrent timeline reads return consistent results
**Objective**: Confirm that 10 concurrent requests for the same timeline return identical event lists.

**Preconditions**:
- Timeline with 30 events; no ongoing writes.

**Test Steps**:
1. Fire 10 concurrent `getTimeline` requests for A↔B.
2. Assert all 10 responses have the same 30 events in the same order.

**Expected Result**: All concurrent reads are consistent.

**Code Sample**:
```typescript
it('should return consistent timeline across concurrent reads', async () => {
  await seedTimeline(contactA.id, contactB.id, 30);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => timelineService.getTimeline(contactA.id, contactB.id))
  );

  const reference = results[0].events.map((e) => e.id);
  for (const result of results.slice(1)) {
    expect(result.events.map((e) => e.id)).toEqual(reference);
  }
});
```

---

### 3.3 Far-Past and Future Events

#### TC-F9-E3.1: Timeline handles events from 10+ years in the past correctly
**Objective**: Verify that very old events (e.g., from 2010) are displayed correctly without date arithmetic errors.

**Preconditions**:
- One event dated `2010-03-15T00:00:00Z` in the store.

**Test Steps**:
1. Build a timeline including the 2010 event.
2. Assert the event is present in the result.
3. Assert `event.timestamp.getFullYear() === 2010`.

**Expected Result**: Historical events display without corruption.

**Code Sample**:
```typescript
it('should handle events from 10+ years ago correctly', async () => {
  await interactionStore.recordEmail({
    from: contactA.id,
    to: contactB.id,
    date: new Date('2010-03-15T00:00:00Z'),
  });

  const timeline = await timelineService.getTimeline(contactA.id, contactB.id);
  const oldEvent = timeline.events.find((e) => e.timestamp.getFullYear() === 2010);
  expect(oldEvent).toBeDefined();
});
```

---

#### TC-F9-E3.2: Scheduled future events appear in the timeline with a FUTURE tag
**Objective**: Verify that a scheduled future meeting (e.g., next week) appears in the timeline with a `status: 'scheduled'` tag rather than being excluded.

**Preconditions**:
- Meeting with `startTime` 7 days in the future.

**Test Steps**:
1. Create a scheduled future meeting.
2. Fetch the timeline with `includeFuture: true`.
3. Assert the future meeting appears with `status: 'scheduled'`.

**Expected Result**: Future meeting included with correct status tag.

**Code Sample**:
```typescript
it('should include future scheduled meetings with SCHEDULED status', async () => {
  await meetingService.createMeeting({
    attendeeIds: [contactA.id, contactB.id],
    startTime: addDays(new Date(), 7),
  });

  const timeline = await timelineService.getTimeline(contactA.id, contactB.id, { includeFuture: true });
  const futureMeeting = timeline.events.find((e) => e.type === 'MEETING' && e.status === 'scheduled');
  expect(futureMeeting).toBeDefined();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Timeline Retrieval Latency

#### TC-F9-P1.1: Timeline with 1 000 events loads in under 200 ms
**Objective**: Validate that a high-activity contact pair's timeline loads within the UX SLA.

**Preconditions**:
- 1 000 events seeded between A and B.
- Index on `(contactId_a, contactId_b, timestamp DESC)`.

**Test Steps**:
1. Seed 1 000 events.
2. Time `timelineService.getTimeline(A, B, { limit: 20 })`.
3. Assert elapsed <= 200 ms.

**Expected Result**: First page of a 1 000-event timeline loads in <= 200 ms.

**Code Sample**:
```typescript
it('timeline first page loads under 200ms for 1000-event history', async () => {
  await seedTimeline(contactA.id, contactB.id, 1000);
  const t0 = performance.now();
  await timelineService.getTimeline(contactA.id, contactB.id, { limit: 20 });
  expect(performance.now() - t0).toBeLessThan(200);
});
```

---

#### TC-F9-P1.2: Filtered timeline loads in under 100 ms
**Objective**: Validate that applying a type filter does not significantly increase timeline query latency.

**Preconditions**:
- 500 mixed events (200 MEETING, 300 EMAIL).

**Test Steps**:
1. Seed the 500 events.
2. Time `getTimeline(A, B, { limit: 20, filter: { type: 'MEETING' } })`.
3. Assert elapsed <= 100 ms.

**Expected Result**: Filtered timeline query <= 100 ms.

**Code Sample**:
```typescript
it('filtered timeline loads under 100ms', async () => {
  await seedTimeline(contactA.id, contactB.id, 300, { type: 'EMAIL' });
  await seedTimeline(contactA.id, contactB.id, 200, { type: 'MEETING' });

  const t0 = performance.now();
  await timelineService.getTimeline(contactA.id, contactB.id, {
    limit: 20,
    filter: { type: 'MEETING' },
  });
  expect(performance.now() - t0).toBeLessThan(100);
});
```

---

### 4.2 Bulk Timeline Construction

#### TC-F9-P2.1: Generate timelines for 10 000 contact pairs in under 5 minutes
**Objective**: Validate the batch timeline pre-generation job (for caching) meets the SLA.

**Preconditions**:
- 10 000 contact pairs with interaction histories seeded.

**Test Steps**:
1. Run `timelineBatchJob.generateAll(10_000)`.
2. Assert elapsed <= 300 000 ms.

**Expected Result**: 10 000 timelines generated in <= 5 minutes.

**Code Sample**:
```typescript
it('should generate 10k timelines in under 5 minutes', async () => {
  await seedContactPairsWithHistory(10_000);
  const t0 = performance.now();
  await timelineBatchJob.generateAll(10_000);
  expect(performance.now() - t0).toBeLessThan(300_000);
}, 360_000);
```

---

#### TC-F9-P2.2: Concurrent timeline requests for 100 different pairs complete within 2 seconds
**Objective**: Confirm the timeline service handles concurrent multi-pair loads without serialisation bottlenecks.

**Preconditions**:
- 100 distinct contact pairs with timelines.

**Test Steps**:
1. Fire 100 concurrent `getTimeline` calls for 100 different pairs.
2. Assert all complete within 2 000 ms.

**Expected Result**: 100 concurrent timeline loads complete in <= 2 s.

**Code Sample**:
```typescript
it('should serve 100 concurrent timeline requests within 2 seconds', async () => {
  const pairs = await seedContactPairsWithHistory(100);
  const t0 = performance.now();

  await Promise.all(
    pairs.map(([a, b]) => timelineService.getTimeline(a.id, b.id, { limit: 20 }))
  );

  expect(performance.now() - t0).toBeLessThan(2000);
});
```

---

### 4.3 Event Ingestion Performance

#### TC-F9-P3.1: 10 000 timeline events ingested in under 30 seconds
**Objective**: Validate the bulk event ingestion pipeline handles high-volume import within the SLA.

**Preconditions**:
- 10 000 mixed event records ready for ingestion.

**Test Steps**:
1. Time `timelineIngestionService.bulkIngest(events)` for 10 000 events.
2. Assert elapsed <= 30 000 ms.
3. Assert all 10 000 events are queryable in the timeline store.

**Expected Result**: Bulk ingestion of 10 000 events in <= 30 s.

**Code Sample**:
```typescript
it('should ingest 10k timeline events in under 30 seconds', async () => {
  const events = buildMixedEvents(10_000, [contactA.id, contactB.id]);
  const t0 = performance.now();
  await timelineIngestionService.bulkIngest(events);
  expect(performance.now() - t0).toBeLessThan(30_000);

  const count = await timelineStore.countForPair(contactA.id, contactB.id);
  expect(count).toBe(10_000);
});
```

---

#### TC-F9-P3.2: Timeline event query does not degrade during concurrent bulk ingestion
**Objective**: Confirm that read latency for timeline queries stays within 2× baseline while a bulk ingestion is running.

**Preconditions**:
- Bulk ingestion of 5 000 events running in the background.
- 20 concurrent timeline read requests.

**Test Steps**:
1. Measure baseline read p95.
2. Start bulk ingestion in background.
3. Measure read p95 during ingestion.
4. Assert ratio <= 2.

**Expected Result**: Read latency degrades by no more than 2× during bulk ingestion.

**Code Sample**:
```typescript
it('reads degrade less than 2x during bulk ingestion', async () => {
  const baselineP95 = await measureTimelineReadP95(20, contactA.id, contactB.id);
  const ingestionPromise = timelineIngestionService.bulkIngest(buildMixedEvents(5_000, [contactA.id, contactB.id]));

  const duringP95 = await measureTimelineReadP95(20, contactA.id, contactB.id);
  await ingestionPromise;

  expect(duringP95 / baselineP95).toBeLessThanOrEqual(2);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases
