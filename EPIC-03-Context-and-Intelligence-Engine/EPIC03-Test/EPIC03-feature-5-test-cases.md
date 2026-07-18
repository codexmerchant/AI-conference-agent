# EPIC03 Feature 5 — Context Tagging — Test Cases

## Test Overview
Comprehensive test suite for Context Tagging covering unit tests, integration tests, edge cases, and performance validation. This feature assigns structured, typed tags to conference sessions and interactions based on extracted intelligence signals (topics, entities, intent, interaction type, classification). Tags include categories such as topic, entity, sentiment, action, conferenceType, and custom domain tags.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Tag Generation from Intelligence Signals

#### TC-F5-U1.1: Topic Signal Generates Topic Tag
**Objective**: An extracted topic correctly produces a tag with `category: "topic"` and the topic label as the value.

**Preconditions**:
- Topic extraction has run and produced at least 1 topic

**Test Steps**:
1. Provide `topicSignals: [{ label: "Machine Learning", relevanceScore: 0.88 }]`
2. Call `generateContextTags({ signals })`
3. Assert result contains `{ category: "topic", value: "Machine Learning", confidence: 0.88 }`

**Expected Result**: Topic tag generated with correct category and value

**Code Sample**:
```typescript
import { generateContextTags } from "@/services/intelligence/contextTagging";

describe("TC-F5-U1.1 Topic Signal Generates Topic Tag", () => {
  it("should produce topic category tag from topic signal", async () => {
    const signals = { topicSignals: [{ label: "Machine Learning", relevanceScore: 0.88 }] };
    const result = await generateContextTags({ signals });
    const tag = result.tags.find((t) => t.category === "topic" && t.value === "Machine Learning");
    expect(tag).toBeDefined();
    expect(tag!.confidence).toBeCloseTo(0.88, 1);
  });
});
```

---

#### TC-F5-U1.2: Entity Signal Generates Entity Tag
**Objective**: A detected entity (person, organization, location) produces an entity-category tag.

**Test Steps**:
1. Provide `entitySignals: [{ text: "OpenAI", type: "organization" }]`
2. Call `generateContextTags({ signals })`
3. Assert result contains `{ category: "entity", subType: "organization", value: "OpenAI" }`

**Expected Result**: Entity tag with correct subType and value

**Code Sample**:
```typescript
it("should produce entity tag from organization entity signal", async () => {
  const signals = { entitySignals: [{ text: "OpenAI", type: "organization", confidence: 0.92 }] };
  const result = await generateContextTags({ signals });
  const tag = result.tags.find((t) => t.category === "entity" && t.value === "OpenAI");
  expect(tag).toBeDefined();
  expect(tag!.subType).toBe("organization");
});
```

---

#### TC-F5-U1.3: Classification Signal Generates ConferenceType Tag
**Objective**: A conference classification label produces a `conferenceType` tag.

**Test Steps**:
1. Provide `classificationSignal: { label: "technical", confidence: 0.91 }`
2. Call `generateContextTags({ signals })`
3. Assert tag `{ category: "conferenceType", value: "technical" }` is present

**Expected Result**: conferenceType tag generated from classification signal

**Code Sample**:
```typescript
it("should produce conferenceType tag from classification signal", async () => {
  const signals = { classificationSignal: { label: "technical", confidence: 0.91 } };
  const result = await generateContextTags({ signals });
  const tag = result.tags.find((t) => t.category === "conferenceType");
  expect(tag?.value).toBe("technical");
  expect(tag?.confidence).toBeCloseTo(0.91, 1);
});
```

---

### 1.2 Tag Deduplication and Normalization

#### TC-F5-U2.1: Duplicate Tags Are Merged
**Objective**: When two signals produce the same tag (same category + value), only one tag appears in the output.

**Preconditions**:
- Both topic extraction and entity extraction produce a "Cloud Computing" label

**Test Steps**:
1. Provide two signals both generating `{ category: "topic", value: "Cloud Computing" }`
2. Assert only 1 tag with that value appears in result

**Expected Result**: Deduplicated output with single "Cloud Computing" topic tag

**Code Sample**:
```typescript
it("should deduplicate tags from multiple signals producing the same value", async () => {
  const signals = {
    topicSignals: [{ label: "Cloud Computing", relevanceScore: 0.78 }],
    entitySignals: [{ text: "Cloud Computing", type: "concept", confidence: 0.65 }],
  };
  const result = await generateContextTags({ signals });
  const cloudTags = result.tags.filter((t) => t.value === "Cloud Computing");
  expect(cloudTags.length).toBe(1);
});
```

---

#### TC-F5-U2.2: Tag Values Are Normalized to Title Case
**Objective**: All tag values are normalized to title case for consistency.

**Test Steps**:
1. Provide a signal with label `"machine learning"` (all lowercase)
2. Assert returned tag has `value: "Machine Learning"`

**Expected Result**: Value normalized to "Machine Learning"

**Code Sample**:
```typescript
it("should normalize tag values to title case", async () => {
  const signals = { topicSignals: [{ label: "machine learning", relevanceScore: 0.80 }] };
  const result = await generateContextTags({ signals });
  const tag = result.tags.find((t) => t.category === "topic");
  expect(tag?.value).toBe("Machine Learning");
});
```

---

#### TC-F5-U2.3: Tag Confidence Is Averaged for Merged Tags
**Objective**: When tags from two signals are merged, the resulting confidence is the average of both.

**Test Steps**:
1. Signal 1 produces `{ value: "AI Ethics", confidence: 0.70 }`
2. Signal 2 produces `{ value: "AI Ethics", confidence: 0.90 }`
3. Assert merged tag confidence = 0.80

**Expected Result**: `{ value: "AI Ethics", confidence: 0.80 }`

**Code Sample**:
```typescript
it("should average confidence when merging duplicate tags", async () => {
  const signals = {
    topicSignals: [{ label: "AI Ethics", relevanceScore: 0.70 }],
    customSignals: [{ category: "topic", value: "AI Ethics", confidence: 0.90 }],
  };
  const result = await generateContextTags({ signals });
  const tag = result.tags.find((t) => t.value === "AI Ethics");
  expect(tag?.confidence).toBeCloseTo(0.80, 1);
});
```

---

### 1.3 Tag Filtering and Threshold Enforcement

#### TC-F5-U3.1: Tags Below Confidence Threshold Are Excluded
**Objective**: Tags with confidence below the configured threshold are not included in the output.

**Preconditions**:
- `options.confidenceThreshold: 0.40`

**Test Steps**:
1. Generate tags; some signals produce tags with confidence < 0.40
2. Assert no returned tag has `confidence < 0.40`

**Expected Result**: All returned tags have `confidence >= 0.40`

**Code Sample**:
```typescript
it("should exclude tags below confidence threshold", async () => {
  const signals = {
    topicSignals: [
      { label: "Quantum Computing", relevanceScore: 0.20 }, // below threshold
      { label: "Cloud Architecture", relevanceScore: 0.75 }, // above threshold
    ],
  };
  const result = await generateContextTags({ signals, options: { confidenceThreshold: 0.40 } });
  result.tags.forEach((tag) => {
    expect(tag.confidence).toBeGreaterThanOrEqual(0.40);
  });
});
```

---

#### TC-F5-U3.2: Max Tags Limit Enforced
**Objective**: When `maxTags` is configured, the output is capped at that number.

**Test Steps**:
1. Generate 20 candidate tags
2. Set `maxTags: 10`
3. Assert `result.tags.length <= 10`

**Expected Result**: Output contains no more than 10 tags

**Code Sample**:
```typescript
it("should cap output at maxTags limit", async () => {
  const signals = {
    topicSignals: Array.from({ length: 20 }, (_, i) => ({ label: `Topic ${i}`, relevanceScore: 0.60 + i * 0.01 })),
  };
  const result = await generateContextTags({ signals, options: { maxTags: 10 } });
  expect(result.tags.length).toBeLessThanOrEqual(10);
});
```

---

#### TC-F5-U3.3: Tags Trimmed at MaxTags Preserve Highest Confidence
**Objective**: When trimmed to maxTags, the retained tags are the highest-confidence ones.

**Test Steps**:
1. Generate 15 tags with known confidence values
2. Set `maxTags: 5`
3. Assert all returned tags are from the top 5 by confidence

**Expected Result**: Highest 5 confidence tags retained

**Code Sample**:
```typescript
it("should retain highest-confidence tags when trimming to maxTags", async () => {
  const signals = {
    topicSignals: Array.from({ length: 15 }, (_, i) => ({ label: `Topic ${i}`, relevanceScore: (15 - i) * 0.06 })),
  };
  const result = await generateContextTags({ signals, options: { maxTags: 5 } });
  const minRetained = Math.min(...result.tags.map((t) => t.confidence));
  const allCandidates = signals.topicSignals.map((s) => s.relevanceScore).sort((a, b) => b - a);
  const threshold = allCandidates[4]; // 5th highest
  expect(minRetained).toBeGreaterThanOrEqual(threshold);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Context Tagging + Full Intelligence Pipeline

#### TC-F5-I1.1: Tags Generated from All Intelligence Signals End-to-End
**Objective**: Running the full intelligence pipeline produces tags from all signal types (topics, entities, classification, intent).

**Preconditions**:
- Full pipeline connected: classifier → topic extractor → entity extractor → intent inference → context tagger

**Test Steps**:
1. Run full pipeline for conference `conf-070`
2. Assert tags include at least one tag from each category: `topic`, `entity`, `conferenceType`, `intent`

**Expected Result**: All four tag categories present

**Code Sample**:
```typescript
it("should produce tags from all signal categories in full pipeline", async () => {
  const { tags } = await runFullIntelligencePipeline({ conferenceId: "conf-070", transcript: richTranscript });
  const categories = new Set(tags.map((t) => t.category));
  expect(categories.has("topic")).toBe(true);
  expect(categories.has("entity")).toBe(true);
  expect(categories.has("conferenceType")).toBe(true);
  expect(categories.has("intent")).toBe(true);
});
```

---

#### TC-F5-I1.2: Tag Generation Is Idempotent
**Objective**: Running the tagging pipeline twice on the same input produces identical tag sets.

**Test Steps**:
1. Run tagging pipeline for `conf-071`; capture tags (run 1)
2. Run tagging pipeline again for `conf-071` (run 2)
3. Assert tag sets are identical

**Expected Result**: Idempotent output across multiple runs

**Code Sample**:
```typescript
it("should produce identical tags on repeated pipeline runs for same input", async () => {
  const run1 = await runTaggingPipeline({ conferenceId: "conf-071", transcript: standardTranscript });
  const run2 = await runTaggingPipeline({ conferenceId: "conf-071", transcript: standardTranscript });
  const sortFn = (a: Tag, b: Tag) => a.value.localeCompare(b.value);
  expect(run1.tags.sort(sortFn)).toEqual(run2.tags.sort(sortFn));
});
```

---

### 2.2 Context Tagging + Search and Filter

#### TC-F5-I2.1: Tagged Conferences Are Searchable by Tag Value
**Objective**: Conferences tagged with "Machine Learning" are returned when searching for that tag.

**Test Steps**:
1. Tag `conf-072` with `{ category: "topic", value: "Machine Learning" }`
2. Query search index: `searchByTag({ category: "topic", value: "Machine Learning" })`
3. Assert `conf-072` appears in results

**Expected Result**: Conference returned in tag-based search

**Code Sample**:
```typescript
it("should make conferences discoverable by their tags", async () => {
  await runTaggingPipeline({ conferenceId: "conf-072", transcript: mlTranscript });
  const results = await searchByTag({ category: "topic", value: "Machine Learning" });
  expect(results.conferenceIds).toContain("conf-072");
});
```

---

#### TC-F5-I2.2: Multi-Tag Filter Returns Intersection
**Objective**: Filtering by two tags returns only conferences that have both tags.

**Test Steps**:
1. Tag `conf-073` with both "technical" (conferenceType) and "Kubernetes" (topic)
2. Tag `conf-074` with "technical" (conferenceType) only
3. Filter by both tags
4. Assert only `conf-073` is returned

**Expected Result**: Only intersection returned

**Code Sample**:
```typescript
it("should return only conferences matching all specified tags", async () => {
  await applyTags("conf-073", [{ category: "conferenceType", value: "technical" }, { category: "topic", value: "Kubernetes" }]);
  await applyTags("conf-074", [{ category: "conferenceType", value: "technical" }]);
  const results = await searchByTags([
    { category: "conferenceType", value: "technical" },
    { category: "topic", value: "Kubernetes" },
  ]);
  expect(results.conferenceIds).toContain("conf-073");
  expect(results.conferenceIds).not.toContain("conf-074");
});
```

---

### 2.3 Context Tagging + Event System

#### TC-F5-I3.1: Tag Creation Emits `context.tagged` Event
**Objective**: Successful tag generation emits a `context.tagged` event with the tag list.

**Test Steps**:
1. Subscribe to `context.tagged` event
2. Run tagging pipeline for `conf-075`
3. Assert event received with `event.conferenceId === "conf-075"` and `event.tags.length > 0`

**Expected Result**: Event received with correct payload

**Code Sample**:
```typescript
it("should emit context.tagged event after tag generation", async () => {
  const eventPromise = eventBus.once("context.tagged");
  await runTaggingPipeline({ conferenceId: "conf-075", transcript: standardTranscript });
  const event = await eventPromise;
  expect(event.conferenceId).toBe("conf-075");
  expect(event.tags.length).toBeGreaterThan(0);
});
```

---

#### TC-F5-I3.2: Tag Update Emits `context.tags.updated` Event
**Objective**: Re-tagging with new signals emits a `context.tags.updated` event with a diff of added/removed tags.

**Test Steps**:
1. Apply initial tags to `conf-076`
2. Subscribe to `context.tags.updated`
3. Re-tag with different signals
4. Assert event includes `added` and `removed` arrays

**Expected Result**: Diff event received

**Code Sample**:
```typescript
it("should emit tags.updated event with diff on re-tagging", async () => {
  await runTaggingPipeline({ conferenceId: "conf-076", transcript: v1Transcript });
  const updateEventPromise = eventBus.once("context.tags.updated");
  await runTaggingPipeline({ conferenceId: "conf-076", transcript: v2Transcript });
  const event = await updateEventPromise;
  expect(event.conferenceId).toBe("conf-076");
  expect(Array.isArray(event.added)).toBe(true);
  expect(Array.isArray(event.removed)).toBe(true);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Empty and Null Signal Inputs

#### TC-F5-E1.1: Empty Signals Object Returns Empty Tags
**Objective**: When no signals are provided, an empty tags array is returned (not an error).

**Test Steps**:
1. Call `generateContextTags({ signals: {} })`
2. Assert `result.tags` is an empty array
3. Assert `result.error` is undefined

**Expected Result**: `{ tags: [], error: undefined }`

**Code Sample**:
```typescript
it("should return empty tags for empty signals input", async () => {
  const result = await generateContextTags({ signals: {} });
  expect(result.error).toBeUndefined();
  expect(result.tags).toEqual([]);
});
```

---

#### TC-F5-E1.2: Null Signal Values Are Skipped
**Objective**: Null or undefined values within signals are gracefully skipped.

**Test Steps**:
1. Call with `{ topicSignals: [null, { label: "AI", relevanceScore: 0.80 }, undefined] }`
2. Assert only the valid signal produces a tag
3. Assert no error thrown

**Expected Result**: 1 tag generated; null/undefined entries ignored

**Code Sample**:
```typescript
it("should skip null entries in signal arrays without crashing", async () => {
  const signals = { topicSignals: [null, { label: "AI", relevanceScore: 0.80 }, undefined] as any };
  const result = await generateContextTags({ signals });
  expect(result.error).toBeUndefined();
  expect(result.tags).toHaveLength(1);
  expect(result.tags[0].value).toBe("AI");
});
```

---

### 3.2 Tag Value Boundary Cases

#### TC-F5-E2.1: Extremely Long Tag Value Is Truncated
**Objective**: Tag values exceeding 100 characters are truncated to prevent storage issues.

**Test Steps**:
1. Provide a topic signal with a 250-character label
2. Assert returned tag value length <= 100
3. Assert tag still has category and confidence

**Expected Result**: Tag value truncated to 100 characters

**Code Sample**:
```typescript
it("should truncate tag values exceeding 100 characters", async () => {
  const longLabel = "A".repeat(250);
  const result = await generateContextTags({ signals: { topicSignals: [{ label: longLabel, relevanceScore: 0.70 }] } });
  expect(result.tags[0].value.length).toBeLessThanOrEqual(100);
  expect(result.tags[0].category).toBe("topic");
});
```

---

#### TC-F5-E2.2: Tag Value with Special Characters Is Sanitized
**Objective**: Tag values containing SQL injection or XSS payloads are sanitized before storage.

**Test Steps**:
1. Provide topic label: `"<script>alert('xss')</script>"`
2. Assert returned tag value does not contain raw `<script>` tags
3. Assert tag is still created (sanitized, not rejected)

**Expected Result**: XSS payload stripped; safe value stored

**Code Sample**:
```typescript
it("should sanitize tag values containing script injection payloads", async () => {
  const maliciousLabel = "<script>alert('xss')</script>";
  const result = await generateContextTags({ signals: { topicSignals: [{ label: maliciousLabel, relevanceScore: 0.60 }] } });
  expect(result.tags[0]?.value).not.toContain("<script>");
  expect(result.tags[0]?.value).not.toContain("alert");
});
```

---

### 3.3 Conflicting Signals

#### TC-F5-E3.1: Conflicting Category Signals Are Resolved by Confidence
**Objective**: When two signals assign different conferenceType values, the higher-confidence one wins.

**Test Steps**:
1. Provide `classificationSignal: { label: "academic", confidence: 0.60 }` and `overrideSignal: { category: "conferenceType", value: "technical", confidence: 0.85 }`
2. Assert `conferenceType` tag value is `"technical"` (higher confidence wins)

**Expected Result**: Higher-confidence tag value retained

**Code Sample**:
```typescript
it("should resolve conflicting conferenceType signals by selecting highest confidence", async () => {
  const signals = {
    classificationSignal: { label: "academic", confidence: 0.60 },
    customSignals: [{ category: "conferenceType", value: "technical", confidence: 0.85 }],
  };
  const result = await generateContextTags({ signals });
  const conferenceTypeTags = result.tags.filter((t) => t.category === "conferenceType");
  expect(conferenceTypeTags).toHaveLength(1);
  expect(conferenceTypeTags[0].value).toBe("technical");
});
```

---

#### TC-F5-E3.2: Unknown Signal Type Is Ignored with Warning
**Objective**: A signal with an unrecognized type is skipped and a warning is logged.

**Test Steps**:
1. Provide `{ unknownSignalType: [{ data: "..." }] }` alongside valid topic signals
2. Assert the unknown signal is ignored
3. Assert `result.warnings` contains `UNKNOWN_SIGNAL_TYPE`

**Expected Result**: Valid tags generated; unknown signal warned

**Code Sample**:
```typescript
it("should ignore unknown signal types and emit a warning", async () => {
  const signals = {
    topicSignals: [{ label: "DevOps", relevanceScore: 0.75 }],
    unknownSignalType: [{ data: "some unrecognized signal" }] as any,
  };
  const result = await generateContextTags({ signals });
  expect(result.warnings?.some((w) => w.code === "UNKNOWN_SIGNAL_TYPE")).toBe(true);
  expect(result.tags.some((t) => t.value === "DevOps")).toBe(true);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Tagging Throughput

#### TC-F5-P1.1: 100 Signal Inputs Tagged in < 500ms
**Objective**: Generating context tags from 100 mixed signals completes within 500ms.

**Test Steps**:
1. Prepare 100 signal objects (mix of topic, entity, classification)
2. Time `generateContextTags` call
3. Assert elapsed < 500ms

**Expected Result**: Latency <= 500ms for 100 signals

**Code Sample**:
```typescript
it("should generate tags from 100 signals in under 500ms", async () => {
  const signals = {
    topicSignals: Array.from({ length: 50 }, (_, i) => ({ label: `Topic ${i}`, relevanceScore: 0.60 })),
    entitySignals: Array.from({ length: 50 }, (_, i) => ({ text: `Entity ${i}`, type: "organization", confidence: 0.70 })),
  };
  const start = Date.now();
  await generateContextTags({ signals });
  expect(Date.now() - start).toBeLessThan(500);
}, 3000);
```

---

#### TC-F5-P1.2: Bulk Tagging of 50 Conferences < 30 Seconds
**Objective**: Applying tags to 50 conferences sequentially completes within 30 seconds.

**Test Steps**:
1. Prepare 50 conference records with transcripts
2. Tag all 50 sequentially
3. Assert total time < 30,000ms

**Expected Result**: 50 conferences tagged in under 30 seconds

**Code Sample**:
```typescript
it("should tag 50 conferences within 30 seconds", async () => {
  const conferences = Array.from({ length: 50 }, (_, i) => ({ conferenceId: `conf-bulk-${i}`, transcript: `Conference ${i} content...` }));
  const start = Date.now();
  for (const conf of conferences) {
    await runTaggingPipeline(conf);
  }
  expect(Date.now() - start).toBeLessThan(30000);
}, 35000);
```

---

### 4.2 Search and Retrieval Performance

#### TC-F5-P2.1: Tag-Based Search Returns Results in < 200ms
**Objective**: Searching for conferences by a single tag returns results within 200ms.

**Test Steps**:
1. Ensure >= 100 conferences are tagged in the test database
2. Execute `searchByTag({ category: "topic", value: "Machine Learning" })`
3. Assert elapsed < 200ms

**Expected Result**: Search results returned in <= 200ms

**Code Sample**:
```typescript
it("should return tag-based search results within 200ms", async () => {
  await seedTaggedConferences(100); // seed test data
  const start = Date.now();
  await searchByTag({ category: "topic", value: "Machine Learning" });
  expect(Date.now() - start).toBeLessThan(200);
});
```

---

#### TC-F5-P2.2: Multi-Tag Intersection Search < 500ms
**Objective**: Multi-tag intersection search across 1,000 tagged conferences completes within 500ms.

**Test Steps**:
1. Seed 1,000 tagged conferences
2. Execute multi-tag search with 3 tag filters
3. Assert elapsed < 500ms

**Expected Result**: Intersection search completes in <= 500ms

**Code Sample**:
```typescript
it("should complete multi-tag intersection search in under 500ms", async () => {
  await seedTaggedConferences(1000);
  const start = Date.now();
  await searchByTags([
    { category: "conferenceType", value: "Technical" },
    { category: "topic", value: "Kubernetes" },
    { category: "entity", value: "Google Cloud" },
  ]);
  expect(Date.now() - start).toBeLessThan(500);
});
```

---

### 4.3 Memory and Resource Usage

#### TC-F5-P3.1: Tagging Pipeline Memory Stable Over 200 Runs
**Objective**: Heap usage remains stable after 200 sequential tagging operations.

**Test Steps**:
1. Record heap before
2. Run 200 tagging operations
3. Force GC and assert heap growth < 40MB

**Expected Result**: Memory delta < 40MB

**Code Sample**:
```typescript
it("should not leak memory over 200 tagging runs", async () => {
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 200; i++) {
    await generateContextTags({ signals: { topicSignals: [{ label: `Topic ${i}`, relevanceScore: 0.75 }] } });
  }
  if (global.gc) global.gc();
  const growthMB = (process.memoryUsage().heapUsed - before) / 1024 / 1024;
  expect(growthMB).toBeLessThan(40);
}, 120000);
```

---

#### TC-F5-P3.2: Cached Tag Sets Returned for Identical Signal Inputs
**Objective**: Identical signal inputs return a cached tag set, reducing computation.

**Test Steps**:
1. Generate tags for signal set A (cold)
2. Generate tags for identical signal set A again (cache hit)
3. Assert second call latency < 10% of first call latency

**Expected Result**: Cache hit is >= 90% faster than cold computation

**Code Sample**:
```typescript
it("should serve cached tag set for identical signal inputs", async () => {
  const signals = { topicSignals: [{ label: "DevOps", relevanceScore: 0.80 }] };
  const start1 = Date.now();
  await generateContextTags({ signals });
  const cold = Date.now() - start1;

  const start2 = Date.now();
  await generateContextTags({ signals });
  const cached = Date.now() - start2;

  expect(cached).toBeLessThan(cold * 0.10);
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
- All signal-to-tag mappings verified: topic, entity, conferenceType, intent, classification
- Deduplication, normalization, confidence averaging, and threshold filtering tested
- Integration with full pipeline, search index, and event bus verified
- Edge cases cover null signals, XSS sanitization, oversized values, and unknown signal types
- Performance covers tagging throughput, search latency, and memory stability
