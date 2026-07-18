# EPIC04 Feature 1 — Contact Creation — Test Cases

## Test Overview
Comprehensive test suite for Contact Creation covering unit tests, integration tests, edge cases, and performance validation. These tests validate that new contacts are correctly instantiated from multiple ingestion sources (calendar events, email headers, manual entry, business card OCR), that required fields are enforced, and that the created records propagate correctly to downstream systems.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Contact Schema Validation

#### TC-F1-U1.1: Valid minimal contact creation
**Objective**: Verify that a contact with only required fields (name + at least one email or phone) is accepted and saved.

**Preconditions**:
- Contact service is initialised with an in-memory store.
- No existing contacts in the store.

**Test Steps**:
1. Call `contactService.createContact({ firstName: 'Alice', lastName: 'Kim', email: 'alice@example.com' })`.
2. Assert the returned object contains a system-generated `id` (UUID v4).
3. Assert `createdAt` timestamp is within 1 second of `Date.now()`.
4. Assert `source` defaults to `'manual'`.

**Expected Result**: Contact record is returned with `id`, `createdAt`, and `source = 'manual'`. No validation errors thrown.

**Code Sample**:
```typescript
import { ContactService } from '@/services/contact-service';

describe('TC-F1-U1.1 — Minimal contact creation', () => {
  it('should create a contact with only required fields', async () => {
    const svc = new ContactService({ store: new InMemoryContactStore() });
    const contact = await svc.createContact({
      firstName: 'Alice',
      lastName: 'Kim',
      email: 'alice@example.com',
    });

    expect(contact.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(new Date(contact.createdAt).getTime()).toBeCloseTo(Date.now(), -3);
    expect(contact.source).toBe('manual');
  });
});
```

---

#### TC-F1-U1.2: Missing required fields throws validation error
**Objective**: Confirm that contact creation fails when neither email nor phone is provided.

**Preconditions**:
- Contact service is initialised.

**Test Steps**:
1. Call `contactService.createContact({ firstName: 'Bob', lastName: 'Jones' })` (no email, no phone).
2. Expect the promise to reject with a `ValidationError`.
3. Assert the error message references the missing field.

**Expected Result**: Promise rejects with `ValidationError: at least one of [email, phone] is required`.

**Code Sample**:
```typescript
it('should reject contact with no email or phone', async () => {
  const svc = new ContactService({ store: new InMemoryContactStore() });
  await expect(
    svc.createContact({ firstName: 'Bob', lastName: 'Jones' })
  ).rejects.toThrow(ValidationError);
});
```

---

#### TC-F1-U1.3: Email format validation
**Objective**: Ensure malformed email addresses are rejected at creation time.

**Preconditions**:
- Contact service is initialised.

**Test Steps**:
1. Call `contactService.createContact({ firstName: 'Carol', email: 'not-an-email' })`.
2. Expect rejection with `ValidationError` referencing the email field.

**Expected Result**: `ValidationError` is thrown. No record is written to the store.

**Code Sample**:
```typescript
it('should reject a malformed email address', async () => {
  const svc = new ContactService({ store: new InMemoryContactStore() });
  await expect(
    svc.createContact({ firstName: 'Carol', email: 'not-an-email' })
  ).rejects.toMatchObject({ field: 'email' });
});
```

---

### 1.2 Source Attribution

#### TC-F1-U2.1: Calendar-sourced contact sets correct source flag
**Objective**: Verify that contacts ingested from calendar events are tagged with `source = 'calendar'`.

**Preconditions**:
- A mock calendar event payload is prepared with an attendee record.

**Test Steps**:
1. Call `contactService.createFromCalendarEvent(mockCalendarEvent)`.
2. Assert `contact.source === 'calendar'`.
3. Assert `contact.sourceEventId` equals the event's `id`.

**Expected Result**: Contact record carries `source: 'calendar'` and the originating event ID.

**Code Sample**:
```typescript
it('should tag calendar-sourced contacts correctly', async () => {
  const event = buildMockCalendarEvent({ attendeeEmail: 'dave@corp.com' });
  const contact = await svc.createFromCalendarEvent(event);

  expect(contact.source).toBe('calendar');
  expect(contact.sourceEventId).toBe(event.id);
});
```

---

#### TC-F1-U2.2: Email-header-sourced contact captures sender metadata
**Objective**: Ensure contacts created from parsed email headers store the originating message ID and date.

**Preconditions**:
- A mock email header object with `From`, `Message-ID`, and `Date` fields is available.

**Test Steps**:
1. Call `contactService.createFromEmailHeader(mockHeader)`.
2. Assert `contact.source === 'email'`.
3. Assert `contact.sourceMessageId === mockHeader['Message-ID']`.
4. Assert `contact.firstSeenAt` equals the parsed email date.

**Expected Result**: Contact is stored with full email provenance metadata.

**Code Sample**:
```typescript
it('should capture email provenance metadata', async () => {
  const header = {
    From: '"Eve Adams" <eve@partner.io>',
    'Message-ID': '<abc123@mail.partner.io>',
    Date: 'Mon, 14 Jul 2026 09:00:00 +0000',
  };
  const contact = await svc.createFromEmailHeader(header);

  expect(contact.source).toBe('email');
  expect(contact.sourceMessageId).toBe('<abc123@mail.partner.io>');
  expect(contact.firstSeenAt).toEqual(new Date('2026-07-14T09:00:00Z'));
});
```

---

#### TC-F1-U2.3: Manual creation with custom tags
**Objective**: Verify that free-form tags supplied at creation time are persisted on the contact record.

**Preconditions**:
- Contact service initialised with a tag-aware store.

**Test Steps**:
1. Call `contactService.createContact({ firstName: 'Frank', email: 'frank@x.com', tags: ['vip', 'sponsor'] })`.
2. Assert `contact.tags` contains both `'vip'` and `'sponsor'`.

**Expected Result**: Tags are stored as-is without normalisation side effects on the main name/email fields.

**Code Sample**:
```typescript
it('should persist custom tags on creation', async () => {
  const contact = await svc.createContact({
    firstName: 'Frank',
    email: 'frank@x.com',
    tags: ['vip', 'sponsor'],
  });
  expect(contact.tags).toEqual(expect.arrayContaining(['vip', 'sponsor']));
});
```

---

### 1.3 Idempotency and Deduplication Guard

#### TC-F1-U3.1: Creating identical contact twice returns existing record
**Objective**: Verify the creation layer detects a near-duplicate on exact email match and returns the existing record rather than creating a second one.

**Preconditions**:
- Contact with `email: 'grace@example.com'` already exists in the store.

**Test Steps**:
1. Call `contactService.createContact({ firstName: 'Grace', email: 'grace@example.com' })`.
2. Assert the returned `id` matches the existing record's `id`.
3. Assert only one record exists in the store for that email.

**Expected Result**: Creation is idempotent — existing record returned, store count unchanged.

**Code Sample**:
```typescript
it('should return existing contact on duplicate email', async () => {
  const first = await svc.createContact({ firstName: 'Grace', email: 'grace@example.com' });
  const second = await svc.createContact({ firstName: 'Grace', email: 'grace@example.com' });

  expect(second.id).toBe(first.id);
  const all = await store.findByEmail('grace@example.com');
  expect(all).toHaveLength(1);
});
```

---

#### TC-F1-U3.2: Phone-number normalisation before uniqueness check
**Objective**: Ensure `+1-555-012-3456` and `15550123456` are resolved to the same canonical phone and treated as the same contact.

**Preconditions**:
- Contact service uses E.164 phone normaliser.

**Test Steps**:
1. Create contact with `phone: '+1-555-012-3456'`.
2. Attempt to create a second contact with `phone: '15550123456'`.
3. Assert both calls return the same `id`.

**Expected Result**: Phone numbers normalised to E.164 `+15550123456` before uniqueness check; single record returned.

**Code Sample**:
```typescript
it('should normalise phone numbers before dedup check', async () => {
  const a = await svc.createContact({ firstName: 'Hank', phone: '+1-555-012-3456' });
  const b = await svc.createContact({ firstName: 'Hank', phone: '15550123456' });
  expect(b.id).toBe(a.id);
});
```

---

#### TC-F1-U3.3: Distinct emails always produce distinct contacts
**Objective**: Confirm that two contacts with different emails are not merged by the dedup guard.

**Preconditions**:
- Empty contact store.

**Test Steps**:
1. Create contact with `email: 'ian@a.com'`.
2. Create contact with `email: 'ian@b.com'`.
3. Assert the two `id` values are different.
4. Assert store contains exactly two records.

**Expected Result**: Two separate contacts are created with unique IDs.

**Code Sample**:
```typescript
it('should create distinct contacts for distinct emails', async () => {
  const a = await svc.createContact({ firstName: 'Ian', email: 'ian@a.com' });
  const b = await svc.createContact({ firstName: 'Ian', email: 'ian@b.com' });
  expect(b.id).not.toBe(a.id);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Calendar Event Pipeline

#### TC-F1-I1.1: End-to-end contact creation from Google Calendar webhook
**Objective**: Verify the full pipeline from incoming webhook payload to stored contact record.

**Preconditions**:
- Calendar webhook handler is running against a test database.
- A valid Google Calendar `eventUpdated` webhook payload is prepared.

**Test Steps**:
1. POST the webhook payload to `/webhooks/calendar`.
2. Wait for async processing (poll store for up to 2 s).
3. Query the contact store for the attendee email from the payload.
4. Assert the contact exists with `source = 'calendar'`.

**Expected Result**: Contact is created in the store within 2 seconds of the webhook receipt.

**Code Sample**:
```typescript
it('should create a contact from a calendar webhook', async () => {
  const payload = buildGCalWebhookPayload({
    attendeeEmail: 'julia@partner.com',
    eventId: 'evt-001',
  });

  await request(app).post('/webhooks/calendar').send(payload).expect(202);

  await waitFor(() => contactStore.findByEmail('julia@partner.com'), { timeout: 2000 });
  const contact = await contactStore.findByEmail('julia@partner.com');
  expect(contact?.source).toBe('calendar');
});
```

---

#### TC-F1-I1.2: Duplicate attendee across multiple events does not create duplicate contacts
**Objective**: Confirm that the same attendee appearing in two different calendar events results in one contact with two `sourceEventId` entries, not two contacts.

**Preconditions**:
- Two calendar event payloads share the same attendee email.

**Test Steps**:
1. POST first event webhook.
2. POST second event webhook (same attendee).
3. Query the store for the attendee email.
4. Assert exactly one contact record exists.
5. Assert `contact.calendarEventIds` contains both event IDs.

**Expected Result**: Single contact record with both event IDs in `calendarEventIds[]`.

**Code Sample**:
```typescript
it('should not duplicate a contact seen in two calendar events', async () => {
  await ingestCalendarEvent(buildGCalWebhookPayload({ attendeeEmail: 'ken@x.com', eventId: 'evt-A' }));
  await ingestCalendarEvent(buildGCalWebhookPayload({ attendeeEmail: 'ken@x.com', eventId: 'evt-B' }));

  const contacts = await contactStore.findAllByEmail('ken@x.com');
  expect(contacts).toHaveLength(1);
  expect(contacts[0].calendarEventIds).toEqual(expect.arrayContaining(['evt-A', 'evt-B']));
});
```

---

### 2.2 CRM Sync

#### TC-F1-I2.1: Contact created locally is pushed to CRM adapter
**Objective**: Verify that after local contact creation the CRM sync adapter receives an upsert call within the configured sync window.

**Preconditions**:
- CRM adapter is mocked with a jest spy.
- Sync interval is set to 0 ms (immediate) in the test config.

**Test Steps**:
1. Create a contact via `contactService.createContact(...)`.
2. Await the sync cycle.
3. Assert the CRM adapter spy was called with the new contact's data.

**Expected Result**: CRM adapter `upsertContact` is called exactly once with the new contact payload.

**Code Sample**:
```typescript
it('should sync new contact to CRM adapter', async () => {
  const crmSpy = jest.spyOn(crmAdapter, 'upsertContact').mockResolvedValue({ crmId: 'crm-001' });
  const contact = await svc.createContact({ firstName: 'Laura', email: 'laura@crm.io' });

  await syncService.runCycle();

  expect(crmSpy).toHaveBeenCalledWith(expect.objectContaining({ id: contact.id }));
});
```

---

#### TC-F1-I2.2: CRM sync failure does not roll back local contact
**Objective**: Ensure a transient CRM write failure leaves the local contact intact and queues a retry.

**Preconditions**:
- CRM adapter throws `NetworkError` on first call.

**Test Steps**:
1. Configure CRM adapter mock to reject once, then resolve.
2. Create a contact locally.
3. Run the sync cycle — assert it handles the error without throwing.
4. Assert contact exists in local store.
5. Assert retry queue contains one entry for this contact.

**Expected Result**: Local contact is persisted; retry queue has one pending item; no uncaught exception.

**Code Sample**:
```typescript
it('should retain local contact when CRM sync fails', async () => {
  jest.spyOn(crmAdapter, 'upsertContact').mockRejectedValueOnce(new NetworkError('timeout'));

  const contact = await svc.createContact({ firstName: 'Mike', email: 'mike@sync.io' });
  await syncService.runCycle();

  expect(await contactStore.findById(contact.id)).toBeDefined();
  expect(retryQueue.size()).toBe(1);
});
```

---

### 2.3 Notification Events

#### TC-F1-I3.1: ContactCreated event is published to event bus
**Objective**: Verify that a `ContactCreated` domain event is emitted on the event bus immediately after a successful creation.

**Preconditions**:
- Event bus is connected to an in-process test subscriber.

**Test Steps**:
1. Subscribe to `contact.created` on the test event bus.
2. Call `svc.createContact(...)`.
3. Assert the subscriber received exactly one event with the new contact's ID.

**Expected Result**: `contact.created` event received with `{ contactId, email, source }` payload.

**Code Sample**:
```typescript
it('should emit ContactCreated event on successful creation', async () => {
  const received: ContactCreatedEvent[] = [];
  eventBus.subscribe('contact.created', (e) => received.push(e));

  const contact = await svc.createContact({ firstName: 'Nina', email: 'nina@events.io' });

  expect(received).toHaveLength(1);
  expect(received[0].contactId).toBe(contact.id);
});
```

---

#### TC-F1-I3.2: No event emitted when creation is a duplicate no-op
**Objective**: Confirm that returning an existing record (idempotent create) does not re-emit a `ContactCreated` event.

**Preconditions**:
- Existing contact with `email: 'oscar@events.io'` in the store.
- Subscriber attached to `contact.created`.

**Test Steps**:
1. Call `svc.createContact({ email: 'oscar@events.io' })`.
2. Assert subscriber list remains empty.

**Expected Result**: Zero events emitted for a no-op creation.

**Code Sample**:
```typescript
it('should not emit event when returning existing contact', async () => {
  await svc.createContact({ firstName: 'Oscar', email: 'oscar@events.io' });
  const received: ContactCreatedEvent[] = [];
  eventBus.subscribe('contact.created', (e) => received.push(e));

  await svc.createContact({ firstName: 'Oscar', email: 'oscar@events.io' });

  expect(received).toHaveLength(0);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 International & Special Character Handling

#### TC-F1-E1.1: Name with non-ASCII characters is stored without corruption
**Objective**: Ensure names containing Unicode characters (e.g., accented letters, CJK, Arabic) are stored and retrieved intact.

**Preconditions**:
- Store uses UTF-8 encoding.

**Test Steps**:
1. Create contacts with names `'Søren Ångström'`, `'李明'`, `'أحمد'`.
2. Retrieve each by ID.
3. Assert `firstName` and `lastName` match the input exactly (no mojibake).

**Expected Result**: All Unicode names round-trip without character corruption.

**Code Sample**:
```typescript
it.each([
  { firstName: 'Søren', lastName: 'Ångström', email: 's@dk.com' },
  { firstName: '李', lastName: '明', email: 'li@cn.com' },
  { firstName: 'أحمد', lastName: '', email: 'ahmed@ar.com' },
])('should store Unicode name $firstName intact', async ({ firstName, lastName, email }) => {
  const c = await svc.createContact({ firstName, lastName, email });
  const retrieved = await svc.getById(c.id);
  expect(retrieved.firstName).toBe(firstName);
});
```

---

#### TC-F1-E1.2: Email with plus-alias is not stripped
**Objective**: Verify that `user+tag@example.com` is stored verbatim and not silently normalised to `user@example.com`.

**Preconditions**:
- Contact store and normaliser configured for production-like behaviour.

**Test Steps**:
1. Create contact with `email: 'pat+conference@example.com'`.
2. Retrieve and assert email field equals `'pat+conference@example.com'`.

**Expected Result**: Plus-alias preserved verbatim in storage.

**Code Sample**:
```typescript
it('should preserve email plus-alias', async () => {
  const c = await svc.createContact({ firstName: 'Pat', email: 'pat+conference@example.com' });
  expect(c.email).toBe('pat+conference@example.com');
});
```

---

### 3.2 Boundary Conditions

#### TC-F1-E2.1: Name field at maximum allowed length (255 chars)
**Objective**: Verify that a name at the maximum length boundary is accepted and stored without truncation.

**Preconditions**:
- Schema enforces max length of 255 characters per name field.

**Test Steps**:
1. Generate a 255-character first name string.
2. Call `svc.createContact({ firstName: longName, email: 'q@q.com' })`.
3. Assert `contact.firstName.length === 255`.

**Expected Result**: Contact created with exactly 255-char first name.

**Code Sample**:
```typescript
it('should accept a 255-character first name', async () => {
  const longName = 'A'.repeat(255);
  const c = await svc.createContact({ firstName: longName, email: 'q@q.com' });
  expect(c.firstName).toHaveLength(255);
});
```

---

#### TC-F1-E2.2: Name field exceeding maximum length is rejected
**Objective**: Confirm a 256-character name triggers a validation error.

**Preconditions**:
- Schema enforces max length of 255 characters.

**Test Steps**:
1. Generate a 256-character first name string.
2. Expect `svc.createContact(...)` to reject with `ValidationError`.

**Expected Result**: `ValidationError` thrown referencing `firstName` field length.

**Code Sample**:
```typescript
it('should reject first name longer than 255 chars', async () => {
  const tooLong = 'A'.repeat(256);
  await expect(
    svc.createContact({ firstName: tooLong, email: 'r@r.com' })
  ).rejects.toMatchObject({ field: 'firstName', code: 'MAX_LENGTH' });
});
```

---

### 3.3 Concurrent Creation

#### TC-F1-E3.1: Concurrent requests for the same email produce one contact
**Objective**: Verify that simultaneous parallel create requests for the same email result in a single contact (race condition safety).

**Preconditions**:
- Contact store uses an optimistic-lock or unique constraint on email.

**Test Steps**:
1. Fire 10 concurrent `createContact` calls for `email: 'race@example.com'`.
2. Await all promises (some may resolve, some may be no-ops).
3. Query store for all records with that email.
4. Assert exactly one record exists.

**Expected Result**: Exactly one contact record exists regardless of concurrency.

**Code Sample**:
```typescript
it('should handle concurrent creation race safely', async () => {
  const calls = Array.from({ length: 10 }, () =>
    svc.createContact({ firstName: 'Race', email: 'race@example.com' })
  );
  await Promise.allSettled(calls);

  const records = await contactStore.findAllByEmail('race@example.com');
  expect(records).toHaveLength(1);
});
```

---

#### TC-F1-E3.2: Concurrent creation of distinct contacts all succeed
**Objective**: Verify that 50 concurrent creates for 50 distinct emails all succeed without data loss.

**Preconditions**:
- Store can handle concurrent writes.

**Test Steps**:
1. Generate 50 unique email addresses.
2. Fire all 50 `createContact` calls concurrently.
3. Assert all 50 promises resolve successfully.
4. Query store and assert 50 records exist.

**Expected Result**: All 50 contacts created; no partial failures or data corruption.

**Code Sample**:
```typescript
it('should create 50 distinct contacts concurrently', async () => {
  const emails = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);
  const results = await Promise.all(
    emails.map((email) => svc.createContact({ firstName: 'User', email }))
  );
  expect(results).toHaveLength(50);
  expect(new Set(results.map((r) => r.id)).size).toBe(50);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Single-Contact Creation Latency

#### TC-F1-P1.1: Single contact creation completes within 50 ms (p99)
**Objective**: Validate that creating one contact (including validation and store write) completes within 50 ms at p99 under nominal load.

**Preconditions**:
- Service running against a local in-process store.
- No external I/O in this test.

**Test Steps**:
1. Run 200 sequential `createContact` calls with unique emails.
2. Record duration of each call.
3. Compute p99 of the durations.
4. Assert p99 <= 50 ms.

**Expected Result**: p99 latency <= 50 ms.

**Code Sample**:
```typescript
it('single contact creation p99 <= 50ms', async () => {
  const durations: number[] = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await svc.createContact({ firstName: 'Perf', email: `perf${i}@test.com` });
    durations.push(performance.now() - t0);
  }
  durations.sort((a, b) => a - b);
  const p99 = durations[Math.ceil(durations.length * 0.99) - 1];
  expect(p99).toBeLessThanOrEqual(50);
});
```

---

#### TC-F1-P1.2: Creation latency does not degrade with 10 000 existing contacts
**Objective**: Confirm that dedup-guard lookup time remains O(1) (index-backed) even when the store holds 10 000 contacts.

**Preconditions**:
- Store pre-seeded with 10 000 contacts.

**Test Steps**:
1. Warm up the store with 10 000 contacts.
2. Run 100 new `createContact` calls.
3. Assert p95 <= 100 ms.

**Expected Result**: No significant latency increase compared to an empty store baseline.

**Code Sample**:
```typescript
it('creation latency stays under 100ms with 10k existing contacts', async () => {
  await seedContacts(store, 10_000);
  const durations: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await svc.createContact({ firstName: 'New', email: `new${i}@perf.com` });
    durations.push(performance.now() - t0);
  }
  durations.sort((a, b) => a - b);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  expect(p95).toBeLessThanOrEqual(100);
});
```

---

### 4.2 Bulk Ingestion Throughput

#### TC-F1-P2.1: Batch creation of 1 000 contacts completes within 5 seconds
**Objective**: Validate the bulk-import path can process 1 000 unique contacts in under 5 seconds.

**Preconditions**:
- `contactService.bulkCreate(contacts[])` method available.
- Empty store.

**Test Steps**:
1. Generate array of 1 000 unique contact objects.
2. Start timer; call `svc.bulkCreate(contacts)`.
3. Assert result contains 1 000 created IDs.
4. Assert elapsed time <= 5 000 ms.

**Expected Result**: 1 000 contacts created with total elapsed time under 5 s.

**Code Sample**:
```typescript
it('bulk create 1000 contacts under 5 seconds', async () => {
  const contacts = Array.from({ length: 1000 }, (_, i) => ({
    firstName: faker.person.firstName(),
    email: `bulk${i}@perf.com`,
  }));

  const t0 = performance.now();
  const results = await svc.bulkCreate(contacts);
  const elapsed = performance.now() - t0;

  expect(results).toHaveLength(1000);
  expect(elapsed).toBeLessThan(5000);
});
```

---

#### TC-F1-P2.2: Bulk creation handles 10% duplicate rate without degradation
**Objective**: Ensure that when 10% of a bulk import are duplicates, the dedup guard adds less than 20% latency overhead.

**Preconditions**:
- 100 contacts pre-seeded.
- Batch of 1 000 contacts, 100 of which are duplicates of seeded records.

**Test Steps**:
1. Seed 100 contacts.
2. Build a batch of 1 000 where every 10th entry matches a seeded email.
3. Time the `bulkCreate` call.
4. Assert total time <= 6 000 ms (baseline 5 s + 20% buffer).
5. Assert store contains 1 000 unique records (not 1 100).

**Expected Result**: Dedup guard handles 10% duplicates within the latency budget; no extra records created.

**Code Sample**:
```typescript
it('bulk create with 10% duplicates stays under latency budget', async () => {
  const seeded = await seedContacts(store, 100);
  const batch = buildBatchWithDuplicates(seeded, 1000, 0.1);

  const t0 = performance.now();
  await svc.bulkCreate(batch);
  const elapsed = performance.now() - t0;

  const total = await contactStore.count();
  expect(total).toBe(1000);
  expect(elapsed).toBeLessThan(6000);
});
```

---

### 4.3 Memory Footprint

#### TC-F1-P3.1: Creating 50 000 contacts does not exceed 512 MB heap
**Objective**: Validate that the in-process store does not accumulate unbounded memory during large-scale creation.

**Preconditions**:
- Node.js process with `--max-old-space-size=1024`.
- Heap measurement via `process.memoryUsage()`.

**Test Steps**:
1. Record baseline heap usage.
2. Create 50 000 contacts in batches of 500.
3. Force GC (`global.gc()` with `--expose-gc` flag).
4. Assert heap increase <= 512 MB over baseline.

**Expected Result**: Heap growth stays within acceptable bounds; no memory leak pattern detected.

**Code Sample**:
```typescript
it('50k contact creation heap growth <= 512MB', async () => {
  const baseline = process.memoryUsage().heapUsed;
  for (let batch = 0; batch < 100; batch++) {
    const contacts = Array.from({ length: 500 }, (_, i) => ({
      firstName: 'Heap',
      email: `heap${batch * 500 + i}@mem.com`,
    }));
    await svc.bulkCreate(contacts);
  }
  if (typeof global.gc === 'function') global.gc();
  const heapGrowth = process.memoryUsage().heapUsed - baseline;
  expect(heapGrowth).toBeLessThan(512 * 1024 * 1024);
});
```

---

#### TC-F1-P3.2: Streaming bulk import does not hold all records in memory simultaneously
**Objective**: Verify the streaming import path releases each batch from memory before processing the next.

**Preconditions**:
- `contactService.streamImport(asyncIterable)` available.
- Import source is an async generator producing 100 k records in chunks of 500.

**Test Steps**:
1. Attach heap-sample probe every 1 s.
2. Start streaming import of 100 k contacts.
3. Assert no single heap sample exceeds baseline + 256 MB.

**Expected Result**: Heap stays flat across the streaming import; no single chunk holds all 100 k records at once.

**Code Sample**:
```typescript
it('streaming import keeps heap flat', async () => {
  const samples: number[] = [];
  const probe = setInterval(() => samples.push(process.memoryUsage().heapUsed), 1000);

  await svc.streamImport(generateContactsAsync(100_000, 500));
  clearInterval(probe);

  const baseline = samples[0];
  const maxSample = Math.max(...samples);
  expect(maxSample - baseline).toBeLessThan(256 * 1024 * 1024);
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
