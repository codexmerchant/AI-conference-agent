# EPIC03 Feature 7 — Minimal Clarification Prompts — Test Cases

## Test Overview
Comprehensive test suite for Minimal Clarification Prompts covering unit tests, integration tests, edge cases, and performance validation. This feature generates the minimum necessary clarification question(s) when user intent or query context is ambiguous, ensuring the agent asks only what is truly needed to proceed — avoiding over-asking and preserving conversational flow.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Clarification Trigger Logic

#### TC-F7-U1.1: Ambiguous Intent Triggers One Clarification Question
**Objective**: A query with ambiguous intent results in exactly one concise clarification prompt being generated.

**Preconditions**:
- Clarification generator is connected to intent inference output
- Input query is flagged as `isAmbiguous: true` by intent inference

**Test Steps**:
1. Provide input: `{ query: "Get me the thing from yesterday", intentResult: { isAmbiguous: true, candidates: [...] } }`
2. Call `generateClarificationPrompt({ query, intentResult })`
3. Assert exactly one clarification question is returned
4. Assert the question is phrased naturally and ends with a `?`

**Expected Result**: `{ prompts: ["Did you mean the recording, the transcript, or the slides from yesterday?"] }`

**Code Sample**:
```typescript
import { generateClarificationPrompt } from "@/services/intelligence/clarificationPrompts";

describe("TC-F7-U1.1 Ambiguous Intent Triggers One Clarification", () => {
  it("should generate exactly one clarification question for ambiguous intent", async () => {
    const result = await generateClarificationPrompt({
      query: "Get me the thing from yesterday",
      intentResult: { isAmbiguous: true, primaryIntent: "action_request", candidates: [{ intent: "action_request", score: 0.48 }, { intent: "information_seeking", score: 0.45 }] },
    });
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]).toMatch(/\?$/);
  });
});
```

---

#### TC-F7-U1.2: High-Confidence Intent Does Not Trigger Clarification
**Objective**: When intent confidence >= 0.85, no clarification prompt is generated.

**Test Steps**:
1. Provide `intentResult: { isAmbiguous: false, primaryConfidence: 0.91 }`
2. Call `generateClarificationPrompt`
3. Assert `result.prompts` is empty or null

**Expected Result**: `{ prompts: [] }`

**Code Sample**:
```typescript
it("should return no clarification prompts for high-confidence intent", async () => {
  const result = await generateClarificationPrompt({
    query: "Schedule a demo for next Friday at 3 PM",
    intentResult: { isAmbiguous: false, primaryIntent: "action_request", primaryConfidence: 0.91 },
  });
  expect(result.prompts.length).toBe(0);
});
```

---

#### TC-F7-U1.3: Missing Required Parameter Triggers Targeted Clarification
**Objective**: When a required parameter is missing from an action-request query, the clarification prompt asks specifically for that parameter.

**Preconditions**:
- Query indicates a scheduling action but no date or time is provided

**Test Steps**:
1. Submit: `{ query: "Book a meeting room", intentResult: { primaryIntent: "action_request", missingParams: ["date", "time", "capacity"] } }`
2. Assert the clarification prompt asks about the missing parameters
3. Assert the prompt is not generic ("What do you mean?") but targeted

**Expected Result**: `{ prompts: ["When would you like the room and for how many people?"] }`

**Code Sample**:
```typescript
it("should generate targeted prompt for missing required action parameters", async () => {
  const result = await generateClarificationPrompt({
    query: "Book a meeting room",
    intentResult: { primaryIntent: "action_request", missingParams: ["date", "time", "capacity"] },
  });
  expect(result.prompts.length).toBe(1);
  // Should ask about specifics, not be a generic fallback
  expect(result.prompts[0].toLowerCase()).not.toBe("what do you mean?");
  expect(result.prompts[0]).toMatch(/when|date|time|how many|capacity/i);
});
```

---

### 1.2 Prompt Quality Validation

#### TC-F7-U2.1: Clarification Prompt Is Concise (< 20 Words)
**Objective**: Generated clarification prompts are concise and do not exceed 20 words.

**Test Steps**:
1. Generate a clarification prompt for an ambiguous query
2. Count words in the returned prompt
3. Assert word count <= 20

**Expected Result**: Prompt word count <= 20

**Code Sample**:
```typescript
it("should generate clarification prompts with no more than 20 words", async () => {
  const result = await generateClarificationPrompt({
    query: "Show me the data",
    intentResult: { isAmbiguous: true, candidates: [{ intent: "information_seeking" }, { intent: "visualization_request" }] },
  });
  const wordCount = result.prompts[0]?.split(/\s+/).length ?? 0;
  expect(wordCount).toBeLessThanOrEqual(20);
});
```

---

#### TC-F7-U2.2: Prompt Offers Concrete Options When Alternatives Are Known
**Objective**: When disambiguation alternatives are known, the prompt lists them (e.g., "Did you mean A, B, or C?").

**Test Steps**:
1. Provide known alternatives: `["the Q3 report", "the Q3 slides", "the Q3 recording"]`
2. Generate clarification prompt
3. Assert the prompt contains at least 2 of the 3 alternatives

**Expected Result**: Prompt lists concrete options for the user to choose from

**Code Sample**:
```typescript
it("should include known alternatives in clarification prompt", async () => {
  const result = await generateClarificationPrompt({
    query: "Send me the Q3 materials",
    intentResult: { isAmbiguous: true, alternatives: ["Q3 report", "Q3 slides", "Q3 recording"] },
  });
  const prompt = result.prompts[0] ?? "";
  const mentionedAlternatives = ["Q3 report", "Q3 slides", "Q3 recording"].filter((alt) => prompt.includes(alt));
  expect(mentionedAlternatives.length).toBeGreaterThanOrEqual(2);
});
```

---

#### TC-F7-U2.3: Prompt Avoids Repeating Information the User Already Provided
**Objective**: If the user already specified a date, the clarification prompt does not ask for the date again.

**Test Steps**:
1. Submit: "Schedule a meeting on Monday" (date is provided, time is missing)
2. Assert the clarification prompt does not mention "date" or "Monday"
3. Assert the prompt asks only for the missing information (time)

**Expected Result**: `{ prompts: ["What time works best for the Monday meeting?"] }`

**Code Sample**:
```typescript
it("should not ask for information the user already provided", async () => {
  const result = await generateClarificationPrompt({
    query: "Schedule a meeting on Monday",
    intentResult: { primaryIntent: "action_request", providedParams: ["date:Monday"], missingParams: ["time"] },
  });
  const prompt = result.prompts[0] ?? "";
  expect(prompt.toLowerCase()).not.toMatch(/what day|monday again|date/);
  expect(prompt.toLowerCase()).toMatch(/time|when.*monday/);
});
```

---

### 1.3 Minimum Prompts Enforcement

#### TC-F7-U3.1: System Generates At Most One Prompt Per Turn
**Objective**: Even when multiple ambiguities exist, the system generates at most 1 clarification prompt per conversational turn.

**Preconditions**:
- Multiple ambiguities: both intent and parameter are ambiguous

**Test Steps**:
1. Provide a query with both intent ambiguity and 3 missing parameters
2. Assert `result.prompts.length === 1`

**Expected Result**: Only 1 prompt generated regardless of ambiguity count

**Code Sample**:
```typescript
it("should generate at most one clarification prompt per turn", async () => {
  const result = await generateClarificationPrompt({
    query: "Do the thing",
    intentResult: { isAmbiguous: true, missingParams: ["action", "target", "date", "format"] },
  });
  expect(result.prompts.length).toBeLessThanOrEqual(1);
});
```

---

#### TC-F7-U3.2: Most Critical Ambiguity Is Prioritized
**Objective**: When multiple ambiguities exist, the most critical one (intent before parameters) is addressed first.

**Test Steps**:
1. Provide both intent ambiguity and missing parameter
2. Assert the generated prompt addresses intent disambiguation (not a parameter question)

**Expected Result**: Intent ambiguity resolved before parameter collection

**Code Sample**:
```typescript
it("should prioritize intent disambiguation over parameter collection", async () => {
  const result = await generateClarificationPrompt({
    query: "Process the submission",
    intentResult: {
      isAmbiguous: true,
      candidates: [{ intent: "action_request", score: 0.50 }, { intent: "information_seeking", score: 0.45 }],
      missingParams: ["date"],
    },
  });
  const prompt = result.prompts[0] ?? "";
  // Should address what action to take, not ask for a date
  expect(prompt.toLowerCase()).toMatch(/do you want|would you like|are you looking|approve|review|schedule/i);
});
```

---

#### TC-F7-U3.3: After Clarification Resolved, No Further Prompts Generated
**Objective**: Once a clarification is answered and intent is resolved, subsequent calls for the same query do not re-trigger prompts.

**Test Steps**:
1. Generate clarification prompt for ambiguous query
2. Provide user response that resolves the ambiguity
3. Call `generateClarificationPrompt` again with resolved intent
4. Assert `result.prompts.length === 0`

**Expected Result**: No further prompts after ambiguity is resolved

**Code Sample**:
```typescript
it("should not generate prompts once clarification has been resolved", async () => {
  // First call - ambiguous
  const firstResult = await generateClarificationPrompt({
    query: "Get the report",
    intentResult: { isAmbiguous: true },
  });
  expect(firstResult.prompts.length).toBe(1);

  // After user clarifies: "I meant the Q3 financial report"
  const secondResult = await generateClarificationPrompt({
    query: "Get the Q3 financial report",
    intentResult: { isAmbiguous: false, primaryIntent: "action_request", primaryConfidence: 0.92 },
  });
  expect(secondResult.prompts.length).toBe(0);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Clarification Prompts + Conversation Flow

#### TC-F7-I1.1: Clarification Prompt Injected into Conversation Response
**Objective**: The clarification prompt is correctly injected as the agent's next message in the conversation thread.

**Preconditions**:
- Conversation manager is wired to the clarification prompt generator

**Test Steps**:
1. Submit ambiguous user message to conversation manager
2. Assert the agent's response contains the clarification prompt text
3. Assert conversation state is `"awaiting_clarification"`

**Expected Result**: Agent response includes clarification prompt; state updated

**Code Sample**:
```typescript
it("should inject clarification prompt into conversation response", async () => {
  const response = await conversationManager.handleMessage({
    sessionId: "session-100",
    message: "Get me the thing from last Tuesday",
  });
  expect(response.text).toMatch(/\?$/);
  const state = await conversationManager.getState("session-100");
  expect(state).toBe("awaiting_clarification");
});
```

---

#### TC-F7-I1.2: User Clarification Response Resumes Normal Flow
**Objective**: After a clarification response is received, the conversation resumes with the original action.

**Test Steps**:
1. Trigger clarification (as in I1.1)
2. Submit user clarification: "I meant the meeting recording"
3. Assert conversation state returns to `"processing"`
4. Assert the action is executed with the clarified intent

**Expected Result**: Action executed correctly after clarification

**Code Sample**:
```typescript
it("should resume normal action flow after user provides clarification", async () => {
  await conversationManager.handleMessage({ sessionId: "session-101", message: "Get me the thing" });
  const resumeResponse = await conversationManager.handleMessage({
    sessionId: "session-101",
    message: "I meant the meeting recording from yesterday",
  });
  const state = await conversationManager.getState("session-101");
  expect(state).toBe("processing");
  expect(resumeResponse.actionTriggered).toBeDefined();
});
```

---

### 2.2 Clarification + Session Context

#### TC-F7-I2.1: Clarification History Stored in Session
**Objective**: Each clarification exchange (prompt + user response) is stored in the session context history.

**Test Steps**:
1. Trigger and resolve one clarification in session `"session-102"`
2. Retrieve session context
3. Assert `context.clarificationHistory` has one entry with `{ prompt, userResponse, resolvedIntent }`

**Expected Result**: Clarification history entry recorded in session

**Code Sample**:
```typescript
it("should store clarification exchange in session context history", async () => {
  await triggerAndResolveClarification("session-102", "Get the thing", "I mean the Q3 report");
  const ctx = await sessionContextStore.get("session-102");
  expect(ctx.clarificationHistory).toHaveLength(1);
  expect(ctx.clarificationHistory[0]).toMatchObject({
    prompt: expect.any(String),
    userResponse: "I mean the Q3 report",
    resolvedIntent: expect.any(String),
  });
});
```

---

#### TC-F7-I2.2: Past Clarification Prevents Re-Prompting for Same Ambiguity
**Objective**: If a similar ambiguity was resolved in the same session, the system uses the historical resolution and skips the clarification prompt.

**Test Steps**:
1. Resolve clarification: "Get the thing" → "meeting recording"
2. Submit similar query again: "Fetch the thing from Tuesday"
3. Assert no clarification prompt is generated (resolved using history)

**Expected Result**: No re-prompt; system uses historical resolution

**Code Sample**:
```typescript
it("should skip clarification for resolved ambiguity using session history", async () => {
  await triggerAndResolveClarification("session-103", "Get the thing", "the meeting recording");
  const result = await generateClarificationPromptWithContext({
    query: "Fetch the thing from Tuesday",
    sessionId: "session-103",
    intentResult: { isAmbiguous: true },
  });
  expect(result.prompts.length).toBe(0);
  expect(result.resolvedFromHistory).toBe(true);
});
```

---

### 2.3 Clarification + Multi-Modal Inputs

#### TC-F7-I3.1: Clarification Prompt Formatted Correctly for Chat UI
**Objective**: Clarification prompt includes structured suggestions/buttons when the channel supports rich UI.

**Test Steps**:
1. Generate clarification with `channel: "chat_ui"` and known alternatives
2. Assert result includes `suggestedReplies` array for quick-tap buttons

**Expected Result**: `{ prompts: [...], suggestedReplies: ["Meeting Recording", "Transcript", "Slides"] }`

**Code Sample**:
```typescript
it("should include suggested replies for chat UI channel", async () => {
  const result = await generateClarificationPrompt({
    query: "Get the materials",
    intentResult: { isAmbiguous: true, alternatives: ["Meeting Recording", "Transcript", "Slides"] },
    channel: "chat_ui",
  });
  expect(result.suggestedReplies).toBeDefined();
  expect(result.suggestedReplies!.length).toBeGreaterThanOrEqual(2);
});
```

---

#### TC-F7-I3.2: Plain Text Channel Returns No Rich Formatting
**Objective**: When channel is `"plain_text"`, no markdown or button structures are included.

**Test Steps**:
1. Generate clarification with `channel: "plain_text"`
2. Assert prompt contains no markdown formatting (no `**`, `[]()`, or `\n-`)

**Expected Result**: Plain text prompt with no markdown

**Code Sample**:
```typescript
it("should return plain text prompt without markdown for plain_text channel", async () => {
  const result = await generateClarificationPrompt({
    query: "Show me the data",
    intentResult: { isAmbiguous: true },
    channel: "plain_text",
  });
  const prompt = result.prompts[0] ?? "";
  expect(prompt).not.toMatch(/\*\*|\[.*\]\(.*\)|\n-/);
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Extreme Ambiguity

#### TC-F7-E1.1: Fully Unintelligible Query Produces Gentle Fallback Prompt
**Objective**: A completely unintelligible query ("asdfghj qwerty!") produces a gentle, open-ended clarification rather than a crash.

**Test Steps**:
1. Submit: `"asdfghj qwerty!"`
2. Assert `result.prompts.length === 1`
3. Assert the prompt is a gentle open-ended fallback (e.g., "Could you clarify what you're looking for?")

**Expected Result**: Single gentle fallback prompt returned

**Code Sample**:
```typescript
it("should return gentle fallback prompt for unintelligible input", async () => {
  const result = await generateClarificationPrompt({
    query: "asdfghj qwerty!",
    intentResult: { isAmbiguous: true, primaryConfidence: 0.05 },
  });
  expect(result.prompts.length).toBe(1);
  expect(result.prompts[0].length).toBeGreaterThan(5);
  expect(result.isFallback).toBe(true);
});
```

---

#### TC-F7-E1.2: All Intent Candidates Have Equal Score
**Objective**: When all intent candidates have equal confidence, the system generates a clarification that presents all options.

**Test Steps**:
1. Provide 3 candidates each with score 0.33
2. Assert the clarification prompt is generated and mentions multiple options

**Expected Result**: Clarification prompt generated listing options

**Code Sample**:
```typescript
it("should generate clarification listing all options when candidates are equally scored", async () => {
  const result = await generateClarificationPrompt({
    query: "Run it",
    intentResult: {
      isAmbiguous: true,
      candidates: [
        { intent: "action_request", score: 0.33 },
        { intent: "information_seeking", score: 0.33 },
        { intent: "follow_up", score: 0.33 },
      ],
    },
  });
  expect(result.prompts.length).toBe(1);
  expect(result.prompts[0]).toMatch(/\?/);
});
```

---

### 3.2 Clarification Loop Prevention

#### TC-F7-E2.1: Maximum Clarification Rounds Enforced
**Objective**: The system does not prompt for clarification more than `maxClarificationRounds` (default: 2) times for the same topic.

**Test Steps**:
1. Set `maxClarificationRounds: 2`
2. Trigger clarification twice without resolution
3. On third call, assert system falls back to best-effort interpretation (no prompt)

**Expected Result**: After 2 prompts, system proceeds with best-effort interpretation

**Code Sample**:
```typescript
it("should stop prompting after maxClarificationRounds and use best-effort interpretation", async () => {
  const sessionId = "session-loop-test";
  // Two rounds of unanswered clarification
  await generateClarificationPromptWithContext({ query: "Do the thing", sessionId, intentResult: { isAmbiguous: true } });
  await generateClarificationPromptWithContext({ query: "Do the thing", sessionId, intentResult: { isAmbiguous: true } });
  // Third attempt
  const thirdResult = await generateClarificationPromptWithContext({
    query: "Do the thing",
    sessionId,
    intentResult: { isAmbiguous: true },
    options: { maxClarificationRounds: 2 },
  });
  expect(thirdResult.prompts.length).toBe(0);
  expect(thirdResult.bestEffortInterpretation).toBeDefined();
});
```

---

#### TC-F7-E2.2: Empty User Clarification Response Handled Gracefully
**Objective**: If the user responds to a clarification with an empty string, the system re-prompts with a note.

**Test Steps**:
1. Trigger clarification
2. Submit empty user response `""`
3. Assert the system generates a gentle re-prompt rather than proceeding incorrectly

**Expected Result**: Re-prompt generated for empty clarification response

**Code Sample**:
```typescript
it("should re-prompt gently when user clarification response is empty", async () => {
  const result = await handleClarificationResponse({
    sessionId: "session-110",
    originalQuery: "Get the thing",
    clarificationResponse: "",
  });
  expect(result.requiresFurtherClarification).toBe(true);
  expect(result.rePrompt).toBeDefined();
  expect(result.rePrompt).toMatch(/\?/);
});
```

---

### 3.3 Contextual Edge Cases

#### TC-F7-E3.1: Query That References Prior Session Content Is Not Over-Prompted
**Objective**: A query like "Same as last time" that is resolvable from session history does not trigger a clarification prompt.

**Test Steps**:
1. Seed session history with a prior resolved action
2. Submit: "Same as last time please"
3. Assert no clarification prompt is generated

**Expected Result**: System resolves from history; no prompt generated

**Code Sample**:
```typescript
it("should resolve 'same as last time' from session history without prompting", async () => {
  await seedSessionHistory("session-120", { action: "schedule_meeting", params: { day: "Friday", time: "3 PM" } });
  const result = await generateClarificationPromptWithContext({
    query: "Same as last time please",
    sessionId: "session-120",
    intentResult: { isAmbiguous: false, resolvedFromHistory: true },
  });
  expect(result.prompts.length).toBe(0);
});
```

---

#### TC-F7-E3.2: Domain-Specific Jargon Does Not Trigger False Clarification
**Objective**: Technical jargon that is unambiguous in context ("LGTM", "PR", "CI/CD") does not trigger a clarification prompt.

**Test Steps**:
1. Submit: "Mark the PR as LGTM and merge after CI/CD passes"
2. In context `domain: "software_engineering"`
3. Assert no clarification prompt is generated

**Expected Result**: No prompt; jargon correctly resolved in domain context

**Code Sample**:
```typescript
it("should not prompt for clarification on unambiguous domain-specific jargon", async () => {
  const result = await generateClarificationPrompt({
    query: "Mark the PR as LGTM and merge after CI/CD passes",
    intentResult: { isAmbiguous: false, primaryIntent: "action_request", primaryConfidence: 0.89 },
    context: { domain: "software_engineering" },
  });
  expect(result.prompts.length).toBe(0);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Prompt Generation Latency

#### TC-F7-P1.1: Clarification Prompt Generated in < 1 Second
**Objective**: A clarification prompt is generated within 1 second of receiving the ambiguous intent result.

**Test Steps**:
1. Prepare an ambiguous intent result
2. Time `generateClarificationPrompt` call
3. Assert elapsed < 1,000ms

**Expected Result**: Latency <= 1,000ms

**Code Sample**:
```typescript
it("should generate clarification prompt in under 1 second", async () => {
  const start = Date.now();
  await generateClarificationPrompt({
    query: "Show me the stuff",
    intentResult: { isAmbiguous: true, candidates: [{ intent: "information_seeking", score: 0.50 }, { intent: "action_request", score: 0.45 }] },
  });
  expect(Date.now() - start).toBeLessThan(1000);
}, 3000);
```

---

#### TC-F7-P1.2: History-Based Resolution Faster Than New Generation (< 100ms)
**Objective**: Resolving clarification from session history completes in under 100ms.

**Test Steps**:
1. Seed session with resolved clarification
2. Time history-based resolution call
3. Assert elapsed < 100ms

**Expected Result**: History resolution latency <= 100ms

**Code Sample**:
```typescript
it("should resolve clarification from history in under 100ms", async () => {
  await seedSessionHistory("session-perf-1", { resolvedClarification: { ambiguity: "thing", resolution: "Q3 report" } });
  const start = Date.now();
  await generateClarificationPromptWithContext({
    query: "Get me the thing again",
    sessionId: "session-perf-1",
    intentResult: { isAmbiguous: true },
  });
  expect(Date.now() - start).toBeLessThan(100);
});
```

---

### 4.2 Throughput

#### TC-F7-P2.1: 50 Concurrent Clarification Generations < 10 Seconds
**Objective**: 50 simultaneous clarification generation calls complete within 10 seconds.

**Test Steps**:
1. Prepare 50 unique ambiguous inputs
2. Fire all 50 concurrently
3. Assert all resolve within 10 seconds total

**Expected Result**: 50 prompts generated in <= 10 seconds

**Code Sample**:
```typescript
it("should handle 50 concurrent clarification generations within 10 seconds", async () => {
  const inputs = Array.from({ length: 50 }, (_, i) => ({
    query: `Get me thing number ${i}`,
    intentResult: { isAmbiguous: true, candidates: [{ intent: "action_request", score: 0.50 }] },
  }));
  const start = Date.now();
  const results = await Promise.all(inputs.map((input) => generateClarificationPrompt(input)));
  expect(Date.now() - start).toBeLessThan(10000);
  results.forEach((r) => expect(r.prompts.length).toBeGreaterThanOrEqual(0));
}, 15000);
```

---

#### TC-F7-P2.2: Prompt Cache Hit Rate >= 30% Under Repeated Similar Queries
**Objective**: Under repeated similar ambiguous queries, the cache hit rate for pre-computed clarification templates is >= 30%.

**Test Steps**:
1. Submit 100 queries with similar ambiguity patterns
2. Check cache statistics
3. Assert `cacheHitRate >= 0.30`

**Expected Result**: >= 30% cache hit rate

**Code Sample**:
```typescript
it("should achieve >= 30% cache hit rate for similar ambiguous queries", async () => {
  const patterns = ["Get me the X", "Fetch the X", "Show me the X", "Retrieve the X"];
  for (let i = 0; i < 100; i++) {
    await generateClarificationPrompt({
      query: patterns[i % patterns.length].replace("X", `item ${Math.floor(i / patterns.length)}`),
      intentResult: { isAmbiguous: true },
    });
  }
  const stats = await getClarificationCacheStats();
  expect(stats.hitRate).toBeGreaterThanOrEqual(0.30);
});
```

---

### 4.3 Quality Metrics

#### TC-F7-P3.1: Prompts Average < 15 Words Across 100 Samples
**Objective**: The average word count of generated clarification prompts across 100 samples is below 15 words.

**Test Steps**:
1. Generate 100 clarification prompts for diverse ambiguous inputs
2. Compute average word count
3. Assert average < 15

**Expected Result**: Average word count < 15

**Code Sample**:
```typescript
it("should generate concise prompts averaging fewer than 15 words across 100 samples", async () => {
  const inputs = Array.from({ length: 100 }, (_, i) => ({
    query: `Ambiguous query number ${i}`,
    intentResult: { isAmbiguous: true },
  }));
  const results = await Promise.all(inputs.map((i) => generateClarificationPrompt(i)));
  const wordCounts = results.flatMap((r) => r.prompts.map((p) => p.split(/\s+/).length));
  const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  expect(avg).toBeLessThan(15);
}, 30000);
```

---

#### TC-F7-P3.2: 0% Error Rate Over 500 Clarification Calls
**Objective**: Zero errors or exceptions across 500 sequential clarification generation calls.

**Test Steps**:
1. Send 500 sequential calls with varied inputs (valid, edge case, minimal)
2. Assert all return without `result.error` being defined

**Expected Result**: 0 errors across 500 calls

**Code Sample**:
```typescript
it("should produce zero errors over 500 sequential clarification calls", async () => {
  const inputs = Array.from({ length: 500 }, (_, i) => ({
    query: i % 10 === 0 ? "" : `Query number ${i} with some ambiguity`,
    intentResult: { isAmbiguous: i % 3 !== 0, primaryConfidence: 0.40 + (i % 5) * 0.10 },
  }));
  let errorCount = 0;
  for (const input of inputs) {
    const result = await generateClarificationPrompt(input);
    if (result.error) errorCount++;
  }
  expect(errorCount).toBe(0);
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
- Trigger logic validated: high-confidence suppresses prompts; ambiguity and missing params trigger prompts
- Prompt quality tested: conciseness (< 20 words), concrete options, no redundant questions
- Minimum-prompt enforcement: at-most-one-per-turn, priority ordering, post-resolution suppression
- Integration verified with conversation flow, session context history, channel-specific formatting
- Edge cases cover unintelligible input, equal-score candidates, clarification loop prevention, and domain jargon
- Performance covers generation latency, history resolution speed, throughput, cache hit rate, and error rate
