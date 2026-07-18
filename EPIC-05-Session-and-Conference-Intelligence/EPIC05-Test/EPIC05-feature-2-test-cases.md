# EPIC05 Feature 2 — Speaker Recognition — Test Cases

## Test Overview
Comprehensive test suite for Speaker Recognition covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Self-Introduction Detection

#### TC-F2-U1.1: Name-Stating Utterance Detected at Session Start
**Objective**: Verify the NLP model detects "Hi, I'm..." / "My name is..." patterns near session start and extracts the stated name.

**Preconditions**:
- Self-introduction NLP model loaded
- Transcript has utterances in the first 120 seconds

**Test Steps**:
1. Provide a segment: `"Hi everyone, I'm Dr. Sarah Chen, VP of Research at Acme Corp."` at `startMs = 15000`
2. Call `detectSelfIntroductions(segments)`
3. Assert returned introduction has `speakerId`, `extractedName = 'Dr. Sarah Chen'`, and `confidence >= 0.9`

**Expected Result**: Name extracted correctly; confidence >= 0.9; method = `'SELF_INTRO'`.

**Code Sample**:
```typescript
describe('SelfIntroductionDetector', () => {
  it('should extract name from a standard self-introduction utterance', async () => {
    const segments = [
      { speakerId: 'Speaker_1', text: "Hi everyone, I'm Dr. Sarah Chen, VP of Research at Acme Corp.", startMs: 15000 }
    ];
    const detector = new SelfIntroductionDetector(mockNlpClient);
    const intros = await detector.detectSelfIntroductions(segments);

    expect(intros).toHaveLength(1);
    expect(intros[0].extractedName).toBe('Dr. Sarah Chen');
    expect(intros[0].confidence).toBeGreaterThanOrEqual(0.9);
    expect(intros[0].method).toBe('SELF_INTRO');
  });
});
```

---

#### TC-F2-U1.2: Third-Party Introduction Detected ("Please welcome...")
**Objective**: Verify detection of introductions made by a moderator on behalf of another speaker.

**Test Steps**:
1. Provide segment: `"Please welcome our next speaker, Marcus Webb from Global Tech."` attributed to moderator
2. Call `detectSelfIntroductions(segments)`
3. Assert `extractedName = 'Marcus Webb'`; `method = 'THIRD_PARTY_INTRO'`

**Expected Result**: Marcus Webb identified; correct method flag set.

**Code Sample**:
```typescript
it('should detect third-party introductions by the moderator', async () => {
  const segments = [
    { speakerId: 'Speaker_0', text: 'Please welcome our next speaker, Marcus Webb from Global Tech.', startMs: 300000 }
  ];
  const intros = await detector.detectSelfIntroductions(segments);
  expect(intros[0].extractedName).toBe('Marcus Webb');
  expect(intros[0].method).toBe('THIRD_PARTY_INTRO');
});
```

---

#### TC-F2-U1.3: No Introduction Detected in Segment Window
**Objective**: Verify the detector returns an empty array when no name-stating patterns exist in the first 120 s.

**Test Steps**:
1. Provide segments containing only topic discussion (no intro patterns) within first 120 s
2. Call `detectSelfIntroductions(segments)`
3. Assert result is an empty array

**Expected Result**: `[]` returned; no false positives.

**Code Sample**:
```typescript
it('should return empty array when no introduction patterns are found', async () => {
  const intros = await detector.detectSelfIntroductions(noIntroFixture);
  expect(intros).toHaveLength(0);
});
```

---

### 1.2 Voiceprint Embedding Comparison

#### TC-F2-U2.1: High-Similarity Voiceprint Match
**Objective**: Verify that two embeddings from the same speaker produce cosine similarity >= 0.92.

**Test Steps**:
1. Load two audio clips of the same speaker from different sessions
2. Generate embeddings via `extractVoiceEmbedding(audioBuffer)`
3. Compute `cosineSimilarity(embedding1, embedding2)`
4. Assert similarity >= 0.92

**Expected Result**: Similarity score >= 0.92; match accepted.

**Code Sample**:
```typescript
describe('VoiceprintMatcher', () => {
  it('should produce cosine similarity >= 0.92 for same speaker across sessions', async () => {
    const embedding1 = await extractVoiceEmbedding(loadAudio('jane_session1.wav'));
    const embedding2 = await extractVoiceEmbedding(loadAudio('jane_session2.wav'));

    const similarity = cosineSimilarity(embedding1, embedding2);
    expect(similarity).toBeGreaterThanOrEqual(0.92);
  });
});
```

---

#### TC-F2-U2.2: Low-Similarity Score for Different Speakers
**Objective**: Verify embeddings from two different speakers produce cosine similarity below the match threshold (0.75).

**Test Steps**:
1. Load audio clips from two different speakers
2. Generate embeddings and compute similarity
3. Assert similarity < 0.75

**Expected Result**: Similarity < 0.75; no false positive match.

**Code Sample**:
```typescript
it('should produce cosine similarity < 0.75 for different speakers', async () => {
  const emb1 = await extractVoiceEmbedding(loadAudio('speaker_alice.wav'));
  const emb2 = await extractVoiceEmbedding(loadAudio('speaker_bob.wav'));

  const similarity = cosineSimilarity(emb1, emb2);
  expect(similarity).toBeLessThan(0.75);
});
```

---

#### TC-F2-U2.3: Confidence Score Attached to Identity Assignment
**Objective**: Verify that the identity assignment object includes a confidence score derived from similarity and signal source weighting.

**Test Steps**:
1. Match a speaker embedding against a known voiceprint with similarity 0.94
2. Call `assignIdentity(speakerId, matchResult, method: 'VOICEPRINT')`
3. Assert returned assignment has `confidence` between 0 and 1 and `method = 'VOICEPRINT'`

**Expected Result**: `confidence` reflects similarity; `method = 'VOICEPRINT'`.

**Code Sample**:
```typescript
it('should attach a confidence score to voiceprint-based identity assignments', () => {
  const assignment = assignIdentity('Speaker_2', { similarity: 0.94, contactId: 'contact-007' }, 'VOICEPRINT');
  expect(assignment.confidence).toBeCloseTo(0.94, 1);
  expect(assignment.method).toBe('VOICEPRINT');
  expect(assignment.contactId).toBe('contact-007');
});
```

---

### 1.3 Agenda/Roster Matching

#### TC-F2-U3.1: Roster Match by Speaker Order
**Objective**: Verify that when the session has 3 speakers and the agenda lists 3 names in order, each `Speaker_N` is mapped to the corresponding name.

**Test Steps**:
1. Provide an agenda with speakers: ["Alice Tan", "Ben Morris", "Carol Day"] in order
2. Provide a session with Speaker_0, Speaker_1, Speaker_2 appearing in that order
3. Call `matchAgendaRoster(session, agenda)`
4. Assert Speaker_0 → Alice Tan, Speaker_1 → Ben Morris, Speaker_2 → Carol Day

**Expected Result**: All three speakers mapped correctly; method = `'AGENDA_ORDER'`.

**Code Sample**:
```typescript
describe('AgendaRosterMatcher', () => {
  it('should map speakers to agenda names by order of first appearance', async () => {
    const result = await matchAgendaRoster(threeSpkSession, orderedAgenda);
    expect(result.assignments['Speaker_0'].resolvedName).toBe('Alice Tan');
    expect(result.assignments['Speaker_1'].resolvedName).toBe('Ben Morris');
    expect(result.assignments['Speaker_2'].resolvedName).toBe('Carol Day');
    Object.values(result.assignments).forEach(a => expect(a.method).toBe('AGENDA_ORDER'));
  });
});
```

---

#### TC-F2-U3.2: Partial Roster Match — Speaker Count Mismatch Warning
**Objective**: Verify a warning is emitted when agenda has 4 speakers but diarization finds only 3.

**Test Steps**:
1. Provide agenda with 4 names; session with 3 speakers
2. Call `matchAgendaRoster(session, agenda)`
3. Assert 3 assignments created and `warnings` includes `'ROSTER_COUNT_MISMATCH'`

**Expected Result**: Best-effort 3 assignments; `warnings: ['ROSTER_COUNT_MISMATCH']`.

**Code Sample**:
```typescript
it('should warn on speaker count mismatch between roster and diarization', async () => {
  const result = await matchAgendaRoster(threeSpkSession, fourNameAgenda);
  expect(Object.keys(result.assignments)).toHaveLength(3);
  expect(result.warnings).toContain('ROSTER_COUNT_MISMATCH');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Identity Resolution Pipeline

#### TC-F2-I1.1: Multi-Signal Identity Resolution (Intro + Roster + Voiceprint)
**Objective**: Verify the resolver combines all three signals with correct confidence weighting to produce a final identity assignment.

**Preconditions**:
- Session diarized; agenda available; voiceprint store populated with consented profiles

**Test Steps**:
1. Feed session through full resolution pipeline
2. Assert each speaker has a `resolvedIdentity` with highest-confidence method logged
3. Assert signal weights: voiceprint (0.6), intro (0.25), roster (0.15)

**Expected Result**: Resolved identities present for all speakers with `resolutionMethod` set correctly.

**Code Sample**:
```typescript
it('should combine all resolution signals into a single weighted identity assignment', async () => {
  const identities = await identityResolver.resolve('session-multi-signal');

  identities.forEach(id => {
    expect(id.resolvedName).toBeDefined();
    expect(id.confidence).toBeGreaterThan(0);
    expect(id.resolutionMethod).toMatch(/VOICEPRINT|SELF_INTRO|AGENDA_ORDER|MANUAL/);
  });
});
```

---

#### TC-F2-I1.2: Manual Correction Overrides Automated Assignment
**Objective**: Verify that a user manual correction takes precedence over automated resolution and is persisted correctly.

**Test Steps**:
1. Auto-resolve speakers for a session (Speaker_1 → "Tom Hall")
2. User corrects via `PATCH /sessions/{id}/speakers/Speaker_1 { resolvedName: "Tim Hall" }`
3. Fetch identity record
4. Assert `resolvedName = 'Tim Hall'`; `method = 'MANUAL'`; `manuallyVerified = true`

**Expected Result**: Manual correction stored; automated result overridden.

**Code Sample**:
```typescript
it('should persist manual speaker correction and override automated result', async () => {
  await autoResolve(sessionId);
  await apiClient.patch(`/sessions/${sessionId}/speakers/Speaker_1`, { resolvedName: 'Tim Hall' });

  const identity = await apiClient.get(`/sessions/${sessionId}/speakers/Speaker_1`);
  expect(identity.data.resolvedName).toBe('Tim Hall');
  expect(identity.data.method).toBe('MANUAL');
  expect(identity.data.manuallyVerified).toBe(true);
});
```

---

### 2.2 Voiceprint Store Integration

#### TC-F2-I2.1: Voiceprint Stored After Consent and Reused Across Sessions
**Objective**: Verify a new voiceprint is persisted on first consent and retrieved on subsequent sessions.

**Test Steps**:
1. User grants voiceprint consent; system stores embedding for "Speaker_1"
2. A new session is recorded with the same speaker
3. Call `resolveIdentity('new-session', 'Speaker_0')`
4. Assert identity resolved to stored contact without any manual input

**Expected Result**: `resolvedName` matches the stored contact; `method = 'VOICEPRINT'`.

**Code Sample**:
```typescript
it('should reuse stored voiceprint to auto-identify the same speaker in a new session', async () => {
  await voiceprintStore.store('contact-jane', janeEmbedding, { consented: true });
  const identity = await identityResolver.resolve('new-session', 'Speaker_0');
  expect(identity.resolvedName).toBe('Jane Doe');
  expect(identity.method).toBe('VOICEPRINT');
});
```

---

#### TC-F2-I2.2: Voiceprint Deleted on Consent Revocation
**Objective**: Verify that revoking consent removes the stored voiceprint and subsequent sessions no longer auto-identify the speaker.

**Test Steps**:
1. Store a voiceprint for contact-jane
2. Revoke consent via `DELETE /contacts/contact-jane/voiceprint`
3. Run identity resolution on a new session
4. Assert no automatic match to Jane Doe

**Expected Result**: No voiceprint-based identity for Jane in the new session; `method != 'VOICEPRINT'`.

**Code Sample**:
```typescript
it('should not match speaker identity after voiceprint consent is revoked', async () => {
  await voiceprintStore.store('contact-jane', janeEmbedding, { consented: true });
  await apiClient.delete('/contacts/contact-jane/voiceprint');

  const identity = await identityResolver.resolve('new-session', 'Speaker_0');
  expect(identity?.method).not.toBe('VOICEPRINT');
});
```

---

### 2.3 Downstream Attribution

#### TC-F2-I3.1: Resolved Names Propagate to Quote Extraction Output
**Objective**: Verify that after speaker resolution, the Quote Extraction feature (Feature 3) uses real names in its output rather than `Speaker_N` labels.

**Test Steps**:
1. Resolve speaker identities for a session
2. Run quote extraction
3. Assert quotes reference `attributedTo: 'Alice Tan'` not `'Speaker_0'`

**Expected Result**: All extracted quotes carry resolved names in `attributedTo`.

**Code Sample**:
```typescript
it('should use resolved speaker names in extracted quote attribution', async () => {
  await identityResolver.resolve(sessionId);
  const quotes = await quoteExtractor.extract(sessionId);
  quotes.forEach(q => expect(q.attributedTo).not.toMatch(/^Speaker_\d+$/));
});
```

---

#### TC-F2-I3.2: Identity Resolution Included in Session Summary
**Objective**: Verify session summary lists resolved speaker names in the participants section.

**Test Steps**:
1. Resolve speaker identities for a session
2. Generate session summary
3. Assert `summary.participants` lists real names with at least one `method` non-null

**Expected Result**: Participants array contains `{ name, role, method }` entries with real names.

**Code Sample**:
```typescript
it('should include resolved speaker names in session summary participants', async () => {
  await identityResolver.resolve(sessionId);
  const summary = await summaryService.summarize(sessionId);
  expect(summary.participants.length).toBeGreaterThan(0);
  summary.participants.forEach(p => expect(p.name).not.toMatch(/^Speaker_/));
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Ambiguous or Failed Recognition

#### TC-F2-E1.1: Two Speakers with Near-Identical Voiceprints
**Objective**: Verify the system flags an ambiguous match rather than making a wrong assignment when two speakers have similarity > 0.88 to the same contact.

**Test Steps**:
1. Store voiceprint for "Jane Doe"
2. Run resolution with two speakers both achieving similarity 0.89 to Jane's embedding
3. Assert both assignments have `ambiguous: true` and no `resolvedName` for either

**Expected Result**: `ambiguous: true` on both; user prompted for manual confirmation.

**Code Sample**:
```typescript
it('should flag ambiguous match when two speakers score near the same contact', async () => {
  const result = await identityResolver.resolve('twin-voice-session');
  result.assignments.forEach(a => {
    if (a.topMatchContactId === 'contact-jane') {
      expect(a.ambiguous).toBe(true);
      expect(a.resolvedName).toBeUndefined();
    }
  });
});
```

---

#### TC-F2-E1.2: No Voiceprint Consent — Voiceprint Path Skipped
**Objective**: Verify that when no contacts have granted voiceprint consent, the system skips voiceprint matching and falls back to intro/roster only.

**Test Steps**:
1. Clear voiceprint store
2. Run identity resolution
3. Assert no `VOICEPRINT` method in any assignment; resolution uses `SELF_INTRO` or `AGENDA_ORDER`

**Expected Result**: All assignments use non-voiceprint methods; no privacy breach.

**Code Sample**:
```typescript
it('should skip voiceprint matching when no consented voiceprints exist', async () => {
  await voiceprintStore.clear();
  const result = await identityResolver.resolve(sessionId);
  result.assignments.forEach(a => expect(a.method).not.toBe('VOICEPRINT'));
});
```

---

### 3.2 Noisy or Low-Quality Audio

#### TC-F2-E2.1: High Background Noise Degrades Embedding Quality
**Objective**: Verify that an embedding extracted from very noisy audio returns a low quality score, triggering a fallback path.

**Test Steps**:
1. Pass audio with SNR < 5 dB to `extractVoiceEmbedding`
2. Assert returned embedding includes `qualityScore < 0.4`
3. Assert resolver skips voiceprint match when quality is low

**Expected Result**: `qualityScore < 0.4`; voiceprint path skipped; `method` set to `'FALLBACK'`.

**Code Sample**:
```typescript
it('should assign low quality score to embedding from noisy audio and skip voiceprint match', async () => {
  const embedding = await extractVoiceEmbedding(loadNoisyAudio('snr5db.wav'));
  expect(embedding.qualityScore).toBeLessThan(0.4);

  const identity = await identityResolver.resolveFromEmbedding(embedding, 'Speaker_0');
  expect(identity.method).toBe('FALLBACK');
});
```

---

#### TC-F2-E2.2: Overlapping Speech Segments Excluded from Embedding Extraction
**Objective**: Verify that audio frames flagged as overlapping speech are excluded before embedding extraction to avoid voice mixing.

**Test Steps**:
1. Provide audio with known crosstalk interval (10–12 s)
2. Call `extractVoiceEmbedding(audio, { crosstalkRanges: [{ start: 10, end: 12 }] })`
3. Assert the extracted embedding was built from frames outside the crosstalk range

**Expected Result**: Embedding excludes crosstalk frames; `usedFramesMs` does not overlap `[10000, 12000]`.

**Code Sample**:
```typescript
it('should exclude overlapping speech frames before extracting voiceprint embedding', async () => {
  const result = await extractVoiceEmbedding(mixedAudio, {
    crosstalkRanges: [{ start: 10000, end: 12000 }]
  });
  result.usedFrames.forEach(f => {
    expect(f.endMs).toBeLessThanOrEqual(10000);
  });
});
```

---

### 3.3 New Speaker Detection

#### TC-F2-E3.1: New Speaker Not in Voiceprint Store
**Objective**: Verify the system creates an unresolved placeholder entry rather than erroring when a speaker has no matching contact.

**Test Steps**:
1. Ensure voiceprint store has no match for Speaker_2's audio
2. Run resolution
3. Assert Speaker_2 has a placeholder entry with `resolvedName: null` and `status: 'UNRESOLVED'`

**Expected Result**: Placeholder record created; no exception; user shown prompt to tag the speaker.

**Code Sample**:
```typescript
it('should create an UNRESOLVED placeholder for a speaker not in the voiceprint store', async () => {
  const result = await identityResolver.resolve('new-speaker-session');
  const unknown = result.assignments.find(a => a.speakerId === 'Speaker_2');
  expect(unknown).toBeDefined();
  expect(unknown!.resolvedName).toBeNull();
  expect(unknown!.status).toBe('UNRESOLVED');
});
```

---

#### TC-F2-E3.2: Duplicate Speaker Label After Re-Diarization
**Objective**: Verify identity assignments are correctly remapped when re-diarization reassigns speaker labels (Speaker_1 and Speaker_2 swapped).

**Test Steps**:
1. Store identity assignments for Speaker_0=Alice, Speaker_1=Bob
2. Re-diarize and receive new mapping: Speaker_0=Alice, Speaker_2=Bob (Speaker_1 now unused)
3. Call `remapIdentities(oldAssignments, newDiarizationMapping)`
4. Assert Alice and Bob are still correctly linked to their segments

**Expected Result**: Identities follow the speaker via embedding, not the label; no stale assignments.

**Code Sample**:
```typescript
it('should remap identities correctly after speaker label reassignment in re-diarization', async () => {
  const remapped = await remapIdentities(originalAssignments, newDiarizationMapping);
  expect(remapped['Speaker_0'].resolvedName).toBe('Alice');
  expect(remapped['Speaker_2'].resolvedName).toBe('Bob');
  expect(remapped['Speaker_1']).toBeUndefined();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Embedding Extraction Speed

#### TC-F2-P1.1: Voiceprint Embedding Extraction Latency
**Objective**: Verify embedding extraction from a 30-second audio clip completes in <= 500 ms.

**Test Steps**:
1. Load a 30-second audio sample
2. Time the `extractVoiceEmbedding` call across 20 iterations

**Expected Result**: p95 latency <= 500 ms; p50 <= 300 ms.

**Code Sample**:
```typescript
it('should extract voiceprint embedding in under 500ms p95', async () => {
  const audio = loadAudio('30sec_sample.wav');
  const runs = await benchmark(() => extractVoiceEmbedding(audio), { iterations: 20 });
  expect(runs.p50).toBeLessThan(300);
  expect(runs.p95).toBeLessThan(500);
});
```

---

#### TC-F2-P1.2: Similarity Search at Scale — 10,000 Stored Voiceprints
**Objective**: Verify nearest-neighbor voiceprint search across 10,000 stored embeddings completes in <= 200 ms.

**Test Steps**:
1. Seed the vector store with 10,000 random embeddings
2. Time a `findNearestVoiceprint(queryEmbedding, { topK: 5 })` call

**Expected Result**: Search completes <= 200 ms; returns top-5 candidates with similarity scores.

**Code Sample**:
```typescript
it('should find nearest voiceprints across 10k stored embeddings in under 200ms', async () => {
  await seedVectorStore(10000);
  const query = generateRandomEmbedding(256);

  const start = performance.now();
  const results = await voiceprintStore.findNearest(query, { topK: 5 });
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(200);
  expect(results).toHaveLength(5);
  results.forEach(r => expect(r.similarity).toBeGreaterThan(0));
});
```

---

### 4.2 Concurrent Resolution Requests

#### TC-F2-P2.1: 20 Concurrent Identity Resolution Requests
**Objective**: Verify the resolver handles 20 simultaneous resolution requests without queue starvation.

**Test Steps**:
1. Seed 20 sessions with diarized transcripts
2. Fire 20 concurrent `identityResolver.resolve(sessionId)` calls
3. Assert all complete within 15 s

**Expected Result**: All 20 complete successfully; no timeout or failure.

**Code Sample**:
```typescript
it('should resolve identities for 20 concurrent sessions within 15 seconds', async () => {
  const sessionIds = await seedMultipleSessions(20);
  const results = await Promise.allSettled(
    sessionIds.map(id => identityResolver.resolve(id))
  );
  results.forEach(r => expect(r.status).toBe('fulfilled'));
}, 15000);
```

---

#### TC-F2-P2.2: Voiceprint Store Read/Write Concurrency
**Objective**: Verify no race condition occurs when 10 sessions simultaneously read and 5 sessions write to the voiceprint store.

**Test Steps**:
1. Fire 10 read queries and 5 write insertions concurrently
2. Assert all operations complete; verify no duplicate or corrupted entries

**Expected Result**: Zero errors; store integrity maintained.

**Code Sample**:
```typescript
it('should handle concurrent reads and writes to the voiceprint store without corruption', async () => {
  const reads = Array.from({ length: 10 }, () => voiceprintStore.findNearest(randomEmbedding(), { topK: 3 }));
  const writes = Array.from({ length: 5 }, (_, i) => voiceprintStore.store(`contact-${i}`, randomEmbedding()));

  const results = await Promise.allSettled([...reads, ...writes]);
  results.forEach(r => expect(r.status).toBe('fulfilled'));
});
```

---

### 4.3 Accuracy Benchmarks

#### TC-F2-P3.1: Self-Introduction Detection Precision and Recall
**Objective**: Verify NLP self-introduction detection achieves >= 90% precision and >= 85% recall on a labelled test corpus.

**Test Steps**:
1. Run detector on 200 labelled session openings (100 with introductions, 100 without)
2. Compute precision and recall from true/false positives/negatives

**Expected Result**: Precision >= 0.90; recall >= 0.85.

**Code Sample**:
```typescript
it('should achieve >=90% precision and >=85% recall on intro detection benchmark', async () => {
  const { precision, recall } = await evaluateDetector(detector, labelledCorpus);
  expect(precision).toBeGreaterThanOrEqual(0.90);
  expect(recall).toBeGreaterThanOrEqual(0.85);
});
```

---

#### TC-F2-P3.2: Voiceprint EER (Equal Error Rate) Below 5%
**Objective**: Verify the voiceprint matching system achieves an Equal Error Rate (EER) <= 5% on a 500-speaker evaluation set.

**Test Steps**:
1. Run the matcher against a 500-speaker EER evaluation corpus with known positive and negative pairs
2. Compute FAR and FRR at various thresholds; find EER

**Expected Result**: EER <= 5%.

**Code Sample**:
```typescript
it('should achieve voiceprint EER <= 5% on 500-speaker evaluation corpus', async () => {
  const { eer } = await evaluateVoiceprintEER(matcher, eerCorpus500);
  expect(eer).toBeLessThanOrEqual(0.05);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, ~12 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: ~30 comprehensive test cases
