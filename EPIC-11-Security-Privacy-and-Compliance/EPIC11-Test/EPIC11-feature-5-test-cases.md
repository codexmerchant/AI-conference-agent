# EPIC11 Feature 5 — Audit Logging — Test Cases

## Test Overview
Comprehensive test suite for Audit Logging covering unit tests, integration tests, edge cases, and performance validation. These tests validate immutable audit log writes, hash-chain integrity, tamper detection, log search and export capabilities, log rotation and archival, and compliance with retention requirements for audit records.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Immutable Audit Log Writes

#### TC-F5-U1.1: Appending an audit event produces a hash-chained entry
**Objective**: Verify that each audit log entry includes a `hash` field derived from the entry content and the hash of the previous entry.

**Preconditions**:
- `AuditLogService` is initialised with an in-memory append-only store.
- One prior entry exists with `hash = 'abc123'`.

**Test Steps**:
1. Append a new event `{ type: 'access.granted', userId: 'user-42', resource: 'session/sess-001', timestamp: '2026-07-19T10:00:00Z' }`.
2. Assert the new entry has a `hash` field.
3. Assert the `previousEntryHash` equals `'abc123'` (the prior entry's hash).
4. Assert the `hash` is a valid SHA-256 hex string.

**Expected Result**: Each entry is cryptographically linked to the previous one, forming a tamper-evident chain.

**Code Sample**:
```typescript
import { AuditLogService } from '@/services/audit-log-service';

describe('TC-F5-U1.1 — Hash-chained entry', () => {
  it('should chain new entry to the previous entry hash', async () => {
    const svc = new AuditLogService({ store: new InMemoryAuditStore() });
    const first = await svc.append({ type: 'session.started', userId: 'user-42', timestamp: new Date().toISOString() });
    const second = await svc.append({ type: 'access.granted', userId: 'user-42', resource: 'session/sess-001', timestamp: new Date().toISOString() });

    expect(second.previousEntryHash).toBe(first.hash);
    expect(second.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

---

#### TC-F5-U1.2: Audit entry is rejected if the hash chain is broken
**Objective**: Confirm that an attempt to insert an entry with an incorrect `previousEntryHash` is rejected.

**Preconditions**:
- The store has 2 entries; the head hash is known.

**Test Steps**:
1. Attempt to append an entry with `previousEntryHash = 'wrong-hash'`.
2. Expect the call to reject with `HashChainBrokenError`.

**Expected Result**: Broken hash chain attempts are rejected, preventing log injection.

**Code Sample**:
```typescript
it('should reject entry with incorrect previousEntryHash', async () => {
  const svc = new AuditLogService({ store: twoEntryStore, validateChain: true });
  await expect(
    svc.append({ type: 'access.denied', userId: 'user-99', timestamp: new Date().toISOString(), previousEntryHash: 'wrong-hash' })
  ).rejects.toThrow(HashChainBrokenError);
});
```

---

#### TC-F5-U1.3: Genesis entry (first entry) uses a sentinel previous hash
**Objective**: Verify that the very first log entry uses a well-known sentinel `previousEntryHash` (e.g. all-zeros) for bootstrapping the chain.

**Preconditions**:
- Audit log store is empty.

**Test Steps**:
1. Append the first event.
2. Assert `entry.previousEntryHash === '0'.repeat(64)`.

**Expected Result**: The genesis entry is identifiable by its sentinel previous hash.

**Code Sample**:
```typescript
it('should use all-zeros sentinel for genesis entry', async () => {
  const svc = new AuditLogService({ store: new InMemoryAuditStore() });
  const first = await svc.append({ type: 'system.initialised', timestamp: new Date().toISOString() });
  expect(first.previousEntryHash).toBe('0'.repeat(64));
});
```

---

### 1.2 Event Schema Validation

#### TC-F5-U2.1: Required fields are enforced on all audit events
**Objective**: Verify that audit events missing required fields (`type`, `timestamp`) are rejected before being written.

**Preconditions**:
- `AuditLogService` validates event schema on write.

**Test Steps**:
1. Attempt to append `{ userId: 'user-42' }` (missing `type` and `timestamp`).
2. Expect the call to reject with `AuditEventValidationError`.
3. Assert the error message lists the missing fields.

**Expected Result**: Invalid audit events are rejected with actionable validation errors.

**Code Sample**:
```typescript
it('should reject audit event missing required fields', async () => {
  const svc = new AuditLogService({ store: new InMemoryAuditStore() });
  await expect(svc.append({ userId: 'user-42' } as any))
    .rejects.toThrow(AuditEventValidationError);
});
```

---

#### TC-F5-U2.2: Unknown event type is accepted but flagged as unclassified
**Objective**: Ensure that new or unknown event types are written to the log with a classification flag for future review, rather than being silently dropped.

**Preconditions**:
- `AuditLogService` is in permissive mode (accepts unknown types).

**Test Steps**:
1. Append event `{ type: 'future.event.v2', userId: 'user-42', timestamp: '...' }`.
2. Assert the event is written successfully.
3. Assert `entry.classification === 'unclassified'`.

**Expected Result**: Unknown event types are preserved and flagged for review.

**Code Sample**:
```typescript
it('should write unknown event type with unclassified flag', async () => {
  const entry = await svc.append({ type: 'future.event.v2', userId: 'user-42', timestamp: new Date().toISOString() });
  expect(entry.classification).toBe('unclassified');
});
```

---

#### TC-F5-U2.3: PII fields in audit events are masked before storage
**Objective**: Confirm that PII fields (email, phone) are masked in the stored audit event to limit data exposure.

**Preconditions**:
- `AuditLogService` is configured with PII masking enabled.

**Test Steps**:
1. Append `{ type: 'contact.created', email: 'alice@example.com', phone: '+15551234567', timestamp: '...' }`.
2. Read the stored entry.
3. Assert `entry.email === 'al***@example.com'` and `entry.phone === '+1555***4567'`.

**Expected Result**: PII is masked at the point of ingestion; raw PII is never durably stored in the audit log.

**Code Sample**:
```typescript
it('should mask PII fields before writing to audit log', async () => {
  const svc = new AuditLogService({ store: new InMemoryAuditStore(), piiMasking: true });
  const entry = await svc.append({ type: 'contact.created', email: 'alice@example.com', phone: '+15551234567', timestamp: new Date().toISOString() });

  expect(entry.email).toMatch(/^al\*+@example\.com$/);
  expect(entry.phone).toMatch(/^\+1555\*+\d{4}$/);
});
```

---

### 1.3 Tamper Detection

#### TC-F5-U3.1: Chain verification detects a tampered entry mid-chain
**Objective**: Verify that the chain verification tool detects when a historical entry has been modified.

**Preconditions**:
- The audit log has 10 entries forming a valid chain.
- Entry 5 has had its `userId` field modified in storage (simulated tampering).

**Test Steps**:
1. Call `auditLogService.verifyChain({ from: 1, to: 10 })`.
2. Assert the result is `{ valid: false, brokenAt: 5 }`.

**Expected Result**: Chain verification pinpoints the exact entry where tampering occurred.

**Code Sample**:
```typescript
it('should detect tampering at entry 5 in a 10-entry chain', async () => {
  await store.directlyCorrupt({ entryIndex: 5, field: 'userId', newValue: 'attacker' });
  const result = await svc.verifyChain({ from: 1, to: 10 });
  expect(result.valid).toBe(false);
  expect(result.brokenAt).toBe(5);
});
```

---

#### TC-F5-U3.2: Deleted entry is detected during chain verification
**Objective**: Confirm that deleting an entry from the middle of the chain is caught during verification.

**Preconditions**:
- The audit log has 10 entries.
- Entry 7 has been deleted from storage (simulated log tampering).

**Test Steps**:
1. Call `auditLogService.verifyChain({ from: 1, to: 10 })`.
2. Assert the result is `{ valid: false, missingEntry: 7 }`.

**Expected Result**: Missing entries are detected by the sequence gap in the hash chain.

**Code Sample**:
```typescript
it('should detect a deleted entry during chain verification', async () => {
  await store.directlyDelete({ entryIndex: 7 });
  const result = await svc.verifyChain({ from: 1, to: 10 });
  expect(result.valid).toBe(false);
  expect(result.missingEntry).toBe(7);
});
```

---

#### TC-F5-U3.3: Valid chain passes verification without errors
**Objective**: Ensure that an intact chain returns a clean verification result.

**Preconditions**:
- The audit log has 50 entries in a valid chain.

**Test Steps**:
1. Call `auditLogService.verifyChain({ from: 1, to: 50 })`.
2. Assert the result is `{ valid: true }`.

**Expected Result**: Verification of a valid chain completes cleanly with no false positives.

**Code Sample**:
```typescript
it('should return valid for an intact 50-entry chain', async () => {
  const result = await svc.verifyChain({ from: 1, to: 50 });
  expect(result.valid).toBe(true);
  expect(result.brokenAt).toBeUndefined();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Audit Log ↔ Access Control Integration

#### TC-F5-I1.1: Every access control decision is written to the audit log
**Objective**: Verify that every permission check (granted or denied) produces a corresponding audit log entry.

**Preconditions**:
- Access control service has the audit log wired as a middleware.

**Test Steps**:
1. Perform 5 permission checks: 3 granted, 2 denied.
2. Assert the audit log contains exactly 5 entries of type `access.decision`.
3. Assert 3 entries have `outcome: 'granted'` and 2 have `outcome: 'denied'`.

**Expected Result**: Full access audit coverage — every decision is logged.

**Code Sample**:
```typescript
it('should log all 5 access decisions with correct outcomes', async () => {
  await performPermissionChecks(svc, 5); // 3 granted, 2 denied per fixture
  const entries = auditLog.query({ type: 'access.decision' });
  expect(entries).toHaveLength(5);
  expect(entries.filter(e => e.outcome === 'granted')).toHaveLength(3);
  expect(entries.filter(e => e.outcome === 'denied')).toHaveLength(2);
});
```

---

#### TC-F5-I1.2: Audit log entries survive access control service restart
**Objective**: Verify that audit entries written before a service restart are still queryable after restart.

**Preconditions**:
- Audit log uses a persistent store (not in-memory).

**Test Steps**:
1. Write 10 audit entries.
2. Simulate service restart (reinitialise `AuditLogService` with the same persistent store).
3. Query for the 10 entries.
4. Assert all 10 are returned.

**Expected Result**: Audit durability is maintained across service restarts.

**Code Sample**:
```typescript
it('should preserve audit entries across service restart', async () => {
  const persistentStore = new PersistentAuditStore({ dbPath: TEST_DB_PATH });
  const svc = new AuditLogService({ store: persistentStore });
  await Promise.all(Array.from({ length: 10 }, (_, i) => svc.append({ type: 'test.event', index: i, timestamp: new Date().toISOString() })));

  const svc2 = new AuditLogService({ store: persistentStore }); // "restart"
  const entries = await svc2.query({ type: 'test.event' });
  expect(entries).toHaveLength(10);
});
```

---

### 2.2 Audit Log Search and Export

#### TC-F5-I2.1: Audit log supports filtering by userId, type, and time range
**Objective**: Verify that the audit log query interface correctly filters by user, event type, and time window.

**Preconditions**:
- Audit log has 100 entries: 40 from `user-42`, 60 from `user-55`; mixed event types over 7 days.

**Test Steps**:
1. Query `{ userId: 'user-42', type: 'access.granted', from: '-24h', to: 'now' }`.
2. Assert only entries matching all three filters are returned.

**Expected Result**: Multi-field query returns the exact matching subset.

**Code Sample**:
```typescript
it('should filter audit log by userId, type, and time range', async () => {
  const entries = await svc.query({ userId: 'user-42', type: 'access.granted', from: new Date(Date.now() - 86400_000), to: new Date() });
  entries.forEach(e => {
    expect(e.userId).toBe('user-42');
    expect(e.type).toBe('access.granted');
    expect(new Date(e.timestamp).getTime()).toBeGreaterThanOrEqual(Date.now() - 86400_000);
  });
});
```

---

#### TC-F5-I2.2: Exporting audit log to NDJSON includes all entries in correct order
**Objective**: Confirm that the export function produces a newline-delimited JSON file with all entries in chronological order.

**Preconditions**:
- Audit log has 50 entries spanning 2 days.

**Test Steps**:
1. Call `auditLogService.export({ format: 'ndjson', outputPath: '/tmp/audit-export.ndjson' })`.
2. Read the file and split on newlines.
3. Assert there are 50 lines.
4. Assert timestamps are in ascending order.

**Expected Result**: Export produces a complete, chronologically ordered NDJSON file.

**Code Sample**:
```typescript
it('should export 50 entries as chronological NDJSON', async () => {
  await svc.export({ format: 'ndjson', outputPath: EXPORT_PATH });
  const lines = readFileSync(EXPORT_PATH, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
  expect(lines).toHaveLength(50);
  for (let i = 1; i < lines.length; i++) {
    expect(new Date(lines[i].timestamp) >= new Date(lines[i - 1].timestamp)).toBe(true);
  }
});
```

---

### 2.3 Log Rotation and Archival

#### TC-F5-I3.1: Audit log rotation archives entries older than 90 days to cold storage
**Objective**: Verify that the rotation job moves entries older than 90 days to a cold storage tier without deleting them.

**Preconditions**:
- Audit log has entries spanning 180 days.

**Test Steps**:
1. Run the rotation job.
2. Assert entries older than 90 days are no longer in the hot store.
3. Assert they are present in the cold storage archive.
4. Assert hot store contains only the last 90 days of entries.

**Expected Result**: Log rotation reliably separates hot and cold data without data loss.

**Code Sample**:
```typescript
it('should archive entries older than 90 days to cold storage', async () => {
  await rotationJob.run({ hotRetentionDays: 90 });
  const hotCount = await hotStore.count();
  const coldCount = await coldStore.count();
  expect(hotCount + coldCount).toBe(TOTAL_ENTRIES);
  const oldest = await hotStore.oldest();
  expect(Date.now() - new Date(oldest.timestamp).getTime()).toBeLessThan(90 * 86400_000);
});
```

---

#### TC-F5-I3.2: Archived entries remain queryable through the unified query interface
**Objective**: Confirm that the query interface transparently queries both hot and cold stores when the time range spans both tiers.

**Preconditions**:
- Hot store has entries for the last 90 days; cold store has entries from 91–180 days ago.

**Test Steps**:
1. Query with a 180-day time range.
2. Assert entries from both tiers are returned.
3. Assert results are chronologically ordered.

**Expected Result**: Archival is transparent to consumers — the query interface spans both tiers.

**Code Sample**:
```typescript
it('should return entries from both hot and cold tiers in a wide query', async () => {
  const entries = await svc.query({ from: new Date(Date.now() - 180 * 86400_000), to: new Date() });
  expect(entries.length).toBeGreaterThan(90);
  for (let i = 1; i < entries.length; i++) {
    expect(new Date(entries[i].timestamp) >= new Date(entries[i-1].timestamp)).toBe(true);
  }
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 High-Volume Burst Writes

#### TC-F5-E1.1: 10,000 concurrent audit writes complete without data loss
**Objective**: Verify the audit log handles a burst of 10,000 concurrent writes (e.g. during a large conference event) without dropping entries.

**Preconditions**:
- Audit log service is running with a persistent write queue.

**Test Steps**:
1. Issue 10,000 concurrent `append` calls.
2. Wait for all to settle.
3. Assert the store contains exactly 10,000 entries.
4. Assert no duplicate `entryId` values exist.

**Expected Result**: All 10,000 entries are durably written without loss or duplication.

**Code Sample**:
```typescript
it('should handle 10k concurrent writes without data loss', async () => {
  const results = await Promise.all(
    Array.from({ length: 10_000 }, (_, i) => svc.append({ type: 'bulk.test', index: i, timestamp: new Date().toISOString() }))
  );
  const entryIds = new Set(results.map(r => r.entryId));
  expect(entryIds.size).toBe(10_000);
  expect(await store.count()).toBe(10_000);
});
```

---

#### TC-F5-E1.2: Write queue drains correctly after a brief back-pressure event
**Objective**: Confirm that entries queued during a momentary back-pressure spike are all eventually written.

**Preconditions**:
- The write queue has a maximum depth of 1,000.
- A burst of 2,000 writes causes temporary back-pressure.

**Test Steps**:
1. Issue 2,000 rapid writes.
2. Wait 5 seconds for the queue to drain.
3. Assert all 2,000 entries are present in the store.

**Expected Result**: Queue drains fully after back-pressure; no entries are dropped.

**Code Sample**:
```typescript
it('should drain write queue after back-pressure event', async () => {
  const promises = Array.from({ length: 2000 }, (_, i) => svc.append({ type: 'burst.test', index: i, timestamp: new Date().toISOString() }));
  await delay(5000);
  await Promise.all(promises);
  expect(await store.count()).toBe(2000);
}, 10_000);
```

---

### 3.2 Clock Manipulation Resistance

#### TC-F5-E2.1: Entry with a backdated timestamp is flagged with a clock-skew warning
**Objective**: Ensure that an audit entry submitted with a timestamp more than 5 minutes in the past is accepted but flagged.

**Preconditions**:
- Server clock is at T; submitted timestamp is T - 10 minutes.

**Test Steps**:
1. Append an event with `timestamp = T - 10 minutes`.
2. Assert the entry is written.
3. Assert `entry.clockSkewWarning === true`.

**Expected Result**: Backdated entries are accepted but flagged for review, preventing silent clock manipulation.

**Code Sample**:
```typescript
it('should flag entries with timestamps more than 5 minutes in the past', async () => {
  const backdated = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const entry = await svc.append({ type: 'suspicious.event', timestamp: backdated, userId: 'user-42' });
  expect(entry.clockSkewWarning).toBe(true);
});
```

---

#### TC-F5-E2.2: Future-dated entry is rejected to prevent log pre-population
**Objective**: Confirm that an entry with a timestamp more than 1 minute in the future is rejected.

**Preconditions**:
- Submitted timestamp is T + 60 minutes.

**Test Steps**:
1. Append an event with `timestamp = T + 60 minutes`.
2. Expect the call to reject with `FutureDateError`.

**Expected Result**: Future-dated entries are rejected to prevent log pre-population attacks.

**Code Sample**:
```typescript
it('should reject entries with future timestamps', async () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await expect(svc.append({ type: 'test.event', timestamp: future })).rejects.toThrow(FutureDateError);
});
```

---

### 3.3 Compliance Export Edge Cases

#### TC-F5-E3.1: Exporting an empty log produces an empty file without error
**Objective**: Confirm the export function handles an empty log gracefully.

**Preconditions**:
- Audit log store is empty.

**Test Steps**:
1. Call `auditLogService.export({ format: 'ndjson', outputPath: '/tmp/empty-export.ndjson' })`.
2. Assert the file exists and has zero lines.
3. Assert no error is thrown.

**Expected Result**: Empty log exports produce a valid empty file.

**Code Sample**:
```typescript
it('should export an empty log without error', async () => {
  const svc = new AuditLogService({ store: new InMemoryAuditStore() });
  await expect(svc.export({ format: 'ndjson', outputPath: EMPTY_EXPORT_PATH })).resolves.not.toThrow();
  expect(readFileSync(EMPTY_EXPORT_PATH, 'utf-8').trim()).toBe('');
});
```

---

#### TC-F5-E3.2: Export respects user-specific redaction rules for GDPR right-of-erasure
**Objective**: Confirm that when a user has exercised their right to erasure, audit log exports redact that user's PII while preserving the event structure.

**Preconditions**:
- User `'user-erased'` has submitted a right-to-erasure request.
- Audit log contains 5 entries referencing `'user-erased'`.

**Test Steps**:
1. Export the audit log.
2. Assert entries from `'user-erased'` are present but `userId` is replaced with `'[REDACTED]'`.
3. Assert event type and timestamp are preserved.

**Expected Result**: Right-to-erasure is honoured in exports while maintaining audit integrity.

**Code Sample**:
```typescript
it('should redact erased user PII in audit log exports', async () => {
  await privacyService.processErasureRequest({ userId: 'user-erased' });
  const lines = await exportAndParse(svc, EXPORT_PATH);
  const erasedEntries = lines.filter(e => e.originalUserId === 'user-erased');
  erasedEntries.forEach(e => {
    expect(e.userId).toBe('[REDACTED]');
    expect(e.type).toBeDefined();
    expect(e.timestamp).toBeDefined();
  });
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Write Throughput

#### TC-F5-P1.1: Audit log sustains 5,000 sequential writes per second
**Objective**: Validate that the audit log can handle the maximum expected write rate at large conference scale.

**Preconditions**:
- Persistent store is backed by an append-only write-ahead log.

**Test Steps**:
1. Write 5,000 entries sequentially.
2. Assert total elapsed time is under 1 second.

**Expected Result**: 5,000 writes per second throughput is sustained.

**Code Sample**:
```typescript
it('should write 5000 entries in under 1 second', async () => {
  const start = Date.now();
  for (let i = 0; i < 5000; i++) {
    await svc.append({ type: 'throughput.test', index: i, timestamp: new Date().toISOString() });
  }
  expect(Date.now() - start).toBeLessThan(1000);
}, 5000);
```

---

#### TC-F5-P1.2: Concurrent writes do not cause serialisation bottleneck
**Objective**: Validate that concurrent write throughput scales with available I/O concurrency.

**Preconditions**:
- 50 concurrent write workers.

**Test Steps**:
1. Issue 5,000 writes spread across 50 concurrent workers.
2. Assert total time is at least 20% faster than 5,000 sequential writes.

**Expected Result**: Concurrent writes are faster than sequential, demonstrating no serialisation lock bottleneck.

**Code Sample**:
```typescript
it('should show throughput improvement with 50 concurrent writers', async () => {
  const concurrentStart = Date.now();
  await Promise.all(Array.from({ length: 50 }, async (_, w) => {
    for (let i = 0; i < 100; i++) {
      await svc.append({ type: 'concurrent.test', worker: w, index: i, timestamp: new Date().toISOString() });
    }
  }));
  const concurrentTime = Date.now() - concurrentStart;
  expect(concurrentTime).toBeLessThan(sequentialBaselineMs * 0.8);
});
```

---

### 4.2 Query Performance

#### TC-F5-P2.1: Query for last 1,000 entries completes within 50ms
**Objective**: Validate that the most common audit query (recent entries) meets latency SLA.

**Preconditions**:
- Store has 100,000 entries.

**Test Steps**:
1. Query for the last 1,000 entries.
2. Assert response time is under 50ms.

**Expected Result**: Recent-entries queries are fast regardless of total log size.

**Code Sample**:
```typescript
it('should return last 1000 entries within 50ms from a 100k-entry store', async () => {
  const start = performance.now();
  const entries = await svc.query({ limit: 1000, order: 'desc' });
  expect(performance.now() - start).toBeLessThan(50);
  expect(entries).toHaveLength(1000);
});
```

---

#### TC-F5-P2.2: Full-range query over 90 days completes within 5 seconds
**Objective**: Validate that wide-range compliance queries (e.g. regulators requesting 90 days of logs) complete within 5 seconds.

**Preconditions**:
- Store has 90 days of entries (~450,000 total).

**Test Steps**:
1. Query for all entries in the last 90 days.
2. Assert response time is under 5 seconds.

**Expected Result**: Wide-range queries meet the compliance report generation SLA.

**Code Sample**:
```typescript
it('should complete 90-day full query within 5 seconds', async () => {
  const start = Date.now();
  await svc.query({ from: new Date(Date.now() - 90 * 86400_000), to: new Date() });
  expect(Date.now() - start).toBeLessThan(5000);
}, 6000);
```

---

### 4.3 Chain Verification Performance

#### TC-F5-P3.1: Chain verification of 10,000 entries completes within 30 seconds
**Objective**: Validate that the compliance chain verification tool is practical at scale.

**Preconditions**:
- Store has a valid 10,000-entry chain.

**Test Steps**:
1. Run `verifyChain({ from: 1, to: 10000 })`.
2. Assert it completes within 30 seconds.

**Expected Result**: Chain verification is fast enough to run as a nightly compliance check.

**Code Sample**:
```typescript
it('should verify 10k-entry chain within 30 seconds', async () => {
  const start = Date.now();
  const result = await svc.verifyChain({ from: 1, to: 10000 });
  expect(Date.now() - start).toBeLessThan(30_000);
  expect(result.valid).toBe(true);
}, 35_000);
```

---

#### TC-F5-P3.2: Hash computation is stable across multiple runs for the same input
**Objective**: Verify that the SHA-256 hash computation is deterministic and produces consistent results.

**Preconditions**:
- A fixed audit entry object is available.

**Test Steps**:
1. Compute the hash of the same entry 1,000 times.
2. Assert all 1,000 hash values are identical.

**Expected Result**: Hashing is deterministic — no random salt or timestamp contamination in the hash input.

**Code Sample**:
```typescript
it('should produce identical hashes for identical entry content', async () => {
  const entry = { type: 'determinism.test', userId: 'user-42', timestamp: '2026-01-01T00:00:00.000Z' };
  const hashes = await Promise.all(Array.from({ length: 1000 }, () => svc.computeEntryHash(entry, 'prev-hash')));
  expect(new Set(hashes).size).toBe(1);
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

**Coverage targets**: Hash chain integrity, tamper detection, schema validation, PII masking in logs, log rotation, compliance export, GDPR erasure in exports, clock manipulation resistance, and write/query throughput SLAs.
