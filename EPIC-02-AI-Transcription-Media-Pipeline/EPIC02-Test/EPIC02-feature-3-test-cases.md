# EPIC02 Feature 3 — Speaker Diarization — Test Cases

## Test Overview
Comprehensive test suite for Speaker Diarization covering unit tests, integration tests, edge cases, and performance validation. This feature identifies and labels individual speakers in multi-party audio, assigns persistent speaker IDs, detects overlapping speech, and attributes transcript segments to the correct speaker.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Speaker Embedding Extraction

#### TC-F3-U1.1: Speaker Embedding Vector Shape and Normalization
**Objective**: Verify the speaker encoder produces a unit-normalized embedding vector of the correct dimensionality (256-d) from a short audio segment.

**Preconditions**:
- `SpeakerEncoder` model loaded
- 2-second audio segment available at 16kHz

**Test Steps**:
1. Call `encoder.embed(twoSecondSegment)`
2. Assert returned embedding is a `Float32Array` of length 256
3. Assert L2 norm of the embedding is 1.0 ± 0.001

**Expected Result**: Embedding has shape `[256]`; L2 norm = 1.0 within floating-point tolerance.

**Code Sample**:
```typescript
describe('SpeakerEncoder', () => {
  it('should produce a 256-d unit-normalized embedding', async () => {
    const encoder = new SpeakerEncoder(mockEmbeddingModel);
    const embedding = await encoder.embed(twoSecondAudioSegment);

    expect(embedding).toBeInstanceOf(Float32Array);
    expect(embedding.length).toBe(256);

    const l2Norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(l2Norm).toBeCloseTo(1.0, 3);
  });
});
```

---

#### TC-F3-U1.2: Same-Speaker Similarity Score > 0.85
**Objective**: Verify that cosine similarity between two embeddings from the same speaker exceeds 0.85.

**Test Steps**:
1. Embed two different 2-second segments from speaker A
2. Compute cosine similarity between the two embeddings
3. Assert similarity > 0.85

**Expected Result**: Cosine similarity between same-speaker embeddings > 0.85.

**Code Sample**:
```typescript
it('should produce high cosine similarity for same speaker', async () => {
  const [seg1, seg2] = speakerAFixture.twoSegments;
  const [emb1, emb2] = await Promise.all([encoder.embed(seg1), encoder.embed(seg2)]);

  const similarity = cosineSimilarity(emb1, emb2);
  expect(similarity).toBeGreaterThan(0.85);
});
```

---

#### TC-F3-U1.3: Different-Speaker Similarity Score < 0.5
**Objective**: Verify that cosine similarity between embeddings from two distinct speakers is below 0.5.

**Test Steps**:
1. Embed a segment from speaker A and a segment from speaker B
2. Compute cosine similarity
3. Assert similarity < 0.5

**Expected Result**: Cross-speaker cosine similarity < 0.5, indicating clear speaker separation.

**Code Sample**:
```typescript
it('should produce low cosine similarity for different speakers', async () => {
  const embA = await encoder.embed(speakerAFixture.segment1);
  const embB = await encoder.embed(speakerBFixture.segment1);

  const similarity = cosineSimilarity(embA, embB);
  expect(similarity).toBeLessThan(0.5);
});
```

---

### 1.2 Speaker Clustering and ID Assignment

#### TC-F3-U2.1: Two-Speaker Clustering Accuracy
**Objective**: Verify the clustering algorithm correctly separates 2-speaker audio into exactly 2 speaker clusters.

**Test Steps**:
1. Feed 20 segments alternating between speaker A and speaker B
2. Run `clusterer.cluster(embeddings)`
3. Assert exactly 2 clusters returned
4. Assert all speaker-A segments in cluster 1 and all speaker-B segments in cluster 2 (or vice versa)

**Expected Result**: 2 clusters; cluster purity >= 95%; no speaker-A segment assigned to speaker-B cluster.

**Code Sample**:
```typescript
describe('SpeakerClusterer', () => {
  it('should cluster 2-speaker audio into exactly 2 groups', async () => {
    const embeddings = await Promise.all(twoSpeakerFixture.segments.map(s => encoder.embed(s)));
    const clusters = clusterer.cluster(embeddings, { maxSpeakers: 4 });

    expect(clusters.length).toBe(2);

    const speakerACluster = clusters.find(c => c.includes(twoSpeakerFixture.speakerAIndices[0]));
    expect(speakerACluster).toBeDefined();
    twoSpeakerFixture.speakerAIndices.forEach(i => expect(speakerACluster!).toContain(i));
  });
});
```

---

#### TC-F3-U2.2: Persistent Speaker ID Assignment Across Session
**Objective**: Verify that a speaker identified in the first 10 seconds is assigned the same `speakerId` when encountered again at 5 minutes into the session.

**Test Steps**:
1. Process segment from speaker A at t=5s → receive `speakerId: 'SPK-0001'`
2. Process a long silence segment
3. Process segment from speaker A at t=305s
4. Assert returned `speakerId` is still `'SPK-0001'`

**Expected Result**: `speakerId` for speaker A is consistent across the full session duration.

**Code Sample**:
```typescript
it('should assign a persistent speaker ID across session duration', async () => {
  const diarizer = new SpeakerDiarizer(encoder, clusterer);

  const result1 = await diarizer.processSegment(speakerAEarly, { sessionId: 'sess-pers-01', offsetMs: 5000 });
  const result2 = await diarizer.processSegment(speakerALate, { sessionId: 'sess-pers-01', offsetMs: 305000 });

  expect(result1.speakerId).toBe(result2.speakerId);
});
```

---

#### TC-F3-U2.3: New Speaker Added Mid-Session
**Objective**: Verify that when a new, previously unseen speaker joins mid-session, they are assigned a new unique `speakerId`.

**Test Steps**:
1. Process segments from speakers A and B, establishing IDs
2. Process a segment from speaker C (not previously seen)
3. Assert speaker C receives a new `speakerId` not equal to A's or B's

**Expected Result**: Speaker C receives a distinct `speakerId`; total unique speaker count increases from 2 to 3.

**Code Sample**:
```typescript
it('should assign a new speakerId to a previously unseen speaker', async () => {
  const resultA = await diarizer.processSegment(speakerASegment, sessionCtx);
  const resultB = await diarizer.processSegment(speakerBSegment, sessionCtx);
  const resultC = await diarizer.processSegment(speakerCSegment, sessionCtx);

  expect(resultC.speakerId).not.toBe(resultA.speakerId);
  expect(resultC.speakerId).not.toBe(resultB.speakerId);
  expect(diarizer.speakerCount(sessionCtx.sessionId)).toBe(3);
});
```

---

### 1.3 Overlap Detection

#### TC-F3-U3.1: Overlapping Speech Detection Flag
**Objective**: Verify the diarizer correctly identifies and flags audio segments containing two simultaneous speakers.

**Test Steps**:
1. Synthesize an overlap segment by mixing speaker A and speaker B audio
2. Process the mixed segment through the diarizer
3. Assert returned result has `overlapDetected: true`
4. Assert both speaker IDs are listed in `result.speakers`

**Expected Result**: `overlapDetected: true`; `result.speakers` contains both `speakerId` values.

**Code Sample**:
```typescript
describe('OverlapDetection', () => {
  it('should detect and flag overlapping speech from two speakers', async () => {
    const overlap = mixAudioSegments(speakerASegment, speakerBSegment);
    const result = await diarizer.processSegment(overlap, sessionCtx);

    expect(result.overlapDetected).toBe(true);
    expect(result.speakers).toContain(resultA.speakerId);
    expect(result.speakers).toContain(resultB.speakerId);
  });
});
```

---

#### TC-F3-U3.2: Non-Overlapping Segment Not Flagged
**Objective**: Verify that a clean single-speaker segment is never incorrectly flagged as overlapping.

**Test Steps**:
1. Process 10 clean single-speaker segments
2. Assert none have `overlapDetected: true`

**Expected Result**: All 10 clean segments have `overlapDetected: false`; false positive rate = 0%.

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Diarization and Transcription Co-processing

#### TC-F3-I1.1: Diarized Speaker Labels Attached to Transcript Segments
**Objective**: Verify that each transcript segment in the final output carries the correct `speakerId` label assigned by the diarizer.

**Preconditions**:
- Full pipeline: ingestion → diarization → transcription → storage

**Test Steps**:
1. Process 2-speaker 30-second audio through the pipeline
2. Query `TranscriptStore.getSegments(sessionId)`
3. Assert each segment has a non-null `speakerId`
4. Assert at least 2 distinct `speakerId` values across segments

**Expected Result**: All segments have `speakerId`; >= 2 distinct speaker IDs present in the segment list.

**Code Sample**:
```typescript
it('should attach diarized speaker labels to all transcript segments', async () => {
  await pipeline.processSession('sess-diar-01', twoSpeakerAudio);

  const segments = await transcriptStore.getSegments('sess-diar-01');
  const speakerIds = new Set(segments.map(s => s.speakerId));

  segments.forEach(s => expect(s.speakerId).toBeTruthy());
  expect(speakerIds.size).toBeGreaterThanOrEqual(2);
}, 30000);
```

---

#### TC-F3-I1.2: Speaker Turn Boundaries Align with Transcript Boundaries
**Objective**: Verify that diarization-detected speaker turn boundaries are within ±200ms of the transcript segment boundaries.

**Test Steps**:
1. Process 2-speaker audio with known ground-truth turn boundaries
2. Compare diarization turn times to transcript segment start times
3. Assert all boundary deltas < 200ms

**Expected Result**: All speaker turn boundary deltas vs. transcript boundaries are < 200ms.

---

### 2.2 Speaker Profile Persistence

#### TC-F3-I2.1: Speaker Embeddings Saved to Profile Store
**Objective**: Verify that after processing a session, speaker embeddings are persisted to the speaker profile store for future recognition.

**Test Steps**:
1. Process a session with 2 identified speakers
2. Query `SpeakerProfileStore.getProfile(speakerId)` for each
3. Assert both profiles exist with non-null `embedding` field
4. Assert `sessionIds` list on each profile includes the current session

**Expected Result**: Both speaker profiles saved; each has `embedding` of length 256 and references the session.

---

#### TC-F3-I2.2: Cross-Session Speaker Re-identification
**Objective**: Verify that a speaker from session 1 is correctly recognized and assigned the same `speakerId` in session 2.

**Test Steps**:
1. Process session 1 with speaker A → `speakerId: 'SPK-0001'`
2. Process session 2 with same speaker A
3. Assert session 2 assigns `speakerId: 'SPK-0001'` to speaker A

**Expected Result**: Speaker A gets consistent `speakerId` across both sessions using stored embeddings.

---

### 2.3 Diarization Event Streaming

#### TC-F3-I3.1: Real-Time Speaker Turn Events via Server-Sent Events
**Objective**: Verify that speaker turn change events are pushed to subscribers via Server-Sent Events (SSE) within 300ms of detection.

**Test Steps**:
1. Subscribe to `GET /sessions/sess-sse-01/speaker-turns`
2. Trigger speaker A → speaker B transition in audio
3. Assert SSE event received within 300ms with `{ from: 'SPK-0001', to: 'SPK-0002', atMs: N }`

**Expected Result**: SSE event delivered within 300ms of turn boundary; payload contains correct speaker IDs and timestamp.

---

#### TC-F3-I3.2: Diarization Timeline Snapshot API
**Objective**: Verify the REST API endpoint returns a complete diarization timeline for a completed session.

**Test Steps**:
1. POST `GET /sessions/sess-done-01/diarization`
2. Assert 200 response with `segments` array
3. Assert each segment has `speakerId`, `startMs`, `endMs`, `overlapDetected`

**Expected Result**: Timeline returned with all required fields; segments cover the full session duration without gaps.

---

## 3. EDGE CASE VALIDATION

### 3.1 Difficult Audio Conditions

#### TC-F3-E1.1: Single Speaker Detected in Multi-Speaker Configuration
**Objective**: Verify the diarizer correctly identifies a single-speaker session when configured to detect up to 6 speakers.

**Test Steps**:
1. Configure diarizer with `maxSpeakers: 6`
2. Process 60 seconds of single-speaker audio
3. Assert `diarizer.speakerCount(sessionId) === 1`

**Expected Result**: Only 1 unique speaker ID assigned; no ghost speakers created.

**Code Sample**:
```typescript
it('should not hallucinate speakers in single-speaker audio', async () => {
  const diarizer = new SpeakerDiarizer(encoder, clusterer, { maxSpeakers: 6 });
  await diarizer.processSession('sess-single', singleSpeakerAudio);

  expect(diarizer.speakerCount('sess-single')).toBe(1);
});
```

---

#### TC-F3-E1.2: Large Panel — 8+ Simultaneous Speakers
**Objective**: Verify the diarizer handles a panel-style session with 8 speakers without exceeding memory limits or producing duplicate IDs.

**Test Steps**:
1. Process 8-speaker audio (`maxSpeakers: 10`)
2. Assert exactly 8 unique speaker IDs assigned
3. Assert no two different speakers share the same `speakerId`
4. Assert memory usage does not exceed 512MB

**Expected Result**: 8 distinct `speakerId` values; no ID collisions; memory < 512MB.

---

### 3.2 Speaker Identity Edge Cases

#### TC-F3-E2.1: Speaker With Voice Changed by Microphone/Encoding Artifacts
**Objective**: Verify a speaker whose voice is distorted by codec artifacts or background noise is still correctly matched to their stored profile.

**Test Steps**:
1. Establish speaker A profile with clean audio
2. Feed heavily compressed (low-bitrate Opus) version of speaker A's voice
3. Assert same `speakerId` assigned

**Expected Result**: Speaker A correctly identified despite compression artifacts; same `speakerId` returned.

---

#### TC-F3-E2.2: Similar-Sounding Voices Not Merged
**Objective**: Verify that two distinct speakers with similar vocal characteristics are not incorrectly merged into one speaker ID.

**Test Steps**:
1. Process audio with speakers A (male, mid-range) and B (male, similar pitch)
2. Assert diarizer assigns 2 distinct speaker IDs
3. Assert cluster boundary similarity score < threshold that would cause merge

**Expected Result**: 2 distinct `speakerId` values assigned; similarity between cluster centroids below merge threshold.

---

### 3.3 Overlap and Crosstalk

#### TC-F3-E3.1: Three-Way Overlap Handling
**Objective**: Verify the diarizer handles a segment where 3 speakers are simultaneously active.

**Test Steps**:
1. Mix audio from speakers A, B, and C simultaneously
2. Process through diarizer
3. Assert `result.overlapDetected: true`
4. Assert `result.speakers` contains all 3 speaker IDs

**Expected Result**: Three-way overlap flagged; all 3 speaker IDs listed in `speakers` array.

---

#### TC-F3-E3.2: Rapid Turn-Taking (< 500ms Per Turn)
**Objective**: Verify the diarizer correctly tracks extremely rapid speaker alternation (back-and-forth with < 500ms turns).

**Test Steps**:
1. Create audio with 10 alternating speaker turns each ~300ms long
2. Process through diarizer
3. Assert at least 8 of 10 turns correctly identified (80% accuracy at high turn rate)

**Expected Result**: Turn detection accuracy >= 80% for sub-500ms turns.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Latency Benchmarks

#### TC-F3-P1.1: Speaker Turn Detection Latency < 200ms
**Objective**: Verify the diarizer detects a speaker turn change within 200ms of the boundary occurring.

**Test Steps**:
1. Construct audio with 10 known speaker-turn timestamps
2. Measure time from turn boundary to diarizer event emission
3. Assert P95 detection latency < 200ms

**Expected Result**: P95 turn detection latency < 200ms from turn boundary.

**Code Sample**:
```typescript
it('should detect speaker turns within 200ms (P95)', async () => {
  const latencies: number[] = [];

  for (const turn of knownTurnFixture.turns) {
    const detectedAt = await measureTurnDetectionLatency(diarizer, turn);
    latencies.push(detectedAt - turn.boundaryMs);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  expect(p95).toBeLessThan(200);
}, 30000);
```

---

#### TC-F3-P1.2: Embedding Extraction Throughput > 100 Segments/Second
**Objective**: Verify the speaker encoder can process at least 100 2-second audio segments per second.

**Test Steps**:
1. Create 500 2-second audio segments
2. Time the encoding of all 500 segments sequentially
3. Assert throughput >= 100 segments/second

**Expected Result**: 500 segments encoded in < 5 seconds; throughput >= 100 segments/sec.

---

### 4.2 Accuracy Benchmarks

#### TC-F3-P2.1: Diarization Error Rate (DER) < 10%
**Objective**: Verify the full diarization pipeline achieves a Diarization Error Rate below 10% on standard benchmark conversations.

**Test Steps**:
1. Run diarizer against 5 benchmark conversations with known ground-truth speaker timelines
2. Compute DER = (false alarm + missed speech + speaker error) / total speech time
3. Assert average DER < 0.10

**Expected Result**: Average DER < 10% across 5 benchmark conversations.

**Code Sample**:
```typescript
it('should achieve DER < 10% on benchmark conversations', async () => {
  const results = await Promise.all(
    benchmarkConversations.map(async conv => {
      const timeline = await diarizer.processSession(`bench-${conv.id}`, conv.audio);
      return computeDER(timeline, conv.groundTruth);
    })
  );

  const avgDer = results.reduce((sum, r) => sum + r.der, 0) / results.length;
  expect(avgDer).toBeLessThan(0.10);
}, 300000);
```

---

#### TC-F3-P2.2: Speaker Confusion Rate < 5% on Clean Audio
**Objective**: Verify the rate at which speech is incorrectly attributed to the wrong speaker is below 5% on clean recordings.

**Test Steps**:
1. Run diarizer on 5 clean 10-minute conversations
2. Compute speaker confusion = incorrect speaker attribution / total attributed speech
3. Assert confusion rate < 5%

**Expected Result**: Speaker confusion rate < 5% on clean audio benchmarks.

---

### 4.3 Scale and Resource Efficiency

#### TC-F3-P3.1: 20 Concurrent Session Diarization
**Objective**: Verify the diarization service handles 20 concurrent live sessions with < 500ms end-to-end turn detection latency.

**Test Steps**:
1. Start 20 concurrent diarization sessions
2. Feed simultaneous audio streams
3. Measure turn detection latency per session
4. Assert P95 latency across all sessions < 500ms

**Expected Result**: P95 turn detection latency < 500ms under 20 concurrent sessions.

---

#### TC-F3-P3.2: Embedding Cache Hit Rate > 80%
**Objective**: Verify the speaker embedding cache achieves a hit rate > 80% for sessions where the same speakers appear repeatedly.

**Test Steps**:
1. Process a 60-minute session with 3 recurring speakers
2. Query cache stats after session
3. Assert cache hit rate > 80%

**Expected Result**: Cache hit rate > 80%; embedding recomputation limited to initial appearance and after extended silence.

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases

### Key Performance Targets
| Metric | Target |
|---|---|
| Diarization Error Rate (DER) | < 10% |
| Speaker turn detection latency | < 200ms (P95) |
| Speaker confusion rate | < 5% |
| Embedding throughput | > 100 segments/sec |
