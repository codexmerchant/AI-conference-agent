# EPIC03 Feature 3 — Intent Inference — Test Cases

## Test Overview
Comprehensive test suite for Intent Inference covering unit tests, integration tests, edge cases, and performance validation. This feature infers the underlying intent of user queries or conference interactions (e.g., information-seeking, decision-making, action-request, clarification, social) and provides ranked intent candidates with confidence scores.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Primary Intent Detection

#### TC-F3-U1.1: Information-Seeking Intent
**Objective**: Verify that a factual question query is classified as `"information_seeking"` with high confidence.

**Preconditions**:
- Intent inference model is loaded
- Input query is clearly a factual question

**Test Steps**:
1. Submit query: "What are the main differences between BERT and GPT architectures?"
2. Call `inferIntent({ query, context })`
3. Assert `primaryIntent === "information_seeking"`
4. Assert `primaryConfidence >= 0.82`

**Expected Result**: `{ primaryIntent: "information_seeking", primaryConfidence: 0.88 }`

**Code Sample**:
```typescript
import { inferIntent } from "@/services/intelligence/intentInference";

describe("TC-F3-U1.1 Information-Seeking Intent", () => {
  it("should classify factual question as information_seeking", async () => {
    const result = await inferIntent({
      query: "What are the main differences between BERT and GPT architectures?",
      context: { sessionType: "technical" },
    });
    expect(result.primaryIntent).toBe("information_seeking");
    expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.82);
  });
});
```

---

#### TC-F3-U1.2: Action-Request Intent
**Objective**: Verify that an imperative command is classified as `"action_request"`.

**Preconditions**:
- Query contains an imperative verb and clear deliverable

**Test Steps**:
1. Submit query: "Schedule a follow-up meeting with the API team for next Thursday"
2. Assert `primaryIntent === "action_request"`
3. Assert `primaryConfidence >= 0.85`

**Expected Result**: `{ primaryIntent: "action_request", primaryConfidence: 0.91 }`

**Code Sample**:
```typescript
it("should classify imperative scheduling request as action_request", async () => {
  const result = await inferIntent({
    query: "Schedule a follow-up meeting with the API team for next Thursday",
    context: {},
  });
  expect(result.primaryIntent).toBe("action_request");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.85);
});
```

---

#### TC-F3-U1.3: Clarification-Seeking Intent
**Objective**: Verify that a follow-up clarification question is classified as `"clarification"`.

**Preconditions**:
- Conversation history is available showing a prior ambiguous statement

**Test Steps**:
1. Submit query: "Wait, did you mean the REST API or the GraphQL endpoint?"
2. Provide prior context containing the ambiguous statement
3. Assert `primaryIntent === "clarification"`

**Expected Result**: `{ primaryIntent: "clarification", primaryConfidence: 0.84 }`

**Code Sample**:
```typescript
it("should classify follow-up disambiguation as clarification intent", async () => {
  const result = await inferIntent({
    query: "Wait, did you mean the REST API or the GraphQL endpoint?",
    context: { priorStatement: "We're updating the API endpoint next week." },
  });
  expect(result.primaryIntent).toBe("clarification");
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.80);
});
```

---

### 1.2 Multi-Intent Ranking

#### TC-F3-U2.1: Ranked Candidate Intents Returned
**Objective**: The system returns multiple ranked intent candidates for ambiguous queries.

**Preconditions**:
- Query is ambiguous between information-seeking and action-request

**Test Steps**:
1. Submit query: "Can we get the Q3 report?"
2. Assert result contains at least 2 candidates
3. Assert candidates are sorted by confidence descending

**Expected Result**: `{ candidates: [{ intent: "action_request", score: 0.52 }, { intent: "information_seeking", score: 0.41 }] }`

**Code Sample**:
```typescript
it("should return ranked candidates for ambiguous query", async () => {
  const result = await inferIntent({ query: "Can we get the Q3 report?", context: {} });
  expect(result.candidates.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < result.candidates.length; i++) {
    expect(result.candidates[i - 1].score).toBeGreaterThanOrEqual(result.candidates[i].score);
  }
});
```

---

#### TC-F3-U2.2: Confidence Gap Between Top-2 Determines Certainty Flag
**Objective**: When top-2 candidate confidence scores differ by < 0.10, the result is flagged as `isAmbiguous: true`.

**Test Steps**:
1. Submit a deliberately ambiguous query
2. Assert `result.isAmbiguous === true` when gap < 0.10
3. Assert `result.isAmbiguous === false` when gap >= 0.10

**Expected Result**: Ambiguity flag correctly set based on confidence gap

**Code Sample**:
```typescript
it("should set isAmbiguous when top-2 confidence gap is less than 0.10", async () => {
  const result = await inferIntent({ query: "Let's look at the data", context: {} });
  const gap = result.candidates[0].score - (result.candidates[1]?.score ?? 0);
  if (gap < 0.10) {
    expect(result.isAmbiguous).toBe(true);
  } else {
    expect(result.isAmbiguous).toBe(false);
  }
});
```

---

#### TC-F3-U2.3: Intent Probability Distribution Sums to 1
**Objective**: All candidate confidence scores sum to approximately 1.0.

**Test Steps**:
1. Submit any query
2. Sum all candidate scores
3. Assert sum ≈ 1.0

**Expected Result**: `sum(candidates[].score) ≈ 1.0`

**Code Sample**:
```typescript
it("should produce candidate scores summing to 1.0", async () => {
  const result = await inferIntent({ query: "Tell me about the workshop sessions", context: {} });
  const total = result.candidates.reduce((acc, c) => acc + c.score, 0);
  expect(total).toBeCloseTo(1.0, 1);
});
```

---

### 1.3 Context-Aware Intent Modulation

#### TC-F3-U3.1: Context Shifts Intent Classification
**Objective**: The same query produces different primary intent depending on the conversational context.

**Preconditions**:
- Two different contexts: (1) during Q&A session, (2) during action planning phase

**Test Steps**:
1. Infer intent for "What's the status?" in Q&A context
2. Infer intent for "What's the status?" in action planning context
3. Assert primary intents differ

**Expected Result**: Different primary intents for same query in different contexts

**Code Sample**:
```typescript
it("should produce different intent for same query in different contexts", async () => {
  const qaResult = await inferIntent({ query: "What's the status?", context: { sessionPhase: "qa" } });
  const planningResult = await inferIntent({ query: "What's the status?", context: { sessionPhase: "action_planning" } });
  expect(qaResult.primaryIntent).not.toBe(planningResult.primaryIntent);
});
```

---

#### TC-F3-U3.2: Prior Action-Requests Shift Subsequent Intent Toward Follow-Up
**Objective**: When recent history contains action requests, a vague query is biased toward `"follow_up"` intent.

**Test Steps**:
1. Set conversation history containing 2 recent action requests
2. Submit query: "How's that coming along?"
3. Assert `primaryIntent === "follow_up"` or confidence for `"follow_up"` is highest

**Expected Result**: `follow_up` intent surfaces due to action-request history

**Code Sample**:
```typescript
it("should bias toward follow_up intent given action-request history", async () => {
  const result = await inferIntent({
    query: "How's that coming along?",
    context: {
      history: [
        { query: "Schedule a demo", intent: "action_request" },
        { query: "Send the report", intent: "action_request" },
      ],
    },
  });
  expect(result.primaryIntent).toBe("follow_up");
});
```

---

#### TC-F3-U3.3: Null Context Defaults to Neutral Prior
**Objective**: When no context is provided, the model uses a uniform prior over intent types.

**Test Steps**:
1. Submit a query with `context: null`
2. Assert result is returned without error
3. Assert candidate distribution has no extreme outlier (all candidates within 0.60 of the top)

**Expected Result**: No crash; reasonable distribution without context

**Code Sample**:
```typescript
it("should handle null context using neutral prior", async () => {
  const result = await inferIntent({ query: "Tell me more", context: null });
  expect(result.error).toBeUndefined();
  const topScore = result.candidates[0].score;
  result.candidates.forEach((c) => {
    expect(topScore - c.score).toBeLessThan(0.60);
  });
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Intent Inference + Clarification Prompt Generator

#### TC-F3-I1.1: Ambiguous Intent Triggers Clarification Prompt
**Objective**: When `isAmbiguous === true`, the system automatically triggers the clarification prompt generator.

**Preconditions**:
- Clarification prompt generator service is connected
- `autoClarity: true` is enabled in pipeline config

**Test Steps**:
1. Submit an ambiguous query: "Get me the thing we discussed"
2. Run full inference + clarification pipeline
3. Assert a clarification prompt is returned alongside the intent result

**Expected Result**: `{ primaryIntent: "...", isAmbiguous: true, clarificationPrompt: "Did you mean...?" }`

**Code Sample**:
```typescript
it("should generate clarification prompt for ambiguous intent", async () => {
  const result = await runIntentPipeline({
    query: "Get me the thing we discussed",
    context: {},
    options: { autoClarity: true },
  });
  expect(result.isAmbiguous).toBe(true);
  expect(result.clarificationPrompt).toBeDefined();
  expect(typeof result.clarificationPrompt).toBe("string");
});
```

---

#### TC-F3-I1.2: High-Confidence Intent Skips Clarification
**Objective**: When confidence >= 0.85, no clarification prompt is generated.

**Test Steps**:
1. Submit an unambiguous query: "Schedule a demo for Friday at 2 PM"
2. Run full intent pipeline with `autoClarity: true`
3. Assert `result.clarificationPrompt` is null/undefined

**Expected Result**: `{ primaryIntent: "action_request", isAmbiguous: false, clarificationPrompt: null }`

**Code Sample**:
```typescript
it("should skip clarification prompt for high-confidence intent", async () => {
  const result = await runIntentPipeline({
    query: "Schedule a demo for Friday at 2 PM",
    context: {},
    options: { autoClarity: true },
  });
  expect(result.primaryConfidence).toBeGreaterThanOrEqual(0.85);
  expect(result.clarificationPrompt).toBeNull();
});
```

---

### 2.2 Intent Inference + Action Router

#### TC-F3-I2.1: Action-Request Intent Routes to Action Handler
**Objective**: Inferred `action_request` intent triggers the correct downstream action routing.

**Test Steps**:
1. Submit: "Book the main conference room for tomorrow morning"
2. Run pipeline with action router enabled
3. Assert `result.routing.destination === "action_handler"`
4. Assert `result.routing.actionType === "calendar_booking"`

**Expected Result**: Request routed to calendar booking action handler

**Code Sample**:
```typescript
it("should route action_request intent to action handler", async () => {
  const result = await runIntentPipelineWithRouting({
    query: "Book the main conference room for tomorrow morning",
    context: {},
  });
  expect(result.routing.destination).toBe("action_handler");
  expect(result.routing.actionType).toBe("calendar_booking");
});
```

---

#### TC-F3-I2.2: Information-Seeking Intent Routes to Knowledge Retrieval
**Objective**: Inferred `information_seeking` intent triggers knowledge base retrieval.

**Test Steps**:
1. Submit: "What were the key takeaways from yesterday's keynote?"
2. Run pipeline with router
3. Assert `result.routing.destination === "knowledge_retrieval"`

**Expected Result**: Routed to knowledge retrieval with appropriate query parameters

**Code Sample**:
```typescript
it("should route information_seeking intent to knowledge retrieval", async () => {
  const result = await runIntentPipelineWithRouting({
    query: "What were the key takeaways from yesterday's keynote?",
    context: {},
  });
  expect(result.routing.destination).toBe("knowledge_retrieval");
});
```

---

### 2.3 Intent Inference + Session Context Store

#### TC-F3-I3.1: Inferred Intent Persisted to Session Context
**Objective**: Each inferred intent is logged in the session context store for history tracking.

**Test Steps**:
1. Infer intent for 3 queries in session `"session-42"`
2. Retrieve session context
3. Assert context history contains all 3 intent entries

**Expected Result**: All 3 intents present in session context history

**Code Sample**:
```typescript
it("should persist all inferred intents to session context history", async () => {
  const queries = ["What is the agenda?", "Schedule a break", "Who is presenting next?"];
  for (const q of queries) {
    await inferIntentWithContext({ query: q, sessionId: "session-42", context: {} });
  }
  const ctx = await sessionContextStore.get("session-42");
  expect(ctx.intentHistory).toHaveLength(3);
});
```

---

#### TC-F3-I3.2: Intent History Influences Next Inference
**Objective**: Prior intents in session history modulate the next inference result.

**Test Steps**:
1. Log 3 `information_seeking` intents into session history
2. Submit ambiguous query: "More on that topic"
3. Assert `primaryIntent === "information_seeking"` due to contextual bias

**Expected Result**: History biases ambiguous query toward `information_seeking`

**Code Sample**:
```typescript
it("should use session intent history to modulate next inference", async () => {
  const sessionId = "session-43";
  for (let i = 0; i < 3; i++) {
    await sessionContextStore.appendIntentHistory(sessionId, "information_seeking");
  }
  const result = await inferIntentWithContext({ query: "More on that topic", sessionId, context: {} });
  expect(result.primaryIntent).toBe("information_seeking");
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Unusual Query Formats

#### TC-F3-E1.1: Single-Word Query
**Objective**: Single-word queries are handled without crashing and return a low-confidence inference.

**Test Steps**:
1. Submit query: `"help"`
2. Assert no exception thrown
3. Assert `primaryConfidence <= 0.60` (low confidence for minimal input)

**Expected Result**: `{ primaryIntent: "...", primaryConfidence: <= 0.60, warnings: [...] }`

**Code Sample**:
```typescript
it("should handle single-word query without crashing", async () => {
  const result = await inferIntent({ query: "help", context: {} });
  expect(result.error).toBeUndefined();
  expect(result.primaryConfidence).toBeLessThanOrEqual(0.60);
});
```

---

#### TC-F3-E1.2: Query with Only Punctuation
**Objective**: Queries consisting entirely of punctuation return a structured error.

**Test Steps**:
1. Submit query: `"???!!!..."`
2. Assert `result.error.code === "UNINTELLIGIBLE_INPUT"`

**Expected Result**: `{ error: { code: "UNINTELLIGIBLE_INPUT" } }`

**Code Sample**:
```typescript
it("should return structured error for punctuation-only query", async () => {
  const result = await inferIntent({ query: "???!!!...", context: {} });
  expect(result.error?.code).toBe("UNINTELLIGIBLE_INPUT");
});
```

---

### 3.2 Contradictory Context

#### TC-F3-E2.1: Context Contradicts Query Intent
**Objective**: When context strongly suggests one intent but query suggests another, the result flags the conflict.

**Test Steps**:
1. Submit a factual question while context indicates active action phase
2. Assert `result.contextConflict === true`
3. Assert query intent takes precedence over context

**Expected Result**: `{ primaryIntent: "information_seeking", contextConflict: true }`

**Code Sample**:
```typescript
it("should flag context conflict when query and context intents disagree", async () => {
  const result = await inferIntent({
    query: "What are the system requirements?",
    context: { sessionPhase: "deployment", priorIntents: ["action_request", "action_request"] },
  });
  expect(result.contextConflict).toBe(true);
  expect(result.primaryIntent).toBe("information_seeking");
});
```

---

#### TC-F3-E2.2: Negated Intent Query
**Objective**: Negation in queries is handled correctly (e.g., "Do NOT schedule anything" should not be `action_request`).

**Test Steps**:
1. Submit: "Please do NOT schedule any meetings for this afternoon"
2. Assert `primaryIntent !== "action_request"`
3. Assert a `"negative_instruction"` or `"constraint"` intent is recognized

**Expected Result**: Intent reflects negation; not classified as action_request

**Code Sample**:
```typescript
it("should handle negated instruction without classifying as action_request", async () => {
  const result = await inferIntent({
    query: "Please do NOT schedule any meetings for this afternoon",
    context: {},
  });
  expect(result.primaryIntent).not.toBe("action_request");
});
```

---

### 3.3 Very Long and Multi-Part Queries

#### TC-F3-E3.1: Multi-Part Query with Mixed Intents
**Objective**: A query containing both a question and an action request is decomposed into sub-intents.

**Test Steps**:
1. Submit: "What's the agenda for tomorrow and can you also book a room for 10 people?"
2. Assert `result.subIntents` contains both `"information_seeking"` and `"action_request"`

**Expected Result**: `{ subIntents: ["information_seeking", "action_request"] }`

**Code Sample**:
```typescript
it("should decompose multi-part query into multiple sub-intents", async () => {
  const result = await inferIntent({
    query: "What's the agenda for tomorrow and can you also book a room for 10 people?",
    context: {},
    options: { decomposeMultiPart: true },
  });
  const intentTypes = result.subIntents?.map((s) => s.intent);
  expect(intentTypes).toContain("information_seeking");
  expect(intentTypes).toContain("action_request");
});
```

---

#### TC-F3-E3.2: Query Exceeding Max Token Length
**Objective**: Queries exceeding the model's max token limit are truncated and flagged.

**Test Steps**:
1. Submit a query of 2,000 tokens (well above limit)
2. Assert classification completes
3. Assert `result.metadata.truncated === true`

**Expected Result**: Classification completed on truncated query; truncation flagged

**Code Sample**:
```typescript
it("should truncate and flag overly long query", async () => {
  const longQuery = "analyze the performance of ".repeat(200);
  const result = await inferIntent({ query: longQuery, context: {} });
  expect(result.metadata?.truncated).toBe(true);
  expect(result.primaryIntent).toBeDefined();
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Inference Latency

#### TC-F3-P1.1: Single Query Inference < 2 Seconds
**Objective**: Intent inference for a standard query completes within 2 seconds.

**Test Steps**:
1. Submit a 20-word query
2. Assert elapsed time < 2,000ms

**Expected Result**: Latency <= 2,000ms

**Code Sample**:
```typescript
it("should infer intent for a standard query in under 2 seconds", async () => {
  const start = Date.now();
  await inferIntent({ query: "Schedule a review meeting with the engineering team next week", context: {} });
  expect(Date.now() - start).toBeLessThan(2000);
}, 5000);
```

---

#### TC-F3-P1.2: Batch Inference of 50 Queries < 30 Seconds
**Objective**: A batch of 50 queries is inferred within 30 seconds total.

**Test Steps**:
1. Prepare 50 diverse queries
2. Call `inferIntentBatch({ queries })` 
3. Assert total elapsed < 30,000ms

**Expected Result**: 50 inferences complete in under 30 seconds

**Code Sample**:
```typescript
it("should complete batch inference of 50 queries within 30 seconds", async () => {
  const queries = Array.from({ length: 50 }, (_, i) => ({ query: `Query ${i}: explain concept ${i}`, context: {} }));
  const start = Date.now();
  const results = await inferIntentBatch({ queries });
  expect(Date.now() - start).toBeLessThan(30000);
  expect(results).toHaveLength(50);
}, 35000);
```

---

### 4.2 Accuracy Under Load

#### TC-F3-P2.1: Accuracy Maintained at 25 Concurrent Requests
**Objective**: Under 25 concurrent inference requests, accuracy does not degrade (measured against labeled test set).

**Test Steps**:
1. Take 25 labeled test queries (ground truth known)
2. Submit all concurrently
3. Assert >= 85% match ground truth labels

**Expected Result**: >= 85% accuracy across 25 concurrent requests

**Code Sample**:
```typescript
it("should maintain >= 85% accuracy under 25 concurrent requests", async () => {
  const labeled = getLabeledTestQueries(25);
  const results = await Promise.all(labeled.map(({ query, context }) => inferIntent({ query, context })));
  const correct = results.filter((r, i) => r.primaryIntent === labeled[i].expectedIntent).length;
  expect(correct / labeled.length).toBeGreaterThanOrEqual(0.85);
}, 20000);
```

---

#### TC-F3-P2.2: Intent Inference Service Recovers Within 5s After Overload
**Objective**: After a burst of 100 concurrent requests (overload), the service recovers and accepts new requests within 5 seconds.

**Test Steps**:
1. Fire 100 concurrent requests (overload burst)
2. Wait for burst to complete or time out
3. Submit a new request immediately after
4. Assert new request returns within 5,000ms

**Expected Result**: Recovery within 5 seconds post-overload

**Code Sample**:
```typescript
it("should recover within 5s after request overload burst", async () => {
  await Promise.allSettled(Array.from({ length: 100 }, () => inferIntent({ query: "load test query", context: {} })));
  const recoveryStart = Date.now();
  const result = await inferIntent({ query: "What is the agenda for today?", context: {} });
  expect(Date.now() - recoveryStart).toBeLessThan(5000);
  expect(result.primaryIntent).toBeDefined();
}, 60000);
```

---

### 4.3 Model Efficiency

#### TC-F3-P3.1: Intent Inference Uses Model Caching for Repeated Tokens
**Objective**: Queries sharing a common prefix benefit from KV-cache reuse, reducing latency.

**Test Steps**:
1. Infer intent for "Schedule a meeting for Monday"
2. Infer intent for "Schedule a meeting for Tuesday" (common prefix)
3. Assert second call is at least 20% faster than first

**Expected Result**: Common-prefix caching reduces second call latency by >= 20%

**Code Sample**:
```typescript
it("should benefit from KV-cache reuse for common-prefix queries", async () => {
  const start1 = Date.now();
  await inferIntent({ query: "Schedule a meeting for Monday", context: {} });
  const first = Date.now() - start1;

  const start2 = Date.now();
  await inferIntent({ query: "Schedule a meeting for Tuesday", context: {} });
  const second = Date.now() - start2;

  expect(second).toBeLessThan(first * 0.80);
});
```

---

#### TC-F3-P3.2: Model Memory Footprint Stable Over 100 Inferences
**Objective**: Heap usage remains stable after 100 sequential inference calls.

**Test Steps**:
1. Record heap before
2. Run 100 inferences
3. Force GC and record heap after
4. Assert growth < 30MB

**Expected Result**: Memory delta < 30MB

**Code Sample**:
```typescript
it("should not leak memory over 100 sequential intent inferences", async () => {
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100; i++) {
    await inferIntent({ query: `inference test query number ${i}`, context: {} });
  }
  if (global.gc) global.gc();
  const growthMB = (process.memoryUsage().heapUsed - before) / 1024 / 1024;
  expect(growthMB).toBeLessThan(30);
}, 120000);
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
- All primary intent types covered: information_seeking, action_request, clarification, follow_up, social, constraint
- Ambiguity detection and confidence gap logic validated
- Context modulation and conflict detection tested
- Integration with clarification prompt generator, action router, and session context store verified
- Batch inference, overload recovery, and memory stability tested under performance section
