# EPIC02 Feature 8 — Timestamp Synchronization — Test Cases

## Test Overview
Comprehensive test suite for Timestamp Synchronization covering unit tests, integration tests, edge cases, and performance validation. This feature aligns and synchronizes timestamps across all media artifacts (audio, transcript segments, slide captures, OCR results) so they share a common session timeline, enabling accurate cross-media navigation and playback.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Clock Offset Calculation

#### TC-F8-U1.1: NTP Clock Offset Applied to Ingestion Timestamps
**Objective**: Verify the synchronizer correctly computes and applies NTP-derived clock offset to convert device-local timestamps to session-global UTC.

**Preconditions**:
- `TimestampSynchronizer` initialized with known NTP offset of +500ms
- Audio chunk with device-local timestamp 1700000000000ms

**Test Steps**:
1. Call `syncer.toSessionTime(1700000000000, { ntpOffsetMs: 500 })`
2. Assert returned value is `1700000000500`

**Expected Result**: Device timestamp adjusted by NTP offset; result = local + offset.

**Code Sample**:
```typescript
describe('TimestampSynchronizer', () => {
  it('should apply NTP clock offset to convert device timestamps', () => {
    const syncer = new TimestampSynchronizer();
    const sessionTime = syncer.toSessionTime(1700000000000, { ntpOffsetMs: 500 });

    expect(sessionTime).toBe(1700000000500);
  });
});
```

---

#### TC-F8-U1.2: Negative Offset (Device Clock Ahead) Handled Correctly
**Objective**: Verify negative NTP offsets (device clock is ahead of server) produce correct earlier session timestamps.

**Test Steps**:
1. Apply offset of -250ms to local timestamp 1700000001000ms
2. Assert result = 1700000000750ms

**Expected Result**: Negative offset correctly subtracts from local time; result = 1700000000750.

**Code Sample**:
```typescript
it('should handle negative NTP offsets for clocks running ahead', () => {
  const syncer = new TimestampSynchronizer();
  const sessionTime = syncer.toSessionTime(1700000001000, { ntpOffsetMs: -250 });

  expect(sessionTime).toBe(1700000000750);
});
```

---

#### TC-F8-U1.3: Session Start Anchor — Relative Offset Calculation
**Objective**: Verify the synchronizer can compute a relative offset from session start (session-relative milliseconds) rather than absolute UTC.

**Test Steps**:
1. Set session start time = 1700000000000ms
2. Apply `syncer.toRelativeMs(1700000030000, { sessionStartMs: 1700000000000 })`
3. Assert result = 30000 (30 seconds into session)

**Expected Result**: Relative offset correctly computed as `absoluteMs - sessionStartMs`.

**Code Sample**:
```typescript
it('should compute session-relative milliseconds from absolute timestamp', () => {
  const syncer = new TimestampSynchronizer();
  const relativeMs = syncer.toRelativeMs(1700000030000, { sessionStartMs: 1700000000000 });

  expect(relativeMs).toBe(30000);
});
```

---

### 1.2 Multi-Stream Alignment

#### TC-F8-U2.1: Audio and Transcript Segment Alignment Within ±50ms
**Objective**: Verify the multi-stream aligner aligns audio chunk start times with transcript segment start times within a ±50ms tolerance.

**Test Steps**:
1. Create an audio chunk with `startMs: 10000` and a transcript segment with `startMs: 10035` (35ms drift)
2. Call `aligner.align(audioChunk, transcriptSegment)`
3. Assert returned delta < 50ms absolute

**Expected Result**: Delta between audio and transcript starts < 50ms; alignment within tolerance.

**Code Sample**:
```typescript
describe('MultiStreamAligner', () => {
  it('should align audio and transcript within 50ms tolerance', () => {
    const aligner = new MultiStreamAligner({ toleranceMs: 50 });
    const audioChunk = { id: 'chunk-01', startMs: 10000, endMs: 12000 };
    const transcriptSeg = { id: 'seg-01', startMs: 10035, endMs: 12030 };

    const result = aligner.align(audioChunk, transcriptSeg);

    expect(Math.abs(result.delta)).toBeLessThan(50);
    expect(result.aligned).toBe(true);
  });
});
```

---

#### TC-F8-U2.2: Slide Timestamp Synchronized to Nearest Audio Frame
**Objective**: Verify a slide display timestamp is snapped to the nearest audio frame boundary to ensure frame-accurate sync.

**Test Steps**:
1. Audio frames at boundaries: 0, 20, 40, 60ms
2. Slide display timestamp = 35ms
3. Call `aligner.snapToAudioFrame(35, audioFrameBoundaries)`
4. Assert result = 40 (nearest frame boundary)

**Expected Result**: Slide timestamp snapped to 40ms (nearest of 20ms, 40ms).

**Code Sample**:
```typescript
it('should snap slide timestamp to nearest audio frame boundary', () => {
  const aligner = new MultiStreamAligner({ frameMs: 20 });
  const frameBoundaries = [0, 20, 40, 60, 80];

  const snapped = aligner.snapToAudioFrame(35, frameBoundaries);
  expect(snapped).toBe(40);
});
```

---

#### TC-F8-U2.3: Three-Stream Alignment — Audio, Transcript, Slide
**Objective**: Verify the aligner correctly computes a consensus timeline when given 3 streams with slight offsets and returns per-stream adjustment values.

**Test Steps**:
1. Audio: stream starts at 1000ms; Transcript: 1050ms; Slide: 980ms
2. Call `aligner.alignThreeStreams(audio, transcript, slide)`
3. Assert returned adjustments bring all 3 to within ±25ms of consensus

**Expected Result**: All 3 streams adjusted to within ±25ms of computed consensus timestamp.

---

### 1.3 Drift Correction

#### TC-F8-U3.1: Linear Drift Correction Over Long Session
**Objective**: Verify the drift corrector applies linear interpolation to correct accumulated clock drift over a 2-hour session.

**Test Steps**:
1. At t=0ms: offset=0ms; at t=7200000ms (2h): measured drift=2000ms
2. Query corrected timestamp at t=3600000ms (1h)
3. Assert corrected offset = 1000ms (linear interpolation: half of 2000ms)

**Expected Result**: Linear drift interpolation gives 1000ms correction at the 1-hour mark.

**Code Sample**:
```typescript
describe('DriftCorrector', () => {
  it('should apply linear drift correction over a 2-hour session', () => {
    const corrector = new DriftCorrector();
    corrector.addCalibrationPoint({ sessionMs: 0, driftMs: 0 });
    corrector.addCalibrationPoint({ sessionMs: 7200000, driftMs: 2000 });

    const corrected = corrector.correct(3600000);
    expect(corrected).toBeCloseTo(1000, 0); // within ±1ms
  });
});
```

---

#### TC-F8-U3.2: Sudden Clock Jump Detection and Flagging
**Objective**: Verify the synchronizer detects an unexpected clock jump (> 5 seconds) and flags affected segments with `TIMESTAMP_ANOMALY`.

**Test Steps**:
1. Feed timestamp sequence: 0, 20, 40, 60, 5060 (5-second jump)
2. Assert segment at index 4 has `anomalyFlag: 'CLOCK_JUMP'`
3. Assert earlier segments have no anomaly flag

**Expected Result**: Clock jump detected at index 4; all prior segments clean.

**Code Sample**:
```typescript
it('should detect and flag sudden clock jumps', () => {
  const syncer = new TimestampSynchronizer();
  const timestamps = [0, 20, 40, 60, 5060];

  const results = syncer.analyzeTimestampSequence(timestamps);

  expect(results[4].anomalyFlag).toBe('CLOCK_JUMP');
  results.slice(0, 4).forEach(r => expect(r.anomalyFlag).toBeNull());
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Cross-Media Sync in Pipeline

#### TC-F8-I1.1: Audio-Transcript-Slide Timeline Merged Without Gaps
**Objective**: Verify the full synchronization pipeline merges audio, transcript, and slide timelines into a single unified timeline with no temporal gaps.

**Preconditions**:
- Session processed with audio, transcript, and 5 slides
- Timeline merger service available

**Test Steps**:
1. Call `timelineMerger.merge('sess-sync-01')`
2. Assert returned `UnifiedTimeline` covers session start to end continuously
3. Assert no gap > 200ms between consecutive timeline events

**Expected Result**: Continuous timeline with no gaps > 200ms; all 3 media types represented.

**Code Sample**:
```typescript
it('should produce a continuous unified timeline without gaps', async () => {
  await pipeline.processSession('sess-sync-01', sessionMedia);
  const timeline = await timelineMerger.merge('sess-sync-01');

  let previousEnd = 0;
  for (const event of timeline.events) {
    expect(event.startMs - previousEnd).toBeLessThan(200);
    previousEnd = event.endMs;
  }
}, 30000);
```

---

#### TC-F8-I1.2: Seeking to 5-Minute Mark Returns Correct Slide, Transcript, Audio
**Objective**: Verify that seeking the unified timeline to t=5m returns the correct slide being displayed, the active transcript segment, and the audio chunk at that point.

**Test Steps**:
1. Process a 10-minute session with known content at t=5m
2. Call `timelineMerger.seek('sess-seek-01', 300000)`
3. Assert returned `SeekResult` has correct `activeSlideId`, `activeSegmentId`, `audioChunkId`

**Expected Result**: All three media references at t=5m match known ground-truth values.

---

### 2.2 Multi-Device Session Sync

#### TC-F8-I2.1: Two Mobile Devices Synced to Same Session Timeline
**Objective**: Verify timestamps from two different mobile devices are correctly synchronized to the same session timeline, accounting for their individual NTP offsets.

**Test Steps**:
1. Ingest audio from device A (NTP offset +200ms) and device B (NTP offset -100ms)
2. Assert synchronized timestamps for overlapping audio are within 50ms of each other

**Expected Result**: Both device streams aligned to within 50ms on the shared timeline.

**Code Sample**:
```typescript
it('should synchronize two mobile device streams to a common timeline', async () => {
  const streamA = { deviceId: 'devA', ntpOffsetMs: 200, chunks: generateChunks(10) };
  const streamB = { deviceId: 'devB', ntpOffsetMs: -100, chunks: generateChunks(10) };

  await syncer.ingestMultiDevice('sess-multidev-01', [streamA, streamB]);

  const syncedA = await syncer.getSyncedTimestamps('sess-multidev-01', 'devA');
  const syncedB = await syncer.getSyncedTimestamps('sess-multidev-01', 'devB');

  syncedA.forEach((tsA, i) => {
    expect(Math.abs(tsA - syncedB[i])).toBeLessThan(50);
  });
});
```

---

#### TC-F8-I2.2: Late-Joining Device Back-Filled with Correct Relative Offset
**Objective**: Verify a device that joins a session 2 minutes late receives a `sessionStartOffset: 120000` in its sync response and subsequent timestamps are adjusted accordingly.

**Test Steps**:
1. Start session at t=0
2. Device joins at t=120000ms
3. Assert sync response contains `sessionStartOffset: 120000`
4. Assert first uploaded chunk from late device is tagged with session-relative time starting at ~120000ms

**Expected Result**: Late joiner correctly offset; first chunk carries `sessionRelativeMs >= 120000`.

---

### 2.3 Playback Sync API

#### TC-F8-I3.1: Playback Position API Returns Synchronized State at Any Timestamp
**Objective**: Verify the playback sync REST API returns a coherent media state for any given session-relative timestamp.

**Test Steps**:
1. GET `/sessions/sess-play-01/sync?atMs=240000`
2. Assert response has `currentSlide`, `currentTranscriptSegment`, `audioOffset`, `nextSlideAtMs`
3. Assert all field values are within 1 second of expected values for t=4m

**Expected Result**: All four state fields accurately reflect session content at t=4m.

---

#### TC-F8-I3.2: WebSocket Sync Stream — Real-Time Position Updates at 1Hz
**Objective**: Verify the WebSocket sync stream pushes session position updates at 1-second intervals during playback.

**Test Steps**:
1. Connect to `ws://localhost:4000/sessions/sess-ws-sync-01/sync-stream`
2. Collect messages for 10 seconds
3. Assert >= 9 messages received (allowing 1 drop)
4. Assert `atMs` in consecutive messages increases by ~1000ms

**Expected Result**: >= 9 messages in 10 seconds; consistent 1-second advancement in `atMs`.

---

## 3. EDGE CASE VALIDATION

### 3.1 Clock Anomalies

#### TC-F8-E1.1: Device Rebooted Mid-Session — Timestamp Reset Handled
**Objective**: Verify the synchronizer detects when a device timestamp resets to 0 (device reboot) and correctly re-anchors subsequent timestamps.

**Test Steps**:
1. Feed a timestamp sequence: 1700050000000, 1700060000000, 0 (reset), 1000, 2000
2. Assert a `DEVICE_RESTART` event is detected at the reset point
3. Assert subsequent timestamps are remapped to continue the session timeline

**Expected Result**: `DEVICE_RESTART` anomaly detected; subsequent timestamps correctly re-anchored to session timeline.

**Code Sample**:
```typescript
it('should detect device restart and re-anchor subsequent timestamps', () => {
  const syncer = new TimestampSynchronizer({ sessionStartMs: 1700000000000 });
  const timestamps = [1700050000000, 1700060000000, 0, 1000, 2000];

  const results = syncer.analyzeTimestampSequence(timestamps);
  const restart = results.find(r => r.anomalyFlag === 'DEVICE_RESTART');

  expect(restart).toBeDefined();
  expect(restart!.index).toBe(2);
  expect(results[3].sessionRelativeMs).toBeGreaterThan(results[1].sessionRelativeMs);
});
```

---

#### TC-F8-E1.2: Timestamp Monotonicity Violation Correction
**Objective**: Verify out-of-order timestamps (non-monotonic sequence) are detected and corrected by interpolation before sync.

**Test Steps**:
1. Feed sequence: 1000, 2000, 1500 (non-monotonic at index 2), 3000
2. Assert `1500` is flagged as `OUT_OF_ORDER`
3. Assert corrected sequence is monotonically increasing

**Expected Result**: Non-monotonic timestamp detected and corrected; final sequence monotonic.

---

### 3.2 Network and Latency Issues

#### TC-F8-E2.1: High-Latency Upload — Timestamps Reconstructed from Sequence
**Objective**: Verify that audio chunks arriving out of order due to network latency are reordered using sequence numbers and re-timestamped correctly.

**Test Steps**:
1. Upload chunks 1, 2, 3, 4, 5 but arrive in order: 1, 3, 2, 5, 4
2. Assert reordering buffer reconstructs correct sequence
3. Assert final timestamp sequence is monotonic

**Expected Result**: Sequence numbers used for reordering; timestamps monotonically increasing after reconstruction.

**Code Sample**:
```typescript
it('should reorder out-of-order chunks using sequence numbers', async () => {
  const chunks = [
    { seq: 1, localMs: 1000 },
    { seq: 3, localMs: 3000 },
    { seq: 2, localMs: 2000 },
    { seq: 5, localMs: 5000 },
    { seq: 4, localMs: 4000 }
  ];

  const ordered = await syncer.reorderAndSync(chunks, sessionCtx);
  const times = ordered.map(c => c.sessionRelativeMs);

  for (let i = 1; i < times.length; i++) {
    expect(times[i]).toBeGreaterThan(times[i - 1]);
  }
});
```

---

#### TC-F8-E2.2: NTP Server Unreachable — Fallback to Device Clock
**Objective**: Verify that when the NTP server is unavailable, the system falls back to device clock timestamps with a `NTP_UNAVAILABLE` warning rather than blocking.

**Test Steps**:
1. Configure NTP resolver to throw `ECONNREFUSED`
2. Ingest a chunk
3. Assert chunk is timestamped using device clock
4. Assert chunk metadata has `ntpStatus: 'NTP_UNAVAILABLE'`

**Expected Result**: Ingestion proceeds with device clock; `ntpStatus` warns of NTP unavailability.

---

### 3.3 Long Session Precision

#### TC-F8-E3.1: 8-Hour Session — Timestamp Precision Maintained (No Integer Overflow)
**Objective**: Verify that a timestamp at 8 hours into a session (28800000ms) is stored and retrieved without integer overflow or precision loss.

**Test Steps**:
1. Create a session-relative timestamp of 28800000ms
2. Store and retrieve from the database
3. Assert retrieved value === 28800000 (exact match)

**Expected Result**: No overflow or precision loss for 8-hour session timestamps.

**Code Sample**:
```typescript
it('should handle 8-hour session timestamps without precision loss', async () => {
  const eightHoursMs = 8 * 60 * 60 * 1000; // 28,800,000

  await timestampStore.save({ sessionId: 'sess-long-01', relativeMs: eightHoursMs });
  const retrieved = await timestampStore.get('sess-long-01');

  expect(retrieved.relativeMs).toBe(eightHoursMs);
});
```

---

#### TC-F8-E3.2: Leap Second Handling in UTC Timestamps
**Objective**: Verify the synchronizer correctly handles UTC timestamps that span a leap second without introducing a 1-second offset.

**Test Steps**:
1. Configure a test session spanning a known leap second boundary
2. Compute session-relative offsets for timestamps before and after the leap second
3. Assert the delta between consecutive timestamps is exactly 20ms (no 1020ms jump)

**Expected Result**: Leap second handled transparently; no artificial gap introduced.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Synchronization Throughput

#### TC-F8-P1.1: 1000 Timestamps Synchronized per Second
**Objective**: Verify the synchronizer processes at least 1000 timestamp conversions per second.

**Test Steps**:
1. Time the synchronization of 10,000 timestamps
2. Assert throughput >= 1000 per second (< 10 seconds total)

**Expected Result**: 10,000 timestamps processed in < 10 seconds; throughput >= 1000/sec.

**Code Sample**:
```typescript
it('should synchronize 1000+ timestamps per second', () => {
  const timestamps = Array.from({ length: 10_000 }, (_, i) => 1700000000000 + i * 20);
  const start = performance.now();

  timestamps.forEach(ts => syncer.toSessionTime(ts, { ntpOffsetMs: 150 }));

  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(10_000);
});
```

---

#### TC-F8-P1.2: Multi-Stream Alignment Completes in < 100ms for 10-Stream Session
**Objective**: Verify aligning 10 concurrent media streams completes in under 100ms for a 1-hour session.

**Test Steps**:
1. Prepare 10 streams each with 180,000 timestamp samples (1h at 50Hz)
2. Time `aligner.alignAll(streams)`
3. Assert < 100ms

**Expected Result**: 10-stream alignment completes in < 100ms.

---

### 4.2 Accuracy Benchmarks

#### TC-F8-P2.1: Synchronization Error < 10ms Across All Media Types
**Objective**: Verify the mean absolute synchronization error between audio, transcript, and slides across 50 benchmark sessions is < 10ms.

**Test Steps**:
1. Process 50 benchmark sessions with known ground-truth synchronized timestamps
2. Compute mean absolute error (MAE) per session
3. Assert overall MAE < 10ms

**Expected Result**: Mean absolute synchronization error < 10ms across 50 sessions.

**Code Sample**:
```typescript
it('should achieve < 10ms mean synchronization error', async () => {
  const errors = await Promise.all(
    benchmarkSessions.map(async sess => {
      const timeline = await timelineMerger.merge(sess.id);
      return computeSyncError(timeline, sess.groundTruth);
    })
  );

  const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;
  expect(mae).toBeLessThan(10);
}, 300000);
```

---

#### TC-F8-P2.2: Drift Correction Reduces Long-Session Error from 2s to < 50ms
**Objective**: Verify that drift correction on a 2-hour session reduces accumulated timestamp error from ~2000ms to < 50ms.

**Test Steps**:
1. Run synchronization with drift correction disabled — measure final error
2. Run with drift correction enabled — measure final error
3. Assert with-correction error < 50ms; without-correction error > 1000ms

**Expected Result**: Drift correction reduces 2-hour error from > 1s to < 50ms.

---

### 4.3 Resource Efficiency

#### TC-F8-P3.1: Synchronizer Memory Footprint < 100MB per Session
**Objective**: Verify the synchronizer's in-memory state for a 2-hour session stays below 100MB.

**Test Steps**:
1. Run a 2-hour session simulation
2. Sample heap memory every 10 minutes
3. Assert peak heap delta < 100MB

**Expected Result**: Peak memory per session < 100MB over 2 hours.

---

#### TC-F8-P3.2: Timeline Merge Latency < 500ms for 8-Hour Session
**Objective**: Verify the unified timeline merge operation for an 8-hour session completes within 500ms.

**Test Steps**:
1. Prepare session data: 28,800 audio chunks, 1440 transcript segments, 400 slides
2. Time `timelineMerger.merge(sessionId)`
3. Assert < 500ms

**Expected Result**: Timeline merge completes in < 500ms even for 8-hour sessions.

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
| Mean synchronization error | < 10ms |
| Timeline merge latency (8h session) | < 500ms |
| Timestamp throughput | >= 1000/sec |
| Drift correction residual error | < 50ms |
