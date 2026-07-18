# EPIC02 Feature 1 — Audio Ingestion Service — Test Cases

## Test Overview
Comprehensive test suite for Audio Ingestion Service covering unit tests, integration tests, edge cases, and performance validation. This service is responsible for accepting raw audio streams from mobile clients, validating format and codec compatibility, buffering incoming data, and routing it to the transcription pipeline.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Audio Stream Validation

#### TC-F1-U1.1: Valid PCM Audio Buffer Acceptance
**Objective**: Verify that the ingestion service accepts and queues a valid PCM 16-bit 44.1kHz mono audio buffer.

**Preconditions**:
- AudioIngestionService instance initialized
- Valid PCM buffer of 4096 samples available
- Codec registry loaded

**Test Steps**:
1. Create a `Float32Array` buffer representing 4096 PCM samples at 44100 Hz
2. Call `ingestionService.ingest(buffer, { codec: 'pcm', sampleRate: 44100, channels: 1 })`
3. Assert the returned receipt contains a valid `chunkId`
4. Assert internal queue length incremented by 1

**Expected Result**: Receipt object with `status: 'QUEUED'` and non-null `chunkId`; internal buffer queue depth increases by 1.

**Code Sample**:
```typescript
describe('AudioIngestionService - Stream Validation', () => {
  let service: AudioIngestionService;

  beforeEach(() => {
    service = new AudioIngestionService({ maxQueueDepth: 100, codecRegistry: defaultCodecs });
  });

  it('should accept a valid PCM 16-bit mono buffer', async () => {
    const samples = new Float32Array(4096).fill(0.5);
    const meta: AudioChunkMeta = { codec: 'pcm', sampleRate: 44100, channels: 1 };

    const receipt = await service.ingest(samples, meta);

    expect(receipt.status).toBe('QUEUED');
    expect(receipt.chunkId).toMatch(/^chunk-[a-f0-9]{8}$/);
    expect(service.queueDepth).toBe(1);
  });
});
```

---

#### TC-F1-U1.2: Codec Mismatch Rejection
**Objective**: Verify the service rejects audio payloads with an unsupported or unregistered codec.

**Preconditions**:
- Service initialized with `codecRegistry` containing only `pcm` and `opus`

**Test Steps**:
1. Construct a buffer with metadata specifying `codec: 'amr-wb'`
2. Call `service.ingest(buffer, { codec: 'amr-wb', sampleRate: 16000, channels: 1 })`
3. Assert the returned promise rejects with `CodecNotSupportedError`

**Expected Result**: Promise rejects with `CodecNotSupportedError`; queue depth remains 0.

**Code Sample**:
```typescript
it('should reject audio with unsupported codec', async () => {
  const samples = new Float32Array(2048);
  const meta: AudioChunkMeta = { codec: 'amr-wb', sampleRate: 16000, channels: 1 };

  await expect(service.ingest(samples, meta)).rejects.toThrow(CodecNotSupportedError);
  expect(service.queueDepth).toBe(0);
});
```

---

#### TC-F1-U1.3: Sample Rate Normalization to 16kHz
**Objective**: Verify the service resamples incoming 44.1kHz audio down to the pipeline-standard 16kHz before queuing.

**Test Steps**:
1. Ingest a 44100 Hz buffer
2. Retrieve the queued chunk from internal buffer
3. Assert `chunk.sampleRate === 16000`
4. Assert the number of samples is scaled proportionally (~0.363x of input)

**Expected Result**: Stored chunk has `sampleRate: 16000`; sample count equals `Math.ceil(4096 * 16000 / 44100)`.

**Code Sample**:
```typescript
it('should downsample 44.1kHz audio to 16kHz', async () => {
  const samples = new Float32Array(4096).map((_, i) => Math.sin(i / 100));
  const receipt = await service.ingest(samples, { codec: 'pcm', sampleRate: 44100, channels: 1 });

  const chunk = service.peekQueue(receipt.chunkId);
  expect(chunk.sampleRate).toBe(16000);
  expect(chunk.samples.length).toBe(Math.ceil(4096 * 16000 / 44100));
});
```

---

### 1.2 Buffer Queue Management

#### TC-F1-U2.1: Queue Depth Limit Enforcement
**Objective**: Verify the service applies back-pressure when the internal buffer queue exceeds `maxQueueDepth`.

**Test Steps**:
1. Configure service with `maxQueueDepth: 5`
2. Ingest 5 valid audio chunks successfully
3. Attempt to ingest a 6th chunk
4. Assert the 6th call rejects with `QueueFullError`

**Expected Result**: First 5 calls resolve with `QUEUED`; 6th call rejects with `QueueFullError`.

**Code Sample**:
```typescript
it('should enforce max queue depth and reject overflow', async () => {
  const service = new AudioIngestionService({ maxQueueDepth: 5, codecRegistry: defaultCodecs });
  const meta = { codec: 'pcm', sampleRate: 16000, channels: 1 };

  for (let i = 0; i < 5; i++) {
    await service.ingest(new Float32Array(1024), meta);
  }

  await expect(service.ingest(new Float32Array(1024), meta)).rejects.toThrow(QueueFullError);
});
```

---

#### TC-F1-U2.2: FIFO Dequeue Order
**Objective**: Verify audio chunks are dequeued in the exact order they were ingested.

**Test Steps**:
1. Ingest chunks labeled A, B, C with unique identifiers embedded in sample data
2. Dequeue 3 times
3. Assert dequeue order matches ingest order

**Expected Result**: Dequeue returns chunks in A → B → C order with matching `chunkId` values.

**Code Sample**:
```typescript
it('should dequeue chunks in FIFO order', async () => {
  const ids: string[] = [];
  for (const label of ['A', 'B', 'C']) {
    const r = await service.ingest(new Float32Array(512), { codec: 'pcm', sampleRate: 16000, channels: 1, label });
    ids.push(r.chunkId);
  }

  for (const expectedId of ids) {
    const chunk = await service.dequeue();
    expect(chunk.chunkId).toBe(expectedId);
  }
});
```

---

#### TC-F1-U2.3: Chunk Metadata Preservation
**Objective**: Verify that session ID, speaker hint, and timestamp metadata attached at ingestion time survive through the queue.

**Test Steps**:
1. Ingest buffer with metadata `{ sessionId: 'sess-001', speakerHint: 'A', ingestTimestamp: 1700000000000 }`
2. Dequeue the chunk
3. Assert all metadata fields are intact on the dequeued object

**Expected Result**: Dequeued chunk carries identical `sessionId`, `speakerHint`, and `ingestTimestamp` values.

**Code Sample**:
```typescript
it('should preserve session metadata through the queue', async () => {
  const meta = { codec: 'pcm', sampleRate: 16000, channels: 1, sessionId: 'sess-001', speakerHint: 'A', ingestTimestamp: 1700000000000 };
  const receipt = await service.ingest(new Float32Array(1024), meta);

  const chunk = await service.dequeue();
  expect(chunk.sessionId).toBe('sess-001');
  expect(chunk.speakerHint).toBe('A');
  expect(chunk.ingestTimestamp).toBe(1700000000000);
});
```

---

### 1.3 Multi-Channel and Stereo Handling

#### TC-F1-U3.1: Stereo-to-Mono Downmix
**Objective**: Verify the service correctly downmixes a 2-channel stereo buffer into mono by averaging left and right channels.

**Test Steps**:
1. Create an interleaved stereo buffer where left channel = 1.0, right channel = -1.0
2. Ingest with `channels: 2`
3. Dequeue and assert mono output samples are all ~0.0 (average)

**Expected Result**: All mono output samples equal `(1.0 + (-1.0)) / 2 = 0.0 ± 0.001` floating-point tolerance.

**Code Sample**:
```typescript
it('should downmix stereo to mono by channel averaging', async () => {
  const stereo = new Float32Array(2048);
  for (let i = 0; i < stereo.length; i += 2) {
    stereo[i] = 1.0;      // left
    stereo[i + 1] = -1.0; // right
  }

  await service.ingest(stereo, { codec: 'pcm', sampleRate: 16000, channels: 2 });
  const chunk = await service.dequeue();

  chunk.samples.forEach(s => expect(s).toBeCloseTo(0.0, 3));
  expect(chunk.channels).toBe(1);
});
```

---

#### TC-F1-U3.2: Silence Detection and Skip
**Objective**: Verify the service detects near-silent buffers (RMS < threshold) and marks them as `SILENT` without routing to transcription.

**Test Steps**:
1. Create a buffer of all-zero samples
2. Ingest with silence detection enabled (`silenceThresholdRms: 0.01`)
3. Assert returned receipt has `status: 'SILENT'`
4. Assert the transcription pipeline mock was not called

**Expected Result**: Receipt has `status: 'SILENT'`; `transcriptionPipeline.submit` call count remains 0.

**Code Sample**:
```typescript
it('should detect silent chunks and skip transcription routing', async () => {
  const silence = new Float32Array(1024).fill(0);
  const receipt = await service.ingest(silence, { codec: 'pcm', sampleRate: 16000, channels: 1 });

  expect(receipt.status).toBe('SILENT');
  expect(mockTranscriptionPipeline.submit).not.toHaveBeenCalled();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 WebSocket Stream Ingestion

#### TC-F1-I1.1: Continuous Audio Frame Ingestion Over WebSocket
**Objective**: Verify the ingestion service correctly processes a continuous sequence of audio frames delivered via a WebSocket connection.

**Preconditions**:
- WebSocket server running on `ws://localhost:4000/audio`
- Client connected with valid session token

**Test Steps**:
1. Open WebSocket connection and send 50 sequential audio frame messages (each 20ms of audio at 16kHz = 320 samples)
2. Wait for all frames to be acknowledged
3. Query ingestion service for total chunks received for the session
4. Assert count = 50, no dropped frames

**Expected Result**: All 50 frames acknowledged; `service.getSessionStats(sessionId).chunksReceived === 50`; zero dropped frames.

**Code Sample**:
```typescript
it('should ingest 50 sequential audio frames over WebSocket', async () => {
  const ws = new WebSocket('ws://localhost:4000/audio');
  await waitForOpen(ws);

  ws.send(JSON.stringify({ type: 'auth', token: 'test-token', sessionId: 'sess-ws-01' }));

  for (let i = 0; i < 50; i++) {
    const frame = createAudioFrame(320, i); // 20ms at 16kHz
    ws.send(frame.buffer);
    await sleep(20); // simulate real-time stream
  }

  await sleep(200); // flush

  const stats = await ingestionService.getSessionStats('sess-ws-01');
  expect(stats.chunksReceived).toBe(50);
  expect(stats.chunksDropped).toBe(0);
  ws.close();
});
```

---

#### TC-F1-I1.2: WebSocket Reconnection and Resume
**Objective**: Verify the ingestion service handles a dropped WebSocket connection and resumes without data loss when the client reconnects.

**Test Steps**:
1. Connect, send 20 frames, forcibly close the WebSocket
2. Reconnect with the same `sessionId` and send 20 more frames
3. Assert total received = 40 across both connections

**Expected Result**: `getSessionStats(sessionId).chunksReceived === 40`; session metadata continuous (no gap marker).

**Code Sample**:
```typescript
it('should resume ingestion after WebSocket reconnection', async () => {
  await sendFrames('sess-reconnect-01', 20, ws1);
  ws1.close();

  await sleep(100);

  const ws2 = new WebSocket('ws://localhost:4000/audio');
  await waitForOpen(ws2);
  ws2.send(JSON.stringify({ type: 'auth', token: 'test-token', sessionId: 'sess-reconnect-01' }));
  await sendFrames('sess-reconnect-01', 20, ws2);

  const stats = await ingestionService.getSessionStats('sess-reconnect-01');
  expect(stats.chunksReceived).toBe(40);
  ws2.close();
});
```

---

### 2.2 Pipeline Hand-off

#### TC-F1-I2.1: Ingested Chunk Delivery to Transcription Queue
**Objective**: Verify that audio chunks ingested by the service are correctly enqueued in the downstream transcription message queue.

**Test Steps**:
1. Ingest 3 audio chunks via the service
2. Poll the transcription message queue (mocked via `InMemoryQueue`)
3. Assert 3 messages are present with matching `chunkId` values

**Expected Result**: Transcription queue contains exactly 3 messages; each message `chunkId` matches the receipt from ingestion.

**Code Sample**:
```typescript
it('should deliver ingested chunks to transcription queue', async () => {
  const receipts: IngestReceipt[] = [];
  for (let i = 0; i < 3; i++) {
    receipts.push(await service.ingest(new Float32Array(1024), defaultMeta));
  }

  await flushQueue();
  const messages = await transcriptionQueue.drain();

  expect(messages).toHaveLength(3);
  receipts.forEach((r, i) => {
    expect(messages[i].chunkId).toBe(r.chunkId);
  });
});
```

---

#### TC-F1-I2.2: Backpressure Signal Propagation to WebSocket Client
**Objective**: Verify that when the ingestion queue is full, the service sends a `BACKPRESSURE` control message to the WebSocket client and the client pauses sending.

**Test Steps**:
1. Configure service with `maxQueueDepth: 3`
2. Drain consumer is paused
3. Send 4 frames over WebSocket
4. Assert the 4th frame triggers a `{ type: 'backpressure', resume: false }` WebSocket response

**Expected Result**: WebSocket client receives `backpressure` control message after 3 frames; client stops transmitting until `resume: true` is received.

---

### 2.3 Storage and Audit Trail

#### TC-F1-I3.1: Ingestion Audit Log Written to Object Storage
**Objective**: Verify that each ingested chunk generates an audit record in the object storage bucket with correct metadata fields.

**Test Steps**:
1. Ingest 2 chunks with distinct session IDs
2. Query mock S3 bucket for audit records under `audit/ingestion/`
3. Assert each record contains `chunkId`, `sessionId`, `sizeBytes`, `ingestTimestamp`

**Expected Result**: 2 audit records found in bucket; all required fields present and non-null.

---

#### TC-F1-I3.2: Failed Ingestion Logged to Dead-Letter Queue
**Objective**: Verify that when audio chunk processing fails (e.g., corrupted buffer), the chunk is routed to the dead-letter queue with error context.

**Test Steps**:
1. Ingest a deliberately corrupted buffer (NaN samples)
2. Assert processing raises an error internally
3. Query dead-letter queue
4. Assert 1 message with `reason: 'CORRUPT_BUFFER'` and original `chunkId`

**Expected Result**: Dead-letter queue contains 1 entry with `reason: 'CORRUPT_BUFFER'`.

---

## 3. EDGE CASE VALIDATION

### 3.1 Malformed and Corrupt Input

#### TC-F1-E1.1: Empty Buffer Rejection
**Objective**: Verify the service rejects a zero-length audio buffer without crashing.

**Test Steps**:
1. Call `service.ingest(new Float32Array(0), defaultMeta)`
2. Assert the call rejects with `EmptyBufferError`
3. Assert service remains operational (ingest subsequent valid buffer succeeds)

**Expected Result**: Rejects with `EmptyBufferError`; service continues functioning normally.

**Code Sample**:
```typescript
it('should reject empty audio buffer gracefully', async () => {
  await expect(service.ingest(new Float32Array(0), defaultMeta)).rejects.toThrow(EmptyBufferError);

  // Service should still be healthy
  const receipt = await service.ingest(new Float32Array(1024), defaultMeta);
  expect(receipt.status).toBe('QUEUED');
});
```

---

#### TC-F1-E1.2: NaN and Infinity Sample Handling
**Objective**: Verify the service sanitizes buffers containing NaN or Infinity values by clamping/replacing them rather than crashing.

**Test Steps**:
1. Create a buffer where samples at index 100 = NaN and index 200 = Infinity
2. Ingest with `sanitize: true` option
3. Dequeue and assert those positions are replaced with 0.0

**Expected Result**: Dequeued chunk has 0.0 at positions 100 and 200; no exception thrown.

**Code Sample**:
```typescript
it('should sanitize NaN and Infinity values in buffer', async () => {
  const samples = new Float32Array(1024).fill(0.1);
  samples[100] = NaN;
  samples[200] = Infinity;

  await service.ingest(samples, { ...defaultMeta, sanitize: true });
  const chunk = await service.dequeue();

  expect(chunk.samples[100]).toBe(0.0);
  expect(chunk.samples[200]).toBe(0.0);
});
```

---

### 3.2 Concurrent Session Handling

#### TC-F1-E2.1: Simultaneous Multi-Session Ingestion Isolation
**Objective**: Verify that chunks from two concurrent sessions are correctly isolated and never mixed.

**Test Steps**:
1. Concurrently ingest 10 chunks for `sessionA` and 10 chunks for `sessionB` using `Promise.all`
2. Drain queue and partition by `sessionId`
3. Assert `sessionA` has exactly 10 chunks, `sessionB` has exactly 10 chunks

**Expected Result**: Queue yields exactly 20 chunks with correct session assignment and zero cross-contamination.

**Code Sample**:
```typescript
it('should isolate chunks from concurrent sessions', async () => {
  await Promise.all([
    ...Array.from({ length: 10 }, () => service.ingest(new Float32Array(512), { ...defaultMeta, sessionId: 'sessA' })),
    ...Array.from({ length: 10 }, () => service.ingest(new Float32Array(512), { ...defaultMeta, sessionId: 'sessB' }))
  ]);

  const chunks = await drainAll();
  const sessA = chunks.filter(c => c.sessionId === 'sessA');
  const sessB = chunks.filter(c => c.sessionId === 'sessB');

  expect(sessA).toHaveLength(10);
  expect(sessB).toHaveLength(10);
});
```

---

#### TC-F1-E2.2: Session Termination Mid-Stream
**Objective**: Verify that when a session is terminated mid-ingestion, all already-queued chunks for that session are flushed and remaining in-flight chunks are discarded cleanly.

**Test Steps**:
1. Ingest 5 chunks for `sess-term-01`
2. Call `service.terminateSession('sess-term-01')`
3. Attempt to ingest 2 more chunks for the same session
4. Assert the 2 post-termination ingest calls reject with `SessionTerminatedError`

**Expected Result**: Post-termination ingests reject with `SessionTerminatedError`; pre-termination chunks remain in queue for downstream processing.

---

### 3.3 Resource Exhaustion

#### TC-F1-E3.1: Memory Pressure During Burst Ingestion
**Objective**: Verify the service does not allocate unbounded memory when receiving a sudden burst of 1000 chunks in rapid succession.

**Test Steps**:
1. Record heap usage before burst
2. Ingest 1000 chunks with `maxQueueDepth: 50` (back-pressure enforced)
3. Record heap usage after burst
4. Assert heap delta < 50 MB

**Expected Result**: Back-pressure rejects excess chunks; heap growth stays within 50 MB bound.

---

#### TC-F1-E3.2: Large Chunk Size Handling (60-Second Audio Block)
**Objective**: Verify the service can handle an unusually large single chunk representing 60 seconds of audio without timeout.

**Test Steps**:
1. Create a buffer of `16000 * 60 = 960000` samples
2. Ingest with a 10-second timeout
3. Assert completion within timeout and receipt returned

**Expected Result**: Ingest completes within 10 seconds; `receipt.status === 'QUEUED'`; chunk is automatically split into 10-second sub-chunks.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Throughput Benchmarks

#### TC-F1-P1.1: Sustained 100 Concurrent Stream Throughput
**Objective**: Verify the ingestion service sustains 100 concurrent audio streams each delivering 50 frames/sec without frame loss.

**Preconditions**:
- Service deployed with 4 worker threads
- Each stream delivers 20ms frames at 16kHz (320 samples/frame)

**Test Steps**:
1. Open 100 concurrent WebSocket connections
2. Each sends 50 frames over 1 second
3. Measure total frames received vs. sent
4. Assert loss rate < 0.1%

**Expected Result**: Total frames received >= 4995 of 5000 sent; P95 frame acknowledgement latency < 50ms.

**Code Sample**:
```typescript
it('should sustain 100 concurrent streams with <0.1% frame loss', async () => {
  const streams = Array.from({ length: 100 }, (_, i) =>
    createStreamClient(`sess-perf-${i}`)
  );

  const results = await Promise.all(streams.map(s => s.sendFrames(50)));
  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
  const totalReceived = results.reduce((sum, r) => sum + r.acked, 0);

  expect(totalSent).toBe(5000);
  expect(totalReceived / totalSent).toBeGreaterThan(0.999);
}, 15000);
```

---

#### TC-F1-P1.2: Single-Stream Ingestion Latency (P99 < 5ms)
**Objective**: Verify that the time from `service.ingest()` call to `QUEUED` receipt is below 5ms at P99 across 1000 sequential calls.

**Test Steps**:
1. Record wall-clock time before and after each of 1000 `service.ingest()` calls
2. Sort latency samples
3. Assert P99 latency < 5ms

**Expected Result**: P99 latency < 5ms; P50 latency < 1ms.

**Code Sample**:
```typescript
it('should achieve P99 ingest latency < 5ms', async () => {
  const latencies: number[] = [];

  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await service.ingest(new Float32Array(320), defaultMeta);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  expect(p99).toBeLessThan(5);
}, 30000);
```

---

### 4.2 Codec Processing Speed

#### TC-F1-P2.1: Opus Decode Throughput (Real-Time Factor > 20x)
**Objective**: Verify the Opus decoder processes audio at least 20x faster than real-time to ensure the pipeline never becomes a bottleneck.

**Test Steps**:
1. Encode 60 seconds of audio as Opus
2. Measure wall-clock time to decode all frames
3. Assert real-time factor = (60s / decode_time_seconds) > 20

**Expected Result**: Decode completes in < 3 seconds for 60s of audio; RTF > 20.

---

#### TC-F1-P2.2: Resampling CPU Overhead
**Objective**: Verify that 44.1kHz-to-16kHz resampling for 1 hour of audio consumes less than 2% CPU on a single core.

**Test Steps**:
1. Feed 3,600 seconds of 44.1kHz audio through the resampler in batch mode
2. Monitor CPU usage via `process.cpuUsage()`
3. Assert total user-space CPU time < 72 seconds (2% of 3600s)

**Expected Result**: CPU consumption for resampling stays below 2% of a single core across 1 hour of audio.

---

### 4.3 Resilience Under Load

#### TC-F1-P3.1: Queue Drain Speed After Back-Pressure Relief
**Objective**: Verify that once a full queue starts draining, the consumer clears backlog at >= 500 chunks/second.

**Test Steps**:
1. Fill queue to `maxQueueDepth: 200`
2. Start consumer and measure time to drain all 200 chunks
3. Assert drain rate >= 500 chunks/second (i.e., < 400ms for 200 chunks)

**Expected Result**: 200 chunks drained within 400ms; drain rate >= 500 chunks/sec.

---

#### TC-F1-P3.2: Graceful Degradation at 200% Overload
**Objective**: Verify that at 2x the rated capacity, the service sheds load gracefully (back-pressure), maintains P95 latency < 100ms for admitted chunks, and does not crash.

**Test Steps**:
1. Send chunks at twice the rated throughput for 30 seconds
2. Monitor: (a) service health endpoint returns 200, (b) admitted chunk P95 latency, (c) error counts
3. Assert service remains alive; admitted chunk latency < 100ms; no unhandled exceptions

**Expected Result**: Service stays healthy; back-pressure rejects excess load; admitted traffic processed within latency SLA.

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, 9 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: 27 comprehensive test cases

### Coverage Targets
| Metric | Target |
|---|---|
| Line Coverage | > 88% |
| Branch Coverage | > 82% |
| Function Coverage | > 92% |

### Key Performance Targets
| Metric | Target |
|---|---|
| P99 ingest latency | < 5ms |
| Max concurrent streams | 100 |
| Frame loss rate | < 0.1% |
| Opus decode RTF | > 20x |
