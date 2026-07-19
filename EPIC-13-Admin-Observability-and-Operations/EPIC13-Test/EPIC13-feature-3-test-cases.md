# EPIC13 Feature 3 — AI Model Monitoring — Test Cases

## Test Overview
Comprehensive test suite for AI Model Monitoring covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Model Performance Metric Collection

#### TC-F3-U1.1: Transcription Accuracy (WER) Computation
**Objective**: Verify the Word Error Rate calculator produces correct WER values against known reference transcripts

**Preconditions**:
- `WERCalculator` class instantiated
- Reference and hypothesis transcript pairs prepared

**Test Steps**:
1. Provide reference: `"the quick brown fox"`, hypothesis: `"the quick brown dog"`
2. Call `calculator.compute(reference, hypothesis)`
3. Assert WER = 0.25 (1 substitution out of 4 words)
4. Test with perfect match — assert WER = 0.0
5. Test with completely wrong hypothesis — assert WER = 1.0

**Expected Result**: WER computed correctly across boundary conditions; formula validated against Levenshtein edit distance standard

**Code Sample**:
```typescript
import { WERCalculator } from '@platform/model-monitoring';

describe('WERCalculator', () => {
  const calculator = new WERCalculator();

  it('should compute WER = 0.25 for one substitution in four words', () => {
    const wer = calculator.compute(
      'the quick brown fox',
      'the quick brown dog'
    );
    expect(wer).toBeCloseTo(0.25, 4);
  });

  it('should return WER = 0.0 for a perfect match', () => {
    expect(calculator.compute('hello world', 'hello world')).toBe(0.0);
  });

  it('should return WER = 1.0 for completely wrong hypothesis', () => {
    const wer = calculator.compute('one two three', 'four five six');
    expect(wer).toBeCloseTo(1.0, 4);
  });
});
```

---

#### TC-F3-U1.2: Model Latency Percentile Tracking
**Objective**: Verify the model latency tracker correctly computes P50, P95, and P99 from a rolling window of observations

**Preconditions**:
- `LatencyTracker` initialized with 1000-sample rolling window

**Test Steps**:
1. Record 1000 latency samples (normal distribution, mean=2.0s, stddev=0.5s)
2. Call `tracker.getPercentiles()`
3. Assert P50 is within 1.9–2.1 seconds
4. Assert P99 is above P95 which is above P50
5. Assert total sample count = 1000

**Expected Result**: Percentile computation accurate within statistical tolerance for normally distributed samples

**Code Sample**:
```typescript
import { LatencyTracker } from '@platform/model-monitoring';

describe('LatencyTracker', () => {
  it('should compute correct latency percentiles from rolling window', () => {
    const tracker = new LatencyTracker({ windowSize: 1000 });

    // Seed with approximately normal distribution
    for (let i = 0; i < 1000; i++) {
      tracker.record(gaussianRandom(2.0, 0.5));
    }

    const percentiles = tracker.getPercentiles();
    expect(percentiles.p50).toBeGreaterThan(1.9);
    expect(percentiles.p50).toBeLessThan(2.1);
    expect(percentiles.p99).toBeGreaterThan(percentiles.p95);
    expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
    expect(tracker.sampleCount).toBe(1000);
  });
});
```

---

#### TC-F3-U1.3: Model Version Registry CRUD Operations
**Objective**: Verify AI model versions can be registered, retrieved, updated, and deprecated via the model registry service

**Preconditions**:
- `ModelRegistry` initialized with in-memory store
- No pre-existing model versions

**Test Steps**:
1. Register model: `{ name: 'whisper-large', version: '3.1', status: 'ACTIVE' }`
2. Retrieve by name and version — assert returned model matches
3. Update status to `DEPRECATED`
4. Assert retrieval reflects updated status
5. Attempt to retrieve non-existent version — assert `ModelNotFoundError`

**Expected Result**: Full lifecycle CRUD operations work correctly; version-specific queries isolated

**Code Sample**:
```typescript
describe('ModelRegistry', () => {
  it('should support full CRUD lifecycle for model versions', async () => {
    const registry = new ModelRegistry(inMemoryStore);

    await registry.register({
      name: 'whisper-large',
      version: '3.1',
      status: 'ACTIVE',
      artifactUri: 's3://models/whisper-large-v3.1',
    });

    const model = await registry.get('whisper-large', '3.1');
    expect(model.status).toBe('ACTIVE');

    await registry.updateStatus('whisper-large', '3.1', 'DEPRECATED');
    const updated = await registry.get('whisper-large', '3.1');
    expect(updated.status).toBe('DEPRECATED');

    await expect(registry.get('whisper-large', '99.0')).rejects.toThrow('ModelNotFoundError');
  });
});
```

---

### 1.2 Drift Detection

#### TC-F3-U2.1: Input Distribution Drift Detection via KL Divergence
**Objective**: Verify the drift detector correctly identifies significant input distribution shifts using KL divergence

**Preconditions**:
- Baseline audio-length distribution established from 10,000 training samples
- Drift threshold: KL divergence > 0.1 triggers DRIFT_DETECTED

**Test Steps**:
1. Feed a sample set representative of baseline distribution — assert `STABLE`
2. Feed a sample set with audio lengths skewed heavily toward long recordings — compute KL divergence
3. Assert KL divergence > 0.1
4. Assert drift detector returns `DRIFT_DETECTED` with drift magnitude

**Expected Result**: Drift detector correctly distinguishes stable from drifted input distributions

**Code Sample**:
```typescript
import { DriftDetector } from '@platform/model-monitoring';

describe('DriftDetector', () => {
  const baseline = generateNormalDistribution({ mean: 120, stddev: 30, n: 10000 }); // audio seconds

  it('should return STABLE for samples matching baseline distribution', () => {
    const detector = new DriftDetector({ baseline, threshold: 0.1 });
    const stableSamples = generateNormalDistribution({ mean: 122, stddev: 31, n: 500 });
    const result = detector.detect(stableSamples);
    expect(result.status).toBe('STABLE');
    expect(result.klDivergence).toBeLessThan(0.1);
  });

  it('should return DRIFT_DETECTED for significantly shifted input distribution', () => {
    const detector = new DriftDetector({ baseline, threshold: 0.1 });
    const driftedSamples = generateNormalDistribution({ mean: 480, stddev: 120, n: 500 });
    const result = detector.detect(driftedSamples);
    expect(result.status).toBe('DRIFT_DETECTED');
    expect(result.klDivergence).toBeGreaterThan(0.1);
    expect(result.driftMagnitude).toBeDefined();
  });
});
```

---

#### TC-F3-U2.2: Output Confidence Score Degradation Alert
**Objective**: Verify alert triggers when model output confidence scores drop below threshold

**Preconditions**:
- Confidence alert threshold: mean confidence < 0.75 over 100 consecutive inferences

**Test Steps**:
1. Record 100 inference confidence scores averaging 0.82 — assert no alert
2. Record 100 scores averaging 0.68 — assert alert emitted
3. Assert alert contains model name, current average, and threshold

**Expected Result**: Confidence degradation detected promptly; alert suppressed when above threshold

**Code Sample**:
```typescript
it('should emit alert when mean confidence drops below 0.75', () => {
  const alerts: any[] = [];
  const monitor = new ConfidenceMonitor({
    modelName: 'entity-extractor-v2',
    threshold: 0.75,
    windowSize: 100,
    onAlert: (a) => alerts.push(a),
  });

  // Window of high-confidence inferences — no alert
  for (let i = 0; i < 100; i++) monitor.record(0.82 + Math.random() * 0.05);
  expect(alerts).toHaveLength(0);

  // Window of low-confidence inferences — should alert
  for (let i = 0; i < 100; i++) monitor.record(0.65 + Math.random() * 0.06);
  expect(alerts).toHaveLength(1);
  expect(alerts[0].modelName).toBe('entity-extractor-v2');
  expect(alerts[0].currentMean).toBeLessThan(0.75);
});
```

---

#### TC-F3-U2.3: Model Comparison — A/B Performance Differential
**Objective**: Verify the A/B model comparator correctly calculates performance differential between two model versions

**Test Steps**:
1. Provide model-A metrics: WER=0.12, latency_p99=2.1s
2. Provide model-B metrics: WER=0.09, latency_p99=2.8s
3. Call `comparator.compare(modelA, modelB)`
4. Assert differential shows model-B is better on accuracy, worse on latency
5. Assert composite score computed per configured weights

**Expected Result**: Multi-metric comparison produces correct per-metric and composite differentials

---

### 1.3 Model Health Reporting

#### TC-F3-U3.1: Model Health Score Aggregation
**Objective**: Verify the model health score aggregates accuracy, latency, and availability into a single normalized score

**Test Steps**:
1. Provide model metrics: accuracy=0.91, p99_latency=1.8s, availability=0.999
2. Call `HealthScorer.score(metrics, weights: { accuracy: 0.5, latency: 0.3, availability: 0.2 })`
3. Assert returned score is between 0 and 1
4. Assert score increases when accuracy improves while other metrics fixed

**Expected Result**: Composite health score is monotonically consistent with individual metric improvements

**Code Sample**:
```typescript
it('should compute higher health score for better accuracy', () => {
  const scorer = new ModelHealthScorer({
    weights: { accuracy: 0.5, latency: 0.3, availability: 0.2 },
    latencyTarget: 2.0,
  });

  const baseScore = scorer.score({ accuracy: 0.91, p99LatencySeconds: 1.8, availability: 0.999 });
  const improvedScore = scorer.score({ accuracy: 0.96, p99LatencySeconds: 1.8, availability: 0.999 });

  expect(improvedScore).toBeGreaterThan(baseScore);
  expect(baseScore).toBeGreaterThan(0);
  expect(baseScore).toBeLessThanOrEqual(1);
});
```

---

#### TC-F3-U3.2: Model SLA Breach Notification
**Objective**: Verify an SLA breach notification is emitted when model availability drops below the 99.5% SLA threshold

**Test Steps**:
1. Configure SLA: availability >= 0.995
2. Record 200 successful inferences then 5 consecutive failures (availability ≈ 0.976)
3. Assert SLA breach event emitted with timestamp and breach percentage
4. Restore availability; assert recovery event emitted

**Expected Result**: SLA breach detection operates in near-real-time; recovery events close the incident lifecycle

---

#### TC-F3-U3.3: Model Rollback Recommendation on Sustained Degradation
**Objective**: Verify the system generates a rollback recommendation when a newly deployed model shows sustained WER degradation

**Test Steps**:
1. Deploy model version `v2.0` replacing `v1.9`
2. Record 500 inferences where `v2.0` WER averages 0.20 vs. `v1.9` baseline of 0.10
3. Assert `ModelAnalyzer.analyze()` returns `RECOMMEND_ROLLBACK` with previous stable version
4. Assert recommendation includes comparison data and confidence level

**Expected Result**: Automated rollback recommendation surfaced to ops team before user impact escalates

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Live Model Performance Tracking

#### TC-F3-I1.1: Whisper Model Metrics Collected During Production Inference
**Objective**: Verify Whisper transcription model emits accuracy and latency metrics to the monitoring pipeline during live inference

**Preconditions**:
- Whisper model service running
- Monitoring pipeline connected to metric store
- Sample audio with known ground-truth transcript available

**Test Steps**:
1. Submit 50 transcription jobs with known ground-truth audio
2. Wait for all jobs to complete
3. Query model monitoring API for Whisper WER metrics in last 30 minutes
4. Assert 50 WER data points recorded
5. Assert mean WER within expected range (< 0.15 for clean audio)

**Expected Result**: All inference events produce corresponding monitoring records; WER within acceptable range

**Code Sample**:
```typescript
it('should record WER metrics for all Whisper inference events', async () => {
  const jobs = await Promise.all(
    groundTruthAudioSamples.map(sample =>
      transcriptionApi.submit({ audioUrl: sample.url, groundTruth: sample.transcript })
    )
  );

  await waitForJobCompletion(jobs.map(j => j.id));

  const werMetrics = await modelMonitoringApi.getMetrics({
    modelName: 'whisper-large',
    metric: 'wer',
    since: Date.now() - 30 * 60 * 1000,
  });

  expect(werMetrics.dataPoints).toHaveLength(50);
  expect(werMetrics.mean).toBeLessThan(0.15);
}, 120000);
```

---

#### TC-F3-I1.2: Model Version Comparison Dashboard Reflects Live Inference Data
**Objective**: Verify the model comparison dashboard correctly shows differential between model versions based on live inference data

**Test Steps**:
1. Route 50% of traffic to `whisper-large-v3.0` and 50% to `whisper-large-v3.1`
2. Process 200 transcription jobs
3. Query model comparison API
4. Assert both versions appear with separate metric lines
5. Assert traffic split reflected in inference count ratio

**Expected Result**: A/B inference data correctly attributed to respective model versions in comparison view

---

### 2.2 Drift Detection Pipeline

#### TC-F3-I2.1: End-to-End Drift Alert from Audio Input Change
**Objective**: Verify that a real shift in audio input characteristics (e.g., predominance of non-English audio) triggers a drift alert through the full pipeline

**Test Steps**:
1. Establish baseline by processing 1000 English audio samples
2. Process 200 non-English audio samples (as drift simulation)
3. Assert drift detection service emits a `DRIFT_DETECTED` event within 10 minutes
4. Assert alert routed to configured Slack channel mock
5. Assert alert includes model name, drift metric, and current vs. baseline comparison

**Expected Result**: Input distribution drift propagates through monitoring pipeline to operator notification within SLA

---

#### TC-F3-I2.2: Drift Detection Does Not Fire on Normal Variance
**Objective**: Verify drift detection system does not generate false positives on normal day-to-day variation

**Test Steps**:
1. Process baseline 5000 samples representing normal weekly variation
2. Process additional 500 samples from the same distribution
3. Run drift detection analysis
4. Assert no `DRIFT_DETECTED` events emitted
5. Assert system reports `STABLE` status

**Expected Result**: False-positive rate < 5% for intra-distribution variance; no alert fatigue from normal operations

---

### 2.3 Model Registry Integration

#### TC-F3-I3.1: Model Deployment Triggers Monitoring Baseline Capture
**Objective**: Verify registering a new model version in the registry automatically initiates a baseline metric capture run

**Test Steps**:
1. Register new model `entity-extractor-v3` in the model registry
2. Assert monitoring service receives `MODEL_REGISTERED` event
3. Assert baseline capture job started within 5 minutes
4. Assert baseline stored in model monitoring store with model version tag

**Expected Result**: Model registration drives monitoring initialization automatically; no manual baseline setup required

---

#### TC-F3-I3.2: Model Deprecation Suppresses Monitoring Alerts
**Objective**: Verify marking a model as DEPRECATED stops monitoring alerts for that version

**Test Steps**:
1. Configure alert for `whisper-large-v2.0` performance degradation
2. Trigger alert condition (inject degraded metrics)
3. Assert alert fires (baseline validation)
4. Deprecate model `whisper-large-v2.0` in registry
5. Re-trigger same alert condition
6. Assert no new alert emitted

**Expected Result**: Deprecated models excluded from alert evaluation; monitoring resources not wasted on retired versions

---

## 3. EDGE CASE VALIDATION

### 3.1 Cold Start and Baseline Absence

#### TC-F3-E1.1: Drift Detection Without Baseline Defers Gracefully
**Objective**: Verify drift detection does not error or false-positive when no baseline has been established yet

**Preconditions**:
- Newly registered model with no baseline metrics

**Test Steps**:
1. Trigger drift analysis for `entity-extractor-v3` (no baseline exists)
2. Assert response status is `NO_BASELINE` (not `DRIFT_DETECTED` or error)
3. Assert system queues baseline establishment task
4. Assert no alert sent to notification channels

**Expected Result**: Absence of baseline handled as a known state; deferred gracefully without false positives

**Code Sample**:
```typescript
it('should return NO_BASELINE status when baseline has not been established', async () => {
  const detector = new DriftDetector(mockMetricStore);
  const result = await detector.analyzeModel('entity-extractor-v3');

  expect(result.status).toBe('NO_BASELINE');
  expect(result.alertEmitted).toBe(false);
  expect(mockMetricStore.queueBaselineCapture).toHaveBeenCalledWith('entity-extractor-v3');
});
```

---

#### TC-F3-E1.2: Monitoring Continues When One Model Inference Endpoint Is Down
**Objective**: Verify that a single model's endpoint being down does not affect monitoring collection for other models

**Test Steps**:
1. Simulate `entity-extractor-v2` endpoint returning 503
2. Continue processing inferences through `whisper-large-v3.1`
3. Assert whisper monitoring metrics continue to be collected
4. Assert `entity-extractor-v2` shows `UNAVAILABLE` status in monitoring dashboard
5. Assert no monitoring data loss for healthy models

**Expected Result**: Model monitoring is independent per model; one failure does not cascade

---

### 3.2 Inference Volume Extremes

#### TC-F3-E2.1: Monitoring Handles Zero Inferences in Reporting Window
**Objective**: Verify model monitoring report generation handles zero inference windows without division-by-zero errors

**Test Steps**:
1. Request model performance report for a 1-hour window with zero inferences
2. Assert report generated successfully (no exception)
3. Assert report indicates `INSUFFICIENT_DATA`
4. Assert all metric fields return `null` or `N/A` rather than `NaN` or `Infinity`

**Expected Result**: Zero-inference windows produce valid, informative reports; no arithmetic errors

---

#### TC-F3-E2.2: Spike of 10,000 Concurrent Inferences Does Not Lose Metrics
**Objective**: Verify the metric collection pipeline does not lose inference events during a sudden spike of 10,000 concurrent inferences

**Test Steps**:
1. Trigger 10,000 concurrent transcription inferences
2. Wait for all to complete
3. Query monitoring store for inference count in spike window
4. Assert count = 10,000 (zero metric loss)

**Expected Result**: Metric collection pipeline horizontally scales or buffers to handle burst without loss

---

### 3.3 Model Version Conflict

#### TC-F3-E3.1: Duplicate Model Version Registration Rejected
**Objective**: Verify registering a model version that already exists is rejected with a clear conflict error

**Test Steps**:
1. Register `whisper-large v3.1`
2. Attempt to register `whisper-large v3.1` again with different artifact URI
3. Assert `ModelVersionConflictError` raised
4. Assert original registration unchanged in registry

**Expected Result**: Version immutability enforced; no silent overwrite of registered model artifacts

---

#### TC-F3-E3.2: Metrics Correctly Partitioned When Two Models Share Same Name Across Namespaces
**Objective**: Verify metric queries do not mix metrics for same-named models in different namespaces

**Test Steps**:
1. Register `whisper-large` in namespaces `tenant-a` and `tenant-b`
2. Process inferences through both
3. Query metrics for `tenant-a / whisper-large`
4. Assert zero metrics from `tenant-b` appear in results

**Expected Result**: Namespace isolation prevents metric attribution errors in multi-tenant deployments

---

## 4. PERFORMANCE VALIDATION

### 4.1 Monitoring Data Ingestion at Scale

#### TC-F3-P1.1: Metric Collection Overhead Per Inference
**Objective**: Verify that adding model monitoring overhead to a transcription inference does not increase end-to-end latency by more than 5ms

**Preconditions**:
- Baseline latency measured without monitoring enabled
- Monitoring enabled with full metric collection

**Test Steps**:
1. Run 1000 inferences without monitoring; record mean latency
2. Run 1000 inferences with monitoring enabled; record mean latency
3. Assert latency difference < 5ms
4. Assert monitoring collection 100% accurate (no sampling)

**Expected Result**: Monitoring instrumentation adds negligible overhead; zero-cost abstraction where possible

**Code Sample**:
```typescript
it('should add less than 5ms monitoring overhead per inference', async () => {
  const withoutMonitoring = await benchmarkInferences(1000, { monitoring: false });
  const withMonitoring = await benchmarkInferences(1000, { monitoring: true });

  const overhead = withMonitoring.meanLatencyMs - withoutMonitoring.meanLatencyMs;
  expect(overhead).toBeLessThan(5);
  expect(withMonitoring.metricsRecorded).toBe(1000);
});
```

---

#### TC-F3-P1.2: Model Monitoring Dashboard Load Time with 10 Models
**Objective**: Verify the model monitoring overview dashboard loads within 2 seconds when displaying 10 models' live metrics

**Test Steps**:
1. Populate monitoring store with 10 active model versions, each with 7 days of data
2. Load the model monitoring dashboard
3. Measure time to full render (all widgets populated)
4. Assert total load time < 2000ms

**Expected Result**: Dashboard renders all 10 models in parallel; no sequential query chain

---

### 4.2 Drift Detection Performance

#### TC-F3-P2.1: KL Divergence Computation Time for Large Sample Sets
**Objective**: Verify KL divergence computation completes in under 100ms for sample sets of 10,000 observations

**Test Steps**:
1. Generate baseline distribution with 10,000 samples
2. Generate current window with 5,000 samples
3. Run KL divergence computation 100 times, measure wall-clock time
4. Assert mean computation time < 100ms

**Expected Result**: Drift detection can run continuously in near-real-time without blocking inference pipeline

**Code Sample**:
```typescript
it('should compute KL divergence in under 100ms for 10k sample baseline', () => {
  const baseline = generateNormalDistribution({ mean: 120, stddev: 30, n: 10000 });
  const current = generateNormalDistribution({ mean: 145, stddev: 35, n: 5000 });

  const times: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    computeKLDivergence(baseline, current, { bins: 50 });
    times.push(performance.now() - start);
  }

  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  expect(mean).toBeLessThan(100);
});
```

---

#### TC-F3-P2.2: Drift Analysis Throughput — 50 Models Simultaneously
**Objective**: Verify the drift detection service can analyze 50 models simultaneously within a 5-minute window

**Test Steps**:
1. Register 50 model versions with populated baselines
2. Trigger drift analysis for all 50 simultaneously
3. Assert all 50 analysis jobs complete within 5 minutes
4. Assert each returns a valid status (not timeout/error)

**Expected Result**: Parallel drift analysis scales to fleet size; no serial bottleneck

---

### 4.3 Historical Report Generation

#### TC-F3-P3.1: Weekly Model Performance Report Generation Time
**Objective**: Verify the weekly model performance report for all active models generates within 60 seconds

**Test Steps**:
1. Populate 7 days of inference data for 10 active models (approx. 500k inferences each)
2. Trigger weekly report generation
3. Measure time from trigger to report-ready notification
4. Assert generation time < 60 seconds

**Expected Result**: Report generation completes within one minute; batched aggregation queries used instead of row-by-row computation

---

#### TC-F3-P3.2: Model Health History Query — 6 Months Lookback
**Objective**: Verify querying 6 months of model health history returns within 3 seconds

**Test Steps**:
1. Populate 180 days of model health snapshots (daily rollups)
2. Query full 6-month history for `whisper-large-v3.1`
3. Measure response time
4. Assert response time < 3000ms
5. Assert 180 data points returned

**Expected Result**: Pre-computed daily rollups enable fast long-horizon queries without raw data scanning

---

## Test Execution Summary

| Category | Test Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Cases | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated Execution Time**: Unit ~3 min | Integration ~25 min | Edge ~10 min | Performance ~60 min
