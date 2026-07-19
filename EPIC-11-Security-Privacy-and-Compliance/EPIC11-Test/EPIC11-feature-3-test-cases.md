# EPIC11 Feature 3 — Data Retention Policies — Test Cases

## Test Overview
Comprehensive test suite for Data Retention Policies covering unit tests, integration tests, edge cases, and performance validation. These tests validate TTL-based data classification, automated purge job execution, legal hold overrides, jurisdiction-specific retention schedules, and audit trails for all deletion events.

---

## 1. UNIT TEST SCENARIOS

### 1.1 TTL-Based Data Classification

#### TC-F3-U1.1: Audio segments are classified with the correct TTL on ingest
**Objective**: Verify that each audio segment is stamped with the correct TTL based on its data class (e.g. conference audio = 365 days).

**Preconditions**:
- `RetentionPolicyService` is loaded with the default policy set.
- Data class `conference_audio` has a configured TTL of 365 days.

**Test Steps**:
1. Call `retentionService.classifyRecord({ type: 'audio', dataClass: 'conference_audio', ingestedAt: new Date() })`.
2. Assert the returned `expiresAt` is approximately `ingestedAt + 365 days`.
3. Assert `dataClass === 'conference_audio'`.

**Expected Result**: Record is stamped with a `expiresAt` date 365 days from ingestion.

**Code Sample**:
```typescript
import { RetentionPolicyService } from '@/services/retention-policy-service';

describe('TC-F3-U1.1 — Audio TTL classification', () => {
  it('should stamp conference_audio with a 365-day TTL', async () => {
    const svc = new RetentionPolicyService({ policyStore: defaultPolicies });
    const now = new Date();
    const record = await svc.classifyRecord({ type: 'audio', dataClass: 'conference_audio', ingestedAt: now });

    const expectedExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    expect(new Date(record.expiresAt).getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    expect(record.dataClass).toBe('conference_audio');
  });
});
```

---

#### TC-F3-U1.2: Contact card PII is classified with a shorter TTL than audio
**Objective**: Confirm that PII data classes have stricter (shorter) retention periods than non-PII data.

**Preconditions**:
- Policy defines `contact_pii` TTL as 90 days and `conference_audio` TTL as 365 days.

**Test Steps**:
1. Classify a `contact_pii` record.
2. Classify a `conference_audio` record with the same `ingestedAt`.
3. Assert `contact_pii.expiresAt < conference_audio.expiresAt`.

**Expected Result**: PII data expires sooner than non-PII audio data.

**Code Sample**:
```typescript
it('should assign shorter TTL to contact_pii than conference_audio', async () => {
  const now = new Date();
  const pii = await svc.classifyRecord({ type: 'metadata', dataClass: 'contact_pii', ingestedAt: now });
  const audio = await svc.classifyRecord({ type: 'audio', dataClass: 'conference_audio', ingestedAt: now });
  expect(new Date(pii.expiresAt) < new Date(audio.expiresAt)).toBe(true);
});
```

---

#### TC-F3-U1.3: Unknown data class falls back to the default retention policy
**Objective**: Ensure an unrecognised `dataClass` does not cause an unhandled error; it should use the default retention policy instead.

**Preconditions**:
- Policy store contains a `default` policy with a 30-day TTL.

**Test Steps**:
1. Call `retentionService.classifyRecord({ type: 'audio', dataClass: 'experimental_unknown', ingestedAt: new Date() })`.
2. Assert `expiresAt` is approximately `ingestedAt + 30 days`.
3. Assert a `retention.class.fallback` telemetry event is emitted.

**Expected Result**: Unknown data classes fall back to the default policy and the fallback is logged for visibility.

**Code Sample**:
```typescript
it('should fall back to default policy for unknown data class', async () => {
  const telemetry = new MockTelemetry();
  const svc = new RetentionPolicyService({ policyStore: defaultPolicies, telemetry });
  const now = new Date();
  const record = await svc.classifyRecord({ type: 'audio', dataClass: 'experimental_unknown', ingestedAt: now });

  const expected = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  expect(new Date(record.expiresAt).getTime()).toBeCloseTo(expected.getTime(), -3);
  expect(telemetry.events).toContainEqual(expect.objectContaining({ type: 'retention.class.fallback' }));
});
```

---

### 1.2 Purge Job Execution

#### TC-F3-U2.1: Purge job deletes only records past their expiresAt
**Objective**: Verify that the TTL purge job deletes expired records and does not touch records that have not yet expired.

**Preconditions**:
- Data store contains 5 expired records and 3 not-yet-expired records.

**Test Steps**:
1. Run `purgeJob.execute({ asOf: new Date() })`.
2. Assert exactly 5 records are deleted.
3. Assert the 3 non-expired records remain untouched.

**Expected Result**: Purge job is precise — only expired records are removed.

**Code Sample**:
```typescript
import { PurgeJob } from '@/jobs/purge-job';

describe('TC-F3-U2.1 — Purge job precision', () => {
  it('should delete only expired records', async () => {
    const store = buildTestStore({ expired: 5, live: 3 });
    const job = new PurgeJob({ store });

    const result = await job.execute({ asOf: new Date() });

    expect(result.deletedCount).toBe(5);
    expect(await store.count()).toBe(3);
  });
});
```

---

#### TC-F3-U2.2: Purge job emits a deletion audit event for each deleted record
**Objective**: Confirm that each deletion produces an immutable audit event containing the record ID, data class, and deletion timestamp.

**Preconditions**:
- Data store contains 3 expired records.
- Audit log is wired to the purge job.

**Test Steps**:
1. Run `purgeJob.execute({ asOf: new Date() })`.
2. Assert the audit log contains exactly 3 `data.deleted` events.
3. Assert each event contains `recordId`, `dataClass`, and `deletedAt`.

**Expected Result**: All deletions are fully auditable with identifying metadata.

**Code Sample**:
```typescript
it('should emit a deletion audit event for each expired record', async () => {
  const auditLog = new MockAuditLog();
  const job = new PurgeJob({ store: expiredStore, auditLog });

  await job.execute({ asOf: new Date() });

  const events = auditLog.events.filter(e => e.type === 'data.deleted');
  expect(events).toHaveLength(3);
  events.forEach(e => {
    expect(e).toMatchObject({ type: 'data.deleted', recordId: expect.any(String), dataClass: expect.any(String), deletedAt: expect.any(String) });
  });
});
```

---

#### TC-F3-U2.3: Purge job is idempotent when re-run on the same data set
**Objective**: Ensure re-running the purge job after all expired records have been deleted is a safe no-op.

**Preconditions**:
- All expired records have already been deleted.

**Test Steps**:
1. Run `purgeJob.execute({ asOf: new Date() })` a second time.
2. Assert `result.deletedCount === 0`.
3. Assert no errors are thrown.

**Expected Result**: Idempotent run completes cleanly with zero deletions.

**Code Sample**:
```typescript
it('should be idempotent when no expired records remain', async () => {
  const job = new PurgeJob({ store: emptyStore });
  const result = await job.execute({ asOf: new Date() });
  expect(result.deletedCount).toBe(0);
});
```

---

### 1.3 Legal Hold Override

#### TC-F3-U3.1: Legal hold prevents purge of held records
**Objective**: Verify that records under a legal hold are excluded from TTL-based purge, regardless of their expiry date.

**Preconditions**:
- Record `'rec-hold-01'` has expired (`expiresAt` in the past) but has an active legal hold.

**Test Steps**:
1. Run `purgeJob.execute({ asOf: new Date() })`.
2. Assert `'rec-hold-01'` is not deleted.
3. Assert a `purge.skipped.legal_hold` audit event is emitted for the record.

**Expected Result**: Legal hold takes precedence over TTL expiry; record is preserved and skip is auditable.

**Code Sample**:
```typescript
it('should skip records under legal hold during purge', async () => {
  const store = new MockDataStore({ records: [{ id: 'rec-hold-01', expiresAt: yesterday, legalHold: true }] });
  const auditLog = new MockAuditLog();
  const job = new PurgeJob({ store, auditLog });

  await job.execute({ asOf: new Date() });

  expect(await store.exists('rec-hold-01')).toBe(true);
  expect(auditLog.events).toContainEqual(expect.objectContaining({ type: 'purge.skipped.legal_hold', recordId: 'rec-hold-01' }));
});
```

---

#### TC-F3-U3.2: Lifting a legal hold allows subsequent purge to delete the expired record
**Objective**: Confirm that once a legal hold is lifted, the next purge run removes the record.

**Preconditions**:
- `'rec-hold-01'` had a legal hold; the hold has now been lifted.

**Test Steps**:
1. Call `retentionService.liftHold({ recordId: 'rec-hold-01' })`.
2. Run `purgeJob.execute({ asOf: new Date() })`.
3. Assert `'rec-hold-01'` is deleted.

**Expected Result**: Once the hold is lifted, the expired record is purged on the next run.

**Code Sample**:
```typescript
it('should delete a record after its legal hold is lifted', async () => {
  await retentionService.liftHold({ recordId: 'rec-hold-01' });
  const result = await job.execute({ asOf: new Date() });
  expect(result.deletedCount).toBeGreaterThanOrEqual(1);
  expect(await store.exists('rec-hold-01')).toBe(false);
});
```

---

#### TC-F3-U3.3: Applying a legal hold to a record already past expiry preserves it
**Objective**: Ensure that placing a legal hold on an already-expired record prevents it from being purged even in the current run.

**Preconditions**:
- Record `'rec-late-hold'` has `expiresAt` in the past.
- Purge job is paused.

**Test Steps**:
1. Apply legal hold to `'rec-late-hold'`.
2. Resume and run the purge job.
3. Assert `'rec-late-hold'` is not deleted.

**Expected Result**: Legal hold applied even after expiry prevents deletion until the hold is lifted.

**Code Sample**:
```typescript
it('should preserve a past-expiry record when hold is applied before purge', async () => {
  await retentionService.applyHold({ recordId: 'rec-late-hold', reason: 'litigation' });
  const result = await job.execute({ asOf: new Date() });
  expect(await store.exists('rec-late-hold')).toBe(true);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Retention Policy ↔ Storage Service Integration

#### TC-F3-I1.1: Storage service auto-classifies records on write using the retention policy
**Objective**: Verify that writing a record to the storage service automatically triggers retention classification.

**Preconditions**:
- Storage service has the retention policy service wired as middleware.

**Test Steps**:
1. Write an audio segment with `dataClass: 'conference_audio'` to storage.
2. Read the stored record's metadata.
3. Assert `expiresAt` is set to approximately `now + 365 days`.

**Expected Result**: Retention classification is transparent to callers — the storage service handles it automatically.

**Code Sample**:
```typescript
it('should auto-classify retention on audio write', async () => {
  const now = new Date();
  await storageService.write({ sessionId: 'sess-ret-001', dataClass: 'conference_audio', data: AUDIO_BUFFER });

  const meta = await storageService.getMetadata('sess-ret-001');
  const expectedExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  expect(new Date(meta.expiresAt).getTime()).toBeCloseTo(expectedExpiry.getTime(), -4);
});
```

---

#### TC-F3-I1.2: Purge job coordinates with storage service to delete blobs and metadata atomically
**Objective**: Confirm that when the purge job deletes a record, both the object blob and its metadata entry are removed atomically.

**Preconditions**:
- An expired record `'rec-purge-01'` has both an object blob and a metadata entry.

**Test Steps**:
1. Run the purge job.
2. Assert neither the blob nor the metadata entry for `'rec-purge-01'` exists after deletion.

**Expected Result**: Purge is atomic — no orphaned blobs or dangling metadata entries.

**Code Sample**:
```typescript
it('should delete blob and metadata atomically', async () => {
  await job.execute({ asOf: new Date() });
  await expect(s3Client.headObject({ bucket: TEST_BUCKET, key: 'rec-purge-01' })).rejects.toThrow();
  expect(await metadataStore.exists('rec-purge-01')).toBe(false);
});
```

---

### 2.2 Jurisdiction-Specific Retention Schedules

#### TC-F3-I2.1: EU/GDPR policy enforces a maximum retention of 30 days for contact PII
**Objective**: Verify that the Regional Compliance Engine overrides the default retention policy with GDPR limits.

**Preconditions**:
- Session jurisdiction is `EU-DE`.
- Default `contact_pii` TTL is 90 days.
- GDPR policy caps `contact_pii` retention at 30 days.

**Test Steps**:
1. Classify a `contact_pii` record with jurisdiction `EU-DE`.
2. Assert `expiresAt` is approximately `ingestedAt + 30 days`.

**Expected Result**: GDPR jurisdiction caps override default TTL values.

**Code Sample**:
```typescript
it('should cap contact_pii TTL at 30 days for EU-DE jurisdiction', async () => {
  const now = new Date();
  const record = await svc.classifyRecord({ type: 'metadata', dataClass: 'contact_pii', ingestedAt: now, jurisdiction: 'EU-DE' });
  const maxExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  expect(new Date(record.expiresAt) <= maxExpiry).toBe(true);
});
```

---

#### TC-F3-I2.2: US state-level retention policy is applied when jurisdiction is US-CA
**Objective**: Ensure CCPA-specific retention rules are applied for California-jurisdiction records.

**Preconditions**:
- US-CA jurisdiction requires consumer data to be deleted within 45 days of a deletion request.

**Test Steps**:
1. Simulate a deletion request for a record in jurisdiction `US-CA`.
2. Assert the record's `scheduledDeletionAt` is within 45 days of the request timestamp.

**Expected Result**: CCPA deletion scheduling is correctly calculated and stored on the record.

**Code Sample**:
```typescript
it('should schedule deletion within 45 days for US-CA jurisdiction', async () => {
  const requestedAt = new Date();
  await retentionService.scheduleDeletion({ recordId: 'rec-ccpa-01', requestedAt, jurisdiction: 'US-CA' });

  const record = await store.getRecord('rec-ccpa-01');
  const maxDeletion = new Date(requestedAt.getTime() + 45 * 24 * 60 * 60 * 1000);
  expect(new Date(record.scheduledDeletionAt) <= maxDeletion).toBe(true);
});
```

---

### 2.3 Deletion Audit Log Integration

#### TC-F3-I3.1: Deletion events are written to an immutable audit log
**Objective**: Verify that purge job deletions produce tamper-evident entries in the immutable audit log.

**Preconditions**:
- Immutable audit log service (append-only with hash chaining) is connected.

**Test Steps**:
1. Run the purge job and delete 5 records.
2. Retrieve the last 5 audit log entries.
3. Assert each entry contains `recordId`, `dataClass`, `deletedAt`, and a valid `previousEntryHash`.

**Expected Result**: Deletion audit entries form a hash chain that detects tampering.

**Code Sample**:
```typescript
it('should write hash-chained audit entries for each deletion', async () => {
  await job.execute({ asOf: new Date() });
  const entries = await auditLog.getLastN(5);

  entries.forEach(e => {
    expect(e).toMatchObject({ recordId: expect.any(String), dataClass: expect.any(String), deletedAt: expect.any(String) });
    expect(e.previousEntryHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

---

#### TC-F3-I3.2: Retention schedule change is audited with before/after policy values
**Objective**: Confirm that updating a data class TTL policy produces an audit entry capturing old and new TTL values.

**Preconditions**:
- `conference_audio` TTL is currently 365 days.

**Test Steps**:
1. Call `retentionService.updatePolicy({ dataClass: 'conference_audio', newTTLDays: 180, changedBy: 'admin-user' })`.
2. Assert an audit entry of type `retention.policy.updated` is written.
3. Assert the entry contains `previousTTLDays: 365` and `newTTLDays: 180`.

**Expected Result**: Policy changes are fully auditable with before/after values and the identity of who made the change.

**Code Sample**:
```typescript
it('should audit retention policy changes with before/after values', async () => {
  await retentionService.updatePolicy({ dataClass: 'conference_audio', newTTLDays: 180, changedBy: 'admin-user' });
  const entry = auditLog.find(e => e.type === 'retention.policy.updated');

  expect(entry.previousTTLDays).toBe(365);
  expect(entry.newTTLDays).toBe(180);
  expect(entry.changedBy).toBe('admin-user');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Clock Skew and Boundary Conditions

#### TC-F3-E1.1: Record expiring exactly at the purge job execution timestamp is included
**Objective**: Verify that a record with `expiresAt === asOf` (exact boundary) is included in the deletion batch.

**Preconditions**:
- Record has `expiresAt` equal to the exact timestamp passed to `purgeJob.execute`.

**Test Steps**:
1. Create a record with `expiresAt = T`.
2. Run `purgeJob.execute({ asOf: T })`.
3. Assert the record is deleted.

**Expected Result**: Boundary-exact records are treated as expired (inclusive comparison).

**Code Sample**:
```typescript
it('should delete records with expiresAt equal to asOf', async () => {
  const T = new Date('2026-01-01T00:00:00.000Z');
  const store = new MockDataStore({ records: [{ id: 'rec-boundary', expiresAt: T }] });
  await new PurgeJob({ store }).execute({ asOf: T });
  expect(await store.exists('rec-boundary')).toBe(false);
});
```

---

#### TC-F3-E1.2: Purge job handles large batches without timing out
**Objective**: Ensure the purge job processes 100,000 expired records without exceeding the configured job timeout.

**Preconditions**:
- Data store contains 100,000 expired records.
- Purge job timeout is set to 5 minutes.

**Test Steps**:
1. Run `purgeJob.execute({ asOf: new Date() })` with batch processing enabled.
2. Assert all 100,000 records are deleted within 5 minutes.
3. Assert no timeout error is thrown.

**Expected Result**: Batch purge completes within the timeout SLA.

**Code Sample**:
```typescript
it('should purge 100k records within 5 minutes', async () => {
  const store = buildLargeExpiredStore(100_000);
  const job = new PurgeJob({ store, batchSize: 1000, timeoutMs: 300_000 });

  const result = await job.execute({ asOf: new Date() });
  expect(result.deletedCount).toBe(100_000);
}, 310_000);
```

---

### 3.2 Concurrent Purge Job Safety

#### TC-F3-E2.1: Two concurrent purge job instances do not double-delete records
**Objective**: Verify that distributed locking prevents two parallel purge job instances from deleting the same records.

**Preconditions**:
- Distributed lock is configured on the purge job.
- Data store has 10 expired records.

**Test Steps**:
1. Start two purge job instances simultaneously.
2. Assert exactly 10 records are deleted (not 20 — no double-delete).
3. Assert only one instance acquired the lock; the other instance logs `lock.acquisition.failed`.

**Expected Result**: Distributed lock ensures exactly-once deletion semantics.

**Code Sample**:
```typescript
it('should not double-delete with concurrent purge instances', async () => {
  const lock = new DistributedLock();
  const store = buildTestStore({ expired: 10 });
  const [job1, job2] = [new PurgeJob({ store, lock }), new PurgeJob({ store, lock })];

  const [r1, r2] = await Promise.all([job1.execute({ asOf: new Date() }), job2.execute({ asOf: new Date() })]);
  expect(r1.deletedCount + r2.deletedCount).toBe(10);
});
```

---

#### TC-F3-E2.2: Partial purge failure rolls back the entire batch
**Objective**: Ensure that if one deletion in a batch fails (e.g. storage error), the entire batch is rolled back and retried.

**Preconditions**:
- Batch of 5 records; the 3rd deletion will fail with a storage error.

**Test Steps**:
1. Configure storage mock to throw on the 3rd deletion.
2. Run the purge job.
3. Assert all 5 records still exist after the failed run.
4. Fix the storage mock and re-run.
5. Assert all 5 records are deleted on the second run.

**Expected Result**: Transactional batch semantics — partial failures roll back the whole batch.

**Code Sample**:
```typescript
it('should roll back entire batch on partial deletion failure', async () => {
  storageMock.failOnNthCall(3, new StorageError('write error'));
  await expect(job.execute({ asOf: new Date() })).rejects.toThrow(StorageError);
  expect(await store.count()).toBe(5); // all records preserved

  storageMock.reset();
  await job.execute({ asOf: new Date() });
  expect(await store.count()).toBe(0);
});
```

---

### 3.3 User-Triggered Early Deletion

#### TC-F3-E3.1: User-requested early deletion bypasses TTL and deletes immediately
**Objective**: Verify that a user's explicit deletion request purges the record immediately, regardless of its TTL.

**Preconditions**:
- Record `'rec-user-del'` has `expiresAt` 300 days in the future.

**Test Steps**:
1. Call `retentionService.userRequestedDeletion({ recordId: 'rec-user-del', requestedBy: 'user-42' })`.
2. Assert the record is deleted immediately.
3. Assert a `data.deleted.user_request` audit event is emitted.

**Expected Result**: User-requested deletions are honoured immediately without waiting for TTL expiry.

**Code Sample**:
```typescript
it('should delete record immediately on user request regardless of TTL', async () => {
  await retentionService.userRequestedDeletion({ recordId: 'rec-user-del', requestedBy: 'user-42' });
  expect(await store.exists('rec-user-del')).toBe(false);
  expect(auditLog.events).toContainEqual(expect.objectContaining({ type: 'data.deleted.user_request', recordId: 'rec-user-del' }));
});
```

---

#### TC-F3-E3.2: Early deletion request for a legally held record is rejected with a clear error
**Objective**: Confirm that user-requested deletion of a legally held record is blocked with a typed error.

**Preconditions**:
- Record `'rec-hold-user'` has an active legal hold.

**Test Steps**:
1. Call `retentionService.userRequestedDeletion({ recordId: 'rec-hold-user', requestedBy: 'user-42' })`.
2. Expect the call to reject with `LegalHoldActiveError`.
3. Assert the record still exists.

**Expected Result**: Legal hold supersedes user deletion requests.

**Code Sample**:
```typescript
it('should reject user deletion request on legally held record', async () => {
  await expect(retentionService.userRequestedDeletion({ recordId: 'rec-hold-user', requestedBy: 'user-42' }))
    .rejects.toThrow(LegalHoldActiveError);
  expect(await store.exists('rec-hold-user')).toBe(true);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Purge Job Throughput

#### TC-F3-P1.1: Purge job processes 10,000 records per minute
**Objective**: Validate that the purge job meets throughput targets to keep up with data volume at conference scale.

**Preconditions**:
- Data store contains 10,000 expired records.

**Test Steps**:
1. Start the purge job and record start time.
2. Wait for completion.
3. Assert completion time is under 60 seconds.

**Expected Result**: 10,000 record purge completes within 60 seconds.

**Code Sample**:
```typescript
it('should purge 10k records in under 60 seconds', async () => {
  const store = buildLargeExpiredStore(10_000);
  const job = new PurgeJob({ store, batchSize: 500 });

  const start = Date.now();
  const result = await job.execute({ asOf: new Date() });
  expect(Date.now() - start).toBeLessThan(60_000);
  expect(result.deletedCount).toBe(10_000);
}, 65_000);
```

---

#### TC-F3-P1.2: Purge job does not degrade concurrent read performance
**Objective**: Ensure that the purge job's batch deletions do not noticeably slow down read queries on the same data store.

**Preconditions**:
- Data store has 50,000 live records and 5,000 expired records.
- Read workload issues 100 queries/second concurrently.

**Test Steps**:
1. Measure baseline read P99 latency.
2. Start the purge job concurrently.
3. Measure read P99 latency during purge.
4. Assert degradation is under 20%.

**Expected Result**: Purge job is a background operation that does not impact read-path SLAs.

**Code Sample**:
```typescript
it('should not degrade reads by more than 20% during purge', async () => {
  const baseline = await measureReadP99(store, 100);
  const [, duringPurge] = await Promise.all([
    job.execute({ asOf: new Date() }),
    measureReadP99(store, 100),
  ]);
  expect(duringPurge / baseline).toBeLessThan(1.20);
});
```

---

### 4.2 Retention Classification Latency

#### TC-F3-P2.1: Classification of a single record completes within 5ms
**Objective**: Confirm that retention classification adds negligible overhead to the write path.

**Preconditions**:
- Policy store is loaded in memory.

**Test Steps**:
1. Time 1,000 sequential `classifyRecord` calls.
2. Assert the median latency is under 5ms.

**Expected Result**: Classification overhead is negligible for the storage write path.

**Code Sample**:
```typescript
it('should classify a record in under 5ms', async () => {
  const latencies = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await svc.classifyRecord({ type: 'audio', dataClass: 'conference_audio', ingestedAt: new Date() });
    latencies.push(performance.now() - start);
  }
  const median = percentile(latencies, 50);
  expect(median).toBeLessThan(5);
});
```

---

#### TC-F3-P2.2: Policy lookup scales to 500 concurrent classification requests
**Objective**: Validate that the policy store can handle 500 concurrent classification requests without queuing.

**Preconditions**:
- Policy store has policies for 20 data classes.

**Test Steps**:
1. Issue 500 concurrent `classifyRecord` calls.
2. Assert all 500 complete without error.
3. Assert p99 latency is under 50ms.

**Expected Result**: Classification service scales to burst write traffic.

**Code Sample**:
```typescript
it('should handle 500 concurrent classification requests within 50ms p99', async () => {
  const latencies = await Promise.all(
    Array.from({ length: 500 }, async () => {
      const start = performance.now();
      await svc.classifyRecord({ type: 'audio', dataClass: 'conference_audio', ingestedAt: new Date() });
      return performance.now() - start;
    })
  );
  expect(percentile(latencies, 99)).toBeLessThan(50);
});
```

---

### 4.3 Audit Log Write Performance

#### TC-F3-P3.1: Audit log write completes within 10ms per deletion event
**Objective**: Ensure audit logging does not become a bottleneck in the purge pipeline.

**Preconditions**:
- Audit log is backed by an append-only durable store.

**Test Steps**:
1. Issue 1,000 sequential audit log write calls.
2. Assert p99 write latency is under 10ms.

**Expected Result**: Audit writes are fast enough to keep up with purge throughput.

**Code Sample**:
```typescript
it('should write audit events within 10ms p99', async () => {
  const latencies = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await auditLog.write({ type: 'data.deleted', recordId: `rec-${i}`, dataClass: 'conference_audio', deletedAt: new Date().toISOString() });
    latencies.push(performance.now() - start);
  }
  expect(percentile(latencies, 99)).toBeLessThan(10);
});
```

---

#### TC-F3-P3.2: Hash chain computation does not exceed 5ms per entry
**Objective**: Ensure the hash chain computation for each audit entry does not add unacceptable latency.

**Preconditions**:
- Audit log uses SHA-256 chaining between entries.

**Test Steps**:
1. Write 1,000 sequential entries.
2. Measure time per entry including hash computation.
3. Assert p99 is under 5ms per entry.

**Expected Result**: Hash chaining overhead is negligible per audit entry.

**Code Sample**:
```typescript
it('should compute hash chain in under 5ms per entry', async () => {
  const latencies = [];
  let prevHash = '0'.repeat(64);
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    const entry = await auditLog.appendChained({ data: { recordId: `rec-${i}` }, previousHash: prevHash });
    prevHash = entry.hash;
    latencies.push(performance.now() - start);
  }
  expect(percentile(latencies, 99)).toBeLessThan(5);
});
```

---

## Test Execution Summary

| Section | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Coverage targets**: TTL classification accuracy, purge job correctness, legal hold enforcement, jurisdiction-specific retention, atomic deletion, audit log immutability, and purge throughput SLAs.
