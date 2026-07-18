# EPIC04 Feature 6 — Meeting Association — Test Cases

## Test Overview
Comprehensive test suite for Meeting Association covering unit tests, integration tests, edge cases, and performance validation. Meeting association links contacts to the meetings they attended, enabling the system to infer relationship strength, shared context, and interaction history. Tests cover attendee parsing, association persistence, conflict detection, multi-source meeting deduplication, and retroactive association for existing contacts.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Attendee Parsing

#### TC-F6-U1.1: Parse attendees from a standard calendar event payload
**Objective**: Verify that attendees are correctly extracted from a well-formed calendar event JSON payload.

**Preconditions**:
- A mock Google Calendar event with 4 attendees is prepared.

**Test Steps**:
1. Call `attendeeParser.parse(mockEvent)`.
2. Assert result contains 4 `Attendee` objects.
3. Assert each has `email`, `displayName`, and `responseStatus`.

**Expected Result**: All 4 attendees parsed with correct fields.

**Code Sample**:
```typescript
import { AttendeeParser } from '@/services/meeting/attendee-parser';

it('should parse all attendees from a calendar event', () => {
  const parser = new AttendeeParser();
  const event = buildCalendarEvent({ attendeeCount: 4 });
  const attendees = parser.parse(event);

  expect(attendees).toHaveLength(4);
  for (const a of attendees) {
    expect(a.email).toBeDefined();
    expect(a.displayName).toBeDefined();
    expect(a.responseStatus).toBeDefined();
  }
});
```

---

#### TC-F6-U1.2: Organiser is included as an attendee if not already listed
**Objective**: Confirm that the meeting organiser is added to the attendee list even when not explicitly in the `attendees` array.

**Preconditions**:
- Calendar event has an `organizer` field but no matching entry in `attendees`.

**Test Steps**:
1. Build event with `organizer.email = 'org@x.com'` and `attendees` list that does NOT include `org@x.com`.
2. Parse the event.
3. Assert the parsed list includes `org@x.com`.

**Expected Result**: Organiser is added to attendee list with `role: 'organizer'`.

**Code Sample**:
```typescript
it('should include organiser in attendee list', () => {
  const parser = new AttendeeParser({ includeOrganiser: true });
  const event = buildCalendarEvent({
    organizer: { email: 'org@x.com', displayName: 'Org Person' },
    attendees: [{ email: 'guest@x.com' }],
  });
  const attendees = parser.parse(event);
  expect(attendees.map((a) => a.email)).toContain('org@x.com');
});
```

---

#### TC-F6-U1.3: Declined attendees are excluded from association by default
**Objective**: Verify that attendees who declined the meeting invitation are not associated with the meeting unless explicitly configured.

**Preconditions**:
- Event has 3 attendees: 2 accepted, 1 declined.

**Test Steps**:
1. Parse event with default config (`excludeDeclined: true`).
2. Assert only 2 attendees are returned.

**Expected Result**: Declined attendee excluded from parsed list.

**Code Sample**:
```typescript
it('should exclude declined attendees by default', () => {
  const parser = new AttendeeParser({ excludeDeclined: true });
  const event = buildCalendarEvent({
    attendees: [
      { email: 'a@x.com', responseStatus: 'accepted' },
      { email: 'b@x.com', responseStatus: 'accepted' },
      { email: 'c@x.com', responseStatus: 'declined' },
    ],
  });
  const attendees = parser.parse(event);
  expect(attendees).toHaveLength(2);
  expect(attendees.map((a) => a.email)).not.toContain('c@x.com');
});
```

---

### 1.2 Association Record Creation

#### TC-F6-U2.1: Meeting-contact association is created for each attendee
**Objective**: Verify that an `MeetingContact` association record is created for every parsed attendee.

**Preconditions**:
- 3 contacts already exist in the store matching the attendee emails.
- Meeting is already saved.

**Test Steps**:
1. Call `associationService.associateAttendees(meeting, attendees)`.
2. Query `MeetingContact` table for `meetingId`.
3. Assert 3 records exist, one per attendee.

**Expected Result**: One association record per attendee.

**Code Sample**:
```typescript
it('should create one association per attendee', async () => {
  const meeting = await createMeeting();
  const attendees = await resolveAttendees(['a@x.com', 'b@x.com', 'c@x.com']);

  await associationService.associateAttendees(meeting, attendees);

  const links = await meetingContactStore.findByMeetingId(meeting.id);
  expect(links).toHaveLength(3);
});
```

---

#### TC-F6-U2.2: Association record stores attendee role (organiser vs guest)
**Objective**: Confirm that the role field on the association record reflects whether the contact was the meeting organiser or a guest.

**Preconditions**:
- Meeting with one organiser and two guests.

**Test Steps**:
1. Associate attendees.
2. Query association for the organiser's contact.
3. Assert `role === 'organizer'`.
4. Query association for a guest.
5. Assert `role === 'attendee'`.

**Expected Result**: Roles are persisted correctly per association record.

**Code Sample**:
```typescript
it('should persist attendee role on association record', async () => {
  const { meeting, organiser, guest } = await setupMeetingWithRoles();
  const orgLink = await meetingContactStore.findOne({ meetingId: meeting.id, contactId: organiser.id });
  const guestLink = await meetingContactStore.findOne({ meetingId: meeting.id, contactId: guest.id });

  expect(orgLink.role).toBe('organizer');
  expect(guestLink.role).toBe('attendee');
});
```

---

#### TC-F6-U2.3: Association is idempotent — duplicate events do not double-link
**Objective**: Verify that processing the same calendar event twice results in one association per attendee, not two.

**Preconditions**:
- The same event payload is processed twice (e.g., webhook retried).

**Test Steps**:
1. Process event once.
2. Process the same event again.
3. Query `MeetingContact` for the meeting's associations.
4. Assert each attendee appears exactly once.

**Expected Result**: Idempotent association — no duplicate links.

**Code Sample**:
```typescript
it('should not create duplicate associations for the same event', async () => {
  const event = buildCalendarEvent({ attendees: ['a@x.com', 'b@x.com'] });
  await meetingIngestionService.process(event);
  await meetingIngestionService.process(event); // retry

  const links = await meetingContactStore.findByMeetingId(event.id);
  expect(links).toHaveLength(2); // not 4
});
```

---

### 1.3 Unmatched Attendee Handling

#### TC-F6-U3.1: Unmatched attendee email creates a new contact stub
**Objective**: Verify that when an attendee's email does not match any existing contact, a new minimal contact stub is created and then associated.

**Preconditions**:
- Contact store has no record for `unknown@partner.com`.

**Test Steps**:
1. Process a meeting with `unknown@partner.com` as an attendee.
2. Assert a new contact stub was created for that email.
3. Assert the meeting-contact association links the meeting to the new stub.

**Expected Result**: New contact stub created; association record links meeting and stub.

**Code Sample**:
```typescript
it('should create a stub contact for unknown attendee email', async () => {
  const event = buildCalendarEvent({ attendees: ['unknown@partner.com'] });
  await meetingIngestionService.process(event);

  const contact = await contactStore.findByEmail('unknown@partner.com');
  expect(contact).toBeDefined();
  expect(contact.source).toBe('calendar');

  const link = await meetingContactStore.findOne({ contactId: contact.id });
  expect(link).toBeDefined();
});
```

---

#### TC-F6-U3.2: Unmatched attendee stub is promoted when the contact is later created manually
**Objective**: Confirm that when a manual contact is created for an email that was previously a stub, the stub is merged into the new contact and its meeting associations are transferred.

**Preconditions**:
- `stub@x.com` exists as a calendar-sourced stub with one meeting association.

**Test Steps**:
1. Create a full manual contact for `stub@x.com`.
2. Run identity resolution.
3. Assert the stub's meeting associations are now linked to the full contact.
4. Assert the stub is tombstoned.

**Expected Result**: Meeting associations transferred to the promoted full contact.

**Code Sample**:
```typescript
it('should transfer meeting associations when stub is promoted', async () => {
  const stub = await createCalendarStub('stub@x.com');
  await linkMeetingToContact(meetingId, stub.id);

  const fullContact = await svc.createContact({ firstName: 'Stub', email: 'stub@x.com' });
  await resolutionPipeline.run();

  const links = await meetingContactStore.findByContactId(fullContact.id);
  expect(links.map((l) => l.meetingId)).toContain(meetingId);
});
```

---

#### TC-F6-U3.3: Attendee without email is associated via display name fuzzy match
**Objective**: Verify that an attendee with no email (name only) is matched to an existing contact by display name, if a high-confidence name match exists.

**Preconditions**:
- Contact `'Alexandra Novak'` exists with email `'alex@corp.com'`.
- Meeting attendee has `displayName: 'Alexandra Novak'` and no email.

**Test Steps**:
1. Process a meeting with the name-only attendee.
2. Assert the association links the meeting to `alex@corp.com`'s contact.

**Expected Result**: Name-matched association created for email-less attendee.

**Code Sample**:
```typescript
it('should associate name-only attendee via fuzzy name match', async () => {
  const contact = await svc.createContact({ firstName: 'Alexandra', lastName: 'Novak', email: 'alex@corp.com' });
  const event = buildCalendarEvent({ attendees: [{ displayName: 'Alexandra Novak' }] });

  await meetingIngestionService.process(event);

  const link = await meetingContactStore.findOne({ contactId: contact.id });
  expect(link).toBeDefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Calendar Webhook to Association

#### TC-F6-I1.1: Full pipeline from webhook to association record
**Objective**: Verify the end-to-end flow: calendar webhook → meeting creation → attendee parsing → contact resolution → association storage.

**Preconditions**:
- All three attendee contacts exist.
- Webhook handler and DB connected.

**Test Steps**:
1. POST a calendar `eventUpdated` webhook with 3 attendees.
2. Wait for processing (up to 3 s).
3. Query associations for the meeting's ID.
4. Assert 3 associations exist.

**Expected Result**: 3 association records created end-to-end within 3 s.

**Code Sample**:
```typescript
it('should create associations end-to-end from webhook', async () => {
  const payload = buildGCalWebhook({ attendees: ['a@x.com', 'b@x.com', 'c@x.com'] });
  await request(app).post('/webhooks/calendar').send(payload).expect(202);

  await waitFor(() => meetingContactStore.countByMeetingId(payload.eventId) === 3, 3000);
  expect(await meetingContactStore.countByMeetingId(payload.eventId)).toBe(3);
});
```

---

#### TC-F6-I1.2: Association is updated when an attendee is removed from the event
**Objective**: Verify that when a calendar event is updated to remove an attendee, the corresponding association record is marked as `removed`.

**Preconditions**:
- Meeting exists with associations for 3 contacts.

**Test Steps**:
1. Send an updated event webhook with only 2 attendees (one removed).
2. Query all associations for the meeting.
3. Assert the removed attendee's association has `status: 'removed'`.

**Expected Result**: Removed attendee's association is soft-deleted, not hard-deleted.

**Code Sample**:
```typescript
it('should mark removed attendee association as removed', async () => {
  const event = await setupMeetingWithThreeAttendees();
  const updatedPayload = removedAttendeePayload(event, 'c@x.com');

  await request(app).post('/webhooks/calendar').send(updatedPayload).expect(202);
  await waitFor(() => true, 1000);

  const link = await meetingContactStore.findOne({ meetingId: event.id, email: 'c@x.com' });
  expect(link?.status).toBe('removed');
});
```

---

### 2.2 Relationship Score Update on Association

#### TC-F6-I2.1: Creating a meeting association triggers relationship score recalculation
**Objective**: Verify that adding a meeting association between two contacts triggers their relationship score to be updated.

**Preconditions**:
- Contacts A and B exist with a relationship score of 0.40.

**Test Steps**:
1. Create a meeting with A and B as attendees.
2. Await score update event.
3. Assert A↔B score > 0.40.

**Expected Result**: Relationship score increases after meeting association created.

**Code Sample**:
```typescript
it('should update relationship score when meeting association created', async () => {
  const [scoreAB] = await getScores([[contactA.id, contactB.id]]);
  await meetingService.createMeeting({ attendeeIds: [contactA.id, contactB.id] });

  await waitFor(async () => (await scorer.getScore(contactA.id, contactB.id)) > scoreAB, 2000);
  expect(await scorer.getScore(contactA.id, contactB.id)).toBeGreaterThan(scoreAB);
});
```

---

#### TC-F6-I2.2: Retroactive meeting association for existing contact updates relationship score
**Objective**: Verify that when an existing contact is retroactively associated with a past meeting, the relationship score is recalculated for all co-attendees.

**Preconditions**:
- Meeting from 30 days ago with 2 attendees (A, C). Contact B exists but was not associated.

**Test Steps**:
1. Retroactively link B to the historical meeting.
2. Assert B↔A and B↔C scores are updated.

**Expected Result**: Historical meeting link updates B's relationship scores with A and C.

**Code Sample**:
```typescript
it('should update relationship scores on retroactive meeting association', async () => {
  const historicalMeeting = await createPastMeeting({ daysAgo: 30, attendeeIds: [contactA.id, contactC.id] });
  await associationService.retroactivelyAssociate(historicalMeeting.id, contactB.id);

  expect(await scorer.getScore(contactB.id, contactA.id)).toBeGreaterThan(0);
  expect(await scorer.getScore(contactB.id, contactC.id)).toBeGreaterThan(0);
});
```

---

### 2.3 Multi-Source Meeting Deduplication

#### TC-F6-I3.1: Identical meetings from Google Calendar and manual entry are deduplicated
**Objective**: Verify that the same meeting ingested from two sources (calendar webhook + manual import) results in one meeting record with associations from both sources, not two separate meetings.

**Preconditions**:
- Same meeting (same time, same attendees) ingested from both sources.

**Test Steps**:
1. Process calendar webhook for the meeting.
2. Manually import the same meeting.
3. Query meetings by time window.
4. Assert exactly one meeting record exists.

**Expected Result**: Single deduplicated meeting record with both source attributions.

**Code Sample**:
```typescript
it('should deduplicate meetings from multiple sources', async () => {
  const meetingData = { startTime: '2026-07-15T09:00:00Z', attendees: ['a@x.com', 'b@x.com'] };
  await meetingIngestionService.processCalendarEvent(buildCalendarEvent(meetingData));
  await meetingIngestionService.processManualImport(meetingData);

  const meetings = await meetingStore.findInTimeWindow('2026-07-15T08:00:00Z', '2026-07-15T10:00:00Z');
  expect(meetings).toHaveLength(1);
});
```

---

#### TC-F6-I3.2: Attendee list is merged when duplicate meeting sources have partial overlap
**Objective**: Verify that when two source payloads for the same meeting have partially overlapping attendee lists, the union is stored.

**Preconditions**:
- Source 1 has attendees A, B; Source 2 has attendees B, C.

**Test Steps**:
1. Process both payloads.
2. Assert single meeting record with associations to A, B, and C.

**Expected Result**: Deduplicated meeting has 3 attendee associations (A ∪ B ∪ C).

**Code Sample**:
```typescript
it('should merge partial attendee lists from duplicate sources', async () => {
  const base = { startTime: '2026-07-15T09:00:00Z' };
  await meetingIngestionService.processCalendarEvent(buildCalendarEvent({ ...base, attendees: ['a@x.com', 'b@x.com'] }));
  await meetingIngestionService.processCalendarEvent(buildCalendarEvent({ ...base, attendees: ['b@x.com', 'c@x.com'] }));

  const meeting = await meetingStore.findByStartTime('2026-07-15T09:00:00Z');
  const links = await meetingContactStore.findByMeetingId(meeting.id);
  expect(links).toHaveLength(3);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Large Meetings

#### TC-F6-E1.1: Meeting with 200 attendees creates all associations correctly
**Objective**: Verify that a large all-hands meeting with 200 attendees is fully processed without truncation.

**Preconditions**:
- 200 contacts exist in the store.

**Test Steps**:
1. Process a calendar event with 200 attendees.
2. Assert 200 association records are created.

**Expected Result**: All 200 associations created; no truncation.

**Code Sample**:
```typescript
it('should create 200 associations for a large meeting', async () => {
  const contacts = await createContacts(200);
  const event = buildCalendarEvent({ attendees: contacts.map((c) => c.email) });

  await meetingIngestionService.process(event);

  const links = await meetingContactStore.findByMeetingId(event.id);
  expect(links).toHaveLength(200);
});
```

---

#### TC-F6-E1.2: Pairwise relationship score update is not triggered for meetings over the large-meeting threshold
**Objective**: Confirm that for meetings with more than 50 attendees, pairwise score recalculation is deferred to a background batch (not triggered synchronously for 50²/2 = 1 225 pairs).

**Preconditions**:
- `largeMeetingThreshold = 50` configured.
- Score update event bus spy attached.

**Test Steps**:
1. Process a meeting with 60 attendees.
2. Assert no synchronous score update events are fired.
3. Assert a `LARGE_MEETING_DEFERRED_SCORING` event is fired instead.

**Expected Result**: Large meeting triggers deferred batch scoring, not synchronous pairwise scoring.

**Code Sample**:
```typescript
it('should defer scoring for large meetings', async () => {
  const syncUpdateSpy = jest.spyOn(scoreUpdateBus, 'emit');
  const deferSpy = jest.spyOn(deferredScoringQueue, 'enqueue');

  await meetingIngestionService.process(buildCalendarEvent({ attendees: generateEmails(60) }));

  expect(syncUpdateSpy).not.toHaveBeenCalled();
  expect(deferSpy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'large-meeting' }));
});
```

---

### 3.2 Time Zone and Date Handling

#### TC-F6-E2.1: Meeting times across time zones are normalised to UTC for deduplication
**Objective**: Verify that the same meeting expressed in different time zones is recognised as a duplicate.

**Preconditions**:
- Meeting at `2026-07-15T09:00:00-05:00` (CDT) and `2026-07-15T14:00:00Z` (UTC) are the same moment.

**Test Steps**:
1. Process both representations.
2. Assert only one meeting record exists.

**Expected Result**: Time zone normalisation prevents false duplicate meetings.

**Code Sample**:
```typescript
it('should deduplicate meetings expressed in different time zones', async () => {
  await meetingIngestionService.processRaw({ startTime: '2026-07-15T09:00:00-05:00', uid: 'mtg-tz' });
  await meetingIngestionService.processRaw({ startTime: '2026-07-15T14:00:00Z', uid: 'mtg-tz' });

  const meetings = await meetingStore.findByUid('mtg-tz');
  expect(meetings).toHaveLength(1);
});
```

---

#### TC-F6-E2.2: All-day events are associated without time-based deduplication collision
**Objective**: Confirm that all-day events (no time component) do not collide with timed events on the same date during deduplication.

**Preconditions**:
- An all-day event and a 1-hour meeting exist on the same date.

**Test Steps**:
1. Ingest both events.
2. Assert two distinct meeting records are created.

**Expected Result**: All-day event and timed meeting are stored as separate records.

**Code Sample**:
```typescript
it('should not collide all-day and timed events on the same date', async () => {
  await meetingIngestionService.process(buildAllDayEvent({ date: '2026-07-15' }));
  await meetingIngestionService.process(buildTimedEvent({ startTime: '2026-07-15T10:00:00Z' }));

  const meetings = await meetingStore.findOnDate('2026-07-15');
  expect(meetings).toHaveLength(2);
});
```

---

### 3.3 Cancelled Meetings

#### TC-F6-E3.1: Cancelled meeting event removes all associations for that meeting
**Objective**: Verify that when a meeting is cancelled, all its attendee associations are soft-deleted.

**Preconditions**:
- Meeting with 3 associations exists.
- A `CANCELLED` event is received.

**Test Steps**:
1. Send cancellation webhook for the meeting.
2. Query all associations for that meeting ID.
3. Assert all associations have `status: 'cancelled'`.

**Expected Result**: All associations marked as cancelled on meeting cancellation.

**Code Sample**:
```typescript
it('should mark all associations cancelled when meeting is cancelled', async () => {
  const meeting = await setupMeetingWithThreeAssociations();
  await meetingIngestionService.processCancellation(meeting.id);

  const links = await meetingContactStore.findByMeetingId(meeting.id);
  expect(links.every((l) => l.status === 'cancelled')).toBe(true);
});
```

---

#### TC-F6-E3.2: Cancelling a meeting reverts its contribution to relationship scores
**Objective**: Confirm that when a meeting is cancelled, the relationship score between the attendees is recalculated downward to remove the meeting's contribution.

**Preconditions**:
- A↔B score before meeting: 0.50. After meeting: 0.65. Meeting is now cancelled.

**Test Steps**:
1. Record score after meeting association.
2. Cancel the meeting.
3. Trigger score recalculation.
4. Assert score drops back toward the pre-meeting level.

**Expected Result**: Score reverts toward pre-meeting value after cancellation.

**Code Sample**:
```typescript
it('should revert relationship score when meeting is cancelled', async () => {
  const preMeetingScore = 0.50;
  await scorer.setScore(contactA.id, contactB.id, 0.65); // after meeting
  await meetingIngestionService.processCancellation(meeting.id);

  const updated = await scorer.getScore(contactA.id, contactB.id);
  expect(updated).toBeLessThan(0.65);
  expect(updated).toBeCloseTo(preMeetingScore, 1);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Association Creation Throughput

#### TC-F6-P1.1: Associate 500 attendees in a single meeting within 2 seconds
**Objective**: Validate the association service can bulk-link 500 attendees to one meeting within the SLA.

**Preconditions**:
- 500 contact records exist.
- Meeting record created.

**Test Steps**:
1. Time `associationService.associateAttendees(meeting, 500 attendees)`.
2. Assert elapsed <= 2 000 ms.
3. Assert 500 association records exist.

**Expected Result**: 500 associations created in <= 2 s.

**Code Sample**:
```typescript
it('should associate 500 attendees within 2 seconds', async () => {
  const contacts = await createContacts(500);
  const meeting = await createMeeting();
  const attendees = contacts.map((c) => ({ contactId: c.id, role: 'attendee' }));

  const t0 = performance.now();
  await associationService.associateAttendees(meeting, attendees);
  expect(performance.now() - t0).toBeLessThan(2000);

  expect(await meetingContactStore.countByMeetingId(meeting.id)).toBe(500);
});
```

---

#### TC-F6-P1.2: Processing 1 000 calendar events per minute (bulk import)
**Objective**: Validate the ingestion pipeline can process 1 000 calendar events per minute including attendee resolution and association.

**Preconditions**:
- 1 000 calendar event payloads (average 5 attendees each).
- All attendee contacts exist.

**Test Steps**:
1. Time processing of 1 000 events via `meetingIngestionService.bulkProcess(events)`.
2. Assert elapsed <= 60 000 ms.

**Expected Result**: 1 000 events processed within 60 s.

**Code Sample**:
```typescript
it('should process 1000 calendar events within 60s', async () => {
  const events = buildCalendarEventBatch(1000, { attendeesPerEvent: 5 });
  const t0 = performance.now();
  await meetingIngestionService.bulkProcess(events);
  expect(performance.now() - t0).toBeLessThan(60_000);
}, 90_000);
```

---

### 4.2 Query Performance

#### TC-F6-P2.1: All meetings for a contact retrieved in under 50 ms (10 000 meetings)
**Objective**: Validate the `getMeetingsByContact` query is fast even for frequently-meeting contacts.

**Preconditions**:
- Contact A has 10 000 meeting associations.

**Test Steps**:
1. Seed 10 000 meeting associations for contact A.
2. Time `meetingContactStore.findByContactId(contactA.id)`.
3. Assert elapsed <= 50 ms.

**Expected Result**: 10 000-association contact query returns in <= 50 ms.

**Code Sample**:
```typescript
it('should retrieve 10k meetings for a contact under 50ms', async () => {
  await seedMeetingAssociations(contactA.id, 10_000);
  const t0 = performance.now();
  await meetingContactStore.findByContactId(contactA.id);
  expect(performance.now() - t0).toBeLessThan(50);
});
```

---

#### TC-F6-P2.2: Shared-meeting lookup between two contacts returns in under 30 ms
**Objective**: Validate the "find meetings shared by contacts A and B" query is fast with a large meeting store.

**Preconditions**:
- 50 000 total meetings in the store; A and B share 150 of them.

**Test Steps**:
1. Seed 50 000 meetings; 150 shared by A and B.
2. Time `meetingContactStore.findSharedMeetings(contactA.id, contactB.id)`.
3. Assert elapsed <= 30 ms.
4. Assert result length === 150.

**Expected Result**: Shared meeting query returns in <= 30 ms.

**Code Sample**:
```typescript
it('should find shared meetings between two contacts under 30ms', async () => {
  await seedSharedMeetings(contactA.id, contactB.id, 150, { totalMeetings: 50_000 });
  const t0 = performance.now();
  const shared = await meetingContactStore.findSharedMeetings(contactA.id, contactB.id);
  expect(performance.now() - t0).toBeLessThan(30);
  expect(shared).toHaveLength(150);
});
```

---

### 4.3 Webhook Processing Latency

#### TC-F6-P3.1: Single calendar webhook processed end-to-end in under 300 ms
**Objective**: Validate that a single incoming webhook is fully processed (meeting saved, associations created) within 300 ms.

**Preconditions**:
- All contacts in the event already exist.

**Test Steps**:
1. Send webhook payload.
2. Poll for association creation.
3. Assert total elapsed <= 300 ms.

**Expected Result**: End-to-end webhook processing <= 300 ms.

**Code Sample**:
```typescript
it('should process single webhook end-to-end under 300ms', async () => {
  const event = buildCalendarEvent({ attendees: ['a@x.com', 'b@x.com'] });
  const t0 = performance.now();
  await request(app).post('/webhooks/calendar').send(event).expect(202);
  await waitFor(() => meetingContactStore.countByMeetingId(event.id) === 2, 1000);
  expect(performance.now() - t0).toBeLessThan(300);
});
```

---

#### TC-F6-P3.2: System handles 100 concurrent webhook events without queue backup
**Objective**: Validate the ingestion system handles a burst of 100 concurrent webhook events without accumulating a processing backlog.

**Preconditions**:
- Webhook handler is async and connected to a worker queue.

**Test Steps**:
1. Fire 100 concurrent webhook POST requests.
2. Assert all return 202 within 5 s.
3. After 10 s, assert queue depth is 0.

**Expected Result**: All events accepted and fully processed within 10 s; no backlog.

**Code Sample**:
```typescript
it('should handle 100 concurrent webhooks without backlog', async () => {
  const events = buildCalendarEventBatch(100, { attendeesPerEvent: 3 });
  const t0 = performance.now();
  await Promise.all(events.map((e) => request(app).post('/webhooks/calendar').send(e).expect(202)));
  expect(performance.now() - t0).toBeLessThan(5000);

  await sleep(10_000);
  expect(await ingestionQueue.depth()).toBe(0);
}, 20_000);
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases
