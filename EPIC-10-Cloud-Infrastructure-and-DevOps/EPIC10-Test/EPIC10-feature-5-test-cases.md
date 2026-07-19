# EPIC10 Feature 5 — GPU Inference Infrastructure — Test Cases

## Test Overview
Comprehensive test suite for the GPU Inference Infrastructure covering unit tests, integration tests, edge cases, and performance validation. Tests validate batch inference scheduling, GPU memory management, model loading and hot-swapping, request queue management, throughput under conference-day transcription bursts, and graceful degradation when GPU capacity is exhausted.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Batch Inference Scheduling

#### TC-F5-U1.1: Requests Batched by Optimal Batch Size for GPU Utilization
**Objective**: Verify the batch scheduler accumulates requests up to the configured max batch size (32) or a 50 ms timeout, whichever comes first, to maximize GPU utilization.

**Preconditions**:
- Inference scheduler configured: `maxBatchSize: 32`, `maxWaitMs: 50`
- GPU worker mock accepting batched requests

**Test Steps**:
1. Submit 20 inference requests within 10 ms
2. Assert scheduler does NOT dispatch immediately (batch not full, timeout not elapsed)
3. Submit 12 more requests (total 32)
4. Assert scheduler dispatches immediately upon reaching batch size 32
5. Assert single batch of 32 sent to GPU worker

**Expected Result**: Batch accumulation works correctly; dispatches on full batch before timeout.

**Code Sample**:
```typescript
describe('InferenceBatchScheduler', () => {
  it('should dispatch batch of 32 when max batch size reached before timeout', async () => {
    jest.useFakeTimers();
    const dispatched: InferenceBatch[] = [];
    const scheduler = new InferenceBatchScheduler({
      maxBatchSize: 32,
      maxWaitMs: 50,
      onDispatch: (batch) => dispatched.push(batch),
    });

    for (let i = 0; i < 32; i++) {
      scheduler.submit({ sessionId: 'sess-001', audioChunk: Buffer.alloc(1024) });
    }

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].requests).toHaveLength(32);
    // Timeout should NOT have fired
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });
});
```

---

#### TC-F5-U1.2: Partial Batch Dispatched After 50ms Timeout
**Objective**: Verify that a partial batch (fewer than 32 requests) is dispatched after the 50 ms wait timeout to prevent unbounded latency for requests that arrive during quiet periods.

**Test Steps**:
1. Submit 5 inference requests
2. Advance timer by 51 ms
3. Assert batch of 5 dispatched to GPU worker
4. Assert no requests waiting after dispatch

**Expected Result**: Timeout-based flush dispatches partial batch; no requests stuck indefinitely.

**Code Sample**:
```typescript
it('should dispatch partial batch after 50ms timeout', async () => {
  jest.useFakeTimers();
  const dispatched: InferenceBatch[] = [];
  const scheduler = new InferenceBatchScheduler({ maxBatchSize: 32, maxWaitMs: 50, onDispatch: (b) => dispatched.push(b) });

  for (let i = 0; i < 5; i++) scheduler.submit({ sessionId: 'sess-002', audioChunk: Buffer.alloc(512) });

  expect(dispatched).toHaveLength(0);
  jest.advanceTimersByTime(51);
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0].requests).toHaveLength(5);
});
```

---

#### TC-F5-U1.3: Priority Queue Promotes Real-Time Session Requests Over Batch
**Objective**: Verify that live conference session inference requests are prioritized over queued offline batch jobs when GPU capacity is constrained.

**Test Steps**:
1. Queue 10 offline batch jobs (priority `LOW`)
2. Submit 1 real-time session request (priority `HIGH`)
3. Call `scheduler.nextBatch()`
4. Assert real-time request dispatched first

**Expected Result**: Priority queue ensures live sessions get GPU access before background batch jobs.

**Code Sample**:
```typescript
it('should prioritize real-time session requests over batch jobs', () => {
  const scheduler = new PriorityInferenceScheduler();

  for (let i = 0; i < 10; i++) scheduler.enqueue({ type: 'BATCH', priority: 'LOW', id: `batch-${i}` });
  scheduler.enqueue({ type: 'REALTIME', priority: 'HIGH', id: 'live-sess-001' });

  const next = scheduler.nextBatch(1);
  expect(next[0].id).toBe('live-sess-001');
});
```

---

### 1.2 GPU Memory Management

#### TC-F5-U2.1: Model Loaded Once and Cached in GPU Memory Across Requests
**Objective**: Verify that the model loader loads the transcription model into GPU memory only once at startup and reuses the cached model handle for subsequent inference calls.

**Test Steps**:
1. Mock GPU memory manager
2. Call `inferenceEngine.infer()` 100 times
3. Assert model `loadToGpu()` called exactly once
4. Assert `infer()` uses cached model handle on all 100 calls

**Expected Result**: Model loading is idempotent; GPU memory not re-allocated on each request.

**Code Sample**:
```typescript
describe('GpuModelManager', () => {
  it('should load model to GPU once and reuse for all inference calls', async () => {
    const loadCalls: string[] = [];
    const mockGpu = createMockGpu({ onLoad: (m) => loadCalls.push(m) });
    const engine = new WhisperInferenceEngine({ gpu: mockGpu, model: 'whisper-large-v3' });

    for (let i = 0; i < 100; i++) {
      await engine.infer(Buffer.alloc(16000));
    }

    expect(loadCalls).toHaveLength(1);
    expect(loadCalls[0]).toBe('whisper-large-v3');
  });
});
```

---

#### TC-F5-U2.2: GPU Out-of-Memory Error Triggers Model Eviction and Reload
**Objective**: Verify that when a CUDA OOM error occurs, the engine evicts the least-recently-used model from GPU memory and reloads the required model.

**Test Steps**:
1. Fill GPU memory with model A and model B
2. Request inference with model C (triggers OOM)
3. Assert LRU model (model A) evicted
4. Assert model C loaded and inference succeeds

**Expected Result**: LRU eviction strategy recovers from OOM; inference completes after eviction.

**Code Sample**:
```typescript
it('should evict LRU model on GPU OOM and reload required model', async () => {
  const manager = new GpuModelCache({ maxGpuMemoryGb: 16 });
  await manager.load('whisper-base'); // 2GB, accessed at t=0
  await manager.load('whisper-large'); // 10GB, accessed at t=1

  // Attempt to load 8GB model — OOM forces eviction
  mockGpu.setNextLoadError('CUDA_OOM');
  await manager.load('whisper-medium'); // 6GB

  expect(manager.getCached()).not.toContain('whisper-base');
  expect(manager.getCached()).toContain('whisper-medium');
});
```

---

#### TC-F5-U2.3: GPU Memory Usage Tracked and Exported as Metric
**Objective**: Verify that GPU memory allocation and free bytes are tracked per model and exported as Prometheus metrics.

**Test Steps**:
1. Load model consuming 8 GB of GPU memory
2. Query `metricsExporter.getGpuMemoryMetrics()`
3. Assert metric `gpu_memory_used_bytes{model="whisper-large-v3"}` equals 8 * 1024^3

**Expected Result**: Accurate GPU memory metrics for capacity planning and alerting.

**Code Sample**:
```typescript
it('should export GPU memory usage as Prometheus metric per model', async () => {
  await gpuManager.loadModel('whisper-large-v3', { expectedMemoryGb: 8 });
  const metrics = await metricsExporter.export();

  expect(metrics).toContain('gpu_memory_used_bytes{model="whisper-large-v3"}');
  expect(metrics).toContain(String(8 * 1024 ** 3));
});
```

---

### 1.3 Model Versioning and Hot-Swap

#### TC-F5-U3.1: New Model Version Loaded Without Interrupting In-Flight Requests
**Objective**: Verify that loading a new model version runs alongside the old model; in-flight requests complete on the old model before the swap occurs.

**Test Steps**:
1. Start 5 long-running inference requests on model v1
2. Trigger model hot-swap to v2
3. Assert in-flight requests complete on v1
4. Assert new requests after swap use v2
5. Assert no requests return errors during transition

**Expected Result**: Zero-downtime model hot-swap; no inference errors during version transition.

**Code Sample**:
```typescript
it('should complete in-flight v1 requests before switching to v2', async () => {
  const v1Results: string[] = [];
  const inFlight = Array.from({ length: 5 }, () =>
    engine.infer(testAudio, { modelVersion: 'v1' }).then((r) => v1Results.push(r.modelVersion))
  );

  engine.hotSwap('v2'); // trigger swap while requests running

  await Promise.all(inFlight);

  expect(v1Results.every((v) => v === 'v1')).toBe(true);
  const newResult = await engine.infer(testAudio);
  expect(newResult.modelVersion).toBe('v2');
});
```

---

#### TC-F5-U3.2: Model Rollback Restores Previous Version on Accuracy Regression
**Objective**: Verify that if a canary evaluation of the new model version shows WER (Word Error Rate) regression > 2%, the engine automatically rolls back to the previous version.

**Test Steps**:
1. Evaluate new model v2 against golden test set
2. Mock WER evaluation: v1=8%, v2=11% (regression > 2%)
3. Assert rollback decision triggered
4. Assert active model reverts to v1

**Expected Result**: Automated quality gate rolls back poor-performing model versions.

**Code Sample**:
```typescript
it('should rollback model when WER regression exceeds 2%', async () => {
  const evaluator = new ModelQualityGate({ maxWerRegression: 2 });
  const result = evaluator.evaluate({ baselineWer: 8, candidateWer: 11 });

  expect(result.decision).toBe('rollback');
  expect(result.reason).toContain('WER regression: 3%');
});
```

---

#### TC-F5-U3.3: Model A/B Test Routes 20% of Traffic to New Version
**Objective**: Verify that the A/B routing layer sends exactly 20% (±2%) of inference requests to the candidate model and 80% to the current stable model.

**Test Steps**:
1. Configure A/B split: stable=80%, candidate=20%
2. Route 1000 inference requests through the splitter
3. Count requests routed to each model
4. Assert candidate receives 180–220 requests (18–22%)

**Expected Result**: Controlled traffic split enables safe model evaluation in production.

**Code Sample**:
```typescript
it('should route approximately 20% of traffic to candidate model', () => {
  const router = new ModelAbRouter({ stableWeight: 80, candidateWeight: 20 });
  const counts = { stable: 0, candidate: 0 };

  for (let i = 0; i < 1000; i++) {
    const model = router.route(`req-${i}`);
    counts[model]++;
  }

  expect(counts.candidate).toBeGreaterThanOrEqual(180);
  expect(counts.candidate).toBeLessThanOrEqual(220);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Transcription Inference

#### TC-F5-I1.1: Audio Chunk Submitted to GPU Returns Transcription Segment
**Objective**: Verify the complete inference pipeline: audio chunk ingested from Kafka → batched → GPU inference → transcription text returned to session service.

**Preconditions**:
- GPU inference service running with Whisper model loaded
- Kafka consumer listening on `conference.audio.chunks`
- Test audio file: 10-second English speech clip

**Test Steps**:
1. Produce audio chunk event to `conference.audio.chunks`
2. Assert GPU inference service picks up chunk within 2 seconds
3. Assert transcription result produced to `conference.transcription.segments`
4. Assert result contains non-empty `text` field and matching `sessionId`

**Expected Result**: End-to-end transcription pipeline functional; result produced within 2 seconds.

**Code Sample**:
```typescript
describe('GPU Inference E2E', () => {
  it('should transcribe audio chunk and produce result to Kafka', async () => {
    const audioChunk = await readTestAudio('./fixtures/10s-english-speech.wav');
    await kafkaProducer.send({
      topic: 'conference.audio.chunks',
      messages: [{ key: 'sess-300', value: JSON.stringify({ sessionId: 'sess-300', audio: audioChunk.toString('base64') }) }],
    });

    const result = await waitForKafkaMessage('conference.transcription.segments', 10_000);
    expect(result.sessionId).toBe('sess-300');
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(10);
  });
});
```

---

#### TC-F5-I1.2: Batch of 32 Audio Chunks Processed Within 500ms
**Objective**: Verify that a full batch of 32 audio chunks (each 5 seconds) is processed by the GPU inference engine and results returned within 500 ms.

**Test Steps**:
1. Submit 32 audio chunks simultaneously to inference service
2. Record time from first submission to last result received
3. Assert total processing time < 500 ms
4. Assert all 32 results contain valid transcription text

**Expected Result**: GPU batch processing meets real-time transcription latency requirements.

---

### 2.2 GPU Cluster Scaling

#### TC-F5-I2.1: Inference Service Scales from 1 to 4 GPU Pods Under Conference Load
**Objective**: Verify that the GPU inference deployment scales from 1 to 4 pods when inference queue depth exceeds the configured threshold (500 pending requests).

**Preconditions**:
- GPU HPA configured: scale-out trigger = queue depth > 500
- Available GPU nodes: 4
- GPU node type: NVIDIA A100

**Test Steps**:
1. Submit 600 inference requests rapidly (exceed queue threshold)
2. Monitor HPA events and pod count
3. Assert pod count reaches 4 within 3 minutes
4. Assert queue depth decreases as new GPU pods come online

**Expected Result**: GPU autoscaling triggers; queue drained as capacity scales; no requests dropped.

**Code Sample**:
```shell
# Watch GPU pod scaling
kubectl get hpa gpu-inference-hpa --watch &
kubectl get pods -l app=gpu-inference-service --watch &

# Drive load
node load-test-inference.js --requests=600 --concurrency=100

# Verify scale-out
kubectl get deployment gpu-inference-service -o jsonpath='{.spec.replicas}'
```

---

#### TC-F5-I2.2: GPU Node Labeled Correctly and Pod Scheduled on GPU Node Only
**Objective**: Verify that GPU inference pods are scheduled exclusively on nodes with the `nvidia.com/gpu: 1` label and never on CPU-only nodes.

**Test Steps**:
1. List all nodes where GPU inference pods are running
2. For each node, assert label `nvidia.com/gpu` exists and has value >= 1
3. Assert no GPU inference pod running on CPU-only node

**Expected Result**: GPU workloads pinned to GPU nodes via nodeSelector; CPU nodes not contaminated with GPU workloads.

**Code Sample**:
```shell
# Verify all GPU inference pods run on GPU nodes
kubectl get pods -l app=gpu-inference-service -o wide \
  | awk 'NR>1 {print $7}' \
  | xargs -I{} kubectl get node {} \
    -o jsonpath='{.metadata.labels.nvidia\.com/gpu}{"\n"}' \
  | grep -v '^$' | grep -c '1'
```

---

### 2.3 Inference Result Quality

#### TC-F5-I3.1: Transcription WER Below 10% on Standard English Test Set
**Objective**: Verify the deployed Whisper model achieves Word Error Rate below 10% on the standard conference speech evaluation dataset.

**Test Steps**:
1. Run inference on 100 golden audio clips with known transcriptions
2. Calculate WER: (substitutions + deletions + insertions) / total words
3. Assert WER < 10%

**Expected Result**: Model meets quality threshold; below-threshold deployment blocked by quality gate.

---

#### TC-F5-I3.2: Speaker Diarization Tags Segments with Correct Speaker Count
**Objective**: Verify the diarization post-processor correctly identifies 2 speakers in a 2-speaker test audio clip and tags each transcription segment with `speakerId`.

**Test Steps**:
1. Submit 2-speaker interview audio for inference
2. Assert result contains segments tagged with `speakerId: "SPEAKER_01"` and `speakerId: "SPEAKER_02"`
3. Assert no segment lacks a `speakerId`

**Expected Result**: Diarization correctly labels segments; contact intelligence can attribute notes to correct speaker.

---

## 3. EDGE CASE VALIDATION

### 3.1 GPU Resource Exhaustion

#### TC-F5-E1.1: Queue Overflow Returns 503 With Retry-After When GPU Saturated
**Objective**: Verify that when the inference request queue reaches maximum capacity (1000 pending), new requests are rejected with `503 Service Unavailable` and a `Retry-After` header.

**Test Steps**:
1. Fill inference queue to 1000 pending requests
2. Submit additional inference request
3. Assert response is `503`
4. Assert `Retry-After` header present with estimated wait time

**Expected Result**: Load shedding protects GPU queue; clients can back off and retry.

**Code Sample**:
```typescript
it('should return 503 with Retry-After when GPU inference queue is full', async () => {
  await fillInferenceQueue(1000);

  const res = await request(inferenceServiceUrl)
    .post('/infer')
    .send({ sessionId: 'sess-overflow', audio: testAudioBase64 });

  expect(res.status).toBe(503);
  expect(res.headers['retry-after']).toBeDefined();
  expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
});
```

---

#### TC-F5-E1.2: CUDA Driver Error Logged and Pod Restarted by Liveness Probe
**Objective**: Verify that a fatal CUDA driver error is caught, logged with full context, and the pod is restarted by the Kubernetes liveness probe within 60 seconds.

**Test Steps**:
1. Inject CUDA driver crash into GPU inference pod
2. Assert error logged with severity `FATAL` and stack trace
3. Assert pod fails liveness probe within 30 seconds
4. Assert Kubernetes restarts the pod
5. Assert pod reaches `Running` state within 60 seconds of crash

**Expected Result**: CUDA crash recovery automated; pod self-heals within 60-second SLA.

---

### 3.2 Malformed Input Handling

#### TC-F5-E2.1: Non-Audio Payload Returns 400 Without GPU Invocation
**Objective**: Verify the inference service validates audio format before GPU invocation, returning `400 Bad Request` for non-audio payloads without consuming GPU resources.

**Test Steps**:
1. Submit a JSON object as the audio payload (not base64 audio)
2. Assert response is `400 Bad Request`
3. Assert error body contains `"error": "invalid_audio_format"`
4. Assert GPU inference kernel was not called (0 GPU calls recorded)

**Expected Result**: Input validation at API layer; GPU protected from malformed payloads.

**Code Sample**:
```typescript
it('should return 400 without invoking GPU when audio payload is malformed', async () => {
  const gpuCallCount = { value: 0 };
  mockGpu.onInfer(() => gpuCallCount.value++);

  const res = await request(inferenceServiceUrl)
    .post('/infer')
    .send({ sessionId: 'sess-bad', audio: '{ not audio }' });

  expect(res.status).toBe(400);
  expect(res.body.error).toBe('invalid_audio_format');
  expect(gpuCallCount.value).toBe(0);
});
```

---

#### TC-F5-E2.2: Zero-Length Audio Returns Empty Transcription Without Error
**Objective**: Verify that a valid audio container with zero audio samples returns an empty transcription result rather than throwing a runtime error.

**Test Steps**:
1. Submit WAV file with valid header but 0 audio samples
2. Assert response is `200 OK`
3. Assert result body contains `{ "text": "", "segments": [] }`

**Expected Result**: Empty audio handled gracefully; no exception thrown; empty transcription returned.

---

### 3.3 Model Loading Failures

#### TC-F5-E3.1: Service Startup Fails Safely if Model File Corrupt
**Objective**: Verify that if the model checkpoint file is corrupted (checksum mismatch), the inference service fails to start and emits a clear error rather than serving with a corrupt model.

**Test Steps**:
1. Replace model checkpoint with zero-byte file
2. Attempt to start inference service
3. Assert startup fails with exit code 1
4. Assert log contains `"error": "model_checksum_mismatch"` with expected vs actual checksums

**Expected Result**: Corrupt model detected at startup; service refuses to start rather than silently degrading.

---

#### TC-F5-E3.2: Model Download Retry Succeeds After Transient S3 Failure
**Objective**: Verify that if the initial model download from S3 fails (network error), the loader retries up to 3 times and successfully initializes the service.

**Test Steps**:
1. Configure S3 mock to return 503 for first 2 download attempts
2. Start inference service
3. Assert model downloaded on 3rd attempt
4. Assert service reaches healthy state

**Expected Result**: Retry logic handles transient S3 failures; service self-initializes without manual intervention.

**Code Sample**:
```typescript
it('should retry model download after transient S3 failure', async () => {
  let attempts = 0;
  mockS3.onGet('/models/whisper-large-v3', () => {
    attempts++;
    if (attempts < 3) throw new S3Error('ServiceUnavailable');
    return modelBuffer;
  });

  const loader = new ModelLoader({ s3: mockS3, maxRetries: 3 });
  await expect(loader.load('whisper-large-v3')).resolves.toBeDefined();
  expect(attempts).toBe(3);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Batch Inference Throughput

#### TC-F5-P1.1: GPU Achieves 100 Audio Minutes Per Minute Throughput
**Objective**: Verify the GPU inference service processes audio at 100x real-time speed (100 minutes of audio per minute of wall-clock time) with batch size 32.

**Preconditions**:
- GPU: NVIDIA A100 40GB
- Model: Whisper Large v3
- Audio: 16kHz mono WAV, 10-second clips
- Batch size: 32

**Test Steps**:
1. Submit 6000 10-second audio clips (1000 minutes of audio total)
2. Record wall-clock time to completion
3. Calculate throughput: audio minutes / wall-clock minutes
4. Assert throughput >= 100x real-time

**Expected Result**: GPU delivers 100x real-time throughput; sufficient for conference-day load.

**Code Sample**:
```shell
# GPU throughput benchmark
python3 benchmark_inference.py \
  --model whisper-large-v3 \
  --batch-size 32 \
  --audio-count 6000 \
  --audio-duration-sec 10 \
  --gpu-device cuda:0 \
  --output-metric throughput_minutes_per_minute
```

---

#### TC-F5-P1.2: p95 Inference Latency for Single Request Under 800ms
**Objective**: Verify that single (non-batched) inference requests for a 10-second audio clip complete within 800 ms at p95, supporting the real-time transcription UX requirement.

**Test Steps**:
1. Submit 500 single-request inference calls (no batching)
2. Measure p50, p95, p99 latency
3. Assert p95 < 800 ms

**Expected Result**: Single-request latency within user-perceived real-time threshold.

---

### 4.2 GPU Utilization Efficiency

#### TC-F5-P2.1: GPU Compute Utilization Above 80% Under Full Conference Load
**Objective**: Verify that the GPU compute utilization stays above 80% during sustained conference-day load, confirming the batching strategy is effective.

**Test Steps**:
1. Run 30 minutes of sustained conference load (continuous audio chunks)
2. Monitor `nvidia-smi --query-gpu=utilization.gpu` every 5 seconds
3. Assert average utilization > 80%

**Expected Result**: Efficient GPU utilization; batching strategy validated; no under-utilization waste.

**Code Sample**:
```shell
# Monitor GPU utilization during load test
nvidia-smi dmon -s u -d 5 -c 360 | tee gpu-utilization.log &

# Run conference load
node conference-load-simulator.js --duration=30m --sessions=50

# Analyze utilization
awk 'NR>1 && $2 ~ /^[0-9]+$/ { sum+=$2; count++ } END { print "Avg GPU utilization: " sum/count "%" }' gpu-utilization.log
```

---

#### TC-F5-P2.2: Memory Bandwidth Utilization Above 70% During Inference
**Objective**: Verify the GPU memory bandwidth is used efficiently (> 70% of peak) during batch inference, confirming audio tensors are loaded efficiently.

**Test Steps**:
1. Profile memory bandwidth during 32-request batch inference
2. Assert utilization > 70% of A100's 2 TB/s peak bandwidth

**Expected Result**: Memory bandwidth efficient; no I/O bottleneck masking compute capacity.

---

### 4.3 Scaling and Cost Efficiency

#### TC-F5-P3.1: GPU Cluster Processes 50 Concurrent Sessions Within SLA
**Objective**: Verify that 4 GPU pods can handle 50 concurrent conference sessions simultaneously, each with 10 audio chunks per minute, within the 800 ms per-segment SLA.

**Test Steps**:
1. Scale to 4 GPU pods
2. Simulate 50 concurrent sessions (500 chunks/minute total)
3. Measure per-segment transcription latency for each session
4. Assert 95% of segments processed within 800 ms

**Expected Result**: 4 GPU pods sufficient for 50 simultaneous conference sessions; cost model validated.

---

#### TC-F5-P3.2: GPU Pod Scale-Down After Conference Ends Within 10 Minutes
**Objective**: Verify that after conference sessions end and the inference queue drains to zero, GPU pods scale down from 4 to 1 within 10 minutes, reducing GPU cost.

**Test Steps**:
1. End all conference sessions (queue drains to zero)
2. Monitor HPA and GPU pod count
3. Assert pod count reduces from 4 to 1 within 10 minutes

**Expected Result**: GPU cost reduced after conference; autoscaling scale-down works within cooldown period.

**Code Sample**:
```shell
# Verify GPU scale-down after conference ends
START=$(date +%s)
kubectl scale deployment gpu-inference-service --replicas=4
# Simulate conference end — stop producing audio chunks
sleep 10  # allow queue to drain

# Wait for scale-down
until [ "$(kubectl get deployment gpu-inference-service -o jsonpath='{.spec.replicas}')" -le "1" ]; do
  sleep 30
done
END=$(date +%s)
echo "Scale-down completed in $((END - START)) seconds"
[ $((END - START)) -le 600 ] && echo "PASS" || echo "FAIL"
```

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **~27** |

**Coverage**: Batch scheduling, priority queuing, GPU memory management, model hot-swap, A/B routing, E2E transcription pipeline, GPU autoscaling, WER validation, queue overflow handling, CUDA crash recovery, malformed audio input, model loading failures, throughput benchmarks, GPU utilization, multi-session capacity, cost-optimizing scale-down.
