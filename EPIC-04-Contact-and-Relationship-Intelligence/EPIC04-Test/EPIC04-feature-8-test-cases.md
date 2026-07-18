# EPIC04 Feature 8 — Contact Enrichment — Test Cases

## Test Overview
Comprehensive test suite for Contact Enrichment covering unit tests, integration tests, edge cases, and performance validation. Contact enrichment augments contact records with data from third-party providers (LinkedIn, Clearbit, Hunter.io) and public signals to fill missing fields, verify existing data, and keep records current. Tests cover field mapping, provider fallback, conflict resolution, enrichment scheduling, consent compliance, and data freshness.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Field Mapping and Transformation

#### TC-F8-U1.1: Clearbit response is correctly mapped to internal contact schema
**Objective**: Verify that a raw Clearbit API response is transformed into the canonical internal contact fields.

**Preconditions**:
- A mock Clearbit `person` response is prepared with known field values.

**Test Steps**:
1. Call `clearbitMapper.map(mockClearbitResponse)`.
2. Assert mapped object has `firstName`, `lastName`, `title`, `company`, `linkedInUrl`, `twitterHandle` set from the Clearbit fields.

**Expected Result**: All relevant Clearbit fields are correctly mapped to internal schema fields.

**Code Sample**:
```typescript
import { ClearbitMapper } from '@/services/enrichment/clearbit-mapper';

it('should map Clearbit response to internal contact fields', () => {
  const mapper = new ClearbitMapper();
  const raw = buildMockClearbitResponse({
    name: { givenName: 'Alice', familyName: 'Chen' },
    title: 'VP Engineering',
    company: { name: 'Acme Corp' },
    linkedin: { handle: 'in/alicechen' },
    twitter: { handle: 'alicechen' },
  });

  const mapped = mapper.map(raw);

  expect(mapped.firstName).toBe('Alice');
  expect(mapped.lastName).toBe('Chen');
  expect(mapped.title).toBe('VP Engineering');
  expect(mapped.company).toBe('Acme Corp');
  expect(mapped.linkedInUrl).toContain('alicechen');
});
```

---

#### TC-F8-U1.2: LinkedIn enrichment response normalises URL to canonical form
**Objective**: Confirm that LinkedIn URLs in various formats are normalised to `https://www.linkedin.com/in/{handle}`.

**Preconditions**:
- Enrichment mapper includes URL normalisation.

**Test Steps**:
1. Map a raw response with `linkedIn: 'linkedin.com/in/johndoe'` (no scheme).
2. Assert mapped `linkedInUrl === 'https://www.linkedin.com/in/johndoe'`.

**Expected Result**: LinkedIn URL normalised to canonical HTTPS form.

**Code Sample**:
```typescript
it('should normalise LinkedIn URL to canonical form', () => {
  const mapper = new LinkedInMapper();
  const result = mapper.map({ linkedIn: 'linkedin.com/in/johndoe' });
  expect(result.linkedInUrl).toBe('https://www.linkedin.com/in/johndoe');
});
```

---

#### TC-F8-U1.3: Enrichment does not overwrite existing verified fields
**Objective**: Verify that when an enrichment result provides a value for a field that is already verified (`emailVerified: true`), the verified field is not overwritten.

**Preconditions**:
- Contact has `email: 'alice@acme.com'` with `emailVerified: true`.
- Enrichment response suggests `email: 'a.chen@acme.com'`.

**Test Steps**:
1. Apply enrichment to the contact.
2. Assert `contact.email` remains `'alice@acme.com'`.

**Expected Result**: Verified fields are protected from enrichment overwrites.

**Code Sample**:
```typescript
it('should not overwrite verified email with enrichment data', () => {
  const enricher = new EnrichmentApplicator({ protectVerifiedFields: true });
  const contact = { email: 'alice@acme.com', emailVerified: true };
  const enrichmentData = { email: 'a.chen@acme.com' };

  const result = enricher.apply(contact, enrichmentData);
  expect(result.email).toBe('alice@acme.com');
});
```

---

### 1.2 Provider Fallback Chain

#### TC-F8-U2.1: Primary provider failure causes fallback to secondary provider
**Objective**: Verify that when the primary enrichment provider (Clearbit) fails, the system falls back to the secondary provider (Hunter.io).

**Preconditions**:
- `EnrichmentChain` configured with `[ClearbitProvider, HunterProvider]`.
- ClearbitProvider mock throws `EnrichmentNotFoundError`.

**Test Steps**:
1. Call `enrichmentChain.enrich(contact)`.
2. Assert `ClearbitProvider.enrich` was called and threw.
3. Assert `HunterProvider.enrich` was called.
4. Assert result comes from Hunter.

**Expected Result**: Fallback triggered; secondary provider result returned.

**Code Sample**:
```typescript
import { EnrichmentChain } from '@/services/enrichment/enrichment-chain';

it('should fall back to secondary provider on primary failure', async () => {
  const clearbitMock = jest.fn().mockRejectedValue(new EnrichmentNotFoundError());
  const hunterMock = jest.fn().mockResolvedValue(buildHunterResult());

  const chain = new EnrichmentChain([
    { enrich: clearbitMock },
    { enrich: hunterMock },
  ]);
  const result = await chain.enrich(buildContact({ email: 'test@co.com' }));

  expect(clearbitMock).toHaveBeenCalled();
  expect(hunterMock).toHaveBeenCalled();
  expect(result.source).toBe('hunter');
});
```

---

#### TC-F8-U2.2: All providers fail — enrichment result returns a structured failure object
**Objective**: Confirm that when all providers fail, the enrichment chain returns a structured failure (not throws) with a reason per provider.

**Preconditions**:
- Both providers throw `EnrichmentNotFoundError`.

**Test Steps**:
1. Call `enrichmentChain.enrich(contact)`.
2. Assert result has `success: false`.
3. Assert `result.failures` contains an entry per provider.

**Expected Result**: Structured failure returned; no unhandled exception thrown.

**Code Sample**:
```typescript
it('should return structured failure when all providers fail', async () => {
  const chain = new EnrichmentChain([
    { enrich: jest.fn().mockRejectedValue(new EnrichmentNotFoundError('clearbit')) },
    { enrich: jest.fn().mockRejectedValue(new EnrichmentNotFoundError('hunter')) },
  ]);

  const result = await chain.enrich(buildContact({ email: 'ghost@404.com' }));
  expect(result.success).toBe(false);
  expect(result.failures).toHaveLength(2);
});
```

---

#### TC-F8-U2.3: Provider rate limit error triggers exponential backoff and retry
**Objective**: Verify that a `RateLimitError` from the provider causes the enrichment chain to wait and retry, not fail immediately.

**Preconditions**:
- Provider mock throws `RateLimitError` twice, then succeeds.
- Backoff configured: `baseDelay = 100ms`, max retries = 3.

**Test Steps**:
1. Call `enrichmentChain.enrich(contact)`.
2. Assert provider was called 3 times.
3. Assert final result is a success.

**Expected Result**: Retry with backoff; success on third attempt.

**Code Sample**:
```typescript
it('should retry on rate limit with backoff', async () => {
  const providerMock = jest.fn()
    .mockRejectedValueOnce(new RateLimitError())
    .mockRejectedValueOnce(new RateLimitError())
    .mockResolvedValue(buildClearbitResult());

  const chain = new EnrichmentChain([{ enrich: providerMock }], { retries: 3, baseDelayMs: 10 });
  const result = await chain.enrich(buildContact({ email: 'rate@test.com' }));

  expect(providerMock).toHaveBeenCalledTimes(3);
  expect(result.success).toBe(true);
});
```

---

### 1.3 Conflict Resolution for Enrichment Data

#### TC-F8-U3.1: Enrichment data for a field with no current value is applied unconditionally
**Objective**: Verify that enrichment fills in a field that is currently `null` without any conflict resolution needed.

**Preconditions**:
- Contact has `title: null`.
- Enrichment result has `title: 'CTO'`.

**Test Steps**:
1. Apply enrichment to contact.
2. Assert `contact.title === 'CTO'`.

**Expected Result**: Null field is filled without conflict.

**Code Sample**:
```typescript
it('should fill a null field from enrichment without conflict', () => {
  const applicator = new EnrichmentApplicator();
  const contact = { title: null };
  const enrichment = { title: 'CTO' };
  const result = applicator.apply(contact, enrichment);
  expect(result.title).toBe('CTO');
});
```

---

#### TC-F8-U3.2: Conflict between existing and enrichment value is resolved by configured strategy
**Objective**: Confirm that when both the existing contact and the enrichment result have a value for `title`, the conflict strategy (`prefer_enrichment`) is applied.

**Preconditions**:
- Conflict strategy: `prefer_enrichment`.
- Contact `title: 'Engineer'`; enrichment `title: 'Senior Engineer'`.

**Test Steps**:
1. Apply enrichment with `prefer_enrichment` strategy.
2. Assert `contact.title === 'Senior Engineer'`.

**Expected Result**: Enrichment value wins per the configured strategy.

**Code Sample**:
```typescript
it('should prefer enrichment value on conflict per strategy', () => {
  const applicator = new EnrichmentApplicator({ conflictStrategy: 'prefer_enrichment' });
  const contact = { title: 'Engineer' };
  const enrichment = { title: 'Senior Engineer' };
  const result = applicator.apply(contact, enrichment);
  expect(result.title).toBe('Senior Engineer');
});
```

---

#### TC-F8-U3.3: Conflict history is stored for audit purposes
**Objective**: Verify that when an enrichment overwrites an existing field value, the old value is recorded in the enrichment audit log.

**Preconditions**:
- Enrichment audit store connected.

**Test Steps**:
1. Apply enrichment that changes `title` from `'Engineer'` to `'Senior Engineer'`.
2. Query enrichment audit for the contact.
3. Assert audit contains a `FIELD_OVERWRITTEN` entry for `title` with both old and new values.

**Expected Result**: Overwrite event recorded in the enrichment audit log.

**Code Sample**:
```typescript
it('should log field overwrite events in enrichment audit', async () => {
  const contact = await createContactWithTitle('Engineer');
  await enrichmentService.enrich(contact.id, { title: 'Senior Engineer' });

  const audit = await enrichmentAuditStore.findByContactId(contact.id);
  const overwrite = audit.find((e) => e.event === 'FIELD_OVERWRITTEN' && e.field === 'title');

  expect(overwrite).toBeDefined();
  expect(overwrite.oldValue).toBe('Engineer');
  expect(overwrite.newValue).toBe('Senior Engineer');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Enrichment Queue Lifecycle

#### TC-F8-I1.1: Low-confidence contact is automatically queued and enriched
**Objective**: Verify the end-to-end flow: low-confidence contact → enrichment queue → enrichment execution → confidence score update.

**Preconditions**:
- Enrichment provider mock returns valid data for the test email.
- `enrichmentThreshold = 0.4`.

**Test Steps**:
1. Create a sparse contact (confidence < 0.4).
2. Run the confidence pipeline (which enqueues the contact).
3. Run the enrichment queue processor.
4. Assert the contact's `title`, `company`, and `phone` are now populated.
5. Assert `confidenceScore` > 0.4.

**Expected Result**: Contact enriched end-to-end; confidence improved.

**Code Sample**:
```typescript
it('should enrich low-confidence contact end-to-end', async () => {
  const contact = await svc.createContact({ firstName: 'Low', email: 'low@enrich.io' });
  await confidencePipeline.run(contact.id);
  await enrichmentQueueProcessor.run();

  const updated = await svc.getById(contact.id);
  expect(updated.title).toBeDefined();
  expect(updated.confidenceScore).toBeGreaterThan(0.4);
});
```

---

#### TC-F8-I1.2: Enrichment job respects provider API rate limits
**Objective**: Verify that the enrichment processor does not exceed the configured rate limit for the Clearbit API.

**Preconditions**:
- `clearbitRateLimit = 600 requests/minute`.
- 1 000 contacts queued for enrichment.

**Test Steps**:
1. Enqueue 1 000 contacts.
2. Start the enrichment processor.
3. After 1 minute, assert the provider mock received <= 600 calls.

**Expected Result**: Rate limit respected; no more than 600 calls per minute.

**Code Sample**:
```typescript
it('should not exceed provider rate limit', async () => {
  const callCount = { value: 0 };
  jest.spyOn(clearbitProvider, 'enrich').mockImplementation(async () => {
    callCount.value++;
    return buildClearbitResult();
  });

  await seedEnrichmentQueue(1000);
  const startTime = Date.now();
  await enrichmentProcessor.startWithTimeout(60_000); // run for 60s

  expect(callCount.value).toBeLessThanOrEqual(600);
}, 90_000);
```

---

### 2.2 Scheduled Re-enrichment

#### TC-F8-I2.1: Contacts not enriched in 90 days are automatically re-queued
**Objective**: Verify that the re-enrichment scheduler identifies and re-queues contacts whose enrichment is older than 90 days.

**Preconditions**:
- 50 contacts enriched > 90 days ago; 50 enriched recently.

**Test Steps**:
1. Run `reEnrichmentScheduler.run()`.
2. Assert enrichment queue has exactly 50 entries (the stale ones).

**Expected Result**: Only stale contacts are re-queued; recently enriched are skipped.

**Code Sample**:
```typescript
it('should re-queue contacts with enrichment older than 90 days', async () => {
  await seedEnrichedContacts({ count: 50, enrichedDaysAgo: 95 });
  await seedEnrichedContacts({ count: 50, enrichedDaysAgo: 30 });

  await reEnrichmentScheduler.run();

  expect(await enrichmentQueue.size()).toBe(50);
});
```

---

#### TC-F8-I2.2: Re-enrichment skips contacts with a do-not-enrich flag
**Objective**: Confirm that contacts marked `doNotEnrich: true` are never re-queued by the scheduler.

**Preconditions**:
- 10 contacts have `doNotEnrich: true`; all are > 90 days stale.

**Test Steps**:
1. Seed 10 stale contacts with `doNotEnrich: true`.
2. Run `reEnrichmentScheduler.run()`.
3. Assert none of the 10 are in the enrichment queue.

**Expected Result**: Do-not-enrich contacts are always excluded from re-enrichment.

**Code Sample**:
```typescript
it('should skip do-not-enrich contacts in re-enrichment scheduler', async () => {
  await seedEnrichedContacts({ count: 10, enrichedDaysAgo: 100, doNotEnrich: true });
  await reEnrichmentScheduler.run();

  const queued = await enrichmentQueue.getAll();
  const doNotEnrichIds = await contactStore.findIdsByFlag('doNotEnrich');
  const illegitimate = queued.filter((q) => doNotEnrichIds.includes(q.contactId));
  expect(illegitimate).toHaveLength(0);
});
```

---

### 2.3 Consent and Compliance

#### TC-F8-I3.1: Enrichment is blocked for contacts in GDPR-regulated regions without explicit consent
**Objective**: Verify that the enrichment service refuses to enrich contacts identified as EU residents unless `gdprConsent: true` is set.

**Preconditions**:
- `GdprEnrichmentGuard` is active.
- Contact has `region: 'EU'` and `gdprConsent: false`.

**Test Steps**:
1. Attempt to enrich the EU contact.
2. Assert enrichment is rejected with `GdprConsentRequiredError`.
3. Assert no external API call was made.

**Expected Result**: EU contact without consent is blocked from enrichment.

**Code Sample**:
```typescript
it('should block enrichment for EU contact without GDPR consent', async () => {
  const contact = await createContact({ email: 'eu@example.de', region: 'EU', gdprConsent: false });
  const providerSpy = jest.spyOn(clearbitProvider, 'enrich');

  await expect(enrichmentService.enrich(contact.id)).rejects.toThrow(GdprConsentRequiredError);
  expect(providerSpy).not.toHaveBeenCalled();
});
```

---

#### TC-F8-I3.2: Enrichment is permitted for EU contacts with explicit consent recorded
**Objective**: Verify that an EU contact with `gdprConsent: true` and a consent timestamp is enriched normally.

**Preconditions**:
- Contact has `region: 'EU'`, `gdprConsent: true`, `consentTimestamp` set.

**Test Steps**:
1. Attempt to enrich the consented EU contact.
2. Assert enrichment proceeds and returns a result.

**Expected Result**: Consented EU contact is enriched without error.

**Code Sample**:
```typescript
it('should allow enrichment for EU contact with GDPR consent', async () => {
  const contact = await createContact({
    email: 'eu@example.de',
    region: 'EU',
    gdprConsent: true,
    consentTimestamp: new Date(),
  });
  jest.spyOn(clearbitProvider, 'enrich').mockResolvedValue(buildClearbitResult());

  await expect(enrichmentService.enrich(contact.id)).resolves.toBeDefined();
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Partial Enrichment Results

#### TC-F8-E1.1: Partial enrichment result fills only the available fields
**Objective**: Verify that if the provider returns data for only 3 of 8 requested fields, only those 3 fields are updated.

**Preconditions**:
- Provider returns `{ title: 'CTO', company: 'ACME' }` but no phone, no LinkedIn.

**Test Steps**:
1. Apply partial enrichment.
2. Assert `title` and `company` are updated.
3. Assert `phone` and `linkedInUrl` remain `null`.

**Expected Result**: Only available fields are applied; unresolved fields left unchanged.

**Code Sample**:
```typescript
it('should apply only available fields from partial enrichment', () => {
  const applicator = new EnrichmentApplicator();
  const contact = { title: null, company: null, phone: null, linkedInUrl: null };
  const partial = { title: 'CTO', company: 'ACME' };

  const result = applicator.apply(contact, partial);
  expect(result.title).toBe('CTO');
  expect(result.company).toBe('ACME');
  expect(result.phone).toBeNull();
  expect(result.linkedInUrl).toBeNull();
});
```

---

#### TC-F8-E1.2: Empty enrichment result leaves contact unchanged
**Objective**: Confirm that an empty enrichment response (no fields returned) leaves the contact record in its original state.

**Preconditions**:
- Provider returns `{}` (empty object).

**Test Steps**:
1. Apply empty enrichment.
2. Assert all contact fields are unchanged.

**Expected Result**: Contact unchanged after empty enrichment; no null overwrites.

**Code Sample**:
```typescript
it('should leave contact unchanged for empty enrichment result', () => {
  const applicator = new EnrichmentApplicator();
  const contact = { title: 'Engineer', company: 'ACME' };
  const result = applicator.apply(contact, {});
  expect(result).toMatchObject(contact);
});
```

---

### 3.2 Data Quality Thresholds

#### TC-F8-E2.1: Low-confidence enrichment data is staged for review rather than auto-applied
**Objective**: Verify that enrichment data below a confidence threshold (`enrichmentConfidence < 0.6`) is placed in a review staging area instead of being applied directly.

**Preconditions**:
- Provider returns `title: 'Director'` with `confidence: 0.45`.
- Auto-apply threshold = 0.6.

**Test Steps**:
1. Run enrichment for the contact.
2. Assert `contact.title` has NOT changed.
3. Assert a staged enrichment record exists for review.

**Expected Result**: Low-confidence enrichment staged; contact not auto-updated.

**Code Sample**:
```typescript
it('should stage low-confidence enrichment for review', async () => {
  jest.spyOn(clearbitProvider, 'enrich').mockResolvedValue({
    title: 'Director',
    confidence: 0.45,
  });

  await enrichmentService.enrich(contact.id);

  const updatedContact = await svc.getById(contact.id);
  expect(updatedContact.title).not.toBe('Director');

  const staged = await stagingStore.findByContactId(contact.id);
  expect(staged).toHaveLength(1);
});
```

---

#### TC-F8-E2.2: High-confidence enrichment data is applied automatically
**Objective**: Confirm that enrichment data with `confidence >= 0.9` is applied without requiring manual review.

**Preconditions**:
- Provider returns `title: 'CTO'` with `confidence: 0.92`.

**Test Steps**:
1. Run enrichment.
2. Assert `contact.title === 'CTO'` immediately after enrichment.
3. Assert no staged record.

**Expected Result**: High-confidence enrichment auto-applied; no review needed.

**Code Sample**:
```typescript
it('should auto-apply high-confidence enrichment data', async () => {
  jest.spyOn(clearbitProvider, 'enrich').mockResolvedValue({ title: 'CTO', confidence: 0.92 });
  await enrichmentService.enrich(contact.id);

  const updatedContact = await svc.getById(contact.id);
  expect(updatedContact.title).toBe('CTO');

  const staged = await stagingStore.findByContactId(contact.id);
  expect(staged).toHaveLength(0);
});
```

---

### 3.3 Network and Provider Failures

#### TC-F8-E3.1: Network timeout does not corrupt the contact record
**Objective**: Verify that a network timeout during enrichment leaves the contact record in its pre-enrichment state.

**Preconditions**:
- Provider mock throws `NetworkTimeoutError` after a 100ms delay.

**Test Steps**:
1. Start enrichment.
2. Assert the promise rejects with a timeout-related error.
3. Assert the contact record is unchanged.

**Expected Result**: Contact record is not partially updated on network timeout.

**Code Sample**:
```typescript
it('should not corrupt contact record on network timeout', async () => {
  const original = await svc.getById(contact.id);
  jest.spyOn(clearbitProvider, 'enrich').mockRejectedValue(new NetworkTimeoutError());

  await expect(enrichmentService.enrich(contact.id)).rejects.toThrow(NetworkTimeoutError);

  const afterFailure = await svc.getById(contact.id);
  expect(afterFailure).toMatchObject(original);
});
```

---

#### TC-F8-E3.2: Provider returning 429 Too Many Requests is retried after the Retry-After header delay
**Objective**: Confirm that when a provider responds with a `Retry-After: 2` header, the enrichment client waits at least 2 seconds before retrying.

**Preconditions**:
- Provider mock returns 429 with `Retry-After: 2` header on the first call, then 200 on the second.

**Test Steps**:
1. Start enrichment.
2. Record the time between the first and second call.
3. Assert the gap is >= 2 000 ms.
4. Assert the final result is a success.

**Expected Result**: Client respects `Retry-After` header; retry delayed >= 2 s.

**Code Sample**:
```typescript
it('should wait for Retry-After duration before retrying', async () => {
  const callTimes: number[] = [];
  jest.spyOn(clearbitProvider, 'enrich').mockImplementation(async () => {
    callTimes.push(Date.now());
    if (callTimes.length === 1) {
      const err = new RateLimitError();
      err.retryAfterMs = 2000;
      throw err;
    }
    return buildClearbitResult();
  });

  await enrichmentService.enrich(contact.id);
  expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(2000);
}, 10_000);
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Enrichment Throughput

#### TC-F8-P1.1: Process 500 enrichment requests per minute
**Objective**: Validate the enrichment processor meets the minimum throughput SLA.

**Preconditions**:
- Provider mock responds in < 50ms.
- Worker pool size = 10.

**Test Steps**:
1. Enqueue 500 contacts for enrichment.
2. Time the processor until the queue is empty.
3. Assert elapsed <= 60 000 ms.

**Expected Result**: 500 enrichments completed within 60 s.

**Code Sample**:
```typescript
it('should process 500 enrichment requests within 60 seconds', async () => {
  jest.spyOn(clearbitProvider, 'enrich').mockImplementation(async () => {
    await sleep(40);
    return buildClearbitResult();
  });
  await seedEnrichmentQueue(500);

  const t0 = performance.now();
  await enrichmentProcessor.drainQueue();
  expect(performance.now() - t0).toBeLessThan(60_000);
}, 90_000);
```

---

#### TC-F8-P1.2: Enrichment processor scales linearly with worker pool size
**Objective**: Confirm that doubling the worker pool from 5 to 10 reduces processing time by approximately 50%.

**Preconditions**:
- 200 contacts queued; provider mock latency = 50 ms.

**Test Steps**:
1. Process 200 contacts with `workerPool = 5`; record elapsed time T5.
2. Process 200 contacts with `workerPool = 10`; record elapsed time T10.
3. Assert `T10 <= T5 * 0.6` (at least 40% faster).

**Expected Result**: Throughput scales with pool size.

**Code Sample**:
```typescript
it('should scale throughput with worker pool size', async () => {
  const mockEnrich = jest.fn(async () => { await sleep(50); return buildClearbitResult(); });

  await seedEnrichmentQueue(200);
  const proc5 = new EnrichmentProcessor({ workerPool: 5, provider: { enrich: mockEnrich } });
  const t0 = performance.now();
  await proc5.drainQueue();
  const t5 = performance.now() - t0;

  await seedEnrichmentQueue(200);
  const proc10 = new EnrichmentProcessor({ workerPool: 10, provider: { enrich: mockEnrich } });
  const t1 = performance.now();
  await proc10.drainQueue();
  const t10 = performance.now() - t1;

  expect(t10).toBeLessThanOrEqual(t5 * 0.6);
});
```

---

### 4.2 Field Application Performance

#### TC-F8-P2.1: Applying enrichment fields to 100 000 contacts in under 30 seconds
**Objective**: Validate the bulk field application job handles 100 000 contacts within the maintenance window.

**Preconditions**:
- 100 000 staged enrichment results ready to apply.

**Test Steps**:
1. Seed 100 000 staged enrichment records.
2. Time `enrichmentApplicator.bulkApply()`.
3. Assert elapsed <= 30 000 ms.

**Expected Result**: Bulk application completes in <= 30 s.

**Code Sample**:
```typescript
it('bulk enrichment application for 100k contacts under 30s', async () => {
  await seedStagedEnrichments(100_000);
  const t0 = performance.now();
  await enrichmentApplicator.bulkApply();
  expect(performance.now() - t0).toBeLessThan(30_000);
}, 60_000);
```

---

#### TC-F8-P2.2: Single contact enrichment application completes in under 10 ms
**Objective**: Validate that the field-application step for a single contact is fast enough for synchronous on-demand paths.

**Preconditions**:
- Enrichment result with 15 fields ready.

**Test Steps**:
1. Run 1 000 single-contact `applicator.apply()` calls.
2. Assert p99 <= 10 ms.

**Expected Result**: p99 application latency <= 10 ms.

**Code Sample**:
```typescript
it('single contact enrichment application p99 <= 10ms', () => {
  const applicator = new EnrichmentApplicator();
  const contact = buildFullContact();
  const enrichment = buildClearbitResult();
  const durations: number[] = [];

  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    applicator.apply(contact, enrichment);
    durations.push(performance.now() - t0);
  }
  durations.sort((a, b) => a - b);
  expect(durations[Math.ceil(durations.length * 0.99) - 1]).toBeLessThanOrEqual(10);
});
```

---

### 4.3 Provider API Efficiency

#### TC-F8-P3.1: Enrichment cache prevents redundant provider calls for the same email
**Objective**: Verify that the enrichment cache serves cached results for the same email within the cache TTL, reducing external API calls.

**Preconditions**:
- Cache TTL = 24 hours.
- Provider mock tracks call count.

**Test Steps**:
1. Enrich `alice@acme.com` 10 times within 24 hours.
2. Assert provider was called only once.
3. Assert all 10 results are identical.

**Expected Result**: 9 of 10 requests served from cache; provider called once.

**Code Sample**:
```typescript
it('should cache enrichment results and avoid redundant provider calls', async () => {
  const providerSpy = jest.spyOn(clearbitProvider, 'enrich').mockResolvedValue(buildClearbitResult());
  const contact = await svc.createContact({ firstName: 'Alice', email: 'alice@acme.com' });

  for (let i = 0; i < 10; i++) {
    await enrichmentService.enrich(contact.id);
  }

  expect(providerSpy).toHaveBeenCalledTimes(1);
});
```

---

#### TC-F8-P3.2: Batch enrichment API call reduces provider round trips by 80%
**Objective**: Confirm that the batch enrichment path reduces the number of provider API calls versus individual calls.

**Preconditions**:
- Provider supports a batch endpoint accepting up to 100 emails per call.
- 1 000 contacts to enrich.

**Test Steps**:
1. Run batch enrichment for 1 000 contacts.
2. Assert provider batch endpoint was called at most 10 times (1 000/100).
3. Assert individual `enrich` was never called.

**Expected Result**: 1 000 enrichments via 10 batch calls (max), not 1 000 individual calls.

**Code Sample**:
```typescript
it('should use batch endpoint to minimise API round trips', async () => {
  const batchSpy = jest.spyOn(clearbitProvider, 'batchEnrich').mockResolvedValue(buildBatchResult(100));
  const singleSpy = jest.spyOn(clearbitProvider, 'enrich');

  await seedEnrichmentQueue(1000);
  await enrichmentProcessor.drainQueue({ batchSize: 100 });

  expect(batchSpy.mock.calls.length).toBeLessThanOrEqual(10);
  expect(singleSpy).not.toHaveBeenCalled();
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
