# EPIC04 Feature 3 — Duplicate Merging — Test Cases

## Test Overview
Comprehensive test suite for Duplicate Merging covering unit tests, integration tests, edge cases, and performance validation. Duplicate merging combines two or more contact records that identity resolution has determined to be the same person into a single canonical record, preserving all source data, resolving field conflicts, and maintaining a complete audit trail.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Field Conflict Resolution

#### TC-F3-U1.1: Most-recently-updated source wins for name field conflict
**Objective**: Verify that when two records have different names, the merge strategy picks the name from the record with the most recent `updatedAt` timestamp.

**Preconditions**:
- Two contact stubs: A with `fullName: 'Jon Smith'` updated 2026-01-01, B with `fullName: 'Jonathan Smith'` updated 2026-06-01.

**Test Steps**:
1. Call `merger.merge(contactA, contactB)`.
2. Assert merged record `fullName === 'Jonathan Smith'` (B is newer).

**Expected Result**: Newer record's name wins.

**Code Sample**:
```typescript
import { ContactMerger } from '@/services/duplicate/contact-merger';

it('should pick the name from the most recently updated record', () => {
  const merger = new ContactMerger({ nameStrategy: 'most-recent' });
  const a = { fullName: 'Jon Smith', updatedAt: new Date('2026-01-01') };
  const b = { fullName: 'Jonathan Smith', updatedAt: new Date('2026-06-01') };

  const merged = merger.merge(a, b);
  expect(merged.fullName).toBe('Jonathan Smith');
});
```

---

#### TC-F3-U1.2: All unique email addresses are preserved in merged record
**Objective**: Ensure the merge concatenates distinct emails from both records, treating the primary record's email as the canonical one.

**Preconditions**:
- Record A has `emails: ['alice@work.com']`.
- Record B has `emails: ['alice@work.com', 'alice@personal.com']`.

**Test Steps**:
1. Merge A and B.
2. Assert merged `emails` contains exactly `['alice@work.com', 'alice@personal.com']` (deduplicated).

**Expected Result**: Union of all unique emails preserved.

**Code Sample**:
```typescript
it('should union all unique emails on merge', () => {
  const merger = new ContactMerger();
  const a = { emails: ['alice@work.com'] };
  const b = { emails: ['alice@work.com', 'alice@personal.com'] };

  const merged = merger.merge(a, b);
  expect(merged.emails).toEqual(expect.arrayContaining(['alice@work.com', 'alice@personal.com']));
  expect(merged.emails).toHaveLength(2);
});
```

---

#### TC-F3-U1.3: Tags from all source records are unioned in merged record
**Objective**: Confirm tags from both records are combined without duplication.

**Preconditions**:
- Record A tags: `['vip', 'sponsor']`.
- Record B tags: `['sponsor', 'speaker']`.

**Test Steps**:
1. Merge A and B.
2. Assert merged `tags` = `['vip', 'sponsor', 'speaker']` (no duplicate `'sponsor'`).

**Expected Result**: Tag union with deduplication.

**Code Sample**:
```typescript
it('should union tags from both records without duplicates', () => {
  const merger = new ContactMerger();
  const a = { tags: ['vip', 'sponsor'] };
  const b = { tags: ['sponsor', 'speaker'] };

  const merged = merger.merge(a, b);
  expect(new Set(merged.tags).size).toBe(merged.tags.length); // no duplicates
  expect(merged.tags).toEqual(expect.arrayContaining(['vip', 'sponsor', 'speaker']));
});
```

---

### 1.2 Audit Trail Generation

#### TC-F3-U2.1: Merge produces an audit record with both source IDs
**Objective**: Verify that a `MergeAudit` record is created capturing which contacts were merged and the winning field values.

**Preconditions**:
- Audit service is wired into the merger.

**Test Steps**:
1. Merge contactA and contactB.
2. Retrieve the audit record by the merged contact's ID.
3. Assert `audit.sourceIds` contains both A's and B's IDs.
4. Assert `audit.mergedAt` is a recent timestamp.

**Expected Result**: Audit record present with both source IDs and a timestamp.

**Code Sample**:
```typescript
it('should create an audit record on merge', async () => {
  const { merged, audit } = await mergerSvc.merge(contactA.id, contactB.id);

  expect(audit.sourceIds).toEqual(expect.arrayContaining([contactA.id, contactB.id]));
  expect(audit.survivingId).toBe(merged.id);
  expect(new Date(audit.mergedAt).getTime()).toBeCloseTo(Date.now(), -3);
});
```

---

#### TC-F3-U2.2: Audit captures field-level conflict resolution decisions
**Objective**: Verify the audit record details which field value was chosen from which source and why.

**Preconditions**:
- Merger is configured to log conflict resolutions.

**Test Steps**:
1. Merge two records with conflicting `title` fields.
2. Check `audit.fieldResolutions` for a `title` entry.
3. Assert it contains `{ field: 'title', chosenFrom: 'B', strategy: 'most-recent' }`.

**Expected Result**: Each conflicted field has an explicit resolution entry in the audit.

**Code Sample**:
```typescript
it('should log field-level conflict resolutions in audit', async () => {
  const a = { ...baseContact, title: 'Engineer', updatedAt: new Date('2026-01-01') };
  const b = { ...baseContact, title: 'Senior Engineer', updatedAt: new Date('2026-06-01') };

  const { audit } = await mergerSvc.mergeRaw(a, b);
  const titleResolution = audit.fieldResolutions.find((r) => r.field === 'title');

  expect(titleResolution).toMatchObject({ field: 'title', chosenValue: 'Senior Engineer', strategy: 'most-recent' });
});
```

---

#### TC-F3-U2.3: Merge audit is immutable after creation
**Objective**: Confirm that the audit record cannot be modified after it is written (append-only audit log).

**Preconditions**:
- Audit store enforces immutability on write.

**Test Steps**:
1. Create a merge audit record.
2. Attempt to update the `mergedAt` field on the stored record.
3. Assert the update is rejected with an `ImmutableRecordError`.

**Expected Result**: Audit record is immutable; update attempt throws.

**Code Sample**:
```typescript
it('should reject mutation of an audit record', async () => {
  const { audit } = await mergerSvc.merge(contactA.id, contactB.id);
  await expect(
    auditStore.update(audit.id, { mergedAt: new Date('2000-01-01') })
  ).rejects.toThrow(ImmutableRecordError);
});
```

---

### 1.3 Surviving Record Selection

#### TC-F3-U3.1: Record with more data fields survives as primary
**Objective**: Verify the merger selects the record with the most populated fields as the surviving record base.

**Preconditions**:
- Record A has 5 populated fields; Record B has 12 populated fields.

**Test Steps**:
1. Merge A and B.
2. Assert `merged.id === B.id` (B survives as primary).

**Expected Result**: The data-richer record is the base for the merged record.

**Code Sample**:
```typescript
it('should select the richer record as primary', () => {
  const merger = new ContactMerger({ survivalStrategy: 'most-fields' });
  const a = buildContact({ fieldsPopulated: 5 });
  const b = buildContact({ fieldsPopulated: 12 });

  const merged = merger.merge(a, b);
  expect(merged.id).toBe(b.id);
});
```

---

#### TC-F3-U3.2: CRM-sourced record takes precedence when source priority is configured
**Objective**: Confirm that source-priority rules (`crm > calendar > manual`) override field-count selection.

**Preconditions**:
- Merger configured with `sourcePriority: ['crm', 'calendar', 'manual']`.

**Test Steps**:
1. Merge a CRM-sourced contact (3 fields) with a manual contact (10 fields).
2. Assert the CRM record is the surviving primary.

**Expected Result**: Source priority overrides field-count heuristic.

**Code Sample**:
```typescript
it('should respect source priority over field count', () => {
  const merger = new ContactMerger({ sourcePriority: ['crm', 'calendar', 'manual'] });
  const crmContact = buildContact({ source: 'crm', fieldsPopulated: 3 });
  const manualContact = buildContact({ source: 'manual', fieldsPopulated: 10 });

  const merged = merger.merge(crmContact, manualContact);
  expect(merged.source).toBe('crm');
});
```

---

#### TC-F3-U3.3: Merge of three records selects the highest-priority surviving record
**Objective**: Verify the 3-way merge picks the highest-priority source among all three records.

**Preconditions**:
- Records from sources: `calendar`, `manual`, `crm`.
- Priority: `crm > calendar > manual`.

**Test Steps**:
1. Call `merger.mergeMany([calendarContact, manualContact, crmContact])`.
2. Assert `merged.primarySource === 'crm'`.
3. Assert all three source IDs appear in `merged.sourceIds`.

**Expected Result**: CRM record wins; all three source IDs are preserved.

**Code Sample**:
```typescript
it('should select correct primary in a 3-way merge', () => {
  const merger = new ContactMerger({ sourcePriority: ['crm', 'calendar', 'manual'] });
  const merged = merger.mergeMany([calendarContact, manualContact, crmContact]);

  expect(merged.primarySource).toBe('crm');
  expect(merged.sourceIds).toHaveLength(3);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Database Merge Operations

#### TC-F3-I1.1: Merged contact replaces both source records in the database
**Objective**: Verify that after a confirmed merge, the two source records are replaced by a single merged record in the contact store.

**Preconditions**:
- Two contacts exist in the DB with IDs `id-A` and `id-B`.

**Test Steps**:
1. Call `mergerSvc.executeMerge(id-A, id-B)`.
2. Assert `contactStore.findById(id-A)` returns a tombstone or is absent.
3. Assert `contactStore.findById(id-B)` returns a tombstone or is absent.
4. Assert the merged record exists and has `sourceIds` = `[id-A, id-B]`.

**Expected Result**: Both originals are replaced by the single merged record.

**Code Sample**:
```typescript
it('should replace both source records with merged record', async () => {
  const a = await svc.createContact({ firstName: 'Tom', email: 'tom@a.com' });
  const b = await svc.createContact({ firstName: 'Tom', email: 'tom@b.com' });

  const merged = await mergerSvc.executeMerge(a.id, b.id);

  expect(await contactStore.findById(a.id)).toBeNull();
  expect(await contactStore.findById(b.id)).toBeNull();
  expect(await contactStore.findById(merged.id)).toBeDefined();
});
```

---

#### TC-F3-I1.2: All meeting associations from both source records are transferred to the merged record
**Objective**: Ensure meeting records referencing either source contact are re-linked to the merged contact after a merge.

**Preconditions**:
- Contact A is associated with meetings `m1`, `m2`.
- Contact B is associated with meetings `m3`.

**Test Steps**:
1. Merge A and B.
2. Query meetings by the merged contact ID.
3. Assert `m1`, `m2`, and `m3` are all returned.

**Expected Result**: All meeting associations re-linked to the merged contact.

**Code Sample**:
```typescript
it('should transfer all meeting associations on merge', async () => {
  await linkMeetings(contactA.id, ['m1', 'm2']);
  await linkMeetings(contactB.id, ['m3']);

  const merged = await mergerSvc.executeMerge(contactA.id, contactB.id);
  const meetings = await meetingStore.findByContactId(merged.id);

  expect(meetings.map((m) => m.id)).toEqual(expect.arrayContaining(['m1', 'm2', 'm3']));
});
```

---

### 2.2 Relationship Graph Update

#### TC-F3-I2.1: Relationship edges from both source contacts are consolidated
**Objective**: Verify that after merging, the relationship graph merges edges from both source nodes into the surviving node.

**Preconditions**:
- Contact A has relationship edges to contacts X and Y.
- Contact B has relationship edges to contacts Y and Z.

**Test Steps**:
1. Merge A and B.
2. Query relationship graph for the merged contact.
3. Assert edges to X, Y (deduplicated), and Z all exist.

**Expected Result**: Merged node has edges to X, Y, Z (Y appears once despite appearing in both).

**Code Sample**:
```typescript
it('should consolidate relationship edges on merge', async () => {
  await relationshipGraph.addEdge(contactA.id, contactX.id, { score: 0.8 });
  await relationshipGraph.addEdge(contactA.id, contactY.id, { score: 0.7 });
  await relationshipGraph.addEdge(contactB.id, contactY.id, { score: 0.6 });
  await relationshipGraph.addEdge(contactB.id, contactZ.id, { score: 0.9 });

  const merged = await mergerSvc.executeMerge(contactA.id, contactB.id);
  const edges = await relationshipGraph.getEdges(merged.id);
  const neighbours = edges.map((e) => e.targetId);

  expect(neighbours).toEqual(expect.arrayContaining([contactX.id, contactY.id, contactZ.id]));
  expect(neighbours.filter((id) => id === contactY.id)).toHaveLength(1);
});
```

---

#### TC-F3-I2.2: Merged relationship scores are recalculated, not averaged
**Objective**: Confirm that after merging, the relationship score to a shared contact (Y) is re-derived from the combined interaction history, not averaged from the two pre-merge scores.

**Preconditions**:
- A→Y score: 0.70 (3 interactions).
- B→Y score: 0.60 (5 interactions).
- Combined: 8 interactions; expected recalculated score ~0.75.

**Test Steps**:
1. Merge A and B.
2. Retrieve the relationship score from the merged contact to Y.
3. Assert score is NOT simply `(0.70 + 0.60) / 2 = 0.65`.
4. Assert score is recalculated and reflects the combined interaction count.

**Expected Result**: Score is recalculated from merged interaction history, not arithmetically averaged.

**Code Sample**:
```typescript
it('should recalculate relationship score after merge', async () => {
  // Set up pre-merge scores with known interaction counts
  await setRelationshipWithInteractions(contactA.id, contactY.id, { score: 0.70, count: 3 });
  await setRelationshipWithInteractions(contactB.id, contactY.id, { score: 0.60, count: 5 });

  const merged = await mergerSvc.executeMerge(contactA.id, contactB.id);
  const score = await relationshipStore.getScore(merged.id, contactY.id);

  expect(score).not.toBeCloseTo(0.65, 1); // not a simple average
  expect(score).toBeGreaterThan(0.70);    // more interactions = higher score
});
```

---

### 2.3 Undo / Rollback

#### TC-F3-I3.1: Merge can be undone within the undo window
**Objective**: Verify that a merge performed within the last 24 hours can be rolled back, restoring both original records.

**Preconditions**:
- Merge was performed 1 hour ago.
- Undo window configured to 24 hours.

**Test Steps**:
1. Execute a merge; record the `mergeId`.
2. Call `mergerSvc.undoMerge(mergeId)`.
3. Assert original contact A is restored with its original data.
4. Assert original contact B is restored with its original data.
5. Assert the merged record is gone.

**Expected Result**: Both originals fully restored; merged record removed.

**Code Sample**:
```typescript
it('should restore both originals on merge undo', async () => {
  const { merged, mergeId } = await mergerSvc.executeMerge(contactA.id, contactB.id);
  await mergerSvc.undoMerge(mergeId);

  expect(await contactStore.findById(contactA.id)).toMatchObject({ firstName: contactA.firstName });
  expect(await contactStore.findById(contactB.id)).toMatchObject({ firstName: contactB.firstName });
  expect(await contactStore.findById(merged.id)).toBeNull();
});
```

---

#### TC-F3-I3.2: Undo fails gracefully after the undo window has expired
**Objective**: Confirm that attempting to undo a merge older than 24 hours throws an `UndoWindowExpiredError`.

**Preconditions**:
- Merge timestamp is mocked to 25 hours ago.

**Test Steps**:
1. Create a merge audit record dated 25 hours in the past.
2. Call `mergerSvc.undoMerge(mergeId)`.
3. Assert rejection with `UndoWindowExpiredError`.

**Expected Result**: Error thrown; records remain merged.

**Code Sample**:
```typescript
it('should reject undo after 24-hour window', async () => {
  const pastMergeId = await createStaleMergeRecord({ hoursAgo: 25 });
  await expect(mergerSvc.undoMerge(pastMergeId)).rejects.toThrow(UndoWindowExpiredError);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Self-Merge Guard

#### TC-F3-E1.1: Merging a contact with itself is rejected
**Objective**: Ensure that passing the same contact ID twice to the merge operation throws a `SelfMergeError`.

**Preconditions**:
- Contact with `id: 'abc'` exists in the store.

**Test Steps**:
1. Call `mergerSvc.executeMerge('abc', 'abc')`.
2. Assert rejection with `SelfMergeError`.

**Expected Result**: `SelfMergeError` thrown; no merge record created.

**Code Sample**:
```typescript
it('should throw SelfMergeError when both IDs are the same', async () => {
  const c = await svc.createContact({ firstName: 'Self', email: 'self@x.com' });
  await expect(mergerSvc.executeMerge(c.id, c.id)).rejects.toThrow(SelfMergeError);
});
```

---

#### TC-F3-E1.2: Already-merged (tombstoned) contact cannot be the target of a new merge
**Objective**: Verify that attempting to merge into a tombstoned record throws a `TombstonedContactError`.

**Preconditions**:
- Contact A was previously merged into B and is now tombstoned.

**Test Steps**:
1. Attempt `mergerSvc.executeMerge(contactA.id, contactC.id)` where A is tombstoned.
2. Assert rejection with `TombstonedContactError`.

**Expected Result**: Error thrown; merge not executed.

**Code Sample**:
```typescript
it('should reject merge when source contact is tombstoned', async () => {
  const { merged } = await mergerSvc.executeMerge(contactA.id, contactB.id);
  await expect(mergerSvc.executeMerge(contactA.id, contactC.id)).rejects.toThrow(TombstonedContactError);
});
```

---

### 3.2 Data Integrity

#### TC-F3-E2.1: Merge preserves the earliest `firstSeenAt` date
**Objective**: Confirm that the merged record's `firstSeenAt` is the earlier of the two source records' dates.

**Preconditions**:
- Contact A `firstSeenAt`: 2025-03-01.
- Contact B `firstSeenAt`: 2024-11-15.

**Test Steps**:
1. Merge A and B.
2. Assert merged `firstSeenAt === new Date('2024-11-15')`.

**Expected Result**: The earliest first-seen date is preserved.

**Code Sample**:
```typescript
it('should keep the earliest firstSeenAt after merge', () => {
  const merger = new ContactMerger();
  const a = { ...base, firstSeenAt: new Date('2025-03-01') };
  const b = { ...base, firstSeenAt: new Date('2024-11-15') };

  const merged = merger.merge(a, b);
  expect(merged.firstSeenAt).toEqual(new Date('2024-11-15'));
});
```

---

#### TC-F3-E2.2: Merge does not lose notes from either source record
**Objective**: Ensure that free-text notes from both records are concatenated (with source attribution) rather than one overwriting the other.

**Preconditions**:
- Contact A has note: `'Met at AWS re:Invent'`.
- Contact B has note: `'Spoke at our webinar'`.

**Test Steps**:
1. Merge A and B.
2. Assert merged `notes` contains both note strings.
3. Assert each note is attributed to its source contact ID.

**Expected Result**: Both notes preserved with source attribution.

**Code Sample**:
```typescript
it('should concatenate notes from both records', () => {
  const merger = new ContactMerger();
  const a = { ...base, id: 'id-a', notes: 'Met at AWS re:Invent' };
  const b = { ...base, id: 'id-b', notes: 'Spoke at our webinar' };

  const merged = merger.merge(a, b);
  expect(merged.notes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ text: 'Met at AWS re:Invent', sourceId: 'id-a' }),
      expect.objectContaining({ text: 'Spoke at our webinar', sourceId: 'id-b' }),
    ])
  );
});
```

---

### 3.3 Cascading Reference Updates

#### TC-F3-E3.1: Relationship score records referencing deleted contact are re-pointed to merged record
**Objective**: Verify that after a merge, all `RelationshipScore` records that referenced either source contact now reference the merged contact.

**Preconditions**:
- `RelationshipScore` table has records pointing to both `id-A` and `id-B`.

**Test Steps**:
1. Merge A and B into merged contact M.
2. Query all `RelationshipScore` rows with `contactId IN (id-A, id-B)`.
3. Assert the result is empty.
4. Query for `contactId = M.id`.
5. Assert all transferred scores are present.

**Expected Result**: All relationship scores re-pointed to the merged ID; no orphan records.

**Code Sample**:
```typescript
it('should re-point relationship scores to the merged contact', async () => {
  await relationshipStore.setScore(contactA.id, contactX.id, 0.8);
  await relationshipStore.setScore(contactB.id, contactX.id, 0.6);

  const merged = await mergerSvc.executeMerge(contactA.id, contactB.id);

  const orphans = await relationshipStore.findByContactIds([contactA.id, contactB.id]);
  expect(orphans).toHaveLength(0);

  const mergedScores = await relationshipStore.findByContactId(merged.id);
  expect(mergedScores.length).toBeGreaterThan(0);
});
```

---

#### TC-F3-E3.2: External CRM references are updated after merge via webhook
**Objective**: Confirm that a merge triggers an outbound webhook to update CRM systems with the new canonical contact ID.

**Preconditions**:
- CRM webhook endpoint is mocked.
- Contact A and B both have a `crmId`.

**Test Steps**:
1. Merge A and B.
2. Assert the CRM webhook received a `CONTACT_MERGED` event with `survivingId = merged.id` and `deprecatedIds = [A.id, B.id]`.

**Expected Result**: CRM webhook called with correct merge payload.

**Code Sample**:
```typescript
it('should send CONTACT_MERGED webhook to CRM after merge', async () => {
  const webhookSpy = jest.spyOn(crmWebhook, 'send');
  const merged = await mergerSvc.executeMerge(contactA.id, contactB.id);

  expect(webhookSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      event: 'CONTACT_MERGED',
      survivingId: merged.id,
      deprecatedIds: expect.arrayContaining([contactA.id, contactB.id]),
    })
  );
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Single Merge Latency

#### TC-F3-P1.1: Single merge completes within 200 ms
**Objective**: Validate that merging two contacts (including field resolution, DB write, and event emission) completes in under 200 ms.

**Preconditions**:
- Both contacts have ~20 fields and ~50 associated meeting records.

**Test Steps**:
1. Execute 100 sequential merges.
2. Record each duration.
3. Assert p99 <= 200 ms.

**Expected Result**: p99 merge latency <= 200 ms.

**Code Sample**:
```typescript
it('single merge p99 <= 200ms', async () => {
  const pairs = await generateContactPairsForMerge(100);
  const durations: number[] = [];

  for (const [a, b] of pairs) {
    const t0 = performance.now();
    await mergerSvc.executeMerge(a.id, b.id);
    durations.push(performance.now() - t0);
  }
  durations.sort((a, b) => a - b);
  expect(durations[Math.ceil(durations.length * 0.99) - 1]).toBeLessThanOrEqual(200);
});
```

---

#### TC-F3-P1.2: Merge latency scales linearly with the number of associated meetings
**Objective**: Verify that merging contacts with 500 associated meetings takes less than 5× the time of merging contacts with 10 meetings (linear, not superlinear growth).

**Preconditions**:
- Pair A: 10 meeting associations each.
- Pair B: 500 meeting associations each.

**Test Steps**:
1. Time the merge of pair A.
2. Time the merge of pair B.
3. Assert `timeB / timeA <= 5` (proportional growth, not exponential).

**Expected Result**: Merge time scales linearly with meeting count.

**Code Sample**:
```typescript
it('merge time scales linearly with meeting associations', async () => {
  const [a10, b10] = await buildMergeablePair({ meetingsEach: 10 });
  const [a500, b500] = await buildMergeablePair({ meetingsEach: 500 });

  const t0 = performance.now();
  await mergerSvc.executeMerge(a10.id, b10.id);
  const time10 = performance.now() - t0;

  const t1 = performance.now();
  await mergerSvc.executeMerge(a500.id, b500.id);
  const time500 = performance.now() - t1;

  expect(time500 / time10).toBeLessThanOrEqual(5);
});
```

---

### 4.2 Bulk Merge Throughput

#### TC-F3-P2.1: 1 000 confirmed merges processed within 30 seconds
**Objective**: Validate the bulk merge processor can handle 1 000 merge operations in under 30 seconds.

**Preconditions**:
- 1 000 pre-identified merge pairs in the merge queue.

**Test Steps**:
1. Enqueue 1 000 confirmed merges.
2. Start timer; run `mergeBatchProcessor.run()`.
3. Assert elapsed <= 30 000 ms.
4. Assert all 1 000 merges are reflected in the store.

**Expected Result**: Bulk merge completes within 30 s.

**Code Sample**:
```typescript
it('bulk merge processor handles 1000 pairs under 30s', async () => {
  const pairs = await generateContactPairsForMerge(1000);
  await mergeQueue.enqueueAll(pairs.map(([a, b]) => ({ sourceId: a.id, targetId: b.id })));

  const t0 = performance.now();
  await mergeBatchProcessor.run();
  expect(performance.now() - t0).toBeLessThan(30_000);

  const completed = await mergeQueue.countCompleted();
  expect(completed).toBe(1000);
});
```

---

#### TC-F3-P2.2: Bulk merge does not degrade query latency for concurrent reads
**Objective**: Verify that ongoing merge operations do not cause read-latency spikes above 2× baseline for concurrent contact queries.

**Preconditions**:
- Background merge batch running.
- Read load: 50 concurrent `findById` queries per second.

**Test Steps**:
1. Start bulk merge of 500 pairs in the background.
2. Simultaneously run 50 read queries.
3. Assert p95 read latency during merge is <= 2× p95 read latency at baseline.

**Expected Result**: Reads degrade by no more than 2× during bulk merge operations.

**Code Sample**:
```typescript
it('reads degrade less than 2x during bulk merge', async () => {
  const baselineP95 = await measureReadLatencyP95(50);
  const mergePromise = mergeBatchProcessor.runBatch(500);

  const duringMergeP95 = await measureReadLatencyP95(50);
  await mergePromise;

  expect(duringMergeP95 / baselineP95).toBeLessThanOrEqual(2);
});
```

---

### 4.3 Rollback Performance

#### TC-F3-P3.1: Merge undo completes within 500 ms
**Objective**: Validate that undoing a recent merge (restoring two contacts) completes in under 500 ms.

**Preconditions**:
- A merge was just executed.

**Test Steps**:
1. Execute a merge; record `mergeId`.
2. Immediately undo; record duration.
3. Assert duration <= 500 ms.

**Expected Result**: Undo completes in under 500 ms.

**Code Sample**:
```typescript
it('merge undo completes within 500ms', async () => {
  const { mergeId } = await mergerSvc.executeMerge(contactA.id, contactB.id);

  const t0 = performance.now();
  await mergerSvc.undoMerge(mergeId);
  expect(performance.now() - t0).toBeLessThan(500);
});
```

---

#### TC-F3-P3.2: Undo of a merge with 200 transferred meetings completes within 2 seconds
**Objective**: Validate that undo of a complex merge (with many meeting re-associations) stays within the SLA.

**Preconditions**:
- Merge transferred 200 meeting associations.

**Test Steps**:
1. Set up contacts each with 100 meeting associations.
2. Execute merge.
3. Time the undo operation.
4. Assert elapsed <= 2 000 ms.

**Expected Result**: Undo SLA of 2 s is met even with 200 meeting re-associations.

**Code Sample**:
```typescript
it('undo with 200 meeting re-associations under 2s', async () => {
  const [a, b] = await buildMergeablePair({ meetingsEach: 100 });
  const { mergeId } = await mergerSvc.executeMerge(a.id, b.id);

  const t0 = performance.now();
  await mergerSvc.undoMerge(mergeId);
  expect(performance.now() - t0).toBeLessThan(2000);
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
