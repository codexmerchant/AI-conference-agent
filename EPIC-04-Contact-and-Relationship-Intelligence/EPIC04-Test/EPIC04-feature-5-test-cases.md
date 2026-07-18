# EPIC04 Feature 5 — Contact Confidence Scoring — Test Cases

## Test Overview
Comprehensive test suite for Contact Confidence Scoring covering unit tests, integration tests, edge cases, and performance validation. Contact confidence scoring measures how trustworthy and complete a contact record is, factoring in data source quality, field completeness, verification status, cross-source corroboration, and record age. Tests validate score computation, threshold-based routing, field-level confidence signals, and degradation over time.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Field Completeness Scoring

#### TC-F5-U1.1: Fully populated contact receives maximum completeness sub-score
**Objective**: Verify that a contact with all optional and required fields populated receives a completeness sub-score of 1.0.

**Preconditions**:
- `ConfidenceScorer` configured with a standard field weight map.
- Contact has: firstName, lastName, email, phone, company, title, linkedInUrl, location.

**Test Steps**:
1. Build a contact stub with all fields populated.
2. Call `scorer.computeCompleteness(contact)`.
3. Assert result === 1.0.

**Expected Result**: Completeness sub-score of 1.0 for a fully populated record.

**Code Sample**:
```typescript
import { ConfidenceScorer } from '@/services/contact/confidence-scorer';

it('should return 1.0 completeness for a fully populated contact', () => {
  const scorer = new ConfidenceScorer();
  const full = buildFullContact(); // all optional + required fields set
  expect(scorer.computeCompleteness(full)).toBe(1.0);
});
```

---

#### TC-F5-U1.2: Contact with only required fields has a completeness sub-score below 0.5
**Objective**: Confirm that a contact with only the bare minimum (name + email) scores below 0.5 for completeness.

**Preconditions**:
- `ConfidenceScorer` weights optional enrichment fields heavily.

**Test Steps**:
1. Build a contact with only `firstName`, `lastName`, and `email`.
2. Call `scorer.computeCompleteness(contact)`.
3. Assert result < 0.5.

**Expected Result**: Sparse record gets a low completeness sub-score.

**Code Sample**:
```typescript
it('should return < 0.5 completeness for a sparse contact', () => {
  const scorer = new ConfidenceScorer();
  const sparse = { firstName: 'Min', lastName: 'Imal', email: 'min@sparse.com' };
  expect(scorer.computeCompleteness(sparse)).toBeLessThan(0.5);
});
```

---

#### TC-F5-U1.3: Each additional field increases the completeness sub-score
**Objective**: Verify that adding a new field to a contact monotonically increases the completeness score.

**Preconditions**:
- Baseline contact has 3 fields.

**Test Steps**:
1. Score contact with 3 fields.
2. Add phone number; score again.
3. Add company; score again.
4. Assert score3 > score2 > score1.

**Expected Result**: Completeness increases monotonically as fields are added.

**Code Sample**:
```typescript
it('should increase completeness with each new field', () => {
  const scorer = new ConfidenceScorer();
  const base = { firstName: 'Step', email: 's@step.com' };
  const withPhone = { ...base, phone: '+10000000001' };
  const withCompany = { ...withPhone, company: 'ACME' };

  expect(scorer.computeCompleteness(withCompany))
    .toBeGreaterThan(scorer.computeCompleteness(withPhone));
  expect(scorer.computeCompleteness(withPhone))
    .toBeGreaterThan(scorer.computeCompleteness(base));
});
```

---

### 1.2 Source Quality Weighting

#### TC-F5-U2.1: Verified CRM source raises confidence above unverified manual entry
**Objective**: Confirm that a contact sourced from a verified CRM integration has a higher source-quality sub-score than one entered manually.

**Preconditions**:
- `sourceQualityMap: { crm_verified: 0.9, manual: 0.4 }`.

**Test Steps**:
1. Score source quality for `source: 'crm_verified'`.
2. Score source quality for `source: 'manual'`.
3. Assert CRM score > manual score.

**Expected Result**: CRM-sourced quality sub-score is higher than manual.

**Code Sample**:
```typescript
it('should score CRM-verified source higher than manual', () => {
  const scorer = new ConfidenceScorer({
    sourceQualityMap: { crm_verified: 0.9, manual: 0.4 },
  });
  expect(scorer.computeSourceQuality('crm_verified'))
    .toBeGreaterThan(scorer.computeSourceQuality('manual'));
});
```

---

#### TC-F5-U2.2: Multi-source corroboration boosts confidence
**Objective**: Verify that a contact corroborated by 3 independent sources has a higher confidence than one from a single source.

**Preconditions**:
- Both contacts have the same completeness; the multi-source one has 3 sources.

**Test Steps**:
1. Score contact with 1 source record.
2. Score contact with 3 source records (same completeness).
3. Assert multi-source score > single-source score.

**Expected Result**: Corroboration from multiple sources boosts confidence.

**Code Sample**:
```typescript
it('should boost confidence for multi-source contacts', () => {
  const scorer = new ConfidenceScorer();
  const single = buildContact({ sources: 1 });
  const multi = buildContact({ sources: 3 });

  expect(scorer.compute(multi)).toBeGreaterThan(scorer.compute(single));
});
```

---

#### TC-F5-U2.3: Unknown source type defaults to lowest quality tier
**Objective**: Ensure an unrecognised source string falls back to the lowest quality tier (0.1) rather than throwing.

**Preconditions**:
- `sourceQualityMap` does not contain `'unknown_crm_xyz'`.

**Test Steps**:
1. Call `scorer.computeSourceQuality('unknown_crm_xyz')`.
2. Assert result === 0.1 (the default floor).

**Expected Result**: Unknown source gets the default floor quality score.

**Code Sample**:
```typescript
it('should return default floor quality for unknown source', () => {
  const scorer = new ConfidenceScorer({ defaultSourceQuality: 0.1 });
  expect(scorer.computeSourceQuality('unknown_crm_xyz')).toBe(0.1);
});
```

---

### 1.3 Verification Status

#### TC-F5-U3.1: Email-verified contact scores higher than unverified
**Objective**: Confirm that a contact with a verified email (`emailVerified: true`) receives a higher confidence than an identical unverified contact.

**Preconditions**:
- All other fields identical between the two contacts.

**Test Steps**:
1. Score contact with `emailVerified: false`.
2. Score contact with `emailVerified: true`.
3. Assert verified score > unverified score.

**Expected Result**: Email verification increases confidence score.

**Code Sample**:
```typescript
it('should score email-verified contact higher', () => {
  const scorer = new ConfidenceScorer();
  const unverified = buildContact({ emailVerified: false });
  const verified = buildContact({ emailVerified: true });
  expect(scorer.compute(verified)).toBeGreaterThan(scorer.compute(unverified));
});
```

---

#### TC-F5-U3.2: Phone-verified and email-verified contact approaches maximum confidence
**Objective**: Verify that a fully populated contact with both email and phone verified achieves a confidence >= 0.95.

**Preconditions**:
- Contact is fully populated, email and phone both verified, CRM-sourced.

**Test Steps**:
1. Build a fully populated, fully verified, CRM-sourced contact.
2. Call `scorer.compute(contact)`.
3. Assert result >= 0.95.

**Expected Result**: High-confidence contact achieves >= 0.95 score.

**Code Sample**:
```typescript
it('should achieve >= 0.95 for fully verified contact', () => {
  const scorer = new ConfidenceScorer({ sourceQualityMap: { crm_verified: 0.9 } });
  const elite = buildFullContact({ emailVerified: true, phoneVerified: true, source: 'crm_verified' });
  expect(scorer.compute(elite)).toBeGreaterThanOrEqual(0.95);
});
```

---

#### TC-F5-U3.3: Bounced email status reduces confidence significantly
**Objective**: Confirm that a contact whose email has hard-bounced (`emailBounced: true`) receives a significantly lower score than a non-bounced equivalent.

**Preconditions**:
- `emailBouncedPenalty = -0.30` configured.

**Test Steps**:
1. Score a contact without bounce.
2. Score the same contact with `emailBounced: true`.
3. Assert bounced score <= normal score - 0.25.

**Expected Result**: Hard bounce penalises confidence by at least 0.25.

**Code Sample**:
```typescript
it('should penalise bounced email in confidence score', () => {
  const scorer = new ConfidenceScorer({ emailBouncedPenalty: 0.30 });
  const normal = buildContact({ emailBounced: false });
  const bounced = buildContact({ emailBounced: true });

  expect(scorer.compute(normal) - scorer.compute(bounced)).toBeGreaterThanOrEqual(0.25);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Score-Triggered Workflows

#### TC-F5-I1.1: Contact below minimum threshold is flagged for enrichment
**Objective**: Verify that when a contact's confidence drops below 0.4, it is automatically added to the enrichment queue.

**Preconditions**:
- `enrichmentThreshold = 0.4`.
- Enrichment queue is empty.

**Test Steps**:
1. Create a sparse contact whose computed confidence < 0.4.
2. Run the confidence scoring pipeline.
3. Assert the contact is present in the enrichment queue.

**Expected Result**: Low-confidence contacts are automatically queued for enrichment.

**Code Sample**:
```typescript
it('should queue low-confidence contact for enrichment', async () => {
  const contact = await svc.createContact({ firstName: 'Low', email: 'low@sparse.com' });
  await confidencePipeline.run(contact.id);

  const queue = await enrichmentQueue.getAll();
  expect(queue.map((q) => q.contactId)).toContain(contact.id);
});
```

---

#### TC-F5-I1.2: Contact reaching high confidence threshold is removed from enrichment queue
**Objective**: Verify that when enrichment raises a contact's confidence above 0.7, it is removed from the enrichment queue.

**Preconditions**:
- Contact is in the enrichment queue with confidence 0.35.

**Test Steps**:
1. Enrich contact (add phone, company, title).
2. Re-run confidence scoring pipeline.
3. Assert new score > 0.7.
4. Assert contact is no longer in the enrichment queue.

**Expected Result**: Contact removed from enrichment queue after confidence threshold is met.

**Code Sample**:
```typescript
it('should remove contact from enrichment queue when threshold met', async () => {
  const contact = await setupLowConfidenceContact();
  await enrichmentService.enrich(contact.id, { phone: '+11234567890', company: 'ACME', title: 'CTO' });
  await confidencePipeline.run(contact.id);

  const queue = await enrichmentQueue.getAll();
  expect(queue.map((q) => q.contactId)).not.toContain(contact.id);
});
```

---

### 2.2 Score Persistence

#### TC-F5-I2.1: Confidence score is stored and retrievable after computation
**Objective**: Verify that the computed confidence score is persisted to the contact record and retrievable via the API.

**Preconditions**:
- Contact created; confidence pipeline run.

**Test Steps**:
1. Create a contact.
2. Run `confidencePipeline.run(contact.id)`.
3. Fetch the contact via `contactService.getById(contact.id)`.
4. Assert `contact.confidenceScore` is a number in [0, 1].

**Expected Result**: `confidenceScore` field is populated on the stored contact.

**Code Sample**:
```typescript
it('should persist confidence score to contact record', async () => {
  const contact = await svc.createContact({ firstName: 'Stored', email: 'stored@x.com' });
  await confidencePipeline.run(contact.id);

  const updated = await svc.getById(contact.id);
  expect(typeof updated.confidenceScore).toBe('number');
  expect(updated.confidenceScore).toBeGreaterThanOrEqual(0);
  expect(updated.confidenceScore).toBeLessThanOrEqual(1);
});
```

---

#### TC-F5-I2.2: Re-scoring updates the stored confidence score
**Objective**: Confirm that enriching a contact and re-running the pipeline updates the stored `confidenceScore` to the new higher value.

**Preconditions**:
- Contact has initial `confidenceScore = 0.35`.

**Test Steps**:
1. Retrieve initial score.
2. Add phone and company to the contact.
3. Re-run confidence pipeline.
4. Assert new stored score > 0.35.

**Expected Result**: Re-scoring reflects enriched data.

**Code Sample**:
```typescript
it('should update stored confidence score after enrichment', async () => {
  const contact = await setupContactWithScore(0.35);
  await svc.updateContact(contact.id, { phone: '+1234567890', company: 'BigCo' });
  await confidencePipeline.run(contact.id);

  const refreshed = await svc.getById(contact.id);
  expect(refreshed.confidenceScore).toBeGreaterThan(0.35);
});
```

---

### 2.3 Batch Scoring

#### TC-F5-I3.1: Batch confidence scoring processes all contacts in the store
**Objective**: Verify that the batch confidence job updates the `confidenceScore` of all contacts.

**Preconditions**:
- 500 contacts in the store, none with a `confidenceScore`.

**Test Steps**:
1. Seed 500 contacts without confidence scores.
2. Run `confidenceBatchJob.run()`.
3. Assert all 500 contacts now have a `confidenceScore` set.

**Expected Result**: Every contact in the store has a confidence score after the batch job.

**Code Sample**:
```typescript
it('should score all contacts in batch job', async () => {
  await seedContacts(store, 500);
  await confidenceBatchJob.run();

  const contacts = await store.findAll();
  const unscored = contacts.filter((c) => c.confidenceScore === undefined);
  expect(unscored).toHaveLength(0);
});
```

---

#### TC-F5-I3.2: Batch job enqueues all contacts below threshold for enrichment
**Objective**: Confirm that after a batch run, all contacts with a computed score below the enrichment threshold are in the enrichment queue.

**Preconditions**:
- 100 contacts: 60 will score above 0.4, 40 will score below 0.4.

**Test Steps**:
1. Run batch confidence job.
2. Count contacts with `confidenceScore < 0.4`.
3. Assert enrichment queue size equals that count.

**Expected Result**: All sub-threshold contacts are queued for enrichment.

**Code Sample**:
```typescript
it('should enqueue all sub-threshold contacts for enrichment after batch', async () => {
  await seedMixedConfidenceContacts(store, { aboveThreshold: 60, belowThreshold: 40 });
  await confidenceBatchJob.run();

  expect(await enrichmentQueue.size()).toBe(40);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Conflicting Data Signals

#### TC-F5-E1.1: Contact with conflicting emails from two sources has reduced confidence
**Objective**: Verify that when two sources disagree on a contact's primary email, the confidence score is penalised.

**Preconditions**:
- Source A reports email `'x@a.com'`; Source B reports email `'x@b.com'` for the same identity.

**Test Steps**:
1. Build a contact with two conflicting source records.
2. Score the contact.
3. Assert score is lower than it would be with consistent email across both sources.

**Expected Result**: Data conflicts reduce confidence.

**Code Sample**:
```typescript
it('should penalise confidence for conflicting emails across sources', () => {
  const scorer = new ConfidenceScorer();
  const consistent = buildContact({ sources: [{ email: 'x@a.com' }, { email: 'x@a.com' }] });
  const conflicting = buildContact({ sources: [{ email: 'x@a.com' }, { email: 'x@b.com' }] });

  expect(scorer.compute(consistent)).toBeGreaterThan(scorer.compute(conflicting));
});
```

---

#### TC-F5-E1.2: Contact with stale data (not updated in 2 years) has degraded confidence
**Objective**: Confirm that a contact record not updated in 2 years receives a lower confidence than an identical but recently updated record.

**Preconditions**:
- `staleness.halfLifeDays = 365`.

**Test Steps**:
1. Score a contact with `updatedAt = today`.
2. Score an identical contact with `updatedAt = 2 years ago`.
3. Assert stale score < fresh score.

**Expected Result**: Staleness degrades confidence.

**Code Sample**:
```typescript
it('should lower confidence for stale contact records', () => {
  const scorer = new ConfidenceScorer({ stalenessHalfLifeDays: 365 });
  const fresh = buildContact({ updatedAt: new Date() });
  const stale = buildContact({ updatedAt: subDays(new Date(), 365 * 2) });

  expect(scorer.compute(fresh)).toBeGreaterThan(scorer.compute(stale));
});
```

---

### 3.2 Empty and Null Field Handling

#### TC-F5-E2.1: Contact with all empty string fields treated same as null
**Objective**: Verify that `company: ''` and `company: null` both contribute zero to the completeness sub-score.

**Preconditions**:
- `ConfidenceScorer` treats empty strings as missing.

**Test Steps**:
1. Score contact with `company: ''`.
2. Score contact with `company: null`.
3. Assert both scores are equal.

**Expected Result**: Empty strings are treated identically to null for scoring purposes.

**Code Sample**:
```typescript
it('should treat empty string same as null in completeness', () => {
  const scorer = new ConfidenceScorer();
  const empty = buildContact({ company: '' });
  const nulled = buildContact({ company: null });
  expect(scorer.computeCompleteness(empty)).toBe(scorer.computeCompleteness(nulled));
});
```

---

#### TC-F5-E2.2: Contact with zero source records does not crash the scorer
**Objective**: Ensure the scorer handles a contact with `sourceRecords: []` without throwing, returning a low (but valid) score.

**Preconditions**:
- Contact was created programmatically without a source record.

**Test Steps**:
1. Build contact with `sourceRecords: []`.
2. Call `scorer.compute(contact)`.
3. Assert result is a number in [0, 1].

**Expected Result**: Score is a valid low number; no exception thrown.

**Code Sample**:
```typescript
it('should not crash when sourceRecords is empty', () => {
  const scorer = new ConfidenceScorer();
  const noSource = buildContact({ sourceRecords: [] });
  const score = scorer.compute(noSource);
  expect(typeof score).toBe('number');
  expect(score).toBeGreaterThanOrEqual(0);
});
```

---

### 3.3 Score Floor and Ceiling

#### TC-F5-E3.1: Maximum possible confidence is 1.0, not higher
**Objective**: Verify that stacking all positive signals (verified, enriched, multi-source, fresh) cannot produce a score above 1.0.

**Preconditions**:
- All confidence-boosting factors enabled and maximised.

**Test Steps**:
1. Build a theoretically "perfect" contact.
2. Assert computed score <= 1.0.

**Expected Result**: Score never exceeds the maximum of 1.0.

**Code Sample**:
```typescript
it('should never exceed 1.0 confidence', () => {
  const scorer = new ConfidenceScorer();
  const perfect = buildPerfectContact();
  expect(scorer.compute(perfect)).toBeLessThanOrEqual(1.0);
});
```

---

#### TC-F5-E3.2: Minimum confidence floor is enforced
**Objective**: Confirm that even with all penalties applied (bounced email, stale, no source), the score does not drop below the configured floor of 0.01.

**Preconditions**:
- `minimumConfidenceFloor = 0.01`.

**Test Steps**:
1. Build a worst-case contact (all penalties active).
2. Assert computed score >= 0.01.

**Expected Result**: Score never drops below the configured floor.

**Code Sample**:
```typescript
it('should not drop below minimum confidence floor', () => {
  const scorer = new ConfidenceScorer({ minimumFloor: 0.01 });
  const worst = buildWorstCaseContact();
  expect(scorer.compute(worst)).toBeGreaterThanOrEqual(0.01);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Individual Scoring Latency

#### TC-F5-P1.1: Single contact confidence score computes in under 5 ms
**Objective**: Validate the confidence scorer is fast enough for synchronous on-write scoring.

**Preconditions**:
- In-process computation, no I/O.

**Test Steps**:
1. Run 1 000 individual `scorer.compute(contact)` calls.
2. Assert p99 <= 5 ms.

**Expected Result**: p99 latency <= 5 ms.

**Code Sample**:
```typescript
it('confidence scoring p99 <= 5ms', () => {
  const scorer = new ConfidenceScorer();
  const contacts = Array.from({ length: 1000 }, buildFullContact);
  const durations: number[] = [];

  for (const c of contacts) {
    const t0 = performance.now();
    scorer.compute(c);
    durations.push(performance.now() - t0);
  }
  durations.sort((a, b) => a - b);
  expect(durations[Math.ceil(durations.length * 0.99) - 1]).toBeLessThanOrEqual(5);
});
```

---

#### TC-F5-P1.2: Batch scoring of 100 000 contacts completes in under 60 seconds
**Objective**: Validate the batch scoring job meets its SLA for a production-scale dataset.

**Preconditions**:
- 100 000 contacts in the store.

**Test Steps**:
1. Seed 100 000 contacts.
2. Time `confidenceBatchJob.run()`.
3. Assert elapsed <= 60 000 ms.

**Expected Result**: Batch scoring completes within 60 s.

**Code Sample**:
```typescript
it('batch scoring 100k contacts under 60s', async () => {
  await seedContacts(store, 100_000);
  const t0 = performance.now();
  await confidenceBatchJob.run();
  expect(performance.now() - t0).toBeLessThan(60_000);
}, 90_000);
```

---

### 4.2 Throughput Under Concurrent Ingestion

#### TC-F5-P2.1: Confidence scores 500 concurrently created contacts without bottleneck
**Objective**: Verify the scoring pipeline does not become a throughput bottleneck during high-volume ingestion.

**Preconditions**:
- Confidence scoring is triggered on each new contact creation.
- 500 contacts created concurrently.

**Test Steps**:
1. Fire 500 concurrent `createContact` calls.
2. Await all.
3. Assert all 500 contacts have a `confidenceScore`.
4. Assert total elapsed time <= 10 000 ms.

**Expected Result**: 500 concurrent creates + scores complete within 10 s.

**Code Sample**:
```typescript
it('should score 500 concurrent contacts within 10s', async () => {
  const calls = Array.from({ length: 500 }, (_, i) =>
    svc.createContact({ firstName: `Conc${i}`, email: `conc${i}@perf.com` })
  );
  const t0 = performance.now();
  const results = await Promise.all(calls);
  expect(performance.now() - t0).toBeLessThan(10_000);

  for (const c of results) {
    expect(typeof c.confidenceScore).toBe('number');
  }
});
```

---

#### TC-F5-P2.2: Scoring pipeline does not degrade read latency during batch run
**Objective**: Confirm that concurrent batch scoring does not increase contact read latency by more than 2×.

**Preconditions**:
- Batch job running in background.
- 50 concurrent read queries.

**Test Steps**:
1. Measure baseline read p95.
2. Start batch scoring job.
3. Measure read p95 during batch.
4. Assert ratio <= 2.

**Expected Result**: Read latency does not more than double during background scoring.

**Code Sample**:
```typescript
it('batch scoring should not double read latency', async () => {
  const baselineP95 = await measureReadP95(50);
  const batchPromise = confidenceBatchJob.run();
  const duringP95 = await measureReadP95(50);
  await batchPromise;

  expect(duringP95 / baselineP95).toBeLessThanOrEqual(2);
});
```

---

### 4.3 Score Storage Efficiency

#### TC-F5-P3.1: Score history for 1 million updates stored in under 1 GB
**Objective**: Validate that the score history storage format is compact enough for production volumes.

**Preconditions**:
- 1 million score history records (contactId, score, calculatedAt, breakdown JSON).

**Test Steps**:
1. Insert 1 million score history records.
2. Query database for table size.
3. Assert total size <= 1 GB.

**Expected Result**: 1 M score records fit within 1 GB of storage.

**Code Sample**:
```typescript
it('1M score history records fit under 1GB', async () => {
  await seedScoreHistory(historyStore, 1_000_000);
  const sizeBytes = await historyStore.getTableSizeBytes();
  expect(sizeBytes).toBeLessThan(1 * 1024 * 1024 * 1024);
});
```

---

#### TC-F5-P3.2: Score breakdown serialisation adds less than 10% overhead over raw score
**Objective**: Confirm that persisting the full score breakdown (sub-scores per dimension) adds less than 10% storage overhead compared to storing only the final score.

**Preconditions**:
- Breakdown includes 8 sub-score fields per record.

**Test Steps**:
1. Measure size of 10 000 records with only `score` stored.
2. Measure size of 10 000 records with `score + breakdown` stored.
3. Assert overhead <= 10%.

**Expected Result**: Breakdown overhead is <= 10%.

**Code Sample**:
```typescript
it('breakdown serialisation overhead <= 10%', async () => {
  const slimSize = await measureStorageSize(10_000, { includeBreakdown: false });
  const fullSize = await measureStorageSize(10_000, { includeBreakdown: true });
  const overhead = (fullSize - slimSize) / slimSize;
  expect(overhead).toBeLessThanOrEqual(0.10);
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
