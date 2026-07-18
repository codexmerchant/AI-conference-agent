# EPIC05 Feature 4 — Slide-to-Topic Linking — Test Cases

## Test Overview
Comprehensive test suite for Slide-to-Topic Linking covering unit tests, integration tests, edge cases, and performance validation.

---

## 1. UNIT TEST SCENARIOS

### 1.1 OCR Text Extraction from Slides

#### TC-F4-U1.1: Slide Image OCR Produces Expected Text
**Objective**: Verify that the OCR pipeline extracts slide text accurately from a clean slide image.

**Preconditions**:
- OCR service configured and available
- Test slide PNG available in fixtures

**Test Steps**:
1. Load `fixture-slide-001.png` (title: "AI Ethics in Practice", bullet points listed)
2. Call `extractSlideText(imageBuffer)`
3. Assert extracted text contains "AI Ethics in Practice" and at least 3 bullet-point strings

**Expected Result**: Extracted text matches slide content; `confidence >= 0.95`.

**Code Sample**:
```typescript
describe('SlideOcrExtractor', () => {
  it('should extract slide title and bullets accurately from a clean PNG', async () => {
    const image = loadFixtureImage('fixture-slide-001.png');
    const extractor = new SlideOcrExtractor(mockOcrService);
    const result = await extractor.extractSlideText(image);

    expect(result.text).toContain('AI Ethics in Practice');
    expect(result.bullets.length).toBeGreaterThanOrEqual(3);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });
});
```

---

#### TC-F4-U1.2: Slide Metadata Extracted (Slide Number, Timestamp)
**Objective**: Verify the slide processor captures the slide capture timestamp and inferred slide index.

**Test Steps**:
1. Process a slide captured at known time `capturedAtMs = 1820000`
2. Call `processSlideCapture({ imageBuffer, capturedAtMs })`
3. Assert result has `slideIndex` and `capturedAtMs = 1820000`

**Expected Result**: Metadata fields populated; `slideIndex` is a positive integer.

**Code Sample**:
```typescript
it('should attach capture timestamp and slide index to processed slide', async () => {
  const result = await slideProcessor.processSlideCapture({ imageBuffer: testImage, capturedAtMs: 1820000 });
  expect(result.capturedAtMs).toBe(1820000);
  expect(result.slideIndex).toBeGreaterThan(0);
});
```

---

#### TC-F4-U1.3: OCR Confidence Below Threshold Triggers Manual Review Flag
**Objective**: Verify that a blurry or low-contrast slide returns a low confidence score and sets `requiresReview = true`.

**Test Steps**:
1. Load `fixture-slide-blurry.png`
2. Call `extractSlideText(imageBuffer)`
3. Assert `confidence < 0.6` and `requiresReview = true`

**Expected Result**: Low-confidence result flagged for human review; no crash.

**Code Sample**:
```typescript
it('should flag low-confidence OCR result for manual review', async () => {
  const image = loadFixtureImage('fixture-slide-blurry.png');
  const result = await extractor.extractSlideText(image);
  expect(result.confidence).toBeLessThan(0.6);
  expect(result.requiresReview).toBe(true);
});
```

---

### 1.2 Semantic Alignment — Slide Text to Transcript Segment

#### TC-F4-U2.1: High Semantic Similarity Links Slide to Correct Segment
**Objective**: Verify the embedding-based aligner maps a slide to the transcript segment with the highest cosine similarity.

**Test Steps**:
1. Create embeddings for slide text "Machine Learning Model Deployment" and three transcript segments
2. Call `alignSlideToSegments(slideEmbedding, segmentEmbeddings)`
3. Assert the segment discussing "deploying ML models to production" is the top match

**Expected Result**: Top match segment has cosine similarity >= 0.85; correct segment selected.

**Code Sample**:
```typescript
describe('SlideSegmentAligner', () => {
  it('should align slide to the semantically closest transcript segment', async () => {
    const slideEmbed = await embedText('Machine Learning Model Deployment');
    const segEmbeds = await Promise.all(segmentTexts.map(embedText));

    const aligner = new SlideSegmentAligner(embeddingService);
    const result = await aligner.alignSlideToSegments(slideEmbed, segEmbeds);

    expect(result.topMatch.segmentId).toBe('seg-ml-deployment');
    expect(result.topMatch.similarity).toBeGreaterThanOrEqual(0.85);
  });
});
```

---

#### TC-F4-U2.2: Time-Window Constraint Improves Alignment Accuracy
**Objective**: Verify that restricting candidate segments to a ±3-minute window around the slide capture time improves alignment.

**Test Steps**:
1. Provide 50 segments spanning 60 minutes; slide captured at minute 30
2. Call `alignSlideToSegments` with `timeWindowMs: 180000`
3. Assert only segments within minutes 27–33 are considered

**Expected Result**: Candidate pool limited to time-window segments; correct segment matched.

**Code Sample**:
```typescript
it('should restrict alignment candidates to the capture time window', async () => {
  const result = await aligner.alignSlideToSegments(slideEmbed, allSegmentEmbeds, {
    capturedAtMs: 1800000,
    timeWindowMs: 180000
  });
  expect(result.candidatesConsidered).toBeLessThan(allSegments.length);
  result.candidates.forEach(c => {
    expect(c.startMs).toBeGreaterThanOrEqual(1620000);
    expect(c.startMs).toBeLessThanOrEqual(1980000);
  });
});
```

---

#### TC-F4-U2.3: Topic Label Derived from Slide + Segment Combined Text
**Objective**: Verify the topic labeler generates a concise topic from the combined text of a slide and its matched segment.

**Test Steps**:
1. Provide slide text "Regulatory Compliance Frameworks" + matched segment text discussing GDPR
2. Call `deriveTopicLabel(slideText, segmentText)`
3. Assert returned label is concise (1–5 words) and semantically appropriate

**Expected Result**: Label like "GDPR Compliance" or "Regulatory Frameworks"; length 1–5 words.

**Code Sample**:
```typescript
it('should derive a concise topic label from slide and matched segment text', async () => {
  const label = await deriveTopicLabel(
    'Regulatory Compliance Frameworks',
    'We need to ensure all data handling meets GDPR requirements outlined in Article 17...'
  );
  const wordCount = label.split(' ').length;
  expect(wordCount).toBeGreaterThanOrEqual(1);
  expect(wordCount).toBeLessThanOrEqual(5);
  expect(label.toLowerCase()).toMatch(/compli|gdpr|regulat/);
});
```

---

### 1.3 Link Persistence and Retrieval

#### TC-F4-U3.1: Slide-Segment Link Stored in Database
**Objective**: Verify a confirmed slide-segment link is written to the `slide_links` table with required fields.

**Test Steps**:
1. Call `saveSlideLink({ sessionId, slideId, segmentId, similarity, topicLabel })`
2. Query database for the record
3. Assert all fields present

**Expected Result**: Record exists with correct `sessionId`, `slideId`, `segmentId`, `similarity`, `topicLabel`, `createdAt`.

**Code Sample**:
```typescript
describe('SlideLinkRepository', () => {
  it('should persist a slide-segment link with all required fields', async () => {
    await saveSlideLink({ sessionId: 'sess-1', slideId: 'slide-3', segmentId: 'seg-047', similarity: 0.91, topicLabel: 'GDPR Compliance' });
    const record = await db.slideLinks.findOne({ where: { slideId: 'slide-3' } });
    expect(record).not.toBeNull();
    expect(record!.similarity).toBeCloseTo(0.91, 2);
    expect(record!.topicLabel).toBe('GDPR Compliance');
  });
});
```

---

#### TC-F4-U3.2: Segment-to-Slide Lookup Returns Correct Slide
**Objective**: Verify querying by `segmentId` returns the linked slide.

**Test Steps**:
1. Seed a slide link for `segmentId = 'seg-047'`
2. Call `getSlideForSegment('seg-047')`
3. Assert returned slide matches seeded link

**Expected Result**: Correct slide returned; `topicLabel` matches stored value.

**Code Sample**:
```typescript
it('should return the linked slide when querying by segment ID', async () => {
  await seedSlideLink({ segmentId: 'seg-047', slideId: 'slide-3', topicLabel: 'GDPR Compliance' });
  const slide = await slideLinkRepo.getSlideForSegment('seg-047');
  expect(slide!.slideId).toBe('slide-3');
  expect(slide!.topicLabel).toBe('GDPR Compliance');
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Slide Capture to Linked Topic Pipeline

#### TC-F4-I1.1: End-to-End Slide Linking from Camera Capture
**Objective**: Verify a slide captured via the mobile camera is OCR'd, aligned to a transcript segment, and linked within the session.

**Preconditions**:
- Active session with streaming transcript
- Slide capture API available

**Test Steps**:
1. POST an image to `POST /sessions/{id}/slides/capture`
2. Poll `GET /sessions/{id}/slides/{slideId}/link-status` until `status = 'LINKED'`
3. Assert response contains `segmentId`, `topicLabel`, `similarity`

**Expected Result**: Slide linked within 10 s; all fields populated.

**Code Sample**:
```typescript
it('should link a captured slide to a transcript segment within 10 seconds', async () => {
  const { slideId } = await apiClient.post(`/sessions/${sessionId}/slides/capture`, { image: testImageBase64 });

  const linkResult = await waitFor(
    () => apiClient.get(`/sessions/${sessionId}/slides/${slideId}/link-status`),
    { until: r => r.data.status === 'LINKED', timeout: 10000 }
  );

  expect(linkResult.data.segmentId).toBeDefined();
  expect(linkResult.data.topicLabel).toBeDefined();
  expect(linkResult.data.similarity).toBeGreaterThan(0.7);
});
```

---

#### TC-F4-I1.2: Topic Labels Propagated to Session Timeline
**Objective**: Verify that once slides are linked, the session timeline view shows topic labels at correct timestamps.

**Test Steps**:
1. Seed 5 slide links for a session at various timestamps
2. Fetch `GET /sessions/{id}/timeline`
3. Assert timeline entries at slide timestamps contain `topicLabel`

**Expected Result**: Timeline includes 5 labeled topic markers at correct positions.

**Code Sample**:
```typescript
it('should include slide-derived topic labels in the session timeline', async () => {
  await seedSlideLinks(sessionId, 5);
  const timeline = await apiClient.get(`/sessions/${sessionId}/timeline`);
  const topicMarkers = timeline.data.markers.filter((m: any) => m.type === 'TOPIC');
  expect(topicMarkers).toHaveLength(5);
  topicMarkers.forEach((m: any) => expect(m.topicLabel).toBeDefined());
});
```

---

### 2.2 Cross-Feature Topic Consumption

#### TC-F4-I2.1: Session Search (Feature 7) Finds Segments by Topic Label
**Objective**: Verify that after slide linking, searching for a topic label via Session Search returns the linked segments.

**Test Steps**:
1. Seed a slide link with `topicLabel = 'Zero Trust Security'`
2. Call `GET /sessions/search?q=Zero+Trust+Security`
3. Assert result includes the linked segment

**Expected Result**: Search results include the segment with matching topic label.

**Code Sample**:
```typescript
it('should find segments by slide-derived topic label via session search', async () => {
  await seedSlideLink(sessionId, { topicLabel: 'Zero Trust Security', segmentId: 'seg-112' });
  const results = await apiClient.get('/sessions/search?q=Zero+Trust+Security');
  const match = results.data.results.find((r: any) => r.segmentId === 'seg-112');
  expect(match).toBeDefined();
  expect(match.topicLabel).toBe('Zero Trust Security');
});
```

---

#### TC-F4-I2.2: Topic Cluster (Feature 8) Groups Slide-Linked Segments
**Objective**: Verify that Topic Clustering uses slide-derived topic labels as seed labels when available.

**Test Steps**:
1. Seed 10 slide links with 3 distinct topic labels
2. Run topic clustering for the session
3. Assert clusters align with the 3 topic labels

**Expected Result**: 3 clusters produced; each cluster's label matches a slide-derived topic label.

**Code Sample**:
```typescript
it('should use slide-derived topic labels as seeds for topic clustering', async () => {
  await seedSlideLinks(sessionId, 10, ['AI Ethics', 'Data Privacy', 'Model Deployment']);
  const clusters = await topicClusterer.cluster(sessionId);
  const labels = clusters.map(c => c.label);
  expect(labels).toContain('AI Ethics');
  expect(labels).toContain('Data Privacy');
  expect(labels).toContain('Model Deployment');
});
```

---

### 2.3 Manual Correction Workflow

#### TC-F4-I3.1: User Corrects Slide Link via API
**Objective**: Verify that a user can manually reassign a slide to a different segment and the correction is persisted.

**Test Steps**:
1. Seed an auto-linked slide (slide-5 → seg-020)
2. User calls `PATCH /sessions/{id}/slides/slide-5/link` with `segmentId: 'seg-035'`
3. Fetch updated link
4. Assert `segmentId = 'seg-035'` and `method = 'MANUAL'`

**Expected Result**: Updated link reflects manual correction.

**Code Sample**:
```typescript
it('should persist manual slide link correction with MANUAL method flag', async () => {
  await seedSlideLink(sessionId, { slideId: 'slide-5', segmentId: 'seg-020' });
  await apiClient.patch(`/sessions/${sessionId}/slides/slide-5/link`, { segmentId: 'seg-035' });

  const link = await apiClient.get(`/sessions/${sessionId}/slides/slide-5/link`);
  expect(link.data.segmentId).toBe('seg-035');
  expect(link.data.method).toBe('MANUAL');
});
```

---

#### TC-F4-I3.2: Manual Correction Does Not Affect Other Slide Links
**Objective**: Verify that manually correcting one slide link does not trigger re-alignment of other slides.

**Test Steps**:
1. Seed 5 slide links
2. Manually correct slide-3's link
3. Fetch all slide links
4. Assert links for slides 1, 2, 4, 5 are unchanged

**Expected Result**: Only slide-3 updated; other links have original segment IDs.

**Code Sample**:
```typescript
it('should not alter other slide links when one is manually corrected', async () => {
  const original = await seedSlideLinks(sessionId, 5);
  await apiClient.patch(`/sessions/${sessionId}/slides/slide-3/link`, { segmentId: 'seg-099' });

  const all = await apiClient.get(`/sessions/${sessionId}/slides/links`);
  [1, 2, 4, 5].forEach(i => {
    const link = all.data.find((l: any) => l.slideId === `slide-${i}`);
    expect(link.segmentId).toBe(original[i - 1].segmentId);
  });
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Slides with No Text Content

#### TC-F4-E1.1: Image-Only Slide Handled Gracefully
**Objective**: Verify the system does not crash on a slide that contains only an image/chart with no text.

**Test Steps**:
1. Pass a slide image containing only a bar chart graphic
2. Call `extractSlideText(imageBuffer)`
3. Assert `text = ''` and `requiresReview = true`; no exception

**Expected Result**: Empty text result returned; `requiresReview = true`; no alignment attempted.

**Code Sample**:
```typescript
it('should return empty text and set requiresReview for image-only slides', async () => {
  const chartImage = loadFixtureImage('chart-only-slide.png');
  const result = await extractor.extractSlideText(chartImage);
  expect(result.text.trim()).toBe('');
  expect(result.requiresReview).toBe(true);
});
```

---

#### TC-F4-E1.2: Slide with Only a Company Logo
**Objective**: Verify a title/logo slide returns no topic label and no segment link.

**Test Steps**:
1. Process a slide containing only a company logo and tagline
2. Run full slide linking pipeline
3. Assert link status = `'UNLINKED'` and `topicLabel = null`

**Expected Result**: No link created; status set to `UNLINKED`.

**Code Sample**:
```typescript
it('should not create a link for a logo-only slide', async () => {
  const { slideId } = await slideProcessor.process({ imageBuffer: logoSlide, sessionId });
  const status = await slideLinkRepo.getLinkStatus(slideId);
  expect(status).toBe('UNLINKED');
});
```

---

### 3.2 Timing Mismatches

#### TC-F4-E2.1: Slide Captured Before Session Start Timestamp
**Objective**: Verify a slide captured before `session.startMs` is not linked and generates a warning.

**Test Steps**:
1. Set `session.startMs = 1000000`
2. Process a slide with `capturedAtMs = 500000`
3. Assert `warnings: ['CAPTURE_BEFORE_SESSION_START']`; no link created

**Expected Result**: Warning issued; slide flagged as `OUT_OF_RANGE`.

**Code Sample**:
```typescript
it('should warn and skip linking for slides captured before session start', async () => {
  const result = await slideProcessor.process({ imageBuffer: testImage, capturedAtMs: 500000, sessionStartMs: 1000000 });
  expect(result.warnings).toContain('CAPTURE_BEFORE_SESSION_START');
  expect(result.linkStatus).toBe('OUT_OF_RANGE');
});
```

---

#### TC-F4-E2.2: No Transcript Segments in Time Window
**Objective**: Verify the aligner handles a case where no segments exist within the ±3-minute window of slide capture.

**Test Steps**:
1. Provide segments only before minute 10 and after minute 20
2. Capture a slide at minute 15
3. Call `alignSlideToSegments` with default time window
4. Assert result has `topMatch = null` and `reason = 'NO_CANDIDATES_IN_WINDOW'`

**Expected Result**: No link created; reason code set correctly.

**Code Sample**:
```typescript
it('should return null match when no transcript segments exist in the capture time window', async () => {
  const result = await aligner.alignSlideToSegments(slideEmbed, gappedSegmentEmbeds, {
    capturedAtMs: 900000,
    timeWindowMs: 180000
  });
  expect(result.topMatch).toBeNull();
  expect(result.reason).toBe('NO_CANDIDATES_IN_WINDOW');
});
```

---

### 3.3 Rapid Slide Advancement

#### TC-F4-E3.1: Presenter Advances 10 Slides in 30 Seconds
**Objective**: Verify the system queues and processes rapid slide captures without dropping or confusing links.

**Test Steps**:
1. Submit 10 slide captures with timestamps 3 s apart
2. Allow pipeline to process all
3. Assert 10 distinct slide entries exist; no two slides share the same `segmentId`

**Expected Result**: 10 slides processed; no collision or duplication of segment links.

**Code Sample**:
```typescript
it('should process 10 rapid slide captures without link collision', async () => {
  const captures = Array.from({ length: 10 }, (_, i) => ({
    imageBuffer: slideImages[i],
    capturedAtMs: 600000 + i * 3000
  }));
  const results = await Promise.all(captures.map(c => slideProcessor.process({ ...c, sessionId })));
  const segmentIds = results.map(r => r.linkedSegmentId).filter(Boolean);
  const unique = new Set(segmentIds);
  expect(results).toHaveLength(10);
  expect(unique.size).toBe(segmentIds.length); // no duplicates
});
```

---

#### TC-F4-E3.2: Duplicate Slide Capture Detected and Skipped
**Objective**: Verify that submitting the same slide image twice (e.g., network retry) creates only one link entry.

**Test Steps**:
1. POST the same slide image twice within 1 s
2. Fetch all slide entries for the session
3. Assert only one entry exists with a deduplication flag

**Expected Result**: Single slide record; `duplicateOf` reference on second submission.

**Code Sample**:
```typescript
it('should deduplicate identical slide captures submitted within 1 second', async () => {
  await apiClient.post(`/sessions/${sessionId}/slides/capture`, { image: testImageBase64 });
  const second = await apiClient.post(`/sessions/${sessionId}/slides/capture`, { image: testImageBase64 });

  expect(second.data.duplicateOf).toBeDefined();
  const all = await apiClient.get(`/sessions/${sessionId}/slides`);
  const originals = all.data.slides.filter((s: any) => !s.duplicateOf);
  expect(originals).toHaveLength(1);
});
```

---

## 4. PERFORMANCE VALIDATION

### 4.1 OCR and Embedding Speed

#### TC-F4-P1.1: OCR Processing Latency Per Slide
**Objective**: Verify OCR extraction from a single slide completes in <= 800 ms.

**Test Steps**:
1. Time `extractSlideText` for 20 slide images

**Expected Result**: p95 <= 800 ms; p50 <= 500 ms.

**Code Sample**:
```typescript
it('should extract slide text in under 800ms p95', async () => {
  const runs = await benchmark(
    () => extractor.extractSlideText(loadFixtureImage('clean-slide.png')),
    { iterations: 20 }
  );
  expect(runs.p95).toBeLessThan(800);
  expect(runs.p50).toBeLessThan(500);
});
```

---

#### TC-F4-P1.2: Alignment Search Across 10,000 Segment Embeddings
**Objective**: Verify slide-to-segment alignment completes in <= 300 ms even with 10,000 candidate segments.

**Test Steps**:
1. Generate 10,000 segment embeddings
2. Time `alignSlideToSegments(slideEmbed, segmentEmbeds)`

**Expected Result**: Alignment completes <= 300 ms; correct top match returned.

**Code Sample**:
```typescript
it('should align a slide to the best segment across 10k candidates in under 300ms', async () => {
  const segEmbeds = await generateEmbeddings(10000);
  const start = performance.now();
  await aligner.alignSlideToSegments(slideEmbed, segEmbeds);
  expect(performance.now() - start).toBeLessThan(300);
});
```

---

### 4.2 Concurrent Slide Processing

#### TC-F4-P2.1: 50 Simultaneous Slide Capture Requests
**Objective**: Verify the API handles 50 concurrent slide capture and linking requests without error.

**Test Steps**:
1. Fire 50 concurrent POST requests to `/sessions/{id}/slides/capture`
2. Assert all 50 return success responses

**Expected Result**: All 50 succeed; no 5xx errors; processing queue stable.

**Code Sample**:
```typescript
it('should handle 50 concurrent slide capture requests without errors', async () => {
  const requests = Array.from({ length: 50 }, (_, i) =>
    apiClient.post(`/sessions/${sessionId}/slides/capture`, { image: slideImages[i % 10] })
  );
  const responses = await Promise.allSettled(requests);
  const failures = responses.filter(r => r.status === 'rejected');
  expect(failures).toHaveLength(0);
});
```

---

#### TC-F4-P2.2: End-to-End Slide Linking Throughput
**Objective**: Verify that 100 slides from a full-day conference can be linked in under 60 s when processed in batches.

**Test Steps**:
1. Seed 100 slide images and a 480-minute transcript
2. Run batch slide linking
3. Measure total elapsed time

**Expected Result**: All 100 slides linked within 60 s.

**Code Sample**:
```typescript
it('should link 100 slides from a full-day conference in under 60 seconds', async () => {
  const slides = loadFixtureSlides(100);
  const start = performance.now();
  await slideLinker.batchLink(sessionId, slides);
  expect(performance.now() - start).toBeLessThan(60000);

  const links = await slideLinkRepo.getAllForSession(sessionId);
  expect(links).toHaveLength(100);
}, 65000);
```

---

### 4.3 Storage and Scalability

#### TC-F4-P3.1: Slide Image Storage Size Validation
**Objective**: Verify slide images are compressed before storage and stay under 200 KB per slide.

**Test Steps**:
1. Process 10 raw slide images (average 2 MB each)
2. Assert stored versions are under 200 KB each

**Expected Result**: Each stored image <= 200 KB; visual quality remains readable.

**Code Sample**:
```typescript
it('should compress slide images to under 200KB before storage', async () => {
  const slides = await Promise.all(rawImages.map(img => slideProcessor.process({ imageBuffer: img, sessionId })));
  for (const slide of slides) {
    const stored = await storageService.getFileSize(slide.storageKey);
    expect(stored).toBeLessThan(200 * 1024);
  }
});
```

---

#### TC-F4-P3.2: Slide Link Index Query Performance
**Objective**: Verify `GET /sessions/{id}/slides/links` returns all links for a session with 200 slides in <= 200 ms.

**Test Steps**:
1. Seed 200 slide links for a session
2. Time the fetch operation

**Expected Result**: Response time <= 200 ms; all 200 links returned.

**Code Sample**:
```typescript
it('should return 200 slide links within 200ms', async () => {
  await seedSlideLinks(sessionId, 200);
  const start = performance.now();
  const res = await apiClient.get(`/sessions/${sessionId}/slides/links`);
  expect(performance.now() - start).toBeLessThan(200);
  expect(res.data.links).toHaveLength(200);
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
