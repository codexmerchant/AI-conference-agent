# EPIC02 Feature 10 — Media Processing Orchestration — Test Cases

## Test Overview
Comprehensive test suite for Media Processing Orchestration covering unit tests, integration tests, edge cases, and performance validation. This feature coordinates the end-to-end execution of all media pipeline stages (ingestion, transcription, diarization, OCR, enhancement, segmentation, indexing, synchronization) as a managed workflow, handling scheduling, retry, prioritization, and status tracking.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Workflow Definition and Parsing

#### TC-F10-U1.1: Workflow DAG Construction from Pipeline Config
**Objective**: Verify the orchestrator correctly parses a pipeline configuration and constructs a valid directed acyclic graph (DAG) of processing stages.

**Preconditions**:
- `PipelineOrchestrator` initialized
- Pipeline config with 6 stages including parallel branches

**Test Steps**:
1. Call `orchestrator.buildDAG(pipelineConfig)`
2. Assert returned DAG has 6 nodes
3. Assert edges represent correct stage dependencies
4. Assert no cycles detected in the DAG

**Expected Result**: DAG with 6 nodes; correct dependency edges; no cycles.

**Code Sample**:
```typescript
describe('PipelineOrchestrator', () => {
  it('should build a valid DAG from pipeline configuration', () => {
    const orchestrator = new PipelineOrchestrator(mockStageRegistry);
    const config: PipelineConfig = {
      stages: [
        { id: 'ingest', dependsOn: [] },
        { id: 'transcribe', dependsOn: ['ingest'] },
        { id: 'diarize', dependsOn: ['ingest'] },
        { id: 'ocr', dependsOn: ['ingest'] },
        { id: 'segment', dependsOn: ['transcribe', 'diarize'] },
        { id: 'index', dependsOn: ['segment', 'ocr'] }
      ]
    };

    const dag = orchestrator.buildDAG(config);

    expect(dag.nodes).toHaveLength(6);
    expect(dag.hasEdge('ingest', 'transcribe')).toBe(true);
    expect(dag.hasEdge('transcribe', 'segment')).toBe(true);
    expect(dag.hasCycle()).toBe(false);
  });
});
```

---

#### TC-F10-U1.2: Topological Sort Produces Valid Stage Execution Order
**Objective**: Verify the topological sort of the DAG produces an execution order where all dependencies of a stage appear before it.

**Test Steps**:
1. Build DAG from config (previous TC)
2. Call `dag.topologicalSort()`
3. For each stage in sort order, assert all dependencies already appeared

**Expected Result**: Every stage appears after all its declared dependencies in sorted order.

**Code Sample**:
```typescript
it('should produce a valid topological execution order', () => {
  const dag = orchestrator.buildDAG(sixStagePipelineConfig);
  const order = dag.topologicalSort();

  for (let i = 0; i < order.length; i++) {
    const stage = order[i];
    const deps = sixStagePipelineConfig.stages.find(s => s.id === stage)!.dependsOn;
    deps.forEach(dep => {
      expect(order.indexOf(dep)).toBeLessThan(i);
    });
  }
});
```

---

#### TC-F10-U1.3: Cyclic Dependency Detection Throws Error
**Objective**: Verify the orchestrator throws a `CyclicDependencyError` when a pipeline config contains a circular dependency.

**Test Steps**:
1. Define config with cycle: A → B → C → A
2. Call `orchestrator.buildDAG(cyclicConfig)`
3. Assert throws `CyclicDependencyError` with description of the cycle

**Expected Result**: `CyclicDependencyError` thrown; error message identifies cycle members.

**Code Sample**:
```typescript
it('should throw CyclicDependencyError for circular stage dependencies', () => {
  const cyclicConfig: PipelineConfig = {
    stages: [
      { id: 'A', dependsOn: ['C'] },
      { id: 'B', dependsOn: ['A'] },
      { id: 'C', dependsOn: ['B'] }
    ]
  };

  expect(() => orchestrator.buildDAG(cyclicConfig)).toThrow(CyclicDependencyError);
});
```

---

### 1.2 Stage Execution Control

#### TC-F10-U2.1: Parallel Branch Stages Execute Concurrently
**Objective**: Verify that pipeline stages with no inter-dependency (parallel branches) are dispatched concurrently, not sequentially.

**Test Steps**:
1. Define pipeline where `transcribe` and `diarize` and `ocr` all depend only on `ingest`
2. Execute the pipeline with mock stages that record their start times
3. Assert `transcribe.startTime`, `diarize.startTime`, and `ocr.startTime` are within 50ms of each other

**Expected Result**: All 3 independent stages start within 50ms of each other, confirming concurrent dispatch.

**Code Sample**:
```typescript
describe('Parallel Execution', () => {
  it('should dispatch independent stages concurrently', async () => {
    const startTimes: Record<string, number> = {};
    const mockStages = {
      transcribe: createMockStage('transcribe', 500, startTimes),
      diarize: createMockStage('diarize', 500, startTimes),
      ocr: createMockStage('ocr', 500, startTimes)
    };

    await orchestrator.run('sess-par-01', parallelBranchConfig, mockStages);

    const times = ['transcribe', 'diarize', 'ocr'].map(k => startTimes[k]);
    const spread = Math.max(...times) - Math.min(...times);
    expect(spread).toBeLessThan(50);
  });
});
```

---

#### TC-F10-U2.2: Downstream Stage Waits for All Dependencies
**Objective**: Verify that a stage with multiple dependencies does not start until all dependencies have completed.

**Test Steps**:
1. Define: `segment` depends on `transcribe` (200ms) and `diarize` (400ms)
2. Record `segment.startTime`
3. Assert `segment` does not start until after `diarize` (the slower dependency) completes

**Expected Result**: `segment.startTime >= diarize.endTime`; `segment` waits for slowest dependency.

**Code Sample**:
```typescript
it('should wait for all dependencies before starting a stage', async () => {
  const events: Record<string, number> = {};
  const stages = {
    ingest: instantMockStage('ingest', events),
    transcribe: delayedMockStage('transcribe', 200, events),
    diarize: delayedMockStage('diarize', 400, events),
    segment: delayedMockStage('segment', 100, events)
  };

  await orchestrator.run('sess-dep-01', funnelConfig, stages);

  expect(events['segment.start']).toBeGreaterThanOrEqual(events['diarize.end']);
});
```

---

#### TC-F10-U2.3: Stage Cancellation Propagates to Downstream Stages
**Objective**: Verify that cancelling a running stage also cancels all downstream stages that depend on it.

**Test Steps**:
1. Start a pipeline run; `transcribe` and `diarize` running, `segment` waiting
2. Cancel `transcribe`
3. Assert `segment` status is `CANCELLED` (because its dependency was cancelled)
4. Assert `ocr` (independent branch) is not cancelled

**Expected Result**: `segment` cancelled due to upstream cancellation; `ocr` (independent) unaffected.

**Code Sample**:
```typescript
it('should cancel downstream stages when an upstream stage is cancelled', async () => {
  const run = orchestrator.start('sess-cancel-01', fullPipelineConfig);

  await waitForStageStatus('transcribe', 'RUNNING');
  await orchestrator.cancelStage('sess-cancel-01', 'transcribe');

  const segmentStatus = await orchestrator.getStageStatus('sess-cancel-01', 'segment');
  const ocrStatus = await orchestrator.getStageStatus('sess-cancel-01', 'ocr');

  expect(segmentStatus).toBe('CANCELLED');
  expect(ocrStatus).not.toBe('CANCELLED');
});
```

---

### 1.3 Retry and Error Handling

#### TC-F10-U3.1: Failed Stage Retried with Exponential Backoff
**Objective**: Verify a failed stage is automatically retried up to `maxRetries: 3` times with exponential backoff delays.

**Test Steps**:
1. Configure `transcribe` stage mock to fail twice then succeed on 3rd attempt
2. Configure `maxRetries: 3, backoffMs: 100`
3. Run pipeline
4. Assert `transcribe` was called 3 times total
5. Assert retry delays were approximately 100ms, 200ms (exponential)

**Expected Result**: 3 total calls; pipeline eventually succeeds; retry delays exponential.

**Code Sample**:
```typescript
describe('Retry Policy', () => {
  it('should retry a failed stage with exponential backoff', async () => {
    const callTimes: number[] = [];
    const failTwiceMock = createFailOncesMock('transcribe', 2, callTimes);

    await orchestrator.run('sess-retry-01', transcribeOnlyConfig, { transcribe: failTwiceMock },
      { maxRetries: 3, backoffMs: 100 }
    );

    expect(callTimes).toHaveLength(3);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThan(90);
    expect(callTimes[2] - callTimes[1]).toBeGreaterThan(190);
  });
});
```

---

#### TC-F10-U3.2: Max Retries Exceeded — Stage Marked FAILED, Run Marked FAILED
**Objective**: Verify that when a stage exceeds `maxRetries`, the stage and the entire pipeline run are marked `FAILED`.

**Test Steps**:
1. Configure stage to always fail
2. Set `maxRetries: 2`
3. Run pipeline
4. Assert stage status = `FAILED` after 3 attempts
5. Assert run status = `FAILED`

**Expected Result**: Stage and run both `FAILED` after exhausting retries.

**Code Sample**:
```typescript
it('should mark run FAILED when stage exceeds maxRetries', async () => {
  const alwaysFail = createAlwaysFailMock('transcribe');

  const result = await orchestrator.run('sess-maxretry-01', transcribeOnlyConfig,
    { transcribe: alwaysFail }, { maxRetries: 2 }
  );

  expect(result.status).toBe('FAILED');
  expect(result.failedStage).toBe('transcribe');
  expect(result.attemptCount).toBe(3);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Pipeline E2E

#### TC-F10-I1.1: Full 6-Stage Pipeline Completes for a 10-Minute Session
**Objective**: Verify that a 10-minute session is fully processed through all 6 pipeline stages (ingest → transcribe+diarize+OCR → segment → index) within 5 minutes.

**Preconditions**:
- All pipeline services running
- Test session with audio + 5 slide images

**Test Steps**:
1. Submit session `sess-full-01` to orchestrator
2. Poll `orchestrator.getRunStatus('sess-full-01')` until `COMPLETE` or timeout (5 min)
3. Assert all 6 stage statuses = `COMPLETE`
4. Assert transcript, slides, and index populated for the session

**Expected Result**: All stages complete within 5 minutes; session fully indexed and accessible.

**Code Sample**:
```typescript
it('should complete a full 6-stage pipeline within 5 minutes', async () => {
  await orchestrator.start('sess-full-01', fullPipelineConfig, tenMinuteSessionMedia);

  await waitFor(async () => {
    const status = await orchestrator.getRunStatus('sess-full-01');
    expect(status.state).toBe('COMPLETE');
  }, { timeout: 300000, interval: 5000 });

  const stageSummary = await orchestrator.getStageSummary('sess-full-01');
  Object.values(stageSummary).forEach(s => expect(s.status).toBe('COMPLETE'));
}, 360000);
```

---

#### TC-F10-I1.2: Pipeline Status Webhook Notifications Sent at Stage Transitions
**Objective**: Verify the orchestrator sends HTTP webhook notifications at each stage status transition (QUEUED → RUNNING → COMPLETE).

**Test Steps**:
1. Register webhook endpoint before running
2. Start pipeline for `sess-webhook-01`
3. Collect webhook payloads
4. Assert at least one `RUNNING` and one `COMPLETE` notification per stage

**Expected Result**: Webhook receives >= 12 notifications (2 per stage × 6 stages); all include `sessionId`, `stage`, `status`.

---

### 2.2 Priority Queue and Scheduling

#### TC-F10-I2.1: High-Priority Session Queued Ahead of Low-Priority Sessions
**Objective**: Verify that a high-priority session submitted after several low-priority sessions starts processing before those sessions.

**Test Steps**:
1. Submit 5 low-priority sessions
2. Pause workers
3. Submit 1 high-priority session
4. Resume workers
5. Assert high-priority session starts processing before low-priority sessions

**Expected Result**: High-priority session begins processing first; low-priority sessions wait.

**Code Sample**:
```typescript
it('should process high-priority sessions before low-priority ones', async () => {
  await orchestrator.pauseWorkers();

  for (let i = 0; i < 5; i++) {
    await orchestrator.submit(`sess-low-${i}`, { priority: 'LOW' });
  }
  await orchestrator.submit('sess-high-01', { priority: 'HIGH' });

  await orchestrator.resumeWorkers();
  await sleep(500);

  const status = await orchestrator.getRunStatus('sess-high-01');
  expect(['RUNNING', 'COMPLETE']).toContain(status.state);

  for (let i = 0; i < 5; i++) {
    const lowStatus = await orchestrator.getRunStatus(`sess-low-${i}`);
    expect(lowStatus.state).toBe('QUEUED');
  }
});
```

---

#### TC-F10-I2.2: Dead-Letter Queue Captures Permanently Failed Runs
**Objective**: Verify that a session that exhausts all retries is moved to the dead-letter queue with complete diagnostic information.

**Test Steps**:
1. Submit a session configured to always fail at the `transcribe` stage (max retries = 3)
2. Wait for DLQ entry
3. Assert DLQ entry has `sessionId`, `failedStage`, `errorMessage`, `attempts: 4`, `timestamp`

**Expected Result**: DLQ entry present with full diagnostic fields after 4 total attempts.

---

### 2.3 Observability Integration

#### TC-F10-I3.1: Stage Metrics Emitted to Prometheus-Compatible Endpoint
**Objective**: Verify each stage emits execution duration and success/failure metrics to the metrics endpoint.

**Test Steps**:
1. Complete a pipeline run
2. GET `/metrics`
3. Assert Prometheus-format counters: `pipeline_stage_duration_ms{stage="transcribe"}`, `pipeline_stage_success_total{stage="transcribe"}`

**Expected Result**: Prometheus metrics endpoint exposes per-stage duration and success counters.

---

#### TC-F10-I3.2: Distributed Trace Spans Linked Across All Pipeline Stages
**Objective**: Verify that a single session run produces a distributed trace where all stage spans share the same `traceId`.

**Test Steps**:
1. Run pipeline with OpenTelemetry tracing enabled
2. Query trace store for spans with `sessionId: 'sess-trace-01'`
3. Assert all stage spans have same `traceId`
4. Assert parent-child span relationships match DAG edges

**Expected Result**: All spans share one `traceId`; parent-child relationships match pipeline DAG.

---

## 3. EDGE CASE VALIDATION

### 3.1 Partial Failure Recovery

#### TC-F10-E1.1: Resume Failed Run from Last Successful Stage
**Objective**: Verify that a failed pipeline run can be resumed from the last successfully completed stage rather than restarting from scratch.

**Test Steps**:
1. Run pipeline; `ocr` stage fails after `ingest`, `transcribe`, `diarize` complete
2. Fix the OCR issue (mock returns success)
3. Call `orchestrator.resume('sess-resume-01')`
4. Assert only `ocr`, `segment`, and `index` stages re-run; `ingest`, `transcribe`, `diarize` are not re-executed

**Expected Result**: Resume skips already-completed stages; only failed and downstream stages re-run.

**Code Sample**:
```typescript
it('should resume from last successful stage without re-running completed stages', async () => {
  const callCounts: Record<string, number> = {};
  const stages = createStagesWithCounts(callCounts, { failAt: 'ocr', failOnAttempt: 1 });

  await orchestrator.run('sess-resume-01', fullPipelineConfig, stages);
  mockOcr.alwaysSucceed();
  await orchestrator.resume('sess-resume-01');

  expect(callCounts['ingest']).toBe(1);    // not re-run
  expect(callCounts['transcribe']).toBe(1); // not re-run
  expect(callCounts['ocr']).toBe(2);        // re-run from failure point
});
```

---

#### TC-F10-E1.2: Partial Success — Non-Critical Stage Failure Allows Continuation
**Objective**: Verify that when a non-critical optional stage fails (e.g., `slide_enhancement`), the pipeline continues with remaining stages and marks the run as `COMPLETE_WITH_WARNINGS`.

**Test Steps**:
1. Configure `slide_enhancement` as `optional: true, continueOnFailure: true`
2. Make `slide_enhancement` fail
3. Run pipeline to completion
4. Assert run status = `COMPLETE_WITH_WARNINGS`
5. Assert all mandatory stages completed successfully

**Expected Result**: Run completes despite optional stage failure; status = `COMPLETE_WITH_WARNINGS`.

**Code Sample**:
```typescript
it('should continue pipeline when non-critical stage fails', async () => {
  mockSlideEnhancement.alwaysFail();

  const result = await orchestrator.run('sess-warn-01', configWithOptionalEnhancement, allStages);

  expect(result.status).toBe('COMPLETE_WITH_WARNINGS');
  expect(result.warnings).toContain('slide_enhancement failed but marked optional');
  expect(result.completedStages).toContain('index');
});
```

---

### 3.2 Resource Contention

#### TC-F10-E2.1: 50 Concurrent Pipeline Runs — No Cross-Session Data Contamination
**Objective**: Verify that 50 concurrent pipeline runs do not contaminate each other's data (transcript segments, slide IDs, speaker IDs all correctly scoped).

**Test Steps**:
1. Start 50 concurrent runs with distinct test content per session
2. After all complete, query each session's transcript
3. Assert no session contains transcript text from another session

**Expected Result**: All 50 sessions have correct, isolated results; zero cross-session contamination.

---

#### TC-F10-E2.2: Worker Crash During Stage — Run Automatically Reassigned
**Objective**: Verify that when a worker process crashes mid-stage execution, the run is automatically detected as stale and reassigned to a healthy worker.

**Test Steps**:
1. Start a pipeline run; `transcribe` stage begins on worker-1
2. Kill worker-1 process
3. Assert within 30 seconds the run is reassigned to worker-2 and `transcribe` re-executes
4. Assert final run status = `COMPLETE`

**Expected Result**: Stale run detected and reassigned within 30 seconds; run completes on new worker.

---

### 3.3 Configuration Edge Cases

#### TC-F10-E3.1: Empty Stage List — Immediate COMPLETE
**Objective**: Verify a pipeline config with zero stages immediately transitions to `COMPLETE` status without errors.

**Test Steps**:
1. Submit a run with `stages: []`
2. Assert run status immediately = `COMPLETE`
3. Assert no stages recorded in run summary

**Expected Result**: Empty pipeline completes instantly; no errors.

**Code Sample**:
```typescript
it('should immediately complete a pipeline with no stages', async () => {
  const result = await orchestrator.run('sess-empty-01', { stages: [] }, {});

  expect(result.status).toBe('COMPLETE');
  expect(Object.keys(result.stages)).toHaveLength(0);
});
```

---

#### TC-F10-E3.2: Unknown Stage Type in Config — Validation Error at Submit Time
**Objective**: Verify the orchestrator validates stage types at submission time and rejects configs referencing unknown stage types before any execution starts.

**Test Steps**:
1. Submit config referencing stage `id: 'mystery_stage'` not in the stage registry
2. Assert `orchestrator.submit()` throws `UnknownStageError` immediately
3. Assert no run record created

**Expected Result**: `UnknownStageError` at submission; no partial run created.

**Code Sample**:
```typescript
it('should reject unknown stage types at submission time', async () => {
  const badConfig = { stages: [{ id: 'mystery_stage', dependsOn: [] }] };

  await expect(orchestrator.submit('sess-bad-01', badConfig)).rejects.toThrow(UnknownStageError);

  const run = await orchestrator.getRunStatus('sess-bad-01');
  expect(run).toBeNull(); // no run created
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Throughput Benchmarks

#### TC-F10-P1.1: Orchestrator Sustains 100 Concurrent Pipeline Runs
**Objective**: Verify the orchestrator manages 100 simultaneously active pipeline runs without degraded scheduling latency.

**Test Steps**:
1. Start 100 pipeline runs simultaneously
2. Measure stage dispatch latency (time from dependency-satisfied to stage start) for each run
3. Assert P95 dispatch latency < 500ms

**Expected Result**: P95 dispatch latency < 500ms under 100 concurrent runs.

**Code Sample**:
```typescript
it('should maintain P95 dispatch latency < 500ms under 100 concurrent runs', async () => {
  const dispatchLatencies: number[] = [];

  const runs = Array.from({ length: 100 }, (_, i) =>
    orchestrator.runWithDispatchMetrics(`sess-scale-${i}`, twoStagePipeline, { onDispatch: (l) => dispatchLatencies.push(l) })
  );

  await Promise.all(runs);
  dispatchLatencies.sort((a, b) => a - b);
  const p95 = dispatchLatencies[Math.floor(dispatchLatencies.length * 0.95)];

  expect(p95).toBeLessThan(500);
}, 300000);
```

---

#### TC-F10-P1.2: Pipeline Queue Depth Clears 1000-Item Backlog in < 10 Minutes
**Objective**: Verify that when the pipeline queue has 1000 pending runs, the worker pool clears the entire backlog within 10 minutes.

**Test Steps**:
1. Submit 1000 fast-completing (5-second each) pipeline runs
2. Measure time for all to complete
3. Assert total time < 600 seconds with 10 workers

**Expected Result**: 1000 runs complete in < 10 minutes with 10 workers.

---

### 4.2 Scheduling Efficiency

#### TC-F10-P2.1: Worker Utilization > 85% Under Sustained Load
**Objective**: Verify that under continuous pipeline submission, worker utilization stays above 85% (workers are not sitting idle).

**Test Steps**:
1. Submit pipeline runs continuously for 5 minutes
2. Sample worker busy/idle status every 10 seconds
3. Assert average utilization > 85%

**Expected Result**: Worker utilization > 85% throughout sustained load period.

**Code Sample**:
```typescript
it('should maintain worker utilization > 85% under sustained load', async () => {
  const utilization: number[] = [];
  const loader = startContinuousLoad(orchestrator);

  for (let i = 0; i < 30; i++) { // 5 minutes at 10s intervals
    await sleep(10000);
    utilization.push(await orchestrator.getWorkerUtilization());
  }

  await loader.stop();
  const avgUtil = utilization.reduce((a, b) => a + b, 0) / utilization.length;
  expect(avgUtil).toBeGreaterThan(0.85);
}, 360000);
```

---

#### TC-F10-P2.2: Priority Inversion Prevented Under Heavy Low-Priority Load
**Objective**: Verify that high-priority sessions start processing within 30 seconds even when 500 low-priority sessions are queued.

**Test Steps**:
1. Queue 500 low-priority sessions
2. Submit 1 high-priority session
3. Assert high-priority session begins processing within 30 seconds

**Expected Result**: High-priority session starts within 30 seconds despite large low-priority queue.

---

### 4.3 Resilience Under Failure

#### TC-F10-P3.1: 5% Stage Failure Rate — Overall Pipeline Success Rate > 95%
**Objective**: Verify that with a 5% random stage failure rate (simulated chaos), the overall pipeline success rate remains above 95% due to retry logic.

**Test Steps**:
1. Configure chaos monkey to randomly fail 5% of stage executions
2. Run 200 pipeline runs
3. Assert >= 190 runs complete with `COMPLETE` or `COMPLETE_WITH_WARNINGS` status

**Expected Result**: >= 95% success rate (190/200 runs) despite 5% stage failure injection.

**Code Sample**:
```typescript
it('should achieve > 95% success rate with 5% random stage failure injection', async () => {
  const chaosMonkey = new ChaosMonkey({ failureRate: 0.05 });
  const results: string[] = [];

  for (let i = 0; i < 200; i++) {
    const result = await orchestrator.run(`sess-chaos-${i}`, fullPipelineConfig, chaosStages(chaosMonkey));
    results.push(result.status);
  }

  const successes = results.filter(s => s === 'COMPLETE' || s === 'COMPLETE_WITH_WARNINGS').length;
  expect(successes / 200).toBeGreaterThan(0.95);
}, 600000);
```

---

#### TC-F10-P3.2: Orchestrator Recovery Time < 30 Seconds After Leader Failover
**Objective**: Verify that in a multi-node orchestrator deployment, leader failover completes and pipeline processing resumes within 30 seconds.

**Test Steps**:
1. Start 2-node orchestrator cluster; start 10 pipeline runs
2. Kill the leader node
3. Measure time until follower becomes leader and resumes dispatching
4. Assert failover + resume < 30 seconds
5. Assert in-flight runs eventually complete (not lost)

**Expected Result**: Failover < 30 seconds; in-flight runs resume and complete.

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
| 100-concurrent-run dispatch latency (P95) | < 500ms |
| Worker utilization under load | > 85% |
| Success rate with 5% failure injection | > 95% |
| Leader failover recovery time | < 30 seconds |
| 1000-run backlog clearance | < 10 minutes |
