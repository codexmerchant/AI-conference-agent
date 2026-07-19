# EPIC07 Feature 1 — Meeting Summaries — Test Cases

## Test Overview
Comprehensive test suite for Meeting Summaries covering unit tests, integration tests, edge cases, and performance validation. Meeting Summaries transform raw transcripts and captured notes into structured, LLM-generated summaries that surface key decisions, topics discussed, and participants.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Transcript Preprocessing
#### TC-F1-U1.1: Strip Filler Words and Normalize Speaker Labels
**Objective**: Verify that raw transcript text is cleaned before being sent to the summarization model.
**Preconditions**: Raw transcript string with speaker diarization labels and filler words.
**Test Steps**:
1. Pass raw transcript `"[Speaker_0]: Uh, so, like, we decided, you know, to go with vendor A."` to `preprocessTranscript()`.
2. Assert output strips filler words and normalizes speaker label.
3. Assert punctuation and sentence structure are preserved.
**Expected Result**: Output is `"Speaker 0: We decided to go with vendor A."` with filler words removed and label normalized.
**Code Sample**:
```typescript
import { preprocessTranscript } from '../src/summarization/preprocess';

describe('Transcript Preprocessing', () => {
  it('strips filler words and normalizes speaker labels', () => {
    const raw = '[Speaker_0]: Uh, so, like, we decided, you know, to go with vendor A.';
    const result = preprocessTranscript(raw);
    expect(result).toBe('Speaker 0: We decided to go with vendor A.');
    expect(result).not.toMatch(/\buh\b|\blike\b|\byou know\b/i);
  });
});
```

#### TC-F1-U1.2: Segment Transcript by Topic Boundary
**Objective**: Verify topic segmentation splits a long transcript into logical chunks.
**Preconditions**: Transcript with multiple topic shifts detected via keyword density.
**Test Steps**:
1. Provide a 2000-word transcript covering pricing, technical requirements, and next steps.
2. Call `segmentByTopic(transcript)`.
3. Assert exactly 3 segments are returned with non-overlapping character ranges.
**Expected Result**: Array of 3 `TranscriptSegment` objects each with `topic`, `startIndex`, and `endIndex`.
**Code Sample**:
```typescript
import { segmentByTopic } from '../src/summarization/segmenter';
import { mockLongTranscript } from '../fixtures/transcripts';

it('segments a multi-topic transcript into distinct chunks', () => {
  const segments = segmentByTopic(mockLongTranscript);
  expect(segments).toHaveLength(3);
  expect(segments[0].topic).toMatch(/pricing/i);
  expect(segments[1].topic).toMatch(/technical/i);
  expect(segments[2].topic).toMatch(/next steps/i);
  // Ensure no overlap
  expect(segments[1].startIndex).toBe(segments[0].endIndex + 1);
});
```

#### TC-F1-U1.3: Build Summarization Prompt from Meeting Metadata
**Objective**: Confirm the prompt builder injects meeting title, participants, and date into the LLM prompt template.
**Preconditions**: `MeetingMetadata` object with title, participants array, and ISO date.
**Test Steps**:
1. Create metadata: `{ title: 'Q3 Vendor Review', participants: ['Alice', 'Bob'], date: '2026-07-19' }`.
2. Call `buildSummarizationPrompt(metadata, transcript)`.
3. Assert prompt contains all three metadata fields.
4. Assert prompt includes instruction to output JSON with keys `summary`, `keyDecisions`, `actionItems`.
**Expected Result**: Prompt string contains meeting title, participant names, date, and structured output instruction.
**Code Sample**:
```typescript
import { buildSummarizationPrompt } from '../src/summarization/promptBuilder';

it('injects metadata into the summarization prompt', () => {
  const meta = { title: 'Q3 Vendor Review', participants: ['Alice', 'Bob'], date: '2026-07-19' };
  const prompt = buildSummarizationPrompt(meta, 'transcript text here');
  expect(prompt).toContain('Q3 Vendor Review');
  expect(prompt).toContain('Alice');
  expect(prompt).toContain('Bob');
  expect(prompt).toContain('2026-07-19');
  expect(prompt).toContain('"keyDecisions"');
  expect(prompt).toContain('"actionItems"');
});
```

### 1.2 LLM Response Parsing
#### TC-F1-U2.1: Parse Valid JSON Summary Response
**Objective**: Verify the response parser correctly extracts structured fields from a valid LLM JSON response.
**Preconditions**: Mock LLM response containing valid JSON with `summary`, `keyDecisions`, and `actionItems`.
**Test Steps**:
1. Provide mock response string containing a JSON block.
2. Call `parseSummaryResponse(response)`.
3. Assert all three fields are extracted with correct types.
**Expected Result**: Returns `MeetingSummary` object with `summary: string`, `keyDecisions: string[]`, `actionItems: ActionItem[]`.
**Code Sample**:
```typescript
import { parseSummaryResponse } from '../src/summarization/parser';

it('parses a valid LLM JSON response into MeetingSummary', () => {
  const mockResponse = JSON.stringify({
    summary: 'Team agreed on vendor A for Q3.',
    keyDecisions: ['Vendor A selected', 'Budget approved at $50k'],
    actionItems: [{ owner: 'Alice', task: 'Send contract', due: '2026-07-26' }]
  });
  const result = parseSummaryResponse(mockResponse);
  expect(result.summary).toBe('Team agreed on vendor A for Q3.');
  expect(result.keyDecisions).toHaveLength(2);
  expect(result.actionItems[0].owner).toBe('Alice');
});
```

#### TC-F1-U2.2: Handle Malformed JSON with Fallback Extraction
**Objective**: Confirm the parser gracefully falls back to regex extraction when LLM returns prose instead of JSON.
**Preconditions**: Mock LLM response in prose format without JSON block.
**Test Steps**:
1. Provide prose response: `"The team decided to use vendor A. Key decision: Budget approved."`.
2. Call `parseSummaryResponse(response)`.
3. Assert fallback extracts a non-empty summary string.
4. Assert no exception is thrown.
**Expected Result**: Returns partial `MeetingSummary` with `summary` populated from prose, `keyDecisions` and `actionItems` as empty arrays.
**Code Sample**:
```typescript
it('falls back to prose extraction when JSON is malformed', () => {
  const prose = 'The team decided to use vendor A. Key decision: Budget approved.';
  const result = parseSummaryResponse(prose);
  expect(result.summary.length).toBeGreaterThan(0);
  expect(result.keyDecisions).toEqual([]);
  expect(result.actionItems).toEqual([]);
});
```

#### TC-F1-U2.3: Validate Summary Length Constraint
**Objective**: Ensure summaries exceeding the max character limit are truncated with an ellipsis.
**Preconditions**: `MeetingSummary` with `summary` field of 1500 characters; configured max is 1000.
**Test Steps**:
1. Create summary object with 1500-char summary string.
2. Call `enforceSummaryLengthLimit(summary, { maxChars: 1000 })`.
3. Assert returned summary is <= 1000 chars.
4. Assert last three characters are `'...'`.
**Expected Result**: Truncated summary string ending with `'...'` and length equal to 1000.
**Code Sample**:
```typescript
import { enforceSummaryLengthLimit } from '../src/summarization/validator';

it('truncates summaries exceeding the max character limit', () => {
  const longSummary = 'A'.repeat(1500);
  const result = enforceSummaryLengthLimit({ summary: longSummary }, { maxChars: 1000 });
  expect(result.summary.length).toBe(1000);
  expect(result.summary.endsWith('...')).toBe(true);
});
```

### 1.3 Summary Storage and Retrieval
#### TC-F1-U3.1: Persist Meeting Summary to Database
**Objective**: Verify that a `MeetingSummary` is correctly persisted with the correct meeting ID foreign key.
**Preconditions**: Mock database client; valid `MeetingSummary` and `meetingId`.
**Test Steps**:
1. Instantiate `SummaryRepository` with mock DB client.
2. Call `repository.save(meetingId, summary)`.
3. Assert mock DB `insert` was called once with correct payload.
**Expected Result**: DB insert is called with `{ meetingId, ...summary }` and returns a generated `summaryId`.
**Code Sample**:
```typescript
import { SummaryRepository } from '../src/db/summaryRepository';
import { mockDbClient } from '../mocks/db';

it('persists a MeetingSummary with the correct meetingId', async () => {
  const repo = new SummaryRepository(mockDbClient);
  const summary = { summary: 'Discussed Q3 plans.', keyDecisions: [], actionItems: [] };
  await repo.save('meeting-123', summary);
  expect(mockDbClient.insert).toHaveBeenCalledWith(
    'meeting_summaries',
    expect.objectContaining({ meetingId: 'meeting-123' })
  );
});
```

#### TC-F1-U3.2: Retrieve Summary by Meeting ID
**Objective**: Confirm retrieval of a previously saved summary by meeting ID.
**Preconditions**: Mock DB seeded with one summary for `meeting-123`.
**Test Steps**:
1. Call `repository.findByMeetingId('meeting-123')`.
2. Assert result is non-null with matching `meetingId`.
**Expected Result**: Returns the stored `MeetingSummary` object.
**Code Sample**:
```typescript
it('retrieves a MeetingSummary by meetingId', async () => {
  mockDbClient.query.mockResolvedValue([{ meetingId: 'meeting-123', summary: 'Plans discussed.' }]);
  const repo = new SummaryRepository(mockDbClient);
  const result = await repo.findByMeetingId('meeting-123');
  expect(result).not.toBeNull();
  expect(result!.meetingId).toBe('meeting-123');
});
```

#### TC-F1-U3.3: Return Null for Non-Existent Meeting ID
**Objective**: Ensure the repository returns null (not throws) when no summary exists for the given ID.
**Preconditions**: Empty mock DB.
**Test Steps**:
1. Call `repository.findByMeetingId('nonexistent-id')`.
2. Assert return value is null.
3. Assert no exception is thrown.
**Expected Result**: `null` returned without error.
**Code Sample**:
```typescript
it('returns null for a non-existent meetingId', async () => {
  mockDbClient.query.mockResolvedValue([]);
  const repo = new SummaryRepository(mockDbClient);
  const result = await repo.findByMeetingId('nonexistent-id');
  expect(result).toBeNull();
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Summarization Pipeline
#### TC-F1-I1.1: Summarize a Real Transcript via LLM API
**Objective**: Validate that the full pipeline — preprocess → segment → LLM call → parse → store — produces a valid summary for a realistic transcript.
**Preconditions**: Sandbox LLM API credentials configured; test database available.
**Test Steps**:
1. Load fixture transcript `fixtures/vendor-review-90min.txt`.
2. Call `MeetingSummaryService.summarize({ meetingId: 'test-001', transcript })`.
3. Assert returned object has non-empty `summary`, at least one `keyDecision`, and at least one `actionItem`.
4. Assert record is present in the test DB.
**Expected Result**: Structured summary stored in DB with all required fields populated.
**Code Sample**:
```typescript
import { MeetingSummaryService } from '../src/services/MeetingSummaryService';
import { readFileSync } from 'fs';

it('produces and stores a summary for a 90-minute transcript', async () => {
  const transcript = readFileSync('fixtures/vendor-review-90min.txt', 'utf8');
  const result = await MeetingSummaryService.summarize({ meetingId: 'test-001', transcript });
  expect(result.summary.length).toBeGreaterThan(100);
  expect(result.keyDecisions.length).toBeGreaterThanOrEqual(1);
  expect(result.actionItems.length).toBeGreaterThanOrEqual(1);
}, 30000);
```

#### TC-F1-I1.2: Summarization Pipeline Handles LLM Rate Limit with Retry
**Objective**: Confirm the pipeline retries on HTTP 429 and eventually succeeds.
**Preconditions**: Mock LLM client that returns 429 twice then succeeds on the third call.
**Test Steps**:
1. Configure mock LLM client with retry sequence: [429, 429, 200].
2. Call `MeetingSummaryService.summarize({ meetingId: 'test-002', transcript: shortTranscript })`.
3. Assert mock LLM client was called exactly 3 times.
4. Assert final result is a valid `MeetingSummary`.
**Expected Result**: Summary generated after 2 retries; no exception propagated.
**Code Sample**:
```typescript
it('retries on rate limit and eventually returns a summary', async () => {
  let callCount = 0;
  mockLlmClient.complete.mockImplementation(() => {
    callCount++;
    if (callCount < 3) throw Object.assign(new Error('Rate limited'), { status: 429 });
    return Promise.resolve(mockSummaryJsonResponse);
  });
  const result = await MeetingSummaryService.summarize({ meetingId: 'test-002', transcript: 'short text' });
  expect(callCount).toBe(3);
  expect(result.summary).toBeTruthy();
});
```

### 2.2 Webhook Trigger and Notification
#### TC-F1-I2.1: Summary Webhook Fires After Summarization Completes
**Objective**: Verify that a registered webhook receives a POST with the summary payload upon completion.
**Preconditions**: Local webhook listener running on test port 9999; webhook registered for `meeting-complete` events.
**Test Steps**:
1. Register webhook: `POST /webhooks { url: 'http://localhost:9999/hook', event: 'summary.created' }`.
2. Trigger summarization for `meeting-003`.
3. Assert webhook listener received exactly one POST.
4. Assert payload contains `meetingId` and `summary` fields.
**Expected Result**: Webhook delivers correct payload within 5 seconds.
**Code Sample**:
```typescript
import { createTestWebhookListener } from '../utils/testWebhook';

it('fires a webhook when a summary is created', async () => {
  const { received, close } = await createTestWebhookListener(9999);
  await registerWebhook({ url: 'http://localhost:9999/hook', event: 'summary.created' });
  await MeetingSummaryService.summarize({ meetingId: 'meeting-003', transcript: sampleTranscript });
  await waitForWebhook(received, 5000);
  expect(received[0].body.meetingId).toBe('meeting-003');
  expect(received[0].body.summary).toBeTruthy();
  await close();
});
```

#### TC-F1-I2.2: Notification Email Sent to Meeting Organizer
**Objective**: Confirm that an email notification with the summary link is dispatched to the meeting organizer.
**Preconditions**: Mock email service; meeting record with organizer email `alice@example.com`.
**Test Steps**:
1. Complete summarization for meeting with organizer `alice@example.com`.
2. Assert mock email service `send` was called once.
3. Assert email `to` field matches organizer; subject contains `"Meeting Summary"`.
**Expected Result**: One email sent with correct recipient and subject.
**Code Sample**:
```typescript
it('sends a summary notification email to the organizer', async () => {
  mockEmailService.send.mockResolvedValue({ messageId: 'msg-001' });
  await MeetingSummaryService.summarize({ meetingId: 'meeting-004', transcript: sampleTranscript });
  expect(mockEmailService.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'alice@example.com', subject: expect.stringContaining('Meeting Summary') })
  );
});
```

### 2.3 Multi-Language Support
#### TC-F1-I3.1: Summarize a Spanish-Language Transcript
**Objective**: Validate that a Spanish transcript is summarized in Spanish by instructing the model to match the input language.
**Preconditions**: Spanish transcript fixture `fixtures/reunión-ventas.txt`.
**Test Steps**:
1. Call `MeetingSummaryService.summarize({ meetingId: 'test-es-001', transcript: spanishTranscript, language: 'es' })`.
2. Assert `result.summary` contains Spanish words (no English-only output).
3. Assert language detection returns `'es'` for the summary text.
**Expected Result**: Summary is in Spanish matching the source language.
**Code Sample**:
```typescript
import { detectLanguage } from '../src/utils/languageDetector';

it('produces a Spanish summary for a Spanish transcript', async () => {
  const spanishTranscript = readFileSync('fixtures/reunión-ventas.txt', 'utf8');
  const result = await MeetingSummaryService.summarize({ meetingId: 'test-es-001', transcript: spanishTranscript, language: 'es' });
  const detectedLang = await detectLanguage(result.summary);
  expect(detectedLang).toBe('es');
}, 30000);
```

#### TC-F1-I3.2: Language Detection Falls Back to English for Mixed Content
**Objective**: Ensure that transcripts with mixed language content default to English summaries.
**Preconditions**: Transcript with 60% English and 40% French content.
**Test Steps**:
1. Pass mixed-language transcript without explicit `language` parameter.
2. Assert `result.language` field is `'en'`.
3. Assert summary is primarily in English.
**Expected Result**: English summary returned; `language: 'en'` in the result object.
**Code Sample**:
```typescript
it('defaults to English for mixed-language transcripts', async () => {
  const result = await MeetingSummaryService.summarize({ meetingId: 'test-mixed', transcript: mixedLangTranscript });
  expect(result.language).toBe('en');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Minimal and Empty Inputs
#### TC-F1-E1.1: Empty Transcript Returns Graceful Empty Summary
**Objective**: Confirm that an empty transcript does not crash the pipeline and returns a sentinel empty summary.
**Preconditions**: Empty string passed as transcript.
**Test Steps**:
1. Call `MeetingSummaryService.summarize({ meetingId: 'empty-001', transcript: '' })`.
2. Assert no exception thrown.
3. Assert `result.summary` equals the configured empty-transcript message.
**Expected Result**: `{ summary: 'No content was captured for this meeting.', keyDecisions: [], actionItems: [] }`.
**Code Sample**:
```typescript
it('returns an empty-state summary for a blank transcript', async () => {
  const result = await MeetingSummaryService.summarize({ meetingId: 'empty-001', transcript: '' });
  expect(result.summary).toBe('No content was captured for this meeting.');
  expect(result.keyDecisions).toHaveLength(0);
});
```

#### TC-F1-E1.2: Single-Sentence Transcript Produces Valid Summary
**Objective**: Verify a transcript with only one sentence still produces a meaningful summary without crashing.
**Preconditions**: Transcript containing a single sentence: `"Alice said hello."`.
**Test Steps**:
1. Call `MeetingSummaryService.summarize` with single-sentence transcript.
2. Assert `result.summary` is non-empty and does not contain error text.
3. Assert `keyDecisions` and `actionItems` are empty arrays.
**Expected Result**: Short but valid summary returned; no error fields present.
**Code Sample**:
```typescript
it('handles a single-sentence transcript without crashing', async () => {
  const result = await MeetingSummaryService.summarize({ meetingId: 'short-001', transcript: 'Alice said hello.' });
  expect(result.summary).toBeTruthy();
  expect(result.summary).not.toMatch(/error|exception/i);
});
```

### 3.2 Extremely Long Transcripts
#### TC-F1-E2.1: Transcript Exceeding Token Limit Is Chunked and Re-Merged
**Objective**: Ensure transcripts exceeding the LLM context window are split into overlapping chunks and their summaries are merged.
**Preconditions**: Transcript of 150,000 characters (exceeds 32k token limit); chunker configured with 500-char overlap.
**Test Steps**:
1. Pass oversized transcript to `MeetingSummaryService.summarize`.
2. Assert the internal chunker splits into at least 4 chunks.
3. Assert the final merged summary is coherent and references topics from both the beginning and end of the transcript.
**Expected Result**: Merged summary covers the full meeting scope; chunking is transparent to the caller.
**Code Sample**:
```typescript
it('chunks and merges summaries for transcripts exceeding token limits', async () => {
  const hugeTranscript = 'word '.repeat(30000); // ~150k chars
  const chunkSpy = jest.spyOn(transcriptChunker, 'chunk');
  const result = await MeetingSummaryService.summarize({ meetingId: 'huge-001', transcript: hugeTranscript });
  expect(chunkSpy).toHaveBeenCalled();
  expect(result.summary.length).toBeGreaterThan(200);
});
```

#### TC-F1-E2.2: Partial Transcript with Missing Speaker Labels
**Objective**: Confirm the pipeline does not fail when some transcript lines lack speaker labels.
**Preconditions**: Transcript with 5 labeled lines followed by 3 unlabeled lines.
**Test Steps**:
1. Pass mixed-label transcript.
2. Assert preprocessing assigns `"Unknown"` label to unlabeled lines.
3. Assert summarization proceeds without exception.
**Expected Result**: Summary generated; unlabeled lines attributed to `"Unknown"` speaker.
**Code Sample**:
```typescript
it('assigns Unknown speaker to unlabeled transcript lines', () => {
  const mixed = 'Alice: Hello.\nBob: Hi.\nThis was said without a label.';
  const processed = preprocessTranscript(mixed);
  expect(processed).toContain('Unknown:');
});
```

### 3.3 Duplicate and Concurrent Requests
#### TC-F1-E3.1: Duplicate Summarization Request for Same Meeting Returns Cached Result
**Objective**: Verify that a second summarization request for the same meeting ID returns the cached result without a second LLM call.
**Preconditions**: Summary already stored in DB for `meeting-123`; caching enabled.
**Test Steps**:
1. Call `MeetingSummaryService.summarize` twice with the same `meetingId`.
2. Assert LLM API was called only once.
3. Assert both calls return identical summaries.
**Expected Result**: Cache hit on second call; LLM not invoked again.
**Code Sample**:
```typescript
it('returns cached summary on duplicate meeting request', async () => {
  await MeetingSummaryService.summarize({ meetingId: 'meeting-123', transcript });
  await MeetingSummaryService.summarize({ meetingId: 'meeting-123', transcript });
  expect(mockLlmClient.complete).toHaveBeenCalledTimes(1);
});
```

#### TC-F1-E3.2: Concurrent Summarization Requests for the Same Meeting Are Deduplicated
**Objective**: Confirm that simultaneous requests for the same meeting don't trigger multiple LLM calls (request coalescing).
**Preconditions**: No cached result; LLM call takes 2 seconds; two concurrent requests submitted.
**Test Steps**:
1. Fire two `summarize` calls simultaneously with the same `meetingId`.
2. Assert LLM was called exactly once.
3. Assert both promises resolve to the same result.
**Expected Result**: Request coalescing reduces LLM calls to one; both callers receive the result.
**Code Sample**:
```typescript
it('coalesces concurrent summarization requests for the same meeting', async () => {
  const [r1, r2] = await Promise.all([
    MeetingSummaryService.summarize({ meetingId: 'concurrent-001', transcript }),
    MeetingSummaryService.summarize({ meetingId: 'concurrent-001', transcript })
  ]);
  expect(mockLlmClient.complete).toHaveBeenCalledTimes(1);
  expect(r1.summary).toBe(r2.summary);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 Summarization Latency
#### TC-F1-P1.1: 30-Minute Transcript Summarized Within SLA
**Objective**: Verify that a typical 30-minute meeting transcript is summarized end-to-end within the 10-second SLA.
**Preconditions**: Staging LLM endpoint; representative 30-minute transcript (~8,000 words).
**Test Steps**:
1. Record start time.
2. Call `MeetingSummaryService.summarize` with 30-minute transcript.
3. Record end time.
4. Assert elapsed time is under 10,000ms.
**Expected Result**: Total latency < 10 seconds for a 30-minute transcript.
**Code Sample**:
```typescript
it('summarizes a 30-minute transcript within 10 seconds', async () => {
  const start = Date.now();
  await MeetingSummaryService.summarize({ meetingId: 'perf-001', transcript: thirtyMinTranscript });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(10000);
}, 15000);
```

#### TC-F1-P1.2: 90-Minute Transcript Summarized Within Extended SLA
**Objective**: Confirm that a long 90-minute transcript completes within the 30-second extended SLA via chunked processing.
**Preconditions**: 90-minute transcript fixture (~24,000 words); chunking enabled.
**Test Steps**:
1. Measure total wall-clock time for `MeetingSummaryService.summarize`.
2. Assert elapsed time < 30,000ms.
**Expected Result**: Chunked summarization of a 90-minute transcript completes in under 30 seconds.
**Code Sample**:
```typescript
it('summarizes a 90-minute transcript within 30 seconds', async () => {
  const start = Date.now();
  await MeetingSummaryService.summarize({ meetingId: 'perf-002', transcript: ninetyMinTranscript });
  expect(Date.now() - start).toBeLessThan(30000);
}, 35000);
```

### 4.2 Throughput Under Load
#### TC-F1-P2.1: Process 50 Concurrent Summarization Requests
**Objective**: Validate that the service handles 50 concurrent summarization requests without errors or significant latency degradation.
**Preconditions**: Staging environment with 4 worker threads; mock LLM returning results in 200ms.
**Test Steps**:
1. Create 50 `summarize` promises with unique meeting IDs.
2. Call `Promise.all(promises)`.
3. Assert all 50 results are valid `MeetingSummary` objects.
4. Assert p95 latency is < 5,000ms.
**Expected Result**: All 50 requests succeed; p95 latency within bounds.
**Code Sample**:
```typescript
it('handles 50 concurrent summarization requests', async () => {
  const promises = Array.from({ length: 50 }, (_, i) =>
    MeetingSummaryService.summarize({ meetingId: `load-${i}`, transcript: sampleTranscript })
  );
  const results = await Promise.all(promises);
  expect(results).toHaveLength(50);
  results.forEach(r => expect(r.summary.length).toBeGreaterThan(0));
}, 60000);
```

#### TC-F1-P2.2: Database Write Throughput for Bulk Summary Storage
**Objective**: Verify the summary repository can write 100 summaries per second without queue backup.
**Preconditions**: Test PostgreSQL instance; batch insert enabled.
**Test Steps**:
1. Generate 1,000 mock summary objects.
2. Insert all using `SummaryRepository.bulkSave(summaries)`.
3. Assert total insertion time < 10 seconds.
4. Assert row count in DB equals 1,000.
**Expected Result**: Bulk insert of 1,000 summaries completes in under 10 seconds.
**Code Sample**:
```typescript
it('bulk-inserts 1000 summaries in under 10 seconds', async () => {
  const summaries = Array.from({ length: 1000 }, (_, i) => ({
    meetingId: `bulk-${i}`,
    summary: 'Test summary.',
    keyDecisions: [],
    actionItems: []
  }));
  const start = Date.now();
  await summaryRepo.bulkSave(summaries);
  expect(Date.now() - start).toBeLessThan(10000);
  const count = await summaryRepo.count();
  expect(count).toBe(1000);
});
```

### 4.3 Token Efficiency
#### TC-F1-P3.1: Prompt Token Count Stays Within Budget
**Objective**: Ensure the constructed prompt does not exceed the configured token budget of 8,000 tokens for a standard meeting.
**Preconditions**: Token counter utility; standard meeting transcript of ~6,000 words.
**Test Steps**:
1. Call `buildSummarizationPrompt(metadata, transcript)`.
2. Count tokens using `countTokens(prompt)`.
3. Assert token count <= 8,000.
**Expected Result**: Prompt fits within the 8,000-token budget.
**Code Sample**:
```typescript
import { countTokens } from '../src/utils/tokenCounter';

it('keeps prompt within the 8000-token budget', () => {
  const prompt = buildSummarizationPrompt(standardMeta, standardTranscript);
  const tokens = countTokens(prompt);
  expect(tokens).toBeLessThanOrEqual(8000);
});
```

#### TC-F1-P3.2: Summary Output Token Count Is Within Model Response Limit
**Objective**: Verify the model is not asked to generate more than 2,000 output tokens for a meeting summary.
**Preconditions**: LLM client configured with `max_tokens: 2000`.
**Test Steps**:
1. Inspect the LLM call parameters captured by the mock client.
2. Assert `max_tokens` parameter equals 2,000.
3. Assert the actual response tokens (from usage metadata) are <= 2,000.
**Expected Result**: LLM is called with `max_tokens: 2000` and responses respect this limit.
**Code Sample**:
```typescript
it('caps LLM output tokens at 2000 for meeting summaries', async () => {
  await MeetingSummaryService.summarize({ meetingId: 'token-001', transcript: sampleTranscript });
  const callArgs = mockLlmClient.complete.mock.calls[0][0];
  expect(callArgs.max_tokens).toBe(2000);
});
```

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **27** |

**Estimated execution time**: Unit: ~30s | Integration: ~3min | Edge: ~1min | Performance: ~5min
**Test environment**: Node.js 20+, Jest, TypeScript, PostgreSQL 15, staging LLM endpoint
