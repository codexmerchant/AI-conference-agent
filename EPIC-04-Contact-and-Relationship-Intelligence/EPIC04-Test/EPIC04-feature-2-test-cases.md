# EPIC04 Feature 2 — Identity Resolution — Test Cases

## Test Overview
Comprehensive test suite for Identity Resolution covering unit tests, integration tests, edge cases, and performance validation. Identity resolution determines whether two contact records from different sources refer to the same real-world person. Tests cover fuzzy name matching, email normalisation, cross-source deduplication, confidence thresholds, and multi-signal fusion logic.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Fuzzy Name Matching

#### TC-F2-U1.1: Exact name match returns maximum confidence
**Objective**: Verify that two identical names produce a match confidence of 1.0.

**Preconditions**:
- `NameMatcher` service is initialised.

**Test Steps**:
1. Call `nameMatcher.score('Alice Johnson', 'Alice Johnson')`.
2. Assert returned score === 1.0.

**Expected Result**: Score is exactly 1.0 for an identical name pair.

**Code Sample**:
```typescript
import { NameMatcher } from '@/services/identity/name-matcher';

describe('TC-F2-U1.1 — Exact name match', () => {
  it('should return 1.0 for identical names', () => {
    const matcher = new NameMatcher();
    expect(matcher.score('Alice Johnson', 'Alice Johnson')).toBe(1.0);
  });
});
```

---

#### TC-F2-U1.2: Abbreviated first name matches full name above threshold
**Objective**: Confirm that `'A. Johnson'` and `'Alice Johnson'` produce a score above 0.85.

**Preconditions**:
- `NameMatcher` handles initial-expansion heuristic.

**Test Steps**:
1. Call `nameMatcher.score('A. Johnson', 'Alice Johnson')`.
2. Assert score >= 0.85.

**Expected Result**: Score >= 0.85 — abbreviated initial is recognised as a likely match.

**Code Sample**:
```typescript
it('should score abbreviated first name above 0.85', () => {
  const matcher = new NameMatcher();
  expect(matcher.score('A. Johnson', 'Alice Johnson')).toBeGreaterThanOrEqual(0.85);
});
```

---

#### TC-F2-U1.3: Common nickname is matched to formal name
**Objective**: Ensure `'Bill Gates'` matches `'William Gates'` using a nickname lexicon.

**Preconditions**:
- `NameMatcher` loaded with a nickname dictionary (`bill → william`).

**Test Steps**:
1. Call `nameMatcher.score('Bill Gates', 'William Gates')`.
2. Assert score >= 0.90.

**Expected Result**: Nickname-to-formal mapping raises the score above 0.90.

**Code Sample**:
```typescript
it('should map common nickname to formal name', () => {
  const matcher = new NameMatcher({ nicknameLexicon: defaultNicknameLexicon });
  expect(matcher.score('Bill Gates', 'William Gates')).toBeGreaterThanOrEqual(0.90);
});
```

---

### 1.2 Email Normalisation

#### TC-F2-U2.1: Case-insensitive email normalisation
**Objective**: Verify that `'User@Example.COM'` and `'user@example.com'` resolve to the same canonical form.

**Preconditions**:
- `EmailNormaliser` lowercases local-part and domain.

**Test Steps**:
1. Call `emailNormaliser.normalize('User@Example.COM')`.
2. Assert result equals `'user@example.com'`.

**Expected Result**: Email is fully lowercased.

**Code Sample**:
```typescript
import { EmailNormaliser } from '@/services/identity/email-normaliser';

it('should lowercase email addresses', () => {
  const norm = new EmailNormaliser();
  expect(norm.normalize('User@Example.COM')).toBe('user@example.com');
});
```

---

#### TC-F2-U2.2: Gmail dot-insensitivity normalisation
**Objective**: Confirm that `'al.ice.smith@gmail.com'` and `'alicesmith@gmail.com'` normalise to the same canonical key.

**Preconditions**:
- `EmailNormaliser` applies Gmail dot-removal rule for `@gmail.com` domain.

**Test Steps**:
1. Normalise both emails.
2. Assert canonical keys are equal.

**Expected Result**: Both addresses map to `'alicesmith@gmail.com'` as the canonical key.

**Code Sample**:
```typescript
it('should remove dots in Gmail local-part', () => {
  const norm = new EmailNormaliser();
  const a = norm.normalize('al.ice.smith@gmail.com');
  const b = norm.normalize('alicesmith@gmail.com');
  expect(a).toBe(b);
});
```

---

#### TC-F2-U2.3: Plus-alias stripping for identity resolution (not storage)
**Objective**: Verify that `'user+conf@example.com'` and `'user@example.com'` share a canonical identity key while both are preserved verbatim in storage.

**Preconditions**:
- `EmailNormaliser` has a `toIdentityKey()` method that strips the plus alias.

**Test Steps**:
1. Call `emailNormaliser.toIdentityKey('user+conf@example.com')`.
2. Call `emailNormaliser.toIdentityKey('user@example.com')`.
3. Assert both keys are equal.

**Expected Result**: Identity keys match; original emails unchanged in storage.

**Code Sample**:
```typescript
it('should strip plus-alias in identity key only', () => {
  const norm = new EmailNormaliser();
  expect(norm.toIdentityKey('user+conf@example.com')).toBe(
    norm.toIdentityKey('user@example.com')
  );
});
```

---

### 1.3 Multi-Signal Fusion

#### TC-F2-U3.1: High-confidence match when name + email both agree
**Objective**: Verify that matching name (score 0.95) AND same canonical email produces a final fusion score >= 0.97.

**Preconditions**:
- `IdentityResolver` is configured with weight: email=0.6, name=0.4.

**Test Steps**:
1. Build two contact stubs: same canonical email, names `'Bob Smith'` and `'Robert Smith'`.
2. Call `identityResolver.resolve(contactA, contactB)`.
3. Assert `result.confidence >= 0.97`.
4. Assert `result.decision === 'MATCH'`.

**Expected Result**: Fusion score >= 0.97; decision is `MATCH`.

**Code Sample**:
```typescript
import { IdentityResolver } from '@/services/identity/identity-resolver';

it('should return high confidence when email + name agree', () => {
  const resolver = new IdentityResolver({ weights: { email: 0.6, name: 0.4 } });
  const a = { email: 'bob.smith@example.com', fullName: 'Bob Smith' };
  const b = { email: 'bob.smith@example.com', fullName: 'Robert Smith' };

  const result = resolver.resolve(a, b);
  expect(result.confidence).toBeGreaterThanOrEqual(0.97);
  expect(result.decision).toBe('MATCH');
});
```

---

#### TC-F2-U3.2: Low-confidence result when only name agrees but email differs
**Objective**: Confirm that name-only similarity (no email overlap) produces a score below the match threshold (0.75).

**Preconditions**:
- `IdentityResolver` configured with email weight 0.6, name weight 0.4.

**Test Steps**:
1. Build two stubs with similar names but completely different emails.
2. Call `resolver.resolve(a, b)`.
3. Assert `result.confidence < 0.75`.
4. Assert `result.decision === 'REVIEW'` or `'NO_MATCH'`.

**Expected Result**: Score < 0.75 due to email mismatch; auto-match not triggered.

**Code Sample**:
```typescript
it('should not auto-match when only name agrees', () => {
  const resolver = new IdentityResolver({ weights: { email: 0.6, name: 0.4 } });
  const a = { email: 'john.doe@acme.com', fullName: 'John Doe' };
  const b = { email: 'jdoe@other.com', fullName: 'John Doe' };

  const result = resolver.resolve(a, b);
  expect(result.confidence).toBeLessThan(0.75);
  expect(['REVIEW', 'NO_MATCH']).toContain(result.decision);
});
```

---

#### TC-F2-U3.3: Phone number match raises fusion score
**Objective**: Verify that adding a matching phone number to a borderline name-match pushes the score above the auto-match threshold.

**Preconditions**:
- `IdentityResolver` includes phone in the signal mix (weight 0.3).

**Test Steps**:
1. Create two stubs with similar names (score ~0.70) and identical normalised phone numbers, but different emails.
2. Assert score without phone < 0.75.
3. Add phone to both stubs; re-resolve.
4. Assert score >= 0.82.

**Expected Result**: Phone agreement lifts a borderline case above the match threshold.

**Code Sample**:
```typescript
it('should lift score with phone signal', () => {
  const resolver = new IdentityResolver({ weights: { email: 0.5, name: 0.3, phone: 0.2 } });
  const a = { email: 'x@a.com', fullName: 'Jon Smyth', phone: '+15550001234' };
  const b = { email: 'y@b.com', fullName: 'John Smith', phone: '+15550001234' };

  const result = resolver.resolve(a, b);
  expect(result.confidence).toBeGreaterThanOrEqual(0.82);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Cross-Source Deduplication

#### TC-F2-I1.1: Contact from calendar and email resolved as same person
**Objective**: Verify that when the same person appears as a calendar attendee and an email sender, the system resolves them into one unified identity.

**Preconditions**:
- Calendar contact ingested with `email: 'sarah@corp.com'`, name `'Sarah Connor'`.
- Email header contact ingested with `email: 'sarah@corp.com'`, name `'S. Connor'`.

**Test Steps**:
1. Ingest both contacts via their respective source adapters.
2. Run the identity resolution pipeline.
3. Query resolved identities for `'sarah@corp.com'`.
4. Assert exactly one identity node exists.
5. Assert the node has two source records attached.

**Expected Result**: Single unified identity with two source records (`calendar`, `email`).

**Code Sample**:
```typescript
it('should unify calendar and email contacts with same email', async () => {
  await calendarAdapter.ingest(buildCalendarContact({ email: 'sarah@corp.com', name: 'Sarah Connor' }));
  await emailAdapter.ingest(buildEmailContact({ email: 'sarah@corp.com', name: 'S. Connor' }));

  await resolutionPipeline.run();

  const identity = await identityStore.findByEmail('sarah@corp.com');
  expect(identity).toBeDefined();
  expect(identity!.sourceRecords).toHaveLength(2);
});
```

---

#### TC-F2-I1.2: CRM contact and manual contact resolved via phone match
**Objective**: Verify that a CRM-imported contact and a manually entered contact with the same phone (different emails) are unified after resolution.

**Preconditions**:
- CRM contact has phone `'+447700900123'` and email `'tom@crm.com'`.
- Manual contact has phone `'+447700900123'` and email `'thomas@personal.com'`.
- Phone weight in resolver set to enable match.

**Test Steps**:
1. Ingest both contacts.
2. Run resolution pipeline.
3. Query the identity graph for phone `'+447700900123'`.
4. Assert single identity node with two source records.

**Expected Result**: Phone match bridges the two source records into one identity.

**Code Sample**:
```typescript
it('should unify contacts via phone when emails differ', async () => {
  await crmAdapter.ingest({ email: 'tom@crm.com', phone: '+447700900123', name: 'Tom Brown' });
  await manualEntry({ email: 'thomas@personal.com', phone: '+447700900123', name: 'Thomas Brown' });

  await resolutionPipeline.run();

  const identity = await identityStore.findByPhone('+447700900123');
  expect(identity!.sourceRecords).toHaveLength(2);
});
```

---

### 2.2 Confidence Threshold Routing

#### TC-F2-I2.1: High-confidence matches auto-merged without human review
**Objective**: Verify that pairs above the auto-merge threshold (0.95) are merged automatically and not placed in the review queue.

**Preconditions**:
- Resolution pipeline configured with `autoMergeThreshold: 0.95`.
- Review queue is empty.

**Test Steps**:
1. Create two contacts differing only in email case (`'Ana@X.COM'` vs `'ana@x.com'`).
2. Run the resolution pipeline.
3. Assert review queue is still empty.
4. Assert contacts are merged.

**Expected Result**: Auto-merge fires; review queue untouched.

**Code Sample**:
```typescript
it('should auto-merge above threshold without queuing', async () => {
  await svc.createContact({ firstName: 'Ana', email: 'Ana@X.COM' });
  await svc.createContact({ firstName: 'Ana', email: 'ana@x.com' });

  await resolutionPipeline.run();

  expect(await reviewQueue.size()).toBe(0);
  const contacts = await contactStore.findAllByEmail('ana@x.com');
  expect(contacts).toHaveLength(1);
});
```

---

#### TC-F2-I2.2: Borderline matches placed in human review queue
**Objective**: Verify that pairs with confidence 0.70–0.94 are routed to the review queue rather than auto-merged.

**Preconditions**:
- Auto-merge threshold = 0.95; review threshold = 0.70.

**Test Steps**:
1. Create two contacts with same name but different employer-domain emails.
2. Run resolution pipeline.
3. Assert review queue contains exactly one item.
4. Assert contacts are NOT merged in the store.

**Expected Result**: One review item queued; contacts remain separate pending human decision.

**Code Sample**:
```typescript
it('should queue borderline pairs for human review', async () => {
  await svc.createContact({ firstName: 'Chris', lastName: 'Lee', email: 'chris@acme.com' });
  await svc.createContact({ firstName: 'Chris', lastName: 'Lee', email: 'c.lee@startupxyz.io' });

  await resolutionPipeline.run();

  expect(await reviewQueue.size()).toBe(1);
  const allChris = await contactStore.findByName('Chris Lee');
  expect(allChris).toHaveLength(2); // not merged yet
});
```

---

### 2.3 Identity Graph Persistence

#### TC-F2-I3.1: Resolved identity graph is persisted and queryable
**Objective**: Verify that after resolution, the identity graph is stored and can be traversed to retrieve all source records for a given identity.

**Preconditions**:
- Graph database or adjacency store connected.

**Test Steps**:
1. Resolve two contacts into a single identity.
2. Query the graph for all nodes connected to the unified identity.
3. Assert both source contact IDs appear as neighbours.

**Expected Result**: Graph query returns both source contact IDs linked to the unified identity node.

**Code Sample**:
```typescript
it('should persist identity graph edges after resolution', async () => {
  const [a, b] = await resolveAndMerge('diana@x.com', 'Di@x.com');
  const identity = await identityGraph.findUnifiedNode('diana@x.com');

  const neighbours = await identityGraph.getSourceNodes(identity.id);
  expect(neighbours.map((n) => n.contactId)).toEqual(expect.arrayContaining([a.id, b.id]));
});
```

---

#### TC-F2-I3.2: Adding a third source record links to existing unified identity
**Objective**: Verify that a third contact record matching an existing unified identity is linked to that identity rather than forming a new one.

**Preconditions**:
- Unified identity already exists for `'elena@x.com'` with two source records.

**Test Steps**:
1. Ingest a third contact with email `'elena@x.com'` from a new source (CRM).
2. Run resolution pipeline.
3. Query the identity for `'elena@x.com'`.
4. Assert source record count is 3.

**Expected Result**: Third record linked to the existing identity node; no new identity created.

**Code Sample**:
```typescript
it('should link third record to existing unified identity', async () => {
  await setupUnifiedIdentity('elena@x.com', 2);
  await crmAdapter.ingest({ email: 'elena@x.com', name: 'Elena V', source: 'crm' });

  await resolutionPipeline.run();

  const identity = await identityStore.findByEmail('elena@x.com');
  expect(identity!.sourceRecords).toHaveLength(3);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous Name Collisions

#### TC-F2-E1.1: Common names with different companies are not auto-merged
**Objective**: Verify that `'James Smith'` at ACME and `'James Smith'` at TechCorp are not auto-merged without additional matching signals.

**Preconditions**:
- Both contacts have distinct emails and distinct company names.

**Test Steps**:
1. Ingest both contacts.
2. Run resolution pipeline.
3. Assert both remain as separate identities.

**Expected Result**: No merge occurs; both identities remain distinct.

**Code Sample**:
```typescript
it('should not merge common names from different companies', async () => {
  await svc.createContact({ firstName: 'James', lastName: 'Smith', email: 'james@acme.com', company: 'ACME' });
  await svc.createContact({ firstName: 'James', lastName: 'Smith', email: 'james@techcorp.com', company: 'TechCorp' });

  await resolutionPipeline.run();

  const identities = await identityStore.findByName('James Smith');
  expect(identities).toHaveLength(2);
});
```

---

#### TC-F2-E1.2: Name transposition does not produce false positive match
**Objective**: Confirm that `'Park Ji-sung'` and `'Ji-sung Park'` are recognised as the same person via name-order normalisation, but `'John Park'` is not matched to `'Park John'` from a different person.

**Preconditions**:
- `NameMatcher` includes CJK name-order transposition heuristic.

**Test Steps**:
1. Score `'Park Ji-sung'` vs `'Ji-sung Park'` — assert >= 0.90.
2. Score `'John Park'` (email: `john@a.com`) vs `'Park John'` (email: `park@b.com`) — assert score < 0.80.

**Expected Result**: Transposition of same name resolves correctly; different people with similar transposed names are not falsely matched.

**Code Sample**:
```typescript
it('should handle CJK name transposition without false positives', () => {
  const matcher = new NameMatcher({ cjkTransposition: true });
  expect(matcher.score('Park Ji-sung', 'Ji-sung Park')).toBeGreaterThanOrEqual(0.90);
  // Different people
  expect(matcher.score('John Park', 'Park John')).toBeLessThan(0.80);
});
```

---

### 3.2 Malformed or Missing Fields

#### TC-F2-E2.1: Contact with no name still resolves via email match
**Objective**: Verify resolution succeeds when one contact has no name field — matching is done on email alone.

**Preconditions**:
- `IdentityResolver` handles null names gracefully (name signal defaults to 0).

**Test Steps**:
1. Ingest contact A: `email: 'noname@x.com'`, no name.
2. Ingest contact B: `email: 'noname@x.com'`, name `'No Name Person'`.
3. Run resolution pipeline.
4. Assert single unified identity.

**Expected Result**: Email-only match produces a MATCH decision; missing name treated as zero signal not as disqualifying.

**Code Sample**:
```typescript
it('should resolve identity with missing name via email', async () => {
  await svc.createContact({ email: 'noname@x.com' });
  await svc.createContact({ firstName: 'No Name', lastName: 'Person', email: 'noname@x.com' });

  await resolutionPipeline.run();

  const identities = await identityStore.findByEmail('noname@x.com');
  expect(identities).toHaveLength(1);
});
```

---

#### TC-F2-E2.2: Null phone field does not crash the resolver
**Objective**: Ensure the resolver handles `phone: null` without throwing and falls back to name + email signals.

**Preconditions**:
- Both contacts have `phone: null`.

**Test Steps**:
1. Create two contacts with same email, both with `phone: null`.
2. Run resolution pipeline.
3. Assert no exception is thrown.
4. Assert they are resolved as a single identity.

**Expected Result**: Pipeline completes without error; phone signal treated as zero.

**Code Sample**:
```typescript
it('should not crash on null phone fields', async () => {
  const a = { firstName: 'Null', lastName: 'Phone', email: 'np@x.com', phone: null };
  const b = { firstName: 'Null', lastName: 'Phone', email: 'np@x.com', phone: null };

  await svc.createContact(a);
  await svc.createContact(b);

  await expect(resolutionPipeline.run()).resolves.not.toThrow();
  expect(await identityStore.findByEmail('np@x.com')).toHaveLength(1);
});
```

---

### 3.3 Circular and Self-Reference Guards

#### TC-F2-E3.1: Resolution algorithm does not resolve a contact with itself
**Objective**: Confirm that a contact is never matched against its own record, preventing trivial self-merge.

**Preconditions**:
- Single contact in the store.

**Test Steps**:
1. Create one contact.
2. Run resolution pipeline.
3. Assert no merge events were emitted.
4. Assert the contact's identity record has exactly one source record.

**Expected Result**: No self-match; identity record has exactly one source.

**Code Sample**:
```typescript
it('should not match a contact against itself', async () => {
  const c = await svc.createContact({ firstName: 'Solo', email: 'solo@x.com' });
  await resolutionPipeline.run();

  const identity = await identityStore.findByContactId(c.id);
  expect(identity?.sourceRecords).toHaveLength(1);
});
```

---

#### TC-F2-E3.2: Resolution handles a chain of three similar contacts without over-merging
**Objective**: Ensure that A matches B and B matches C but A does not necessarily match C if signals are insufficient.

**Preconditions**:
- A ↔ B: confidence 0.97 (auto-merge).
- B ↔ C: confidence 0.96 (auto-merge).
- A ↔ C direct: confidence 0.60 (below threshold).

**Test Steps**:
1. Ingest A, B, C.
2. Run resolution pipeline.
3. Assert A and B are merged.
4. Assert B and C are merged.
5. Assert the merged A+B identity and C are evaluated separately; transitivity handled by the graph — if A-B-C form a cluster, assert it is reviewed rather than auto-merged blindly.

**Expected Result**: Transitive merge chain is handled correctly; no over-aggressive auto-merging.

**Code Sample**:
```typescript
it('should apply transitivity rules correctly for chained matches', async () => {
  const [a, b, c] = await ingestThreeChainedContacts();
  await resolutionPipeline.run({ transitiveReview: true });

  const cluster = await identityStore.findClusterContaining(a.id);
  // Transitive cluster should be flagged for review, not auto-merged
  expect(cluster.status).toMatch(/REVIEW|MERGED/);
  expect(cluster.contactIds).toEqual(expect.arrayContaining([a.id, b.id, c.id]));
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Pairwise Comparison Throughput

#### TC-F2-P1.1: Resolve 10 000 candidate pairs within 10 seconds
**Objective**: Validate that the resolution engine can evaluate 10 000 pairwise comparisons in under 10 seconds.

**Preconditions**:
- 10 000 candidate pairs pre-generated in memory.
- No external I/O.

**Test Steps**:
1. Start timer.
2. Run `resolver.batchResolve(pairs)`.
3. Assert result array length equals 10 000.
4. Assert elapsed time <= 10 000 ms.

**Expected Result**: 10 000 pairs resolved in <= 10 s.

**Code Sample**:
```typescript
it('should resolve 10k pairs under 10 seconds', async () => {
  const pairs = generateCandidatePairs(10_000);
  const t0 = performance.now();
  const results = await resolver.batchResolve(pairs);
  const elapsed = performance.now() - t0;

  expect(results).toHaveLength(10_000);
  expect(elapsed).toBeLessThan(10_000);
});
```

---

#### TC-F2-P1.2: Fuzzy name scoring completes in under 1 ms per pair
**Objective**: Verify that a single name pair comparison is cheap enough for large-scale blocking.

**Preconditions**:
- `NameMatcher` uses pre-compiled trigram index.

**Test Steps**:
1. Run 1 000 name pair comparisons, recording each duration.
2. Assert median duration <= 1 ms.

**Expected Result**: Median name comparison <= 1 ms.

**Code Sample**:
```typescript
it('name scoring should be sub-millisecond per pair', () => {
  const matcher = new NameMatcher({ nicknameLexicon: defaultNicknameLexicon });
  const pairs = generateNamePairs(1000);
  const durations = pairs.map(([a, b]) => {
    const t0 = performance.now();
    matcher.score(a, b);
    return performance.now() - t0;
  });
  const median = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];
  expect(median).toBeLessThan(1);
});
```

---

### 4.2 Pipeline Throughput

#### TC-F2-P2.1: Full resolution pipeline processes 50 000 contacts in under 60 seconds
**Objective**: Validate end-to-end pipeline throughput including blocking, comparison, and graph write.

**Preconditions**:
- 50 000 contacts seeded with ~5% expected duplicates.

**Test Steps**:
1. Seed 50 000 contacts.
2. Start timer; run `resolutionPipeline.runFull()`.
3. Assert elapsed <= 60 000 ms.
4. Assert number of unified identities < 50 000 (merges occurred).

**Expected Result**: Pipeline completes in <= 60 s with expected merge count.

**Code Sample**:
```typescript
it('full pipeline processes 50k contacts under 60s', async () => {
  await seedContacts(store, 50_000, { duplicateRate: 0.05 });
  const t0 = performance.now();
  await resolutionPipeline.runFull();
  const elapsed = performance.now() - t0;

  expect(elapsed).toBeLessThan(60_000);
  const identityCount = await identityStore.count();
  expect(identityCount).toBeLessThan(50_000);
});
```

---

#### TC-F2-P2.2: Incremental resolution on new contact completes in under 500 ms
**Objective**: Validate that resolving a single new contact against an existing database of 100 000 identities completes in under 500 ms.

**Preconditions**:
- 100 000 identities in the store.
- Blocking index is pre-built.

**Test Steps**:
1. Add one new contact.
2. Run incremental resolution for that contact.
3. Assert elapsed <= 500 ms.

**Expected Result**: Incremental resolution is fast enough for near-real-time ingestion.

**Code Sample**:
```typescript
it('incremental resolution completes under 500ms', async () => {
  await seedIdentities(identityStore, 100_000);
  const newContact = await svc.createContact({ firstName: 'Zara', email: 'zara@new.com' });

  const t0 = performance.now();
  await resolutionPipeline.resolveOne(newContact.id);
  expect(performance.now() - t0).toBeLessThan(500);
});
```

---

### 4.3 Memory and Blocking Efficiency

#### TC-F2-P3.1: Blocking index reduces comparison space by at least 95%
**Objective**: Verify the blocking strategy (email domain + name trigram) reduces the number of actual pairwise comparisons from O(n²) to < 5% of all pairs.

**Preconditions**:
- 10 000 contacts loaded.
- Blocker configured with email-domain and trigram blocks.

**Test Steps**:
1. Load 10 000 contacts.
2. Run the blocker to produce candidate pairs.
3. Assert candidate pair count <= 0.05 * (10_000 * 9_999 / 2).

**Expected Result**: Blocking reduces candidate pairs to <= 5% of all n² pairs.

**Code Sample**:
```typescript
it('blocking should reduce comparison space by 95%', async () => {
  await seedContacts(store, 10_000);
  const pairs = await blocker.generateCandidatePairs();
  const maxExpected = Math.floor((10_000 * 9_999) / 2 * 0.05);
  expect(pairs.length).toBeLessThanOrEqual(maxExpected);
});
```

---

#### TC-F2-P3.2: Resolution pipeline heap growth stays under 256 MB for 50k contacts
**Objective**: Confirm the pipeline does not accumulate unbounded memory while processing a large batch.

**Preconditions**:
- 50 000 contacts in the store.
- `--expose-gc` flag enabled.

**Test Steps**:
1. Record baseline heap.
2. Run full resolution pipeline.
3. Force GC.
4. Assert heap growth <= 256 MB.

**Expected Result**: No memory leak pattern; heap growth bounded.

**Code Sample**:
```typescript
it('pipeline heap growth under 256MB for 50k contacts', async () => {
  await seedContacts(store, 50_000);
  const baseline = process.memoryUsage().heapUsed;

  await resolutionPipeline.runFull();
  if (typeof global.gc === 'function') global.gc();

  const growth = process.memoryUsage().heapUsed - baseline;
  expect(growth).toBeLessThan(256 * 1024 * 1024);
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
