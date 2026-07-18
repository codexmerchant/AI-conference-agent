# EPIC05 Feature 5 — Session Summarization — Test Cases

## Test Overview
Comprehensive test suite for Session Summarization covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Summary Generation and Length Constraints

#### TC-F5-U1.1: Short Summary Stays Within Word Count Limit
**Objective**: Verify the summarizer produces a `SHORT` summary within the 150-word limit.

**Preconditions**:
- Summarization LLM service available
- 1-hour session transcript loaded

**Test Steps**:
1. Call `generateSummary(transcript, { mode: 'SHORT' })`
2. Count words in returned `summary.text`
3. Assert word count <= 150

**Expected Result**: Summary text <= 150 words; key session topic present in text.

**Code Sample**:
```typescript
describe('SessionSummarizer', () => {
  it('should generate a SHORT summary within the 150-word limit', async () => {
    const summarizer = new SessionSummarizer(mockLlmService);
    const result = await summarizer.generateSummary(oneHourTranscript, { mode: 'SHORT' });

    const wordCount = result.text.split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(150);
    expect(result.mode).toBe('SHORT');
  });
});
```

---

#### TC-F5-U1.2: Detailed Summary Covers All Major Topics
**Objective**: Verify the `DETAILED` summary includes coverage of each major topic identified in the session.

**Test Steps**:
1. Use a transcript with 4 known topic segments: Security, Compliance, Cost, Roadmap
2. Call `generateSummary(transcript, { mode: 'DETAILED' })`
3. Assert all 4 topic names appear in the summary text

**Expected Result**: All 4 topics referenced; word count between 300–800.

**Code Sample**:
```typescript
it('should include all major topics in a DETAILED summary', async () => {
  const result = await summarizer.generateSummary(fourTopicTranscript, { mode: 'DETAILED' });
  const lower = result.text.toLowerCase();

  ['security', 'compliance', 'cost', 'roadmap'].forEach(topic => {
    expect(lower).toContain(topic);
  });

  const wordCount = result.text.split(/\s+/).length;
  expect(wordCount).toBeGreaterThanOrEqual(300);
  expect(wordCount).toBeLessThanOrEqual(800);
});
```

---

#### TC-F5-U1.3: Bullet-Point Summary Produces Structured List
**Objective**: Verify the `BULLETS` mode returns an array of bullet points rather than prose.

**Test Steps**:
1. Call `generateSummary(transcript, { mode: 'BULLETS' })`
2. Assert `result.bullets` is an array with 5–10 entries
3. Assert `result.text` is null or empty (bullets only)

**Expected Result**: `bullets` array with 5–10 non-empty strings; no prose block.

**Code Sample**:
```typescript
it('should produce a bullet-point array in BULLETS mode', async () => {
  const result = await summarizer.generateSummary(transcript, { mode: 'BULLETS' });

  expect(Array.isArray(result.bullets)).toBe(true);
  expect(result.bullets.length).toBeGreaterThanOrEqual(5);
  expect(result.bullets.length).toBeLessThanOrEqual(10);
  result.bullets.forEach(b => expect(b.trim().length).toBeGreaterThan(0));
});
```

---

### 1.2 Key Point Coverage

#### TC-F5-U2.1: Action Items Extracted and Listed Separately
**Objective**: Verify the summarizer identifies action items from the transcript and returns them in a separate `actionItems` field.

**Test Steps**:
1. Provide a transcript containing "We need to", "Team will", "Follow up on" phrases
2. Call `generateSummary(transcript, { extractActionItems: true })`
3. Assert `result.actionItems` is an array with at least 1 entry

**Expected Result**: At least one action item extracted; each item has `text` and optional `assignee`.

**Code Sample**:
```typescript
describe('ActionItemExtractor', () => {
  it('should extract action items from summarized transcript', async () => {
    const result = await summarizer.generateSummary(actionItemTranscript, { extractActionItems: true });

    expect(result.actionItems).toBeDefined();
    expect(result.actionItems!.length).toBeGreaterThanOrEqual(1);
    result.actionItems!.forEach(item => expect(item.text).toBeDefined());
  });
});
```

---

#### TC-F5-U2.2: Decisions Made During Session Captured in Summary
**Objective**: Verify "decided to" / "agreed that" / "confirmed that" utterances are reflected as decisions in the summary output.

**Test Steps**:
1. Provide transcript containing: "We've decided to move forward with vendor B."
2. Call `generateSummary(transcript, { extractDecisions: true })`
3. Assert `result.decisions` contains an entry referencing "vendor B"

**Expected Result**: Decision captured; `decisions` array is non-empty.

**Code Sample**:
```typescript
it('should capture session decisions in the decisions field', async () => {
  const result = await summarizer.generateSummary(decisionTranscript, { extractDecisions: true });
  expect(result.decisions!.some(d => d.text.toLowerCase().includes('vendor b'))).toBe(true);
});
```

---

#### TC-F5-U2.3: Panel Context Incorporated into Summary Introduction
**Objective**: Verify that when panel analysis data is available, the summary introduction names the panelists and moderator.

**Test Steps**:
1. Seed panel analysis with moderator "Jane Doe" and panelists "Alice Tan", "Bob Lee"
2. Call `generateSummary(transcript, { includePanelContext: true, sessionId })`
3. Assert summary contains at least two of the three names

**Expected Result**: Summary introduction mentions panelists by resolved name.

**Code Sample**:
```typescript
it('should incorporate panelist names from panel analysis into summary introduction', async () => {
  await seedPanelAnalysis(sessionId, { moderator: 'Jane Doe', panelists: ['Alice Tan', 'Bob Lee'] });
  const result = await summarizer.generateSummary(transcript, { includePanelContext: true, sessionId });

  const namedPeople = ['Jane Doe', 'Alice Tan', 'Bob Lee'].filter(name => result.text.includes(name));
  expect(namedPeople.length).toBeGreaterThanOrEqual(2);
});
```

---

### 1.3 Summary Persistence and Versioning

#### TC-F5-U3.1: Summary Persisted to Database with Version Number
**Objective**: Verify that the first summary generates version 1, and regeneration produces version 2.

**Test Steps**:
1. Generate and save summary → assert `version = 1`
2. Regenerate and save → assert `version = 2`
3. Fetch latest summary → assert version 2 returned by default

**Expected Result**: Version increments correctly; `GET /sessions/{id}/summary` returns latest.

**Code Sample**:
```typescript
describe('SummaryVersioning', () => {
  it('should increment version on each summary regeneration', async () => {
    const v1 = await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
    expect(v1.version).toBe(1);

    const v2 = await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
    expect(v2.version).toBe(2);

    const latest = await summaryRepo.getLatest(sessionId);
    expect(latest.version).toBe(2);
  });
});
```

---

#### TC-F5-U3.2: Previous Summary Version Retrievable by Version Number
**Objective**: Verify that `GET /sessions/{id}/summary?version=1` returns version 1 even after subsequent regenerations.

**Test Steps**:
1. Generate 3 versions of the summary
2. Fetch version 1 by explicit version param
3. Assert returned text matches the original first version

**Expected Result**: Version 1 text matches original; `version` field = 1.

**Code Sample**:
```typescript
it('should retrieve a specific prior summary version by version number', async () => {
  const v1Text = (await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' })).text;
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });

  const v1 = await apiClient.get(`/sessions/${sessionId}/summary?version=1`);
  expect(v1.data.text).toBe(v1Text);
  expect(v1.data.version).toBe(1);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Full Summarization Pipeline

#### TC-F5-I1.1: End-to-End Summary Generation via API
**Objective**: Verify `POST /sessions/{id}/summarize` triggers the full pipeline and returns a complete summary.

**Preconditions**:
- Session transcribed; speaker identities optionally resolved; panel analysis optionally present

**Test Steps**:
1. POST to `/sessions/{sessionId}/summarize` with `{ mode: 'DETAILED' }`
2. Poll `GET /sessions/{sessionId}/summary/status` until `status = 'COMPLETE'`
3. Assert response has `text`, `bullets`, `actionItems`, `decisions`, `participants`

**Expected Result**: All summary fields populated within 30 s.

**Code Sample**:
```typescript
it('should generate a complete detailed summary via the summarize API', async () => {
  await apiClient.post(`/sessions/${sessionId}/summarize`, { mode: 'DETAILED' });

  const summary = await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/summary`),
    { until: r => r.data.status === 'COMPLETE', timeout: 30000 }
  );

  expect(summary.data.text).toBeDefined();
  expect(summary.data.actionItems).toBeDefined();
  expect(summary.data.decisions).toBeDefined();
});
```

---

#### TC-F5-I1.2: Summary Enriched with Resolved Speaker Names
**Objective**: Verify that the summary correctly attributes action items and decisions to resolved speaker names.

**Test Steps**:
1. Resolve speaker identities (Speaker_1 → "Dr. Lee")
2. Generate summary with `extractActionItems: true`
3. Assert at least one action item's `assignee` field contains "Dr. Lee"

**Expected Result**: Action items attributed to real names; no `Speaker_N` labels.

**Code Sample**:
```typescript
it('should attribute action items to resolved speaker names in summary', async () => {
  await identityResolver.resolve(sessionId);
  const summary = await summaryService.generateAndSave(sessionId, transcript, { extractActionItems: true });
  const withAssignee = summary.actionItems!.filter(a => a.assignee);
  withAssignee.forEach(a => expect(a.assignee).not.toMatch(/^Speaker_/));
});
```

---

### 2.2 Multi-Format Export

#### TC-F5-I2.1: Summary Exported to PDF via Export API
**Objective**: Verify `GET /sessions/{id}/summary/export?format=pdf` returns a valid PDF with correct content.

**Test Steps**:
1. Generate and persist summary
2. Call export endpoint with `format=pdf`
3. Assert `Content-Type: application/pdf` and body is non-empty binary

**Expected Result**: Valid PDF binary response; file size > 5 KB.

**Code Sample**:
```typescript
it('should export session summary as a valid PDF', async () => {
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'DETAILED' });
  const res = await apiClient.get(`/sessions/${sessionId}/summary/export?format=pdf`, { responseType: 'arraybuffer' });

  expect(res.headers['content-type']).toContain('application/pdf');
  expect(res.data.byteLength).toBeGreaterThan(5000);
});
```

---

#### TC-F5-I2.2: Summary Pushed to Connected Note-Taking App
**Objective**: Verify the summary is successfully synced to a connected note-taking integration (e.g., Notion) via the Integrations platform (EPIC-08).

**Test Steps**:
1. Configure a Notion integration for the test user
2. Generate and save summary
3. Trigger sync
4. Assert `integration_sync_log` shows status `SYNCED` for Notion

**Expected Result**: Sync log entry with `status = 'SYNCED'`; no error codes.

**Code Sample**:
```typescript
it('should sync session summary to connected Notion integration', async () => {
  await configureIntegration(userId, 'NOTION', mockNotionCredentials);
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'DETAILED' });
  await syncService.sync(sessionId, { integrations: ['NOTION'] });

  const log = await db.integrationSyncLog.findOne({ where: { sessionId, integration: 'NOTION' } });
  expect(log!.status).toBe('SYNCED');
});
```

---

### 2.3 Trigger and Re-generation

#### TC-F5-I3.1: Transcript Update Triggers Summary Invalidation
**Objective**: Verify that editing a transcript segment sets the existing summary status to `STALE`.

**Test Steps**:
1. Generate and persist a summary
2. Edit a transcript segment via `PUT /sessions/{id}/segments/seg-001`
3. Fetch `GET /sessions/{id}/summary`
4. Assert `status = 'STALE'`

**Expected Result**: Summary marked stale after transcript edit; no automatic re-run (on-demand only).

**Code Sample**:
```typescript
it('should mark summary as STALE after transcript segment is edited', async () => {
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
  await apiClient.put(`/sessions/${sessionId}/segments/seg-001`, { text: 'Updated text.' });

  const summary = await apiClient.get(`/sessions/${sessionId}/summary`);
  expect(summary.data.status).toBe('STALE');
});
```

---

#### TC-F5-I3.2: Re-generation After Stale Status Produces Updated Summary
**Objective**: Verify that regenerating a stale summary produces a new version incorporating the transcript edit.

**Test Steps**:
1. Edit a segment and confirm summary is stale
2. POST to `/sessions/{id}/summarize`
3. Wait for completion
4. Assert new version number and updated content

**Expected Result**: Version incremented; new summary reflects updated segment content.

**Code Sample**:
```typescript
it('should regenerate summary after stale status and reflect transcript edit', async () => {
  const v1 = await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
  await apiClient.put(`/sessions/${sessionId}/segments/seg-001`, { text: 'A critical new insight was shared.' });
  await apiClient.post(`/sessions/${sessionId}/summarize`, { mode: 'SHORT' });

  const v2 = await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/summary`),
    { until: r => r.data.version > v1.version, timeout: 30000 }
  );
  expect(v2.data.text).toContain('critical new insight');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Multi-Language Input

#### TC-F5-E1.1: Summary Generated from Japanese Transcript
**Objective**: Verify the summarizer generates a coherent Japanese-language summary when input language is Japanese.

**Test Steps**:
1. Provide a Japanese-language transcript
2. Call `generateSummary(transcript, { mode: 'SHORT', language: 'ja' })`
3. Assert output is in Japanese (non-ASCII characters present); no English substitutions

**Expected Result**: Summary in Japanese; `result.language = 'ja'`; no crash.

**Code Sample**:
```typescript
it('should generate a Japanese-language summary from a Japanese transcript', async () => {
  const result = await summarizer.generateSummary(japaneseTranscript, { mode: 'SHORT', language: 'ja' });
  expect(result.language).toBe('ja');
  // Assert Japanese characters present
  expect(/[　-鿿]/.test(result.text)).toBe(true);
});
```

---

#### TC-F5-E1.2: Summary Requested in Different Language Than Transcript
**Objective**: Verify translation is applied when `outputLanguage` differs from transcript language.

**Test Steps**:
1. Provide a Spanish transcript
2. Call `generateSummary(transcript, { mode: 'SHORT', outputLanguage: 'en' })`
3. Assert summary is in English

**Expected Result**: English summary of Spanish content; no Spanish words in main body.

**Code Sample**:
```typescript
it('should translate summary to English when outputLanguage differs from transcript', async () => {
  const result = await summarizer.generateSummary(spanishTranscript, { mode: 'SHORT', outputLanguage: 'en' });
  expect(result.language).toBe('en');
  // Basic heuristic: no common Spanish-only words
  expect(result.text).not.toMatch(/\b(que|esto|para|como)\b/i);
});
```

---

### 3.2 Unusually Short or Long Sessions

#### TC-F5-E2.1: Very Short Session (Under 2 Minutes)
**Objective**: Verify the summarizer produces a meaningful summary even for a very short session.

**Test Steps**:
1. Provide a 90-second transcript with 3 utterances
2. Call `generateSummary(transcript, { mode: 'SHORT' })`
3. Assert summary is non-empty and references the main topic

**Expected Result**: Summary text >= 20 words; no "insufficient data" error.

**Code Sample**:
```typescript
it('should produce a non-empty summary for a 90-second session', async () => {
  const result = await summarizer.generateSummary(ninetySecTranscript, { mode: 'SHORT' });
  const wordCount = result.text.split(/\s+/).filter(Boolean).length;
  expect(wordCount).toBeGreaterThanOrEqual(20);
  expect(result.status).toBe('COMPLETE');
});
```

---

#### TC-F5-E2.2: Multi-Day Conference Marathon (20+ Hours of Transcript)
**Objective**: Verify the summarizer correctly chunks and processes a 20-hour transcript without timeout or memory failure.

**Test Steps**:
1. Generate a synthetic 20-hour transcript (72,000 segments)
2. Call `generateSummary` with `mode: 'DETAILED'` and 10-minute timeout
3. Assert summary is returned and contains multiple section headers

**Expected Result**: Summary generated within 10 minutes; structured sections present.

**Code Sample**:
```typescript
it('should summarize a 20-hour conference transcript within timeout', async () => {
  const bigTranscript = generateSyntheticTranscript({ hours: 20 });
  const result = await summarizer.generateSummary(bigTranscript, { mode: 'DETAILED' });
  expect(result.status).toBe('COMPLETE');
  expect(result.sections).toBeDefined();
  expect(result.sections!.length).toBeGreaterThan(3);
}, 620000);
```

---

### 3.3 Unstructured or Degraded Transcripts

#### TC-F5-E3.1: Summary from Heavily Disfluency-Filled Transcript
**Objective**: Verify the summarizer filters disfluencies (um, uh, false starts) and produces clean output.

**Test Steps**:
1. Provide transcript: "So, um, what we're, uh, trying to, like, you know, achieve is basically, uh, better..."
2. Generate summary
3. Assert no "um", "uh", "like" appear in summary text

**Expected Result**: Clean summary; disfluencies absent; meaning preserved.

**Code Sample**:
```typescript
it('should filter disfluencies and produce clean summary text', async () => {
  const result = await summarizer.generateSummary(disfluencyTranscript, { mode: 'SHORT' });
  expect(result.text).not.toMatch(/\bum\b|\buh\b|\byou know\b/i);
  expect(result.text.length).toBeGreaterThan(50);
});
```

---

#### TC-F5-E3.2: Summary When Transcript Has Large Silent Gaps
**Objective**: Verify the summarizer handles transcripts with long silent segments (no text) without producing empty sections.

**Test Steps**:
1. Provide transcript with 10-minute silent gaps between topic segments
2. Generate summary
3. Assert no empty bullet points or blank sections in output

**Expected Result**: Summary contains only content from spoken segments; no blank entries.

**Code Sample**:
```typescript
it('should not produce empty sections for silent transcript gaps', async () => {
  const result = await summarizer.generateSummary(gappedTranscript, { mode: 'BULLETS' });
  result.bullets!.forEach(b => expect(b.trim()).not.toBe(''));
  if (result.sections) {
    result.sections.forEach(s => expect(s.content.trim()).not.toBe(''));
  }
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Summary Generation Speed

#### TC-F5-P1.1: SHORT Summary Latency — 1-Hour Transcript
**Objective**: Verify a SHORT summary is generated within 5 s for a 1-hour session.

**Test Steps**:
1. Load a 1-hour transcript fixture
2. Time `generateSummary(transcript, { mode: 'SHORT' })` across 10 iterations

**Expected Result**: p50 <= 4 s; p95 <= 5 s.

**Code Sample**:
```typescript
it('should generate a SHORT summary in under 5 seconds p95 for a 1-hour session', async () => {
  const transcript = loadFixture('1hour-transcript.json');
  const runs = await benchmark(() => summarizer.generateSummary(transcript, { mode: 'SHORT' }), { iterations: 10 });
  expect(runs.p50).toBeLessThan(4000);
  expect(runs.p95).toBeLessThan(5000);
});
```

---

#### TC-F5-P1.2: DETAILED Summary Latency — 2-Hour Transcript
**Objective**: Verify a DETAILED summary of a 2-hour session completes within 15 s.

**Test Steps**:
1. Load a 2-hour transcript fixture
2. Time `generateSummary(transcript, { mode: 'DETAILED' })` across 5 iterations

**Expected Result**: p95 <= 15 s.

**Code Sample**:
```typescript
it('should generate a DETAILED summary for a 2-hour session within 15 seconds', async () => {
  const runs = await benchmark(
    () => summarizer.generateSummary(twoHourTranscript, { mode: 'DETAILED' }),
    { iterations: 5 }
  );
  expect(runs.p95).toBeLessThan(15000);
});
```

---

### 4.2 Concurrent Summarization

#### TC-F5-P2.1: 10 Concurrent Summary Generation Requests
**Objective**: Verify the service handles 10 simultaneous summarization requests without queue starvation.

**Test Steps**:
1. Seed 10 different session transcripts
2. Fire 10 concurrent summarization requests
3. Assert all complete within 60 s

**Expected Result**: All 10 summaries generated; no failures.

**Code Sample**:
```typescript
it('should handle 10 concurrent summarization requests within 60 seconds', async () => {
  const sessionIds = await seedMultipleSessions(10);
  const results = await Promise.allSettled(
    sessionIds.map(id => summaryService.generateAndSave(id, transcripts[id], { mode: 'SHORT' }))
  );
  results.forEach(r => expect(r.status).toBe('fulfilled'));
}, 60000);
```

---

#### TC-F5-P2.2: Summary API Response Time Under Load
**Objective**: Verify `GET /sessions/{id}/summary` responds within 100 ms even with 100 concurrent reads.

**Test Steps**:
1. Pre-seed a summary
2. Fire 100 concurrent GET requests
3. Collect response times

**Expected Result**: p99 response time <= 100 ms.

**Code Sample**:
```typescript
it('should serve summary GET requests with p99 latency under 100ms under 100 concurrent reads', async () => {
  await seedSummary(sessionId);
  const latencies = await measureConcurrentGets(
    () => apiClient.get(`/sessions/${sessionId}/summary`),
    { concurrency: 100 }
  );
  expect(percentile(latencies, 99)).toBeLessThan(100);
});
```

---

### 4.3 LLM Token Efficiency

#### TC-F5-P3.1: Prompt Token Count Within Model Context Limit
**Objective**: Verify the transcript chunking strategy ensures each LLM call stays within the 128K-token context window.

**Test Steps**:
1. Tokenize a 3-hour session transcript
2. Assert all chunks are <= 100,000 tokens (leaving room for response)

**Expected Result**: No chunk exceeds 100,000 tokens; total chunk count >= 1.

**Code Sample**:
```typescript
it('should chunk a 3-hour transcript so each chunk stays within 100k tokens', async () => {
  const chunks = summarizer.chunkTranscript(threeHourTranscript, { maxTokens: 100000 });
  chunks.forEach(chunk => {
    const tokens = tokenCounter.count(chunk.text);
    expect(tokens).toBeLessThanOrEqual(100000);
  });
  expect(chunks.length).toBeGreaterThanOrEqual(1);
});
```

---

#### TC-F5-P3.2: Summary Caching Prevents Redundant LLM Calls
**Objective**: Verify that fetching the same summary twice reuses the cached result and does not trigger a second LLM call.

**Test Steps**:
1. Generate a summary (first call → LLM invoked)
2. Fetch the summary again (second call → cache hit)
3. Assert LLM service was called exactly once

**Expected Result**: LLM service `callCount = 1`; second request served from cache.

**Code Sample**:
```typescript
it('should serve repeated summary requests from cache without re-invoking the LLM', async () => {
  const spyLlm = jest.spyOn(mockLlmService, 'complete');
  await summaryService.generateAndSave(sessionId, transcript, { mode: 'SHORT' });
  await summaryService.getSummary(sessionId); // second fetch

  expect(spyLlm).toHaveBeenCalledTimes(1);
});
```

---

## Test Execution Summary

### Test Categories
- **Unit Tests**: 3 suites, ~12 test cases
- **Integration Tests**: 3 suites, 6 test cases
- **Edge Cases**: 3 suites, 6 test cases
- **Performance Tests**: 3 suites, 6 test cases

### Total: ~30 comprehensive test cases
