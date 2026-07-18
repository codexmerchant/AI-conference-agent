# EPIC03 Feature 1 — Conference Classification — Test Cases

## Test Overview
Comprehensive test suite for Conference Classification covering unit tests, integration tests, edge cases, and performance validation. This feature classifies conferences into predefined types (academic, corporate, technical, workshop, panel, keynote, etc.) and returns multi-label confidence scores.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Single-Label Classification Accuracy

#### TC-F1-U1.1: High-Confidence Single-Label Classification
**Objective**: Verify the classifier returns the correct primary label with confidence >= 0.85 for an unambiguous technical conference transcript.

**Preconditions**:
- Classification model is loaded and warm
- Input transcript contains >= 500 tokens of clearly technical content

**Test Steps**:
1. Prepare a transcript excerpt containing terms: "API design", "microservices", "Kubernetes", "CI/CD pipeline"
2. Call `classifyConference({ transcript, metadata })` with the prepared input
3. Assert the top-ranked label is `"technical"`
4. Assert the confidence score for `"technical"` is >= 0.85
5. Assert total confidence scores across all labels sum to approximately 1.0

**Expected Result**: `{ label: "technical", confidence: 0.91, labels: [{ type: "technical", score: 0.91 }, ...] }`

**Code Sample**:
```typescript
import { classifyConference } from "@/services/intelligence/conferenceClassifier";

describe("TC-F1-U1.1 High-Confidence Single-Label Classification", () => {
  it("should return technical label with confidence >= 0.85", async () => {
    const input = {
      transcript: "Today we discuss API design patterns, microservices orchestration with Kubernetes, and CI/CD pipelines...",
      metadata: { title: "Cloud Architecture Summit", speakerCount: 3 },
    };

    const result = await classifyConference(input);

    expect(result.primaryLabel).toBe("technical");
    expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.85);
    expect(result.labels.reduce((sum, l) => sum + l.score, 0)).toBeCloseTo(1.0, 1);
  });
});
```

---

#### TC-F1-U1.2: Academic Conference Label
**Objective**: Verify correct classification of a research-heavy conference session.

**Preconditions**:
- Model is loaded
- Transcript references peer-reviewed research, citations, and academic methodology

**Test Steps**:
1. Provide transcript: "Our paper presents novel findings on transformer attention mechanisms, peer-reviewed at NeurIPS..."
2. Call `classifyConference({ transcript, metadata })`
3. Assert primary label is `"academic"`
4. Assert confidence >= 0.80

**Expected Result**: `{ primaryLabel: "academic", primaryConfidence: 0.88 }`

**Code Sample**:
```typescript
it("should classify academic research session correctly", async () => {
  const input = {
    transcript: "Our paper presents novel findings on transformer attention mechanisms, peer-reviewed at NeurIPS 2025...",
    metadata: { title: "AI Research Symposium" },
  };

  const result = await classifyConference(input);

  expect(result.primaryLabel).toBe("academic");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.80);
});
```

---

#### TC-F1-U1.3: Corporate Conference Label
**Objective**: Verify correct classification of a business strategy meeting.

**Preconditions**:
- Transcript contains corporate strategy, product roadmap, and revenue language

**Test Steps**:
1. Provide transcript: "Q3 revenue targets, product roadmap alignment, stakeholder OKRs, and GTM strategy..."
2. Call `classifyConference({ transcript, metadata })`
3. Assert primary label is `"corporate"`
4. Assert confidence >= 0.80

**Expected Result**: `{ primaryLabel: "corporate", primaryConfidence: 0.86 }`

**Code Sample**:
```typescript
it("should classify corporate strategy session correctly", async () => {
  const input = {
    transcript: "Q3 revenue targets, product roadmap alignment, stakeholder OKRs, GTM strategy for enterprise accounts...",
    metadata: { title: "Executive Strategy Review" },
  };
  const result = await classifyConference(input);
  expect(result.primaryLabel).toBe("corporate");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.80);
});
```

---

### 1.2 Multi-Label Classification Output

#### TC-F1-U2.1: Multi-Label Output for Hybrid Events
**Objective**: Verify the classifier assigns multiple labels when content spans two conference types.

**Preconditions**:
- Input transcript blends academic research with corporate product announcements

**Test Steps**:
1. Construct a transcript that contains both research citations and product launch language
2. Call `classifyConference({ transcript, metadata })`
3. Assert the result contains at least 2 labels with confidence >= 0.30
4. Assert labels include both `"academic"` and `"corporate"`

**Expected Result**: `{ labels: [{ type: "academic", score: 0.54 }, { type: "corporate", score: 0.38 }] }`

**Code Sample**:
```typescript
it("should return multiple labels for hybrid academic-corporate conference", async () => {
  const input = {
    transcript: "We present our published research on LLM fine-tuning, now productized and available in our enterprise suite...",
    metadata: { title: "Applied AI Summit" },
  };
  const result = await classifyConference(input);
  const highConfidenceLabels = result.labels.filter((l) => l.score >= 0.30);
  expect(highConfidenceLabels.length).toBeGreaterThanOrEqual(2);
  const labelTypes = highConfidenceLabels.map((l) => l.type);
  expect(labelTypes).toContain("academic");
  expect(labelTypes).toContain("corporate");
});
```

---

#### TC-F1-U2.2: Label Score Normalization
**Objective**: Confirm all label confidence scores sum to 1.0 (softmax normalization).

**Preconditions**:
- Any valid conference transcript

**Test Steps**:
1. Submit a standard transcript
2. Sum all returned label scores
3. Assert the sum equals 1.0 within tolerance of 0.01

**Expected Result**: `sum(labels[].score) ≈ 1.0`

**Code Sample**:
```typescript
it("should produce label scores that sum to 1.0", async () => {
  const result = await classifyConference({ transcript: "Workshop on agile methodology...", metadata: {} });
  const total = result.labels.reduce((acc, l) => acc + l.score, 0);
  expect(total).toBeCloseTo(1.0, 2);
});
```

---

#### TC-F1-U2.3: Minimum Label Count
**Objective**: Verify the classifier always returns at least the configured minimum number of labels.

**Preconditions**:
- System is configured with `minLabels: 3`

**Test Steps**:
1. Submit a short, unambiguous transcript
2. Assert `result.labels.length >= 3`

**Expected Result**: At least 3 labels returned even if lower-confidence

**Code Sample**:
```typescript
it("should always return at least minLabels results", async () => {
  const result = await classifyConference({
    transcript: "A short workshop introduction.",
    metadata: {},
    options: { minLabels: 3 },
  });
  expect(result.labels.length).toBeGreaterThanOrEqual(3);
});
```

---

### 1.3 Confidence Threshold Enforcement

#### TC-F1-U3.1: Below-Threshold Labels Filtered
**Objective**: Verify that labels with confidence below the configured threshold are excluded from the primary output.

**Preconditions**:
- Classifier configured with `confidenceThreshold: 0.20`

**Test Steps**:
1. Submit a transcript; obtain raw model scores
2. Call `classifyConference` with threshold enforcement enabled
3. Assert no returned label has `score < 0.20`

**Expected Result**: All returned labels have `score >= 0.20`

**Code Sample**:
```typescript
it("should exclude labels below confidence threshold", async () => {
  const result = await classifyConference({
    transcript: "Annual shareholder meeting discussing Q4 earnings...",
    metadata: {},
    options: { confidenceThreshold: 0.20 },
  });
  result.labels.forEach((label) => {
    expect(label.score).toBeGreaterThanOrEqual(0.20);
  });
});
```

---

#### TC-F1-U3.2: All Labels Below Threshold Falls Back to Top-1
**Objective**: When all labels fall below threshold, the system returns the top-scoring label as a fallback.

**Preconditions**:
- Very ambiguous or short input where all scores are low

**Test Steps**:
1. Submit a one-word input: `"conference"`
2. Set `confidenceThreshold: 0.60`
3. Assert result still contains exactly 1 label (the top-1 fallback)

**Expected Result**: `{ labels: [{ type: "unknown", score: 0.22, isFallback: true }] }`

**Code Sample**:
```typescript
it("should return top-1 fallback when all scores are below threshold", async () => {
  const result = await classifyConference({
    transcript: "conference",
    metadata: {},
    options: { confidenceThreshold: 0.60 },
  });
  expect(result.labels.length).toBe(1);
  expect(result.labels[0].isFallback).toBe(true);
});
```

---

#### TC-F1-U3.3: Threshold of 0.0 Returns All Labels
**Objective**: A threshold of 0.0 should return all possible classification labels.

**Test Steps**:
1. Submit a standard transcript
2. Set `confidenceThreshold: 0.0`
3. Assert returned label count equals the total number of classification categories

**Expected Result**: All configured label types are returned

**Code Sample**:
```typescript
it("should return all labels when threshold is 0.0", async () => {
  const TOTAL_CATEGORIES = 8; // academic, corporate, technical, workshop, panel, keynote, hybrid, other
  const result = await classifyConference({
    transcript: "A keynote presentation on innovation...",
    metadata: {},
    options: { confidenceThreshold: 0.0 },
  });
  expect(result.labels.length).toBe(TOTAL_CATEGORIES);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Classifier + Persistence Layer

#### TC-F1-I1.1: Classification Results Persisted to Database
**Objective**: Verify that classification results are stored in the database with correct schema after a successful classification call.

**Preconditions**:
- Test database is seeded and connected
- A conference record with `conferenceId: "conf-001"` exists

**Test Steps**:
1. Call `classifyAndPersist({ conferenceId: "conf-001", transcript })` 
2. Query the database for the stored classification
3. Assert the stored record contains `conferenceId`, `primaryLabel`, `labels[]`, `classifiedAt` timestamp

**Expected Result**: Database record matches classification output

**Code Sample**:
```typescript
it("should persist classification to DB with correct schema", async () => {
  await classifyAndPersist({ conferenceId: "conf-001", transcript: "Technical deep-dive on Rust memory safety..." });
  const stored = await db.conferenceClassifications.findOne({ conferenceId: "conf-001" });
  expect(stored).toMatchObject({
    conferenceId: "conf-001",
    primaryLabel: expect.any(String),
    labels: expect.arrayContaining([expect.objectContaining({ type: expect.any(String), score: expect.any(Number) })]),
    classifiedAt: expect.any(Date),
  });
});
```

---

#### TC-F1-I1.2: Re-Classification Updates Existing Record
**Objective**: Re-running classification on the same conference updates (not duplicates) the stored record.

**Test Steps**:
1. Classify `conf-001` with original transcript
2. Classify `conf-001` again with updated transcript
3. Query database and assert only one record exists for `conf-001`

**Expected Result**: Single updated record, not two records

**Code Sample**:
```typescript
it("should upsert classification record on re-classification", async () => {
  await classifyAndPersist({ conferenceId: "conf-001", transcript: "Original transcript..." });
  await classifyAndPersist({ conferenceId: "conf-001", transcript: "Updated transcript with new content..." });
  const count = await db.conferenceClassifications.count({ conferenceId: "conf-001" });
  expect(count).toBe(1);
});
```

---

### 2.2 Classifier + Metadata Enrichment Pipeline

#### TC-F1-I2.1: Metadata Boosts Classification Accuracy
**Objective**: Verify that conference title and speaker metadata are used by the enrichment pipeline to improve classification confidence.

**Test Steps**:
1. Classify a short transcript (low confidence baseline) without metadata
2. Re-classify with metadata: `{ title: "IEEE International Workshop on Machine Learning" }`
3. Assert primary confidence increases by at least 0.05

**Expected Result**: Confidence boost >= 0.05 when metadata is included

**Code Sample**:
```typescript
it("should improve confidence when relevant metadata is provided", async () => {
  const baseResult = await classifyConference({ transcript: "Short ambiguous content.", metadata: {} });
  const enrichedResult = await classifyConference({
    transcript: "Short ambiguous content.",
    metadata: { title: "IEEE International Workshop on Machine Learning" },
  });
  expect(enrichedResult.primaryConfidence).toBeGreaterThan(baseResult.primaryConfidence + 0.05);
});
```

---

#### TC-F1-I2.2: Pipeline Emits Classification Event
**Objective**: Confirm the enrichment pipeline emits a `conference.classified` event upon successful classification.

**Test Steps**:
1. Subscribe to `conference.classified` event bus topic
2. Trigger classification for `conf-002`
3. Assert the event is received with correct `conferenceId` and `primaryLabel`

**Expected Result**: Event received within 500ms

**Code Sample**:
```typescript
it("should emit conference.classified event after successful classification", async () => {
  const eventPromise = eventBus.once("conference.classified");
  await classifyAndPersist({ conferenceId: "conf-002", transcript: "Corporate quarterly review..." });
  const event = await eventPromise;
  expect(event.conferenceId).toBe("conf-002");
  expect(event.primaryLabel).toBeDefined();
});
```

---

### 2.3 Classifier + Downstream Context Tagging

#### TC-F1-I3.1: Classification Label Propagates to Context Tags
**Objective**: Verify that the conference type label is included as a context tag after the full pipeline completes.

**Test Steps**:
1. Run full pipeline: classify conference + generate context tags
2. Assert context tags include a tag of category `"conferenceType"` matching the primary label

**Expected Result**: `tags.find(t => t.category === "conferenceType").value === primaryLabel`

**Code Sample**:
```typescript
it("should propagate classification label to context tags", async () => {
  const { classification, tags } = await runIntelligencePipeline({ conferenceId: "conf-003", transcript: "..." });
  const conferenceTypeTag = tags.find((t) => t.category === "conferenceType");
  expect(conferenceTypeTag).toBeDefined();
  expect(conferenceTypeTag?.value).toBe(classification.primaryLabel);
});
```

---

#### TC-F1-I3.2: Multi-Label Tags Created for Hybrid Conferences
**Objective**: When multiple labels exceed threshold, multiple `conferenceType` tags are created.

**Test Steps**:
1. Submit a hybrid transcript that triggers 2 labels >= 0.30
2. Run full pipeline
3. Assert tags contain 2 `"conferenceType"` entries

**Expected Result**: Two conferenceType tags present

**Code Sample**:
```typescript
it("should create multiple conferenceType tags for multi-label classification", async () => {
  const { tags } = await runIntelligencePipeline({ conferenceId: "conf-004", transcript: "Research findings now productized for enterprise clients..." });
  const conferenceTypeTags = tags.filter((t) => t.category === "conferenceType");
  expect(conferenceTypeTags.length).toBeGreaterThanOrEqual(2);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Minimal and Empty Inputs

#### TC-F1-E1.1: Empty Transcript Handled Gracefully
**Objective**: Classifier returns a structured error (not a thrown exception) for empty transcript input.

**Preconditions**:
- System is running

**Test Steps**:
1. Call `classifyConference({ transcript: "", metadata: {} })`
2. Assert the result contains `error.code === "INSUFFICIENT_INPUT"`
3. Assert no unhandled exception is thrown

**Expected Result**: `{ error: { code: "INSUFFICIENT_INPUT", message: "..." } }`

**Code Sample**:
```typescript
it("should return structured error for empty transcript", async () => {
  const result = await classifyConference({ transcript: "", metadata: {} });
  expect(result.error).toBeDefined();
  expect(result.error?.code).toBe("INSUFFICIENT_INPUT");
});
```

---

#### TC-F1-E1.2: Whitespace-Only Transcript
**Objective**: Transcript containing only whitespace/newlines is treated as empty.

**Test Steps**:
1. Call `classifyConference({ transcript: "   \n\t  ", metadata: {} })`
2. Assert same `INSUFFICIENT_INPUT` error as empty input

**Expected Result**: Same error as empty transcript

**Code Sample**:
```typescript
it("should treat whitespace-only transcript as empty", async () => {
  const result = await classifyConference({ transcript: "   \n\t  ", metadata: {} });
  expect(result.error?.code).toBe("INSUFFICIENT_INPUT");
});
```

---

### 3.2 Ambiguous and Adversarial Inputs

#### TC-F1-E2.1: Equally Ambiguous Multi-Domain Transcript
**Objective**: When top two labels have nearly equal scores (diff < 0.05), the system flags the result as `lowConfidence`.

**Test Steps**:
1. Craft a transcript equally referencing academic research and corporate strategy
2. Submit to classifier
3. Assert `result.isLowConfidence === true` when top-2 score difference < 0.05

**Expected Result**: `{ isLowConfidence: true, primaryLabel: "academic" | "corporate" }`

**Code Sample**:
```typescript
it("should flag result as lowConfidence when top-2 scores are near-equal", async () => {
  const transcript = "Half the content is peer-reviewed research findings. The other half covers quarterly revenue strategy.";
  const result = await classifyConference({ transcript, metadata: {} });
  const scores = result.labels.map((l) => l.score).sort((a, b) => b - a);
  if (scores[0] - scores[1] < 0.05) {
    expect(result.isLowConfidence).toBe(true);
  }
});
```

---

#### TC-F1-E2.2: Non-English Transcript Handling
**Objective**: Classifier handles non-English input without crashing and returns a language detection warning.

**Test Steps**:
1. Submit a German transcript: "Willkommen zur Hauptkonferenz über künstliche Intelligenz..."
2. Assert the response includes `warnings: [{ code: "NON_ENGLISH_INPUT" }]`
3. Assert a classification is still attempted

**Expected Result**: Classification attempted with language warning included

**Code Sample**:
```typescript
it("should warn on non-English input and still attempt classification", async () => {
  const result = await classifyConference({
    transcript: "Willkommen zur Hauptkonferenz über künstliche Intelligenz und maschinelles Lernen.",
    metadata: {},
  });
  const langWarning = result.warnings?.find((w) => w.code === "NON_ENGLISH_INPUT");
  expect(langWarning).toBeDefined();
  expect(result.primaryLabel).toBeDefined();
});
```

---

### 3.3 Extremely Long Inputs

#### TC-F1-E3.1: Transcript Exceeding Max Token Limit is Truncated
**Objective**: Transcripts exceeding the model's context window are truncated cleanly and the truncation is noted in the response.

**Preconditions**:
- Model max context = 8000 tokens

**Test Steps**:
1. Construct a transcript of 15,000 tokens
2. Submit to classifier
3. Assert `result.metadata.truncated === true`
4. Assert classification still returns a valid result

**Expected Result**: `{ primaryLabel: "...", metadata: { truncated: true, originalTokenCount: 15000, processedTokenCount: 8000 } }`

**Code Sample**:
```typescript
it("should truncate long transcripts and flag truncation in metadata", async () => {
  const longTranscript = "technical conference content ".repeat(600); // ~15,000 tokens approx
  const result = await classifyConference({ transcript: longTranscript, metadata: {} });
  expect(result.metadata.truncated).toBe(true);
  expect(result.primaryLabel).toBeDefined();
});
```

---

#### TC-F1-E3.2: Chunked Classification for Multi-Session Conferences
**Objective**: Multi-session conferences are classified by chunking and aggregating chunk-level labels.

**Test Steps**:
1. Submit a 3-session conference (3 transcript chunks)
2. Call `classifyConferenceChunked({ chunks: [t1, t2, t3] })`
3. Assert aggregate label is computed from weighted chunk scores

**Expected Result**: Weighted aggregate classification returned

**Code Sample**:
```typescript
it("should aggregate chunk-level classifications into a conference-level label", async () => {
  const chunks = [
    "Morning session: API design patterns and architecture reviews.",
    "Afternoon session: Machine learning model deployment case studies.",
    "Evening panel: Future of cloud-native development.",
  ];
  const result = await classifyConferenceChunked({ chunks });
  expect(result.primaryLabel).toBeDefined();
  expect(result.chunkResults).toHaveLength(3);
  expect(result.aggregationMethod).toBe("weighted_average");
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Latency Under Load

#### TC-F1-P1.1: Single Classification Latency < 5 Seconds
**Objective**: A single classification call completes within the 5-second SLA.

**Preconditions**:
- Warm model instance
- Standard transcript (500–2000 tokens)

**Test Steps**:
1. Record `startTime`
2. Call `classifyConference` with a 1,000-token transcript
3. Record `endTime`
4. Assert `endTime - startTime < 5000ms`

**Expected Result**: Latency <= 5,000ms

**Code Sample**:
```typescript
it("should classify a standard transcript in under 5 seconds", async () => {
  const transcript = "technical conference session content ".repeat(50);
  const start = Date.now();
  await classifyConference({ transcript, metadata: {} });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(5000);
}, 10000);
```

---

#### TC-F1-P1.2: Cold Start Latency < 15 Seconds
**Objective**: First classification after service cold start completes within 15 seconds.

**Test Steps**:
1. Restart the classification service (cold state)
2. Immediately submit a classification request
3. Assert total time from submission to result < 15,000ms

**Expected Result**: Cold start + classification <= 15,000ms

**Code Sample**:
```typescript
it("should complete cold-start classification within 15 seconds", async () => {
  await classificationService.restart(); // simulate cold start
  const start = Date.now();
  await classifyConference({ transcript: "Annual technical conference...", metadata: {} });
  expect(Date.now() - start).toBeLessThan(15000);
}, 20000);
```

---

### 4.2 Throughput

#### TC-F1-P2.1: 10 Concurrent Classifications Complete Without Error
**Objective**: 10 simultaneous classification requests all succeed without errors or timeouts.

**Test Steps**:
1. Create 10 unique transcript inputs
2. Fire all 10 `classifyConference` calls simultaneously using `Promise.all`
3. Assert all 10 resolve with valid `primaryLabel` values
4. Assert no result contains an error

**Expected Result**: All 10 succeed; no errors

**Code Sample**:
```typescript
it("should handle 10 concurrent classification requests without errors", async () => {
  const inputs = Array.from({ length: 10 }, (_, i) => ({
    transcript: `Conference session ${i}: Covering technical topic ${i}...`,
    metadata: { sessionId: `session-${i}` },
  }));
  const results = await Promise.all(inputs.map((input) => classifyConference(input)));
  results.forEach((result) => {
    expect(result.error).toBeUndefined();
    expect(result.primaryLabel).toBeDefined();
  });
}, 30000);
```

---

#### TC-F1-P2.2: Throughput >= 20 Requests Per Minute
**Objective**: Service sustains >= 20 classification requests per minute under steady load.

**Test Steps**:
1. Send 20 sequential classification requests, recording each latency
2. Assert total wall-clock time <= 60,000ms
3. Assert no individual request exceeds 5,000ms

**Expected Result**: 20 requests complete in under 60 seconds

**Code Sample**:
```typescript
it("should sustain >= 20 classifications per minute", async () => {
  const transcript = "Standard conference transcript for load testing.";
  const start = Date.now();
  for (let i = 0; i < 20; i++) {
    const reqStart = Date.now();
    await classifyConference({ transcript, metadata: {} });
    expect(Date.now() - reqStart).toBeLessThan(5000);
  }
  expect(Date.now() - start).toBeLessThan(60000);
}, 70000);
```

---

### 4.3 Resource Efficiency

#### TC-F1-P3.1: Memory Usage Does Not Grow Under Repeated Classifications
**Objective**: Heap memory remains stable over 50 repeated classifications (no memory leak).

**Test Steps**:
1. Record initial heap usage
2. Run 50 classification calls sequentially
3. Record final heap usage
4. Assert heap growth < 50MB

**Expected Result**: Memory delta < 50MB

**Code Sample**:
```typescript
it("should not leak memory over 50 repeated classifications", async () => {
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 50; i++) {
    await classifyConference({ transcript: "Conference content...", metadata: {} });
  }
  if (global.gc) global.gc(); // force GC if available
  const after = process.memoryUsage().heapUsed;
  const growthMB = (after - before) / 1024 / 1024;
  expect(growthMB).toBeLessThan(50);
}, 120000);
```

---

#### TC-F1-P3.2: Classification Result is Cached for Identical Inputs
**Objective**: Identical transcript inputs return a cached result, reducing model inference time by >= 80%.

**Test Steps**:
1. Submit `transcript-A`, record latency (cold)
2. Submit identical `transcript-A` again, record latency (cached)
3. Assert cached latency < 20% of cold latency

**Expected Result**: Cache hit reduces latency by >= 80%

**Code Sample**:
```typescript
it("should serve cached result for repeated identical input", async () => {
  const transcript = "Repeatable deterministic conference transcript content.";
  const start1 = Date.now();
  await classifyConference({ transcript, metadata: {} });
  const coldMs = Date.now() - start1;

  const start2 = Date.now();
  await classifyConference({ transcript, metadata: {} });
  const cachedMs = Date.now() - start2;

  expect(cachedMs).toBeLessThan(coldMs * 0.20);
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

### Coverage Notes
- Confidence threshold enforcement tested at values 0.0, 0.20, and 0.60
- Multi-label output verified for hybrid conference types
- Database persistence and event emission verified via integration tests
- Non-English input, empty input, and oversized input covered in edge cases
- Latency, throughput, memory, and caching validated in performance tests
