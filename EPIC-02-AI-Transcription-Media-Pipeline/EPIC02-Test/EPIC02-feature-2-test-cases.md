# EPIC02 Feature 2 — Streaming Transcription — Test Cases

## Test Overview
Comprehensive test suite for Streaming Transcription covering unit tests, integration tests, edge cases, and performance validation. This feature handles real-time speech-to-text conversion of audio chunks using a streaming ASR model, emitting partial and final transcript segments with confidence scores.

---

## 1. UNIT TEST SCENARIOS

### 1.1 ASR Model Interface

#### TC-F2-U1.1: Partial Transcript Emission
**Objective**: Verify the transcription engine emits intermediate partial results as audio frames arrive, before a final result is produced.

**Preconditions**:
- `StreamingTranscriptionEngine` initialized with mock ASR model
- Mock model configured to emit 3 partials before final

**Test Steps**:
1. Subscribe to `engine.on('partial', handler)`
2. Feed 5 sequential audio frames to the engine
3. Assert `handler` was called 3 times with `isFinal: false`
4. Assert a final event is emitted with `isFinal: true` after silence detection

**Expected Result**: Exactly 3 partial events followed by 1 final event; all events carry non-empty `text` and `confidence` fields.

**Code Sample**:
```typescript
describe('StreamingTranscriptionEngine', () => {
  it('should emit partial transcripts followed by a final result', async () => {
    const engine = new StreamingTranscriptionEngine(mockAsrModel);
    const partials: TranscriptEvent[] = [];
    const finals: TranscriptEvent[] = [];

    engine.on('partial', e => partials.push(e));
    engine.on('final', e => finals.push(e));

    for (let i = 0; i < 5; i++) {
      await engine.push(createAudioFrame(320));
    }
    await engine.flush();

    expect(partials.length).toBe(3);
    expect(finals.length).toBe(1);
    partials.forEach(p => {
      expect(p.isFinal).toBe(false);
      expect(p.text).toBeTruthy();
      expect(p.confidence).toBeGreaterThan(0);
    });
    expect(finals[0].isFinal).toBe(true);
  });
});
```

---

#### TC-F2-U1.2: Confidence Score Range Validation
**Objective**: Verify that all emitted confidence scores are normalized to the [0.0, 1.0] range.

**Test Steps**:
1. Feed 20 frames covering varied speech content (loud, quiet, accented mock responses)
2. Collect all emitted partial and final events
3. Assert all `confidence` values are within [0.0, 1.0]

**Expected Result**: Every emitted `confidence` value satisfies `0.0 <= confidence <= 1.0`.

**Code Sample**:
```typescript
it('should emit confidence scores normalized to [0, 1]', async () => {
  const engine = new StreamingTranscriptionEngine(mockAsrModel);
  const events: TranscriptEvent[] = [];
  engine.on('partial', e => events.push(e));
  engine.on('final', e => events.push(e));

  for (const frame of mockSpeechFrames) {
    await engine.push(frame);
  }
  await engine.flush();

  events.forEach(e => {
    expect(e.confidence).toBeGreaterThanOrEqual(0.0);
    expect(e.confidence).toBeLessThanOrEqual(1.0);
  });
});
```

---

#### TC-F2-U1.3: Language Detection and Model Switching
**Objective**: Verify the engine detects the spoken language from initial frames and switches to the appropriate language model.

**Test Steps**:
1. Configure engine with `autoDetectLanguage: true` and models for `en`, `es`, `zh`
2. Feed frames from a mock Spanish-language audio fixture
3. Assert `engine.detectedLanguage === 'es'`
4. Assert the active model switched to the Spanish ASR model

**Expected Result**: `detectedLanguage` is `'es'`; `engine.activeModelId` references the Spanish model instance.

**Code Sample**:
```typescript
it('should detect language and switch to matching ASR model', async () => {
  const engine = new StreamingTranscriptionEngine(multilingualModelRegistry, { autoDetectLanguage: true });

  for (const frame of spanishAudioFixture.frames) {
    await engine.push(frame);
  }

  expect(engine.detectedLanguage).toBe('es');
  expect(engine.activeModelId).toBe('asr-model-es-v2');
});
```

---

### 1.2 Transcript Segment Assembly

#### TC-F2-U2.1: Word-Level Timestamp Attachment
**Objective**: Verify each word in the final transcript carries an accurate word-level start and end timestamp.

**Test Steps**:
1. Feed a 5-second audio fixture with known content: "Hello world this is a test"
2. Receive the final transcript event
3. Assert 6 word-level timestamp objects exist
4. Assert first word starts at ~0ms and last word ends at ~4500ms

**Expected Result**: `event.words` array has 6 elements; each element has `word`, `startMs`, `endMs`; startMs increases monotonically.

**Code Sample**:
```typescript
it('should attach word-level timestamps to final transcript', async () => {
  const engine = new StreamingTranscriptionEngine(mockAsrModel);
  let finalEvent: TranscriptEvent | null = null;
  engine.on('final', e => { finalEvent = e; });

  for (const frame of helloWorldFixture.frames) {
    await engine.push(frame);
  }
  await engine.flush();

  expect(finalEvent).not.toBeNull();
  expect(finalEvent!.words).toHaveLength(6);
  expect(finalEvent!.words[0].word).toBe('Hello');
  expect(finalEvent!.words[0].startMs).toBeLessThan(finalEvent!.words[1].startMs);
  finalEvent!.words.forEach(w => {
    expect(w.startMs).toBeLessThan(w.endMs);
  });
});
```

---

#### TC-F2-U2.2: Transcript Segment Stitching Across Chunks
**Objective**: Verify the engine correctly stitches partial transcripts from multiple audio chunks into a coherent final sentence without word duplication.

**Test Steps**:
1. Split "The quick brown fox" audio across 4 equal chunks
2. Feed chunks sequentially, each producing a partial
3. Receive final event
4. Assert `final.text === 'The quick brown fox'` with no repeated words

**Expected Result**: Final transcript text is exactly "The quick brown fox"; word count in `words` array is 4.

**Code Sample**:
```typescript
it('should stitch partials into a coherent final transcript', async () => {
  const chunks = splitAudio(quickBrownFoxFixture, 4);
  let finalEvent: TranscriptEvent | null = null;
  engine.on('final', e => { finalEvent = e; });

  for (const chunk of chunks) {
    await engine.push(chunk);
  }
  await engine.flush();

  expect(finalEvent!.text).toBe('The quick brown fox');
  expect(finalEvent!.words).toHaveLength(4);
});
```

---

#### TC-F2-U2.3: Punctuation and Capitalization Restoration
**Objective**: Verify the post-processing layer correctly restores punctuation and capitalization to raw ASR output.

**Test Steps**:
1. Feed raw ASR output string: `"hello how are you today i am fine thank you"`
2. Run through `PunctuationRestorer`
3. Assert output: `"Hello, how are you today? I am fine, thank you."`

**Expected Result**: Output string has correct sentence casing and punctuation marks.

**Code Sample**:
```typescript
it('should restore punctuation and capitalization', async () => {
  const restorer = new PunctuationRestorer(mockPunctuationModel);
  const raw = 'hello how are you today i am fine thank you';

  const restored = await restorer.restore(raw);
  expect(restored).toBe('Hello, how are you today? I am fine, thank you.');
});
```

---

### 1.3 Stream Lifecycle Management

#### TC-F2-U3.1: Graceful Stream Finalization on `flush()`
**Objective**: Verify calling `flush()` causes the engine to process all buffered audio and emit any pending final event before resolving.

**Test Steps**:
1. Feed 3 frames but do not wait for natural utterance end
2. Call `engine.flush()`
3. Assert final event emitted before `flush()` promise resolves

**Expected Result**: `flush()` resolves only after final event is emitted; no buffered audio lost.

**Code Sample**:
```typescript
it('should emit final event before flush() resolves', async () => {
  let finalEmitted = false;
  engine.on('final', () => { finalEmitted = true; });

  for (const frame of incompleteUtteranceFrames) {
    await engine.push(frame);
  }

  expect(finalEmitted).toBe(false);
  await engine.flush();
  expect(finalEmitted).toBe(true);
});
```

---

#### TC-F2-U3.2: Engine Reset Between Sessions
**Objective**: Verify that calling `engine.reset()` clears all internal state, buffers, and context so the next session starts clean.

**Test Steps**:
1. Process a full utterance in session 1, verify final event
2. Call `engine.reset()`
3. Assert `engine.bufferedFrames === 0`, `engine.detectedLanguage === null`, context clear
4. Process a different utterance in session 2; verify no bleed from session 1

**Expected Result**: After reset, all session-1 state is cleared; session-2 transcript does not contain session-1 words.

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Transcription Pipeline

#### TC-F2-I1.1: Audio Chunk to Final Transcript Delivery
**Objective**: Verify that an audio chunk ingested by the ingestion service produces a final transcript delivered to the session transcript store within 3 seconds.

**Preconditions**:
- Full pipeline running: ingestion → transcription → store
- Session `sess-e2e-01` registered

**Test Steps**:
1. Ingest a 5-second audio clip via `AudioIngestionService`
2. Wait up to 3 seconds
3. Query `TranscriptStore.getLatestSegment('sess-e2e-01')`
4. Assert segment exists with non-empty `text`

**Expected Result**: Transcript segment persisted within 3 seconds of ingest; `text` contains at least 3 words.

**Code Sample**:
```typescript
it('should produce a transcript segment within 3 seconds of ingest', async () => {
  const sessionId = 'sess-e2e-01';
  await ingestionService.ingest(fiveSecondAudioClip, { codec: 'pcm', sampleRate: 16000, channels: 1, sessionId });

  await waitFor(async () => {
    const segment = await transcriptStore.getLatestSegment(sessionId);
    expect(segment).not.toBeNull();
    expect(segment!.text.split(' ').length).toBeGreaterThan(2);
  }, { timeout: 3000, interval: 100 });
}, 10000);
```

---

#### TC-F2-I1.2: Real-Time Partial Transcript WebSocket Push
**Objective**: Verify that partial transcript events are pushed to connected WebSocket subscribers in real time as audio is being processed.

**Test Steps**:
1. Subscribe to `ws://localhost:4000/transcripts/sess-rt-01`
2. Begin ingesting a 10-second audio stream
3. Assert at least 5 partial transcript WebSocket messages received within 10 seconds
4. Assert final message has `isFinal: true`

**Expected Result**: >= 5 partial WS messages with `isFinal: false` during stream; 1 final message with `isFinal: true` at end.

---

### 2.2 Transcript Storage Integration

#### TC-F2-I2.1: Transcript Segment Persistence to Database
**Objective**: Verify final transcript segments are correctly written to the PostgreSQL `transcript_segments` table with all required columns.

**Test Steps**:
1. Process a 10-second audio clip through the full pipeline
2. Query DB: `SELECT * FROM transcript_segments WHERE session_id = 'sess-db-01'`
3. Assert 1+ rows with `session_id`, `text`, `start_ms`, `end_ms`, `confidence`, `speaker_id` all non-null

**Expected Result**: At least 1 row in `transcript_segments`; all 6 required columns populated.

---

#### TC-F2-I2.2: Transcript Versioning on Re-Process
**Objective**: Verify that re-processing the same audio session creates a new transcript version rather than overwriting the existing record.

**Test Steps**:
1. Process session `sess-version-01` — confirms `version: 1` stored
2. Re-trigger transcription with updated model
3. Query DB for `sess-version-01`
4. Assert 2 rows exist with `version` values 1 and 2

**Expected Result**: Both versions present in DB; `version: 2` has higher `confidence` (from improved model).

---

### 2.3 Error Recovery

#### TC-F2-I3.1: ASR Model Timeout Triggers Retry with Backoff
**Objective**: Verify that when the ASR model call times out, the transcription engine retries with exponential backoff up to 3 times.

**Test Steps**:
1. Configure mock ASR model to timeout for first 2 calls, succeed on 3rd
2. Submit audio chunk to transcription engine
3. Assert model was called 3 times total
4. Assert final transcript is delivered after successful retry

**Expected Result**: 3 total ASR calls; transcript produced; retry delays follow exponential backoff (100ms, 200ms, 400ms).

---

#### TC-F2-I3.2: Partial Transcript Recovery After Model Restart
**Objective**: Verify that if the ASR model process crashes mid-stream, partial transcripts already delivered are preserved and the stream resumes from the crash point.

**Test Steps**:
1. Process 20 frames, receiving 5 partial transcripts
2. Simulate model process crash
3. Allow model to restart (max 2 seconds)
4. Feed remaining 20 frames
5. Assert combined transcript covers full audio without gaps

**Expected Result**: Final transcript combines pre-crash and post-restart segments; no duplicated or missing words at boundary.

---

## 3. EDGE CASE VALIDATION

### 3.1 Low-Quality Audio Handling

#### TC-F2-E1.1: High-Noise Audio with SNR < 10dB
**Objective**: Verify the transcription engine gracefully handles extremely noisy audio by returning a low-confidence result rather than crashing or hanging.

**Test Steps**:
1. Feed audio with artificially injected white noise at SNR = 5dB
2. Assert final event is eventually emitted
3. Assert `confidence < 0.5`
4. Assert `lowConfidenceFlag: true` is set on the event

**Expected Result**: Final event emitted with `confidence < 0.5` and `lowConfidenceFlag: true`; no crash or timeout.

**Code Sample**:
```typescript
it('should handle high-noise audio and return low-confidence result', async () => {
  const noisyAudio = addWhiteNoise(speechFixture, { snrDb: 5 });
  let finalEvent: TranscriptEvent | null = null;
  engine.on('final', e => { finalEvent = e; });

  for (const frame of noisyAudio.frames) {
    await engine.push(frame);
  }
  await engine.flush();

  expect(finalEvent).not.toBeNull();
  expect(finalEvent!.confidence).toBeLessThan(0.5);
  expect(finalEvent!.lowConfidenceFlag).toBe(true);
});
```

---

#### TC-F2-E1.2: Non-Speech Audio (Music, Crowd Noise) Classification
**Objective**: Verify the engine correctly classifies non-speech audio inputs and emits `type: 'NON_SPEECH'` events rather than garbled text.

**Test Steps**:
1. Feed 5 seconds of music audio through the engine
2. Assert emitted events have `type: 'NON_SPEECH'`
3. Assert no `text` field on non-speech events

**Expected Result**: Events have `type: 'NON_SPEECH'`; no spurious transcript text generated.

---

### 3.2 Utterance Boundary Detection

#### TC-F2-E2.1: Long Utterance (>30 Seconds) Auto-Segmentation
**Objective**: Verify the engine auto-splits utterances longer than 30 seconds at natural pause boundaries rather than emitting a single massive segment.

**Test Steps**:
1. Feed 90 seconds of continuous speech without a pause longer than 2 seconds
2. Assert at least 3 final segments emitted (auto-split every ~30s)
3. Assert segment boundaries align with detected silence gaps

**Expected Result**: >= 3 final transcript segments; no single segment longer than 35 seconds of audio.

---

#### TC-F2-E2.2: Back-to-Back Utterances Without Gap
**Objective**: Verify the engine correctly segments two distinct utterances that have no silence between them, using voice activity detection boundary cues.

**Test Steps**:
1. Concatenate two distinct 5-second utterances without silence
2. Feed through engine
3. Assert 2 distinct final events are emitted with non-overlapping time ranges

**Expected Result**: 2 final events with non-overlapping `[startMs, endMs]` ranges; combined text covers both utterances.

---

### 3.3 Special Content Types

#### TC-F2-E3.1: Acronym and Technical Jargon Preservation
**Objective**: Verify the engine correctly transcribes domain-specific technical terms and acronyms (e.g., "API", "OAuth", "WebRTC") without splitting or mangling them.

**Test Steps**:
1. Feed audio fixture containing "the WebRTC API uses OAuth for authentication"
2. Assert final transcript text matches exactly

**Expected Result**: Transcript: `"the WebRTC API uses OAuth for authentication"` — acronyms preserved, not expanded or lowercased.

**Code Sample**:
```typescript
it('should preserve acronyms and technical terms in transcription', async () => {
  for (const frame of technicalJargonFixture.frames) {
    await engine.push(frame);
  }
  await engine.flush();

  expect(collectedFinal?.text).toMatch(/WebRTC/);
  expect(collectedFinal?.text).toMatch(/OAuth/);
  expect(collectedFinal?.text).toMatch(/API/);
});
```

---

#### TC-F2-E3.2: Number and Date Normalization
**Objective**: Verify spoken numbers and dates are normalized to standard written forms (e.g., "twenty twenty four" → "2024", "the fifteenth of march" → "March 15th").

**Test Steps**:
1. Feed audio fixtures for number and date utterances
2. Assert normalized forms appear in final transcript

**Expected Result**: Numbers and dates normalized; `"twenty twenty four"` → `"2024"` in output text.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Latency Benchmarks

#### TC-F2-P1.1: Time-to-First-Partial Transcript < 500ms
**Objective**: Verify the first partial transcript event is emitted within 500ms of the first audio frame being pushed.

**Test Steps**:
1. Record wall-clock time when first frame is pushed
2. Record wall-clock time when first `partial` event fires
3. Assert delta < 500ms across 100 trials

**Expected Result**: P95 time-to-first-partial < 500ms; P50 < 200ms.

**Code Sample**:
```typescript
it('should emit first partial transcript within 500ms', async () => {
  const latencies: number[] = [];

  for (let trial = 0; trial < 100; trial++) {
    const engine = new StreamingTranscriptionEngine(mockAsrModel);
    let firstPartialTime: number | null = null;
    engine.on('partial', () => { if (!firstPartialTime) firstPartialTime = performance.now(); });

    const start = performance.now();
    await engine.push(createAudioFrame(320));
    if (!firstPartialTime) await waitForEvent(engine, 'partial');

    latencies.push(firstPartialTime! - start);
    await engine.reset();
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  expect(p95).toBeLessThan(500);
}, 60000);
```

---

#### TC-F2-P1.2: Final Transcript Latency After Utterance End < 1 Second
**Objective**: Verify the final transcript is emitted within 1 second of the last audio frame (after natural silence detection triggers).

**Test Steps**:
1. Feed a complete 5-second utterance then stop sending frames
2. Measure time from last frame to `final` event
3. Assert delay < 1000ms

**Expected Result**: Final event latency after last frame < 1000ms in P95 of 50 trials.

---

### 4.2 Accuracy Benchmarks

#### TC-F2-P2.1: Word Error Rate (WER) < 8% on Clean Audio
**Objective**: Verify the transcription engine achieves a Word Error Rate below 8% on clean, single-speaker audio benchmarks.

**Test Steps**:
1. Run engine against 10 standard benchmark utterances (known ground truth)
2. Compute WER = (S + D + I) / N for each
3. Assert average WER < 0.08

**Expected Result**: Average WER < 8% across 10 benchmark utterances.

**Code Sample**:
```typescript
it('should achieve WER < 8% on clean audio benchmarks', async () => {
  const results = await runBenchmarkSuite(engine, benchmarkFixtures);
  const avgWer = results.reduce((sum, r) => sum + r.wer, 0) / results.length;

  expect(avgWer).toBeLessThan(0.08);
}, 120000);
```

---

#### TC-F2-P2.2: Throughput — 50 Concurrent Transcription Streams
**Objective**: Verify the transcription service maintains < 2-second final latency for 50 concurrent live streams.

**Test Steps**:
1. Start 50 concurrent audio sessions each streaming 10 seconds of audio
2. Measure final transcript latency per session
3. Assert P95 final latency < 2000ms across all sessions

**Expected Result**: P95 final transcript latency < 2000ms under 50 concurrent streams.

---

### 4.3 Resource Efficiency

#### TC-F2-P3.1: CPU Usage Per Transcription Stream < 5% of Single Core
**Objective**: Verify each active transcription stream consumes less than 5% of a single CPU core under normal load.

**Test Steps**:
1. Start 10 concurrent streams
2. Measure total CPU usage over 30 seconds
3. Assert per-stream CPU = total_cpu / 10 < 5%

**Expected Result**: Per-stream CPU consumption < 5% of a single core at steady state.

---

#### TC-F2-P3.2: Memory Footprint Stable Over 30-Minute Session
**Objective**: Verify the transcription engine does not exhibit memory leaks during a 30-minute continuous transcription session.

**Test Steps**:
1. Run a 30-minute continuous audio feed (simulated at 10x speed for testing)
2. Sample heap memory every minute
3. Assert heap growth trend < 1 MB/minute

**Expected Result**: Heap memory remains stable; growth rate < 1 MB/minute over the test period.

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
| Time to first partial | < 500ms (P95) |
| Final transcript latency | < 1s after utterance end |
| Word Error Rate (clean audio) | < 8% |
| Concurrent streams | 50 at < 2s latency |
