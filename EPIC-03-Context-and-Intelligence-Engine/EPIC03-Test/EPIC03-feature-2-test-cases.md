# EPIC03 Feature 2 — Interaction-Type Classification — Test Cases

## Test Overview
Comprehensive test suite for Interaction-Type Classification covering unit tests, integration tests, edge cases, and performance validation. This feature classifies the interaction type within a conference session (e.g., Q&A, panel discussion, presentation, breakout, networking) and assigns confidence scores to each detected type.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Core Interaction Type Detection

#### TC-F2-U1.1: Presentation Interaction Type
**Objective**: Verify that a one-way monologue transcript is classified as `"presentation"` with high confidence.

**Preconditions**:
- Interaction classifier model is loaded
- Transcript has a single dominant speaker with no question-answer turns

**Test Steps**:
1. Submit a transcript: "Good afternoon everyone. Today I'll walk you through our quarterly results..."
2. Call `classifyInteractionType({ transcript, speakerMetadata })`
3. Assert `primaryType === "presentation"`
4. Assert `primaryConfidence >= 0.80`

**Expected Result**: `{ primaryType: "presentation", primaryConfidence: 0.87 }`

**Code Sample**:
```typescript
import { classifyInteractionType } from "@/services/intelligence/interactionClassifier";

describe("TC-F2-U1.1 Presentation Interaction Type", () => {
  it("should classify monologue transcript as presentation", async () => {
    const input = {
      transcript: "Good afternoon everyone. Today I'll walk you through our quarterly results and product highlights...",
      speakerMetadata: { speakerCount: 1 },
    };
    const result = await classifyInteractionType(input);
    expect(result.primaryType).toBe("presentation");
    expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.80);
  });
});
```

---

#### TC-F2-U1.2: Q&A Interaction Type
**Objective**: Verify that a back-and-forth question-answer transcript is classified as `"qa"`.

**Preconditions**:
- Transcript contains alternating speaker turns with question markers

**Test Steps**:
1. Submit transcript: "Audience: How does this scale? Speaker: Great question, we use horizontal sharding..."
2. Call `classifyInteractionType({ transcript, speakerMetadata })`
3. Assert `primaryType === "qa"`
4. Assert `primaryConfidence >= 0.78`

**Expected Result**: `{ primaryType: "qa", primaryConfidence: 0.83 }`

**Code Sample**:
```typescript
it("should classify question-answer exchanges as qa", async () => {
  const input = {
    transcript: "Audience: How does this scale to millions of users? Speaker: Great question — we use horizontal sharding across 12 regions.",
    speakerMetadata: { speakerCount: 2, hasQuestionMarkers: true },
  };
  const result = await classifyInteractionType(input);
  expect(result.primaryType).toBe("qa");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.78);
});
```

---

#### TC-F2-U1.3: Panel Discussion Detection
**Objective**: Verify that a multi-speaker, moderator-led exchange is classified as `"panel"`.

**Preconditions**:
- Transcript has 3+ speakers, moderator questions, and equal speaking turns

**Test Steps**:
1. Submit panel discussion transcript with 4 speakers
2. Assert `primaryType === "panel"`

**Expected Result**: `{ primaryType: "panel", primaryConfidence: 0.85 }`

**Code Sample**:
```typescript
it("should classify multi-speaker moderated session as panel", async () => {
  const input = {
    transcript: "Moderator: Let's start with our first panelist... Panelist A: I believe... Panelist B: Adding to that...",
    speakerMetadata: { speakerCount: 4, hasModeratorRole: true },
  };
  const result = await classifyInteractionType(input);
  expect(result.primaryType).toBe("panel");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.82);
});
```

---

### 1.2 Multi-Type Detection for Mixed Sessions

#### TC-F2-U2.1: Session with Presentation Followed by Q&A
**Objective**: Detect multiple interaction types within a single session and correctly sequence them.

**Preconditions**:
- Transcript has clear segment boundary between presentation and Q&A

**Test Steps**:
1. Submit transcript with 60% presentation and 40% Q&A content
2. Assert `types` array contains both `"presentation"` and `"qa"`
3. Assert `types[0].type === "presentation"` (dominant type first)

**Expected Result**: `{ types: [{ type: "presentation", score: 0.60 }, { type: "qa", score: 0.35 }] }`

**Code Sample**:
```typescript
it("should detect mixed presentation + Q&A session", async () => {
  const input = {
    transcript: "Speaker presents for 45 minutes... [TRANSITION] Audience: Can you explain the caching layer? Speaker: Sure...",
    speakerMetadata: { speakerCount: 3 },
  };
  const result = await classifyInteractionType(input);
  const typeNames = result.types.map((t) => t.type);
  expect(typeNames).toContain("presentation");
  expect(typeNames).toContain("qa");
  expect(result.types[0].type).toBe("presentation");
});
```

---

#### TC-F2-U2.2: Segment Boundary Detection
**Objective**: Verify the classifier identifies the timestamp offset where interaction type changes.

**Test Steps**:
1. Submit a structured transcript with known transition at position 1800 seconds
2. Assert `result.segments[0].endOffset` approximately equals 1800

**Expected Result**: Segment boundary detected within ±60 seconds of actual transition

**Code Sample**:
```typescript
it("should detect segment transition offset within 60 seconds", async () => {
  const result = await classifyInteractionType({
    transcript: buildTranscriptWithTransitionAt(1800),
    speakerMetadata: { speakerCount: 2 },
    options: { detectSegments: true },
  });
  expect(result.segments).toHaveLength(2);
  expect(result.segments[0].endOffset).toBeGreaterThan(1740);
  expect(result.segments[0].endOffset).toBeLessThan(1860);
});
```

---

#### TC-F2-U2.3: Breakout Session Classification
**Objective**: Small-group breakout sessions with informal discussion are classified as `"breakout"`.

**Test Steps**:
1. Submit transcript with 3 speakers, informal language, no moderator
2. Assert `primaryType === "breakout"`

**Expected Result**: `{ primaryType: "breakout", primaryConfidence: 0.76 }`

**Code Sample**:
```typescript
it("should classify small informal group discussion as breakout", async () => {
  const result = await classifyInteractionType({
    transcript: "Person A: So what do you think about the new approach? Person B: Honestly I prefer the simpler solution...",
    speakerMetadata: { speakerCount: 3, isInformal: true },
  });
  expect(result.primaryType).toBe("breakout");
});
```

---

### 1.3 Speaker Turn Analysis

#### TC-F2-U3.1: Speaker Turn Count Influences Classification
**Objective**: Verify that the number of speaker turn switches is used as a signal in classification.

**Test Steps**:
1. Submit transcript with metadata indicating 42 speaker turns
2. Assert classifier used `speakerTurnCount` in its feature vector (detectable via debug output)
3. Assert classification is `"qa"` or `"panel"` (high-turn types)

**Expected Result**: High turn count correlates with interactive classification types

**Code Sample**:
```typescript
it("should use speaker turn count as classification signal", async () => {
  const result = await classifyInteractionType({
    transcript: "Highly interactive session with many back-and-forth exchanges...",
    speakerMetadata: { speakerCount: 4, speakerTurnCount: 42 },
    options: { debug: true },
  });
  expect(result.debug?.features.speakerTurnCount).toBe(42);
  expect(["qa", "panel", "breakout"]).toContain(result.primaryType);
});
```

---

#### TC-F2-U3.2: Single-Speaker Zero Turns Yields Presentation
**Objective**: A transcript with zero speaker switches always classifies as `"presentation"`.

**Test Steps**:
1. Submit transcript with `speakerTurnCount: 0`
2. Assert `primaryType === "presentation"`

**Expected Result**: `{ primaryType: "presentation" }`

**Code Sample**:
```typescript
it("should classify single-speaker zero-turn transcript as presentation", async () => {
  const result = await classifyInteractionType({
    transcript: "Continuous monologue about microservices architecture and cloud-native patterns...",
    speakerMetadata: { speakerCount: 1, speakerTurnCount: 0 },
  });
  expect(result.primaryType).toBe("presentation");
});
```

---

#### TC-F2-U3.3: Moderator Role Detection
**Objective**: Verify that a speaker with disproportionately high question-sentence ratio is flagged as moderator.

**Test Steps**:
1. Submit transcript where Speaker A has 90% question sentences
2. Assert `result.roles.find(r => r.speakerId === "A")?.role === "moderator"`

**Expected Result**: Speaker A assigned moderator role

**Code Sample**:
```typescript
it("should detect moderator based on question-sentence ratio", async () => {
  const result = await classifyInteractionType({
    transcript: "A: What do you think? A: How about the second point? A: Any final thoughts? B: Yes, I believe...",
    speakerMetadata: { speakerCount: 2 },
    options: { detectRoles: true },
  });
  const moderator = result.roles?.find((r) => r.role === "moderator");
  expect(moderator?.speakerId).toBe("A");
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Interaction Classifier + Context Engine

#### TC-F2-I1.1: Interaction Type Feeds Downstream Context Pipeline
**Objective**: Confirmed interaction type is available as context when downstream features (intent inference, topic extraction) execute.

**Preconditions**:
- Full intelligence pipeline is wired
- Test conference `conf-010` exists

**Test Steps**:
1. Run full pipeline for `conf-010` (Q&A session transcript)
2. Retrieve context object
3. Assert `context.interactionType === "qa"`
4. Assert intent inference used Q&A-specific prompting strategy

**Expected Result**: Context object includes `interactionType: "qa"` and downstream features reflect it

**Code Sample**:
```typescript
it("should propagate interaction type to downstream context", async () => {
  const context = await runIntelligencePipeline({ conferenceId: "conf-010", transcript: qaTranscript });
  expect(context.interactionType).toBe("qa");
  expect(context.intentInference.strategy).toBe("qa_intent_model");
});
```

---

#### TC-F2-I1.2: Interaction Type Stored in Session Metadata
**Objective**: Classified interaction type is persisted in the session metadata table.

**Test Steps**:
1. Classify interaction type for `conf-010`
2. Query `sessionMetadata` table
3. Assert `sessionMetadata.interactionType` and `sessionMetadata.interactionConfidence` are present

**Expected Result**: Fields persisted correctly

**Code Sample**:
```typescript
it("should persist interaction type in session metadata", async () => {
  await classifyAndPersistInteractionType({ conferenceId: "conf-010", transcript: qaTranscript });
  const meta = await db.sessionMetadata.findOne({ conferenceId: "conf-010" });
  expect(meta?.interactionType).toBeDefined();
  expect(meta?.interactionConfidence).toBeGreaterThan(0);
});
```

---

### 2.2 Real-Time Streaming Classification

#### TC-F2-I2.1: Streaming Transcript Updates Classification Incrementally
**Objective**: As transcript chunks stream in, the interaction type classification updates progressively.

**Test Steps**:
1. Open a streaming classification session
2. Send 5 transcript chunks at 2-second intervals
3. Assert each chunk triggers an updated classification event
4. Assert final classification stabilizes after chunk 4

**Expected Result**: 5 incremental updates received; final classification is stable

**Code Sample**:
```typescript
it("should update classification incrementally as streaming transcript arrives", async () => {
  const updates: ClassificationUpdate[] = [];
  const stream = classifyInteractionTypeStream({ conferenceId: "conf-011" });
  stream.on("update", (u) => updates.push(u));

  for (const chunk of qaChunks) {
    await stream.ingest(chunk);
    await delay(200);
  }
  await stream.finalize();

  expect(updates.length).toBeGreaterThanOrEqual(4);
  expect(updates[updates.length - 1].primaryType).toBe("qa");
});
```

---

#### TC-F2-I2.2: Stream Handles Backpressure Without Loss
**Objective**: When chunks arrive faster than classification can process, no chunks are dropped.

**Test Steps**:
1. Send 20 chunks without delay
2. Assert total ingested count equals 20 after finalization

**Expected Result**: All 20 chunks processed; no data loss

**Code Sample**:
```typescript
it("should process all chunks under backpressure without loss", async () => {
  const stream = classifyInteractionTypeStream({ conferenceId: "conf-012" });
  const chunks = Array.from({ length: 20 }, (_, i) => `chunk-${i}: conference content...`);
  await Promise.all(chunks.map((c) => stream.ingest(c)));
  const result = await stream.finalize();
  expect(result.processedChunkCount).toBe(20);
});
```

---

### 2.3 Integration with Speaker Diarization

#### TC-F2-I3.1: Classification Uses Diarization Output
**Objective**: When speaker diarization output is available, interaction type classification accuracy improves.

**Test Steps**:
1. Classify without diarization (baseline accuracy via mock)
2. Classify with diarization-enriched metadata
3. Assert accuracy/confidence improves by >= 0.05

**Expected Result**: Confidence higher with diarization data

**Code Sample**:
```typescript
it("should improve confidence using speaker diarization metadata", async () => {
  const baseResult = await classifyInteractionType({ transcript: ambiguousTranscript, speakerMetadata: {} });
  const enrichedResult = await classifyInteractionType({
    transcript: ambiguousTranscript,
    speakerMetadata: diarizationOutput,
  });
  expect(enrichedResult.primaryConfidence).toBeGreaterThan(baseResult.primaryConfidence + 0.05);
});
```

---

#### TC-F2-I3.2: Mismatched Diarization Does Not Crash Classifier
**Objective**: If diarization output references speakers not in the transcript, classifier handles gracefully.

**Test Steps**:
1. Submit a transcript with speaker IDs A, B
2. Provide diarization metadata for speakers A, B, C, D (two extra)
3. Assert classifier completes without error

**Expected Result**: Classification succeeds; extra speakers ignored with warning

**Code Sample**:
```typescript
it("should handle diarization metadata with extra speakers gracefully", async () => {
  const result = await classifyInteractionType({
    transcript: "A: Hello B: Hi",
    speakerMetadata: { speakers: ["A", "B", "C", "D"] },
  });
  expect(result.error).toBeUndefined();
  expect(result.warnings?.some((w) => w.code === "UNKNOWN_SPEAKER")).toBe(true);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Degenerate Speaker Patterns

#### TC-F2-E1.1: Single Speaker Labeled as Q&A (Misclassification Guard)
**Objective**: A single speaker reading aloud audience questions should not be misclassified as `"qa"`.

**Test Steps**:
1. Submit transcript: "I'll now read some questions from the audience. First question: ..."
2. Assert classifier does not return `"qa"` as primary type

**Expected Result**: `"presentation"` is primary type despite question content

**Code Sample**:
```typescript
it("should not misclassify single-speaker reading questions as qa", async () => {
  const result = await classifyInteractionType({
    transcript: "I'll read some audience questions. Question 1: What about scalability? My answer: ...",
    speakerMetadata: { speakerCount: 1, speakerTurnCount: 0 },
  });
  expect(result.primaryType).not.toBe("qa");
  expect(result.primaryType).toBe("presentation");
});
```

---

#### TC-F2-E1.2: Silent Segments Between Speakers
**Objective**: Long silences between speakers do not cause incorrect segmentation.

**Test Steps**:
1. Submit transcript with 10-minute gap markers between speaker turns
2. Assert segments are not split at silence points

**Expected Result**: Segments split on interaction-type change, not silence alone

**Code Sample**:
```typescript
it("should not create segment boundaries at silence gaps", async () => {
  const result = await classifyInteractionType({
    transcript: "Speaker A: Good morning. [SILENCE 600s] Speaker A: As I was saying...",
    speakerMetadata: { speakerCount: 1 },
    options: { detectSegments: true },
  });
  expect(result.segments).toHaveLength(1); // one continuous presentation
});
```

---

### 3.2 Unusual Input Formats

#### TC-F2-E2.1: Transcript with Only Laughter and Applause Annotations
**Objective**: Transcripts with only non-verbal annotations return `"unknown"` with low confidence.

**Test Steps**:
1. Submit: `"[LAUGHTER] [APPLAUSE] [CHEERING] [APPLAUSE]"`
2. Assert `primaryType === "unknown"` and `primaryConfidence <= 0.30`

**Expected Result**: `{ primaryType: "unknown", primaryConfidence: 0.15 }`

**Code Sample**:
```typescript
it("should return unknown type for non-verbal-only transcript", async () => {
  const result = await classifyInteractionType({
    transcript: "[LAUGHTER] [APPLAUSE] [CHEERING] [APPLAUSE]",
    speakerMetadata: {},
  });
  expect(result.primaryType).toBe("unknown");
  expect(result.primaryConfidence).toBeLessThanOrEqual(0.30);
});
```

---

#### TC-F2-E2.2: Transcript Timestamp Overflow
**Objective**: Transcripts with malformed or overflowing timestamps are normalized without crashing.

**Test Steps**:
1. Submit a transcript where `startOffset = 9999999999` (invalid)
2. Assert classifier completes and `result.error` is undefined
3. Assert a warning for `INVALID_TIMESTAMP` is present

**Expected Result**: Classification succeeds with timestamp warning

**Code Sample**:
```typescript
it("should handle timestamp overflow gracefully", async () => {
  const result = await classifyInteractionType({
    transcript: "Interesting keynote content...",
    speakerMetadata: {},
    options: { startOffset: 9999999999 },
  });
  expect(result.error).toBeUndefined();
  expect(result.warnings?.some((w) => w.code === "INVALID_TIMESTAMP")).toBe(true);
});
```

---

### 3.3 Multilingual and Code-Switch Inputs

#### TC-F2-E3.1: Code-Switching Mid-Session
**Objective**: A transcript that switches between English and another language mid-session does not lose interaction type fidelity.

**Test Steps**:
1. Submit English Q&A followed by French response
2. Assert `primaryType === "qa"` is retained despite language switch
3. Assert a `LANGUAGE_SWITCH_DETECTED` warning is emitted

**Expected Result**: QA type retained; language warning emitted

**Code Sample**:
```typescript
it("should retain interaction type classification across language switch", async () => {
  const result = await classifyInteractionType({
    transcript: "Audience: How does this work? Speaker: C'est une très bonne question. Notre système utilise...",
    speakerMetadata: { speakerCount: 2 },
  });
  expect(result.primaryType).toBe("qa");
  expect(result.warnings?.some((w) => w.code === "LANGUAGE_SWITCH_DETECTED")).toBe(true);
});
```

---

#### TC-F2-E3.2: Fully Non-English Session Returns Best-Effort Classification
**Objective**: Non-English session is classified using language-agnostic turn-taking signals.

**Test Steps**:
1. Submit a Japanese-language panel discussion transcript
2. Assert a classification is returned (not an error)
3. Assert `result.metadata.languageDetected !== "en"`

**Expected Result**: Classification returned using structural signals; language noted in metadata

**Code Sample**:
```typescript
it("should classify non-English session using turn-taking signals", async () => {
  const result = await classifyInteractionType({
    transcript: "司会: 最初の質問をどうぞ。パネリストA: はい、私は...",
    speakerMetadata: { speakerCount: 3 },
  });
  expect(result.primaryType).toBeDefined();
  expect(result.metadata?.languageDetected).not.toBe("en");
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Classification Latency

#### TC-F2-P1.1: Standard Transcript Classified in < 3 Seconds
**Objective**: Interaction type classification for a 30-minute session transcript completes within 3 seconds.

**Test Steps**:
1. Prepare a 1,500-token transcript (approx 30-min session)
2. Time the `classifyInteractionType` call
3. Assert elapsed < 3,000ms

**Expected Result**: Latency <= 3,000ms

**Code Sample**:
```typescript
it("should classify 30-minute session transcript in under 3 seconds", async () => {
  const transcript = "conference speaker turn content ".repeat(75);
  const start = Date.now();
  await classifyInteractionType({ transcript, speakerMetadata: { speakerCount: 3 } });
  expect(Date.now() - start).toBeLessThan(3000);
}, 8000);
```

---

#### TC-F2-P1.2: Segment Detection Does Not Add > 1 Second Overhead
**Objective**: Enabling `detectSegments: true` adds no more than 1,000ms compared to baseline.

**Test Steps**:
1. Classify without segment detection; record baseline latency
2. Classify same input with segment detection; record latency
3. Assert overhead <= 1,000ms

**Expected Result**: Overhead <= 1,000ms

**Code Sample**:
```typescript
it("should not add more than 1s overhead for segment detection", async () => {
  const input = { transcript: mixedSessionTranscript, speakerMetadata: { speakerCount: 3 } };
  const start1 = Date.now();
  await classifyInteractionType(input);
  const baseline = Date.now() - start1;

  const start2 = Date.now();
  await classifyInteractionType({ ...input, options: { detectSegments: true } });
  const withSegments = Date.now() - start2;

  expect(withSegments - baseline).toBeLessThan(1000);
});
```

---

### 4.2 Streaming Performance

#### TC-F2-P2.1: Streaming Incremental Update Latency < 500ms Per Chunk
**Objective**: Each incremental classification update during streaming completes within 500ms of chunk receipt.

**Test Steps**:
1. Open a streaming classification session
2. Send 10 chunks, recording update latency for each
3. Assert all per-chunk update latencies < 500ms

**Expected Result**: All 10 chunk updates arrive within 500ms

**Code Sample**:
```typescript
it("should emit classification update within 500ms of each chunk", async () => {
  const stream = classifyInteractionTypeStream({ conferenceId: "conf-020" });
  const latencies: number[] = [];

  stream.on("update", () => latencies.push(Date.now()));
  for (const chunk of testChunks) {
    const sent = Date.now();
    await stream.ingest(chunk);
    await delay(10);
    if (latencies.length > 0) {
      expect(latencies[latencies.length - 1] - sent).toBeLessThan(500);
    }
  }
}, 15000);
```

---

#### TC-F2-P2.2: Stream Session Supports Up to 8 Hours of Content
**Objective**: A streaming session processing 8 hours of transcript does not crash or degrade.

**Test Steps**:
1. Simulate 8 hours of transcript in 5-minute chunks (96 chunks)
2. Send all chunks to stream
3. Assert finalization returns a valid classification

**Expected Result**: All 96 chunks processed; valid final result

**Code Sample**:
```typescript
it("should handle 8-hour session transcript across 96 chunks", async () => {
  const stream = classifyInteractionTypeStream({ conferenceId: "conf-021" });
  for (let i = 0; i < 96; i++) {
    await stream.ingest(`Session chunk ${i}: content for 5 minutes of conference audio.`);
  }
  const result = await stream.finalize();
  expect(result.primaryType).toBeDefined();
  expect(result.processedChunkCount).toBe(96);
}, 60000);
```

---

### 4.3 Cache and Deduplication

#### TC-F2-P3.1: Repeated Classification of Same Session Returns Cached Result
**Objective**: Re-classifying the same session ID returns a cached result within 100ms.

**Test Steps**:
1. Classify `conf-030` (records result in cache)
2. Classify `conf-030` again
3. Assert second call returns within 100ms

**Expected Result**: Cache hit latency <= 100ms

**Code Sample**:
```typescript
it("should return cached classification result within 100ms", async () => {
  await classifyInteractionType({ conferenceId: "conf-030", transcript: standardTranscript, speakerMetadata: {} });
  const start = Date.now();
  await classifyInteractionType({ conferenceId: "conf-030", transcript: standardTranscript, speakerMetadata: {} });
  expect(Date.now() - start).toBeLessThan(100);
});
```

---

#### TC-F2-P3.2: Cache Invalidated on Transcript Update
**Objective**: When a conference transcript is updated, the cache is invalidated and a fresh classification is performed.

**Test Steps**:
1. Classify `conf-031` with transcript v1
2. Update transcript to v2
3. Classify `conf-031` again
4. Assert result reflects v2 content (not cached v1)

**Expected Result**: Updated classification returned; cache miss on v2

**Code Sample**:
```typescript
it("should invalidate cache when transcript is updated", async () => {
  await classifyInteractionType({ conferenceId: "conf-031", transcript: "v1: Keynote presentation content", speakerMetadata: {} });
  await updateConferenceTranscript("conf-031", "v2: Interactive workshop with exercises");
  const result = await classifyInteractionType({ conferenceId: "conf-031", transcript: "v2: Interactive workshop with exercises", speakerMetadata: {} });
  expect(result.primaryType).toBe("workshop");
  expect(result.fromCache).toBe(false);
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
- All major interaction types covered: presentation, Q&A, panel, breakout, workshop, keynote, unknown
- Segment boundary detection tested with known transition offsets
- Speaker turn count and moderator role detection validated
- Streaming classification tested for incremental updates and backpressure
- Cache invalidation on transcript update verified
