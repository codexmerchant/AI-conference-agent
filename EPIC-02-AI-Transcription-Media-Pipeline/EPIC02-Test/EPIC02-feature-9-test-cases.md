# EPIC02 Feature 9 — Transcript Segmentation — Test Cases

## Test Overview
Comprehensive test suite for Transcript Segmentation covering unit tests, integration tests, edge cases, and performance validation. This feature divides raw ASR output into meaningful, structured segments (sentences, paragraphs, topic sections) using punctuation, silence detection, semantic analysis, and speaker-change boundaries.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Sentence Boundary Detection

#### TC-F9-U1.1: Punctuation-Based Sentence Splitting
**Objective**: Verify the segmenter correctly splits a long transcript string into individual sentences at terminal punctuation marks.

**Preconditions**:
- `TranscriptSegmenter` initialized with English sentence model
- Raw transcript string available

**Test Steps**:
1. Call `segmenter.splitSentences("Hello world. How are you? I am fine. Thank you.")`
2. Assert returns 4 sentence strings
3. Assert each sentence ends with terminal punctuation

**Expected Result**: 4 sentences returned; each ends with `.`, `?`, or `!`.

**Code Sample**:
```typescript
describe('TranscriptSegmenter', () => {
  it('should split transcript into sentences at punctuation boundaries', () => {
    const segmenter = new TranscriptSegmenter({ language: 'en' });
    const sentences = segmenter.splitSentences('Hello world. How are you? I am fine. Thank you.');

    expect(sentences).toHaveLength(4);
    sentences.forEach(s => expect(s).toMatch(/[.?!]$/));
  });
});
```

---

#### TC-F9-U1.2: Sentence Boundary Preserved Across Speaker Turn
**Objective**: Verify that when a sentence begins with speaker A and ends with speaker B (an interrupted sentence), it is treated as two separate segments.

**Test Steps**:
1. Build a raw transcript with speaker turns mid-sentence
2. Call `segmenter.splitWithSpeakerBoundaries(rawTranscript, speakerTurns)`
3. Assert segments split at speaker turn boundary even if mid-sentence

**Expected Result**: Segment boundary created at every speaker turn, even if it splits a sentence.

**Code Sample**:
```typescript
it('should split segments at speaker turn boundaries mid-sentence', () => {
  const rawText = 'The revenue was up twenty percent in the';
  const speakerTurns = [{ atWord: 6, fromSpeaker: 'SPK-0001', toSpeaker: 'SPK-0002' }];

  const segments = segmenter.splitWithSpeakerBoundaries(rawText, speakerTurns);

  expect(segments).toHaveLength(2);
  expect(segments[0].speakerId).toBe('SPK-0001');
  expect(segments[1].speakerId).toBe('SPK-0002');
});
```

---

#### TC-F9-U1.3: Abbreviation Handling — No False Sentence Boundary on "Dr.", "e.g.", "U.S."
**Objective**: Verify the segmenter does not split at common abbreviations that contain periods.

**Test Steps**:
1. Call `segmenter.splitSentences("Dr. Smith presented the U.S. data. The results were good.")`
2. Assert exactly 2 sentences returned (not 4 or 5 due to abbreviation dots)

**Expected Result**: Exactly 2 sentences; abbreviation periods do not trigger splits.

**Code Sample**:
```typescript
it('should not split sentences at common abbreviation periods', () => {
  const sentences = segmenter.splitSentences('Dr. Smith presented the U.S. data. The results were good.');

  expect(sentences).toHaveLength(2);
  expect(sentences[0]).toContain('Dr. Smith');
  expect(sentences[0]).toContain('U.S.');
});
```

---

### 1.2 Topic Segmentation

#### TC-F9-U2.1: TextTiling Topic Boundary Detection
**Objective**: Verify the topic segmenter identifies cohesive topic blocks using TextTiling algorithm on a transcript with 3 distinct topics.

**Test Steps**:
1. Build a transcript with 3 distinct topics: product features, market analysis, Q&A
2. Call `topicSegmenter.segment(transcript)`
3. Assert 3 topic blocks detected
4. Assert topic labels are distinct

**Expected Result**: 3 topic blocks; each covers the correct portion of the transcript.

**Code Sample**:
```typescript
describe('TopicSegmenter', () => {
  it('should detect 3 topic blocks in a transcript', async () => {
    const segmenter = new TopicSegmenter(mockEmbeddingModel);
    const transcript = buildMultiTopicTranscript(['product', 'market', 'qa']);

    const topics = await segmenter.segment(transcript);

    expect(topics).toHaveLength(3);
    expect(topics[0].label).not.toBe(topics[1].label);
    expect(topics[1].label).not.toBe(topics[2].label);
  });
});
```

---

#### TC-F9-U2.2: Topic Segment Has Start/End Word Indices
**Objective**: Verify each detected topic segment carries `startWordIndex` and `endWordIndex` that correctly partition the full word list.

**Test Steps**:
1. Segment a 100-word transcript into 3 topics
2. Assert `topics[0].startWordIndex === 0`
3. Assert `topics[2].endWordIndex === 99`
4. Assert consecutive topic indices are contiguous (no gaps or overlaps)

**Expected Result**: Topic indices form a complete, non-overlapping partition of the transcript.

**Code Sample**:
```typescript
it('should produce contiguous word index ranges for topic segments', async () => {
  const transcript = generateWordTranscript(100);
  const topics = await topicSegmenter.segment(transcript);

  expect(topics[0].startWordIndex).toBe(0);
  expect(topics[topics.length - 1].endWordIndex).toBe(99);

  for (let i = 1; i < topics.length; i++) {
    expect(topics[i].startWordIndex).toBe(topics[i - 1].endWordIndex + 1);
  }
});
```

---

#### TC-F9-U2.3: Minimum Topic Length Enforcement (>= 5 Sentences)
**Objective**: Verify topic segments shorter than 5 sentences are merged with the adjacent topic rather than emitted as standalone micro-segments.

**Test Steps**:
1. Construct a transcript where topic 2 has only 2 sentences before a topic shift
2. Assert that topic 2 is merged with topic 1 or 3 (not emitted alone)
3. Assert final topic count is 2, not 3

**Expected Result**: Short 2-sentence topic not emitted; merged into neighbor; 2 topics total.

---

### 1.3 Silence-Based Segmentation

#### TC-F9-U3.1: Paragraph Breaks at Silence > 2 Seconds
**Objective**: Verify the segmenter creates a paragraph boundary wherever the audio contains a silence gap of 2 seconds or more.

**Test Steps**:
1. Build a transcript with word-level timestamps where a 2.5-second silence occurs at word 20
2. Assert segment break introduced at word 20
3. Assert 2 segments total

**Expected Result**: Segment boundary at the 2.5-second silence; 2 segments produced.

**Code Sample**:
```typescript
describe('SilenceSegmenter', () => {
  it('should create segment boundary at silence > 2 seconds', () => {
    const words = [
      ...generateWords(20, { durationMs: 500, gapMs: 100 }),
      ...generateWords(20, { durationMs: 500, gapMs: 100, startMs: 20 * 600 + 2500 }) // 2.5s gap
    ];

    const segments = segmenter.segmentBySilence(words, { silenceThresholdMs: 2000 });

    expect(segments).toHaveLength(2);
    expect(segments[0].words.length).toBe(20);
    expect(segments[1].words.length).toBe(20);
  });
});
```

---

#### TC-F9-U3.2: Short Pauses (< 1 Second) Do Not Create Segments
**Objective**: Verify brief pauses within normal speech cadence (< 1 second) do not create unnecessary segment breaks.

**Test Steps**:
1. Build a 50-word transcript with 0.5-second pauses between each word group of 5
2. Assert only 1 segment returned (no splits at 0.5s pauses)

**Expected Result**: 1 segment returned; short pauses do not fragment transcript.

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Pipeline-Level Segmentation

#### TC-F9-I1.1: Raw ASR Output Segmented and Stored as DB Records
**Objective**: Verify that raw ASR output from the transcription engine is automatically segmented and each segment stored as a separate database record within 5 seconds.

**Preconditions**:
- Segmentation service subscribed to `transcription.final` events
- PostgreSQL running

**Test Steps**:
1. Emit `transcription.final` event with a 200-word raw transcript
2. Wait up to 5 seconds
3. Query `transcript_segments` table for the session
4. Assert at least 5 rows returned with non-null `text`, `startMs`, `endMs`

**Expected Result**: >= 5 segment rows in DB within 5 seconds; all required fields populated.

**Code Sample**:
```typescript
it('should segment and store transcript records within 5 seconds', async () => {
  await eventBus.emit('transcription.final', {
    sessionId: 'sess-seg-01',
    rawText: twoHundredWordTranscript,
    words: wordTimestamps
  });

  await waitFor(async () => {
    const rows = await db.query('SELECT * FROM transcript_segments WHERE session_id = $1', ['sess-seg-01']);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    rows.forEach(r => {
      expect(r.text).toBeTruthy();
      expect(r.start_ms).toBeGreaterThanOrEqual(0);
    });
  }, { timeout: 5000, interval: 200 });
}, 10000);
```

---

#### TC-F9-I1.2: Segmentation Applies Speaker Labels from Diarization
**Objective**: Verify that when diarization data is available, segments are split at speaker boundaries and each segment carries the correct `speakerId`.

**Test Steps**:
1. Trigger segmentation with both ASR output and diarization timeline
2. Assert all segments have `speakerId` set
3. Assert no segment spans a speaker turn boundary

**Expected Result**: Speaker-aware segmentation; all segments have `speakerId`; no segment crosses a turn boundary.

---

### 2.2 Topic Hierarchy Storage

#### TC-F9-I2.1: Topic-Segment Hierarchy Stored with Parent References
**Objective**: Verify that topic segments and their child sentence segments are stored with correct parent-child foreign key relationships.

**Test Steps**:
1. Process a transcript through topic segmentation
2. Query `topic_segments` and `transcript_segments` tables
3. Assert each `transcript_segment` has `topic_segment_id` FK matching a topic in `topic_segments`

**Expected Result**: All transcript segments linked to a parent topic segment via FK.

---

#### TC-F9-I2.2: Session Summary Generated from Topic Segments
**Objective**: Verify an AI-generated session summary is produced using the detected topic segments as structural inputs.

**Test Steps**:
1. Process a session through full segmentation pipeline
2. Call `summaryService.generateSummary('sess-sum-01')`
3. Assert summary is non-empty
4. Assert summary references each detected topic by name

**Expected Result**: Session summary generated; each topic name appears in summary text.

**Code Sample**:
```typescript
it('should generate a session summary referencing all topic segments', async () => {
  const summary = await summaryService.generateSummary('sess-sum-01');

  expect(summary.text.length).toBeGreaterThan(100);
  const topicLabels = await topicSegmentStore.getLabels('sess-sum-01');
  topicLabels.forEach(label => expect(summary.text).toContain(label));
});
```

---

### 2.3 Search and Navigation Integration

#### TC-F9-I3.1: Segment Navigation from Search Result
**Objective**: Verify that clicking a search result navigates the playback position to the start of the corresponding transcript segment.

**Test Steps**:
1. Index transcript segments
2. Search for a keyword in segment 5 of session `sess-nav-01`
3. Assert search result includes `startMs` and `segmentId` for segment 5
4. Assert `GET /sessions/sess-nav-01/seek?segmentId=seg-5` returns the correct `audioOffsetMs`

**Expected Result**: Search result navigable; seek endpoint returns correct audio offset.

---

#### TC-F9-I3.2: Transcript Download Includes Segmented Paragraphs with Timestamps
**Objective**: Verify the transcript download export formats segmented paragraphs with timestamps in SRT/VTT format.

**Test Steps**:
1. GET `/sessions/sess-dl-01/transcript?format=vtt`
2. Assert response has `Content-Type: text/vtt`
3. Assert VTT content has >= 5 timestamp cues
4. Assert each cue has `startTime --> endTime` and text

**Expected Result**: Valid VTT file with >= 5 cued segments; all cues have start/end times and text.

---

## 3. EDGE CASE VALIDATION

### 3.1 Transcript Content Edge Cases

#### TC-F9-E1.1: All-Questions Transcript (No Statements)
**Objective**: Verify a transcript consisting entirely of questions segments correctly without creating false boundaries at every `?`.

**Test Steps**:
1. Feed transcript: "Where is the data? What does it mean? How do we respond? When did this start?"
2. Assert 4 segments produced (1 per question)
3. Assert no segment is empty

**Expected Result**: 4 segments; each is a complete question; no empty segments.

**Code Sample**:
```typescript
it('should segment a questions-only transcript into 4 question segments', () => {
  const segments = segmenter.splitSentences(
    'Where is the data? What does it mean? How do we respond? When did this start?'
  );

  expect(segments).toHaveLength(4);
  segments.forEach(s => {
    expect(s.trim()).toBeTruthy();
    expect(s).toMatch(/\?$/);
  });
});
```

---

#### TC-F9-E1.2: Very Long Single Sentence (> 200 Words)
**Objective**: Verify the segmenter handles an extremely long run-on sentence without infinite loops or crashes, applying a hard maximum segment length.

**Test Steps**:
1. Feed a 250-word sentence with no punctuation
2. Assert segmenter splits at `maxWordsPerSegment: 100` boundary
3. Assert 3 segments produced; all non-empty

**Expected Result**: Run-on sentence force-split at 100-word boundary; 3 segments; no crash.

**Code Sample**:
```typescript
it('should force-split run-on sentences at maxWordsPerSegment', () => {
  const runOn = generateWords(250).join(' ');
  const segments = segmenter.splitSentences(runOn, { maxWordsPerSegment: 100 });

  expect(segments).toHaveLength(3);
  segments.forEach(s => expect(s.split(' ').length).toBeLessThanOrEqual(100));
});
```

---

### 3.2 Multi-Language Segmentation

#### TC-F9-E2.1: German Compound Words Not Split Mid-Word
**Objective**: Verify that German compound words (e.g., "Softwareentwicklung") are never split at hyphens or internal compound boundaries during segmentation.

**Test Steps**:
1. Feed a German transcript containing "Softwareentwicklung und Datenbankmanagement"
2. Assert no segment ends mid-compound (e.g., no segment ending with "Software" or "Datenbank")

**Expected Result**: German compound words preserved intact within segments.

---

#### TC-F9-E2.2: Chinese Text Segmented Without Space Delimiters
**Objective**: Verify the segmenter correctly segments Chinese text that uses punctuation (。？！) rather than spaces as delimiters.

**Test Steps**:
1. Feed Chinese transcript: `"你好世界。今天天气怎么样？我很好。谢谢。"`
2. Assert 4 segments returned at Chinese terminal punctuation marks

**Expected Result**: 4 Chinese segments correctly identified; no empty segments.

**Code Sample**:
```typescript
it('should segment Chinese text at Chinese punctuation marks', () => {
  const segmenter = new TranscriptSegmenter({ language: 'zh' });
  const segments = segmenter.splitSentences('你好世界。今天天气怎么样？我很好。谢谢。');

  expect(segments).toHaveLength(4);
  segments.forEach(s => expect(s.trim()).toBeTruthy());
});
```

---

### 3.3 Boundary Conflict Resolution

#### TC-F9-E3.1: Silence Boundary Overrides Sentence Mid-Point
**Objective**: Verify that when a silence boundary falls inside a sentence, the silence boundary takes precedence and the sentence is split there.

**Test Steps**:
1. Build transcript where a 3-second silence falls at word 7 of a 15-word sentence
2. Assert segmenter creates a break at word 7 (silence boundary)
3. Assert 2 segments; silence-split takes priority over sentence completeness

**Expected Result**: Silence boundary takes precedence; 2 segments at silence point.

---

#### TC-F9-E3.2: Speaker Turn and Sentence Boundary Coincide — No Duplicate Split
**Objective**: Verify that when a speaker turn and a sentence boundary occur at the same word index, only one segment boundary is created (not two).

**Test Steps**:
1. Build transcript where sentence ends AND speaker changes at word 15
2. Assert segmenter produces only 1 boundary at word 15 (not 2 adjacent empty segments)

**Expected Result**: Single boundary at word 15; no duplicate or empty segment created.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Processing Speed

#### TC-F9-P1.1: 10,000-Word Transcript Segmented in < 500ms
**Objective**: Verify segmentation of a 10,000-word transcript completes in under 500ms.

**Test Steps**:
1. Generate a 10,000-word transcript fixture
2. Time full segmentation (sentence split + topic detection)
3. Assert < 500ms

**Expected Result**: 10,000-word transcript segmented in < 500ms.

**Code Sample**:
```typescript
it('should segment a 10,000-word transcript in under 500ms', async () => {
  const transcript = generateWordTranscript(10_000);
  const start = performance.now();

  await segmenter.fullSegment(transcript);

  expect(performance.now() - start).toBeLessThan(500);
});
```

---

#### TC-F9-P1.2: Throughput — 100 Sessions Segmented per Minute
**Objective**: Verify the segmentation service handles 100 concurrent 5-minute session transcripts within 60 seconds.

**Test Steps**:
1. Submit 100 session transcripts (each ~1500 words) concurrently
2. Wait for all to complete
3. Assert all complete within 60 seconds

**Expected Result**: 100 segmentation jobs complete in < 60 seconds.

---

### 4.2 Accuracy Benchmarks

#### TC-F9-P2.1: Sentence Segmentation F1 Score > 0.92 on Benchmark Corpus
**Objective**: Verify sentence boundary detection achieves F1 > 0.92 on a labeled transcription corpus.

**Test Steps**:
1. Run segmenter on 20 benchmark transcripts with labeled boundaries
2. Compute precision, recall, and F1 for sentence boundaries
3. Assert F1 > 0.92

**Expected Result**: F1 score > 0.92 on sentence boundary detection benchmark.

**Code Sample**:
```typescript
it('should achieve F1 > 0.92 for sentence boundary detection', async () => {
  const results = await Promise.all(
    benchmarkCorpus.map(async item => {
      const predicted = segmenter.splitSentences(item.text);
      return evaluateBoundaries(predicted, item.labeledBoundaries);
    })
  );

  const avgF1 = average(results.map(r => r.f1));
  expect(avgF1).toBeGreaterThan(0.92);
}, 120000);
```

---

#### TC-F9-P2.2: Topic Segmentation WinDiff Score < 0.15
**Objective**: Verify topic segmentation achieves a WinDiff error score below 0.15 on standard benchmark conversations (lower = better).

**Test Steps**:
1. Run topic segmenter on 10 benchmark multi-topic transcripts
2. Compute WinDiff for each
3. Assert average WinDiff < 0.15

**Expected Result**: Average WinDiff < 0.15 across 10 benchmarks.

---

### 4.3 Resource Efficiency

#### TC-F9-P3.1: Segmentation Worker Memory < 256MB per Session
**Objective**: Verify a segmentation worker processing a 2-hour session stays within 256MB memory.

**Test Steps**:
1. Monitor process memory during 2-hour session segmentation
2. Assert peak RSS delta < 256MB

**Expected Result**: Peak memory per segmentation job < 256MB.

---

#### TC-F9-P3.2: Incremental Streaming Segmentation — No Full-Buffer Requirement
**Objective**: Verify the segmenter can operate in streaming mode, emitting completed segments as they arrive without buffering the entire transcript.

**Test Steps**:
1. Feed words one-by-one to `segmenter.pushWord(word)`
2. Assert `segment` events are emitted as complete sentences are detected
3. Assert each emitted segment does not require knowledge of future words

**Expected Result**: Segments emitted in streaming fashion; no full-transcript buffer required.

**Code Sample**:
```typescript
it('should emit segments incrementally in streaming mode', async () => {
  const streamingSegmenter = segmenter.asStream();
  const emittedSegments: string[] = [];

  streamingSegmenter.on('segment', s => emittedSegments.push(s.text));

  for (const word of tenSentenceWords) {
    streamingSegmenter.pushWord(word);
  }
  await streamingSegmenter.flush();

  expect(emittedSegments.length).toBeGreaterThanOrEqual(9); // allow 1 pending
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

### Key Performance Targets
| Metric | Target |
|---|---|
| 10,000-word segmentation latency | < 500ms |
| Sentence boundary F1 score | > 0.92 |
| Topic WinDiff error | < 0.15 |
| Streaming mode latency per segment | < 200ms |
