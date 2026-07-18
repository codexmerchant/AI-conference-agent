# EPIC02 Feature 6 — Slide Extraction — Test Cases

## Test Overview
Comprehensive test suite for Slide Extraction covering unit tests, integration tests, edge cases, and performance validation. This feature detects slide boundaries in video streams and captured images, deduplicates identical slide frames, extracts clean slide snapshots, and links each slide to its display timestamp in the conference recording.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Slide Boundary Detection

#### TC-F6-U1.1: Scene Change Detection in Video Frame Sequence
**Objective**: Verify the scene-change detector identifies frame transitions where a new slide appears using pixel-difference threshold analysis.

**Preconditions**:
- `SlideDetector` initialized with frame differencing algorithm
- Video fixture with 3 distinct slides (each 30 frames) available

**Test Steps**:
1. Feed 90 frames from the fixture to `detector.analyze(frames)`
2. Assert 2 change points detected (transitions at frame 30 and 60)
3. Assert detected change frame indices are within ±2 frames of ground truth

**Expected Result**: 2 change points detected at correct indices ±2 frames.

**Code Sample**:
```typescript
describe('SlideDetector', () => {
  it('should detect slide transitions at correct frame indices', async () => {
    const detector = new SlideDetector({ pixelDiffThreshold: 0.15 });
    const frames = await loadVideoFrameFixture('3-slide-sequence');

    const changes = await detector.analyze(frames);

    expect(changes).toHaveLength(2);
    expect(changes[0].frameIndex).toBeGreaterThanOrEqual(28);
    expect(changes[0].frameIndex).toBeLessThanOrEqual(32);
    expect(changes[1].frameIndex).toBeGreaterThanOrEqual(58);
    expect(changes[1].frameIndex).toBeLessThanOrEqual(62);
  });
});
```

---

#### TC-F6-U1.2: Confidence Score for Slide vs. Non-Slide Transition
**Objective**: Verify the detector assigns high confidence to genuine slide changes and low confidence to irrelevant transitions (e.g., presenter walking in front of screen).

**Test Steps**:
1. Feed a frame sequence containing: a real slide change, a person walking past, and a camera focus shift
2. Assert slide-change confidence > 0.85
3. Assert person-walk confidence < 0.40
4. Assert focus-shift confidence < 0.30

**Expected Result**: Real slide transition high confidence; false transitions low confidence.

**Code Sample**:
```typescript
it('should assign high confidence to genuine slide changes', async () => {
  const frames = await loadFixture('mixed-transitions');
  const events = await detector.analyze(frames);

  const slideChange = events.find(e => e.type === 'slide_change');
  const personWalk = events.find(e => e.type === 'occlusion');
  const focusShift = events.find(e => e.type === 'focus');

  expect(slideChange!.confidence).toBeGreaterThan(0.85);
  expect(personWalk!.confidence).toBeLessThan(0.40);
  expect(focusShift!.confidence).toBeLessThan(0.30);
});
```

---

#### TC-F6-U1.3: Minimum Slide Duration Filter (< 2-Second Flashes Ignored)
**Objective**: Verify that slide transitions lasting fewer than 2 seconds (brief flashes or animations) are not reported as distinct slide captures.

**Test Steps**:
1. Create a frame sequence where slide B appears for only 1 second between slides A and C
2. Assert detector reports only 2 distinct slides (A and C), not 3

**Expected Result**: Only 2 slides extracted; the brief 1-second intermediate slide is filtered out.

**Code Sample**:
```typescript
it('should ignore slide transitions shorter than 2 seconds', async () => {
  const frames = createFrameSequence([
    { slide: 'A', durationSec: 10 },
    { slide: 'B', durationSec: 1 }, // should be filtered
    { slide: 'C', durationSec: 10 }
  ]);

  const slides = await extractor.extract(frames);
  expect(slides).toHaveLength(2);
  expect(slides[0].id).toBe('A');
  expect(slides[1].id).toBe('C');
});
```

---

### 1.2 Slide Deduplication

#### TC-F6-U2.1: Identical Slides Across Sessions Deduplicated by Hash
**Objective**: Verify that two extractions of the same slide produce the same content hash and only one is stored.

**Test Steps**:
1. Extract slide from session A at t=5m
2. Extract the same slide from session B at t=12m
3. Assert both produce identical `contentHash` values
4. Assert the deduplication store returns the same `slideId` for both

**Expected Result**: Both extractions produce identical `contentHash`; only 1 entry in slide store.

**Code Sample**:
```typescript
describe('SlideDeduplication', () => {
  it('should produce identical hashes and reuse slide ID for duplicate slides', async () => {
    const slideA = await extractor.extractFrame(sameSlideBuffer, { sessionId: 'sessA', offsetMs: 300000 });
    const slideB = await extractor.extractFrame(sameSlideBuffer, { sessionId: 'sessB', offsetMs: 720000 });

    expect(slideA.contentHash).toBe(slideB.contentHash);

    const storedA = await slideStore.getByHash(slideA.contentHash);
    const storedB = await slideStore.getByHash(slideB.contentHash);
    expect(storedA.slideId).toBe(storedB.slideId);
  });
});
```

---

#### TC-F6-U2.2: Near-Duplicate Detection for Slightly Animated Slides
**Objective**: Verify that two frames of the same slide with minor animation (e.g., a bullet point fading in) are recognized as the same slide via perceptual hash.

**Test Steps**:
1. Create two frames: base slide and slide with one bullet point at 50% opacity
2. Compute perceptual hash for both
3. Assert Hamming distance between hashes < 8 (threshold for same slide)

**Expected Result**: Hamming distance < 8; slides classified as same content.

**Code Sample**:
```typescript
it('should recognize near-duplicate slides via perceptual hash', async () => {
  const hash1 = await perceptualHasher.hash(baseSlideFrame);
  const hash2 = await perceptualHasher.hash(animatedSlideFrame);

  const hammingDist = computeHammingDistance(hash1, hash2);
  expect(hammingDist).toBeLessThan(8);
});
```

---

#### TC-F6-U2.3: Different Slides Not Merged Despite Similar Layout
**Objective**: Verify that two slides with identical templates but different content are NOT deduplicated.

**Test Steps**:
1. Create two slides with identical branding/template but different text content
2. Compute content hashes
3. Assert hashes are different
4. Assert `slideStore.count()` returns 2 after storing both

**Expected Result**: Different content hashes; 2 distinct entries in slide store.

**Code Sample**:
```typescript
it('should not merge slides with same template but different content', async () => {
  const slide1 = await extractor.extractFrame(templateSlide1, sessCtx);
  const slide2 = await extractor.extractFrame(templateSlide2, sessCtx);

  expect(slide1.contentHash).not.toBe(slide2.contentHash);
  expect(await slideStore.count()).toBe(2);
});
```

---

### 1.3 Slide Image Cleanup

#### TC-F6-U3.1: Slide Crop to Remove Projector Borders
**Objective**: Verify the extractor automatically detects and removes dark projector borders from captured slide images.

**Test Steps**:
1. Feed a slide image with 50px black borders on all sides
2. Call `extractor.cropToBoundary(image)`
3. Assert output dimensions are 100px smaller in each dimension
4. Assert output has no uniform-color border pixels

**Expected Result**: Border pixels removed; output is clean slide content area.

**Code Sample**:
```typescript
describe('SlideImageCleanup', () => {
  it('should crop projector borders from slide image', async () => {
    const withBorders = addUniformBorder(slideFixture, 50, 0); // 50px black border
    const cropped = await extractor.cropToBoundary(withBorders);

    expect(cropped.width).toBe(withBorders.width - 100);
    expect(cropped.height).toBe(withBorders.height - 100);
  });
});
```

---

#### TC-F6-U3.2: Best Frame Selection — Sharpest Frame in 30-Frame Window
**Objective**: Verify the extractor selects the sharpest frame from a 30-frame window around the detected slide transition for storage.

**Test Steps**:
1. Create a 30-frame window where frame 15 has the highest Laplacian sharpness
2. Call `extractor.selectBestFrame(frames)`
3. Assert frame 15 is returned as the representative slide image

**Expected Result**: Frame with highest sharpness score is selected as representative.

**Code Sample**:
```typescript
it('should select the sharpest frame from a detection window', async () => {
  const frames = generateFrameWindow(30, { sharpestAt: 15 });
  const best = await extractor.selectBestFrame(frames);

  expect(best.frameIndex).toBe(15);
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Video-to-Slide Pipeline

#### TC-F6-I1.1: Full Video Processing — Slides Extracted with Timestamps
**Objective**: Verify end-to-end processing of a 10-minute conference video produces correctly timestamped slide extractions.

**Preconditions**:
- Video processor service running
- Test video with 5 known slide transitions at known timestamps

**Test Steps**:
1. Submit 10-minute test video to `videoProcessor.process('sess-vid-01', videoBuffer)`
2. Wait for processing to complete
3. Query `slideStore.getBySession('sess-vid-01')`
4. Assert 5 slides extracted at correct timestamps ±5 seconds

**Expected Result**: 5 slides in store with timestamps within 5 seconds of known ground truth.

**Code Sample**:
```typescript
it('should extract 5 slides with correct timestamps from 10-minute video', async () => {
  await videoProcessor.process('sess-vid-01', tenMinuteVideo);

  const slides = await slideStore.getBySession('sess-vid-01');
  expect(slides).toHaveLength(5);

  const knownTimestamps = [30000, 150000, 280000, 420000, 540000]; // ms
  slides.forEach((slide, i) => {
    expect(Math.abs(slide.displayedAtMs - knownTimestamps[i])).toBeLessThan(5000);
  });
}, 120000);
```

---

#### TC-F6-I1.2: Slide Extraction Triggered by Mobile Photo Upload
**Objective**: Verify that when a mobile client uploads a slide photo, the extraction pipeline runs, deduplicates, and returns a `slideId` within 3 seconds.

**Test Steps**:
1. POST slide photo to `POST /media/upload` with `{ type: 'slide', sessionId: 'sess-mobile-01' }`
2. Poll `GET /slides?sessionId=sess-mobile-01` until a result appears or timeout
3. Assert result appears within 3 seconds with `slideId` and `contentHash`

**Expected Result**: Slide available in API within 3 seconds; `slideId` and `contentHash` populated.

---

### 2.2 Transcript-Slide Linking

#### TC-F6-I2.1: Slide Display Time Linked to Transcript Segment
**Objective**: Verify that the transcript segment active during a slide's display period is automatically linked to that slide.

**Test Steps**:
1. Process a session where slide 3 is displayed from t=5m to t=7m
2. Assert `TranscriptSegments` between 300000ms and 420000ms all have `associatedSlideId` pointing to slide 3

**Expected Result**: All transcript segments during slide 3 display window reference slide 3's `slideId`.

---

#### TC-F6-I2.2: Slide Carousel API Response with Linked Transcripts
**Objective**: Verify the slide carousel REST endpoint returns slides with embedded linked transcript excerpts.

**Test Steps**:
1. GET `/sessions/sess-carousel-01/slides?includeTranscripts=true`
2. Assert each slide object in response has `linkedTranscriptExcerpt` field with non-empty text

**Expected Result**: All slides in carousel have `linkedTranscriptExcerpt` populated.

---

### 2.3 Storage and CDN

#### TC-F6-I3.1: Extracted Slide Images Uploaded to CDN with Correct Cache Headers
**Objective**: Verify that extracted slide images are uploaded to the CDN with `Cache-Control: max-age=86400` headers.

**Test Steps**:
1. Trigger slide extraction
2. Query `GET <cdnUrl>/slides/<slideId>.png` via HTTP client
3. Assert response status 200
4. Assert `Cache-Control` header contains `max-age=86400`

**Expected Result**: CDN URL accessible; correct cache headers present.

---

#### TC-F6-I3.2: Storage Deduplication — Duplicate Slide Only Stored Once
**Objective**: Verify that storing the same slide twice (by content hash) results in only one S3 object, with both session references pointing to it.

**Test Steps**:
1. Extract the same slide from 2 different sessions
2. Query S3 bucket for objects with matching content hash
3. Assert only 1 S3 object exists
4. Assert `slide_references` table has 2 rows both pointing to same S3 key

**Expected Result**: 1 S3 object; 2 session references; storage saved.

---

## 3. EDGE CASE VALIDATION

### 3.1 Challenging Transitions

#### TC-F6-E1.1: Animated Slide Builds — Only Final State Extracted
**Objective**: Verify that slides with multi-step animation builds (each step triggering a minor frame change) result in only 1 extracted slide capturing the complete final state.

**Test Steps**:
1. Feed a video where slide A builds up over 10 incremental steps
2. Assert only 1 slide extracted for slide A (the final complete state)
3. Assert no partial-build intermediate frames stored

**Expected Result**: 1 slide captured per animated slide; intermediate build frames suppressed.

**Code Sample**:
```typescript
it('should extract only the final state of animated slide builds', async () => {
  const slides = await extractor.extract(animatedBuildVideo);
  const slideAEntries = slides.filter(s => s.slideGroupId === 'slide-A');

  expect(slideAEntries).toHaveLength(1);
  expect(slideAEntries[0].isComplete).toBe(true);
});
```

---

#### TC-F6-E1.2: Rapid-Fire Presenter Clicking Through Slides
**Objective**: Verify that slides advanced rapidly (< 500ms each) are still captured individually, not skipped entirely.

**Test Steps**:
1. Feed a video sequence where 5 slides are shown for 300ms each
2. Assert all 5 slides detected and extracted
3. Assert `displayedAtMs` timestamps are distinct for all 5

**Expected Result**: All 5 rapid slides extracted with distinct timestamps; none skipped.

---

### 3.2 Video Quality Issues

#### TC-F6-E2.1: Low-Resolution Screen Recording (480p)
**Objective**: Verify the detector and extractor function correctly on low-resolution 854x480 screen recordings.

**Test Steps**:
1. Process a 480p video with 3 slide transitions
2. Assert all 3 slides detected
3. Assert extracted images are upscaled to at least 1280x720 for storage

**Expected Result**: All 3 slides detected; upscaled to 720p or higher.

---

#### TC-F6-E2.2: High Motion Blur in Video Frame
**Objective**: Verify that a heavily motion-blurred slide frame (from camera shake) is not selected as the representative frame for the slide.

**Test Steps**:
1. Create a window of frames where frames 1-5 are blurred, frame 10 is sharp
2. Assert `extractor.selectBestFrame(frames)` returns frame 10

**Expected Result**: Blurred frames not selected; sharpest frame (10) chosen as representative.

---

### 3.3 Deduplication Edge Cases

#### TC-F6-E3.1: Same Slide with Different Timestamps — Single Slide Object
**Objective**: Verify a slide re-shown at a later point in the same session creates a new timestamp reference but not a new slide object.

**Test Steps**:
1. Extract slide A at t=5m and t=25m (same slide repeated)
2. Assert `slideStore.count()` returns 1 (not 2)
3. Assert the one slide object has `displayTimestamps: [300000, 1500000]`

**Expected Result**: 1 slide object with 2 display timestamps; not duplicated.

---

#### TC-F6-E3.2: Empty Video (No Slides Detected) Returns Empty List
**Objective**: Verify processing a video with no slide content (e.g., speaker-only recording) returns an empty slide list rather than false positives.

**Test Steps**:
1. Process a 5-minute speaker-only video (no slides)
2. Assert `slideStore.getBySession(sessionId)` returns `[]`

**Expected Result**: Empty list returned; no false positive slide detections.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Processing Speed

#### TC-F6-P1.1: Real-Time Slide Detection — Process at >= 30 fps
**Objective**: Verify the slide detector processes incoming video frames at >= 30 fps to keep up with real-time video streams.

**Test Steps**:
1. Feed 300 frames to the detector and time total processing
2. Assert frames processed per second >= 30

**Expected Result**: >= 30 fps throughput; pipeline does not fall behind real-time stream.

**Code Sample**:
```typescript
it('should process video frames at >= 30 fps', async () => {
  const frames = generateFrames(300, { width: 1920, height: 1080 });
  const start = performance.now();

  await detector.analyzeAll(frames);

  const elapsed = performance.now() - start;
  const fps = 300 / (elapsed / 1000);
  expect(fps).toBeGreaterThanOrEqual(30);
}, 30000);
```

---

#### TC-F6-P1.2: Slide Extraction Latency from Detection to Storage < 5 Seconds
**Objective**: Verify that from the moment a slide transition is detected, the clean slide image is fully extracted, processed, and stored within 5 seconds.

**Test Steps**:
1. Record timestamp when detector emits slide change event
2. Poll slide store until new slide appears
3. Assert time delta < 5000ms

**Expected Result**: End-to-end latency from detection to storage < 5 seconds.

---

### 4.2 Accuracy Benchmarks

#### TC-F6-P2.1: Slide Detection Precision > 95% and Recall > 90%
**Objective**: Verify the slide detector achieves precision > 95% (few false positives) and recall > 90% (few missed slides) on benchmark videos.

**Test Steps**:
1. Run detector on 10 benchmark videos with known ground-truth slide transitions
2. Compute precision and recall for each video
3. Assert average precision > 0.95 and average recall > 0.90

**Expected Result**: Precision > 95%; recall > 90%.

**Code Sample**:
```typescript
it('should achieve precision > 95% and recall > 90%', async () => {
  const metrics = await Promise.all(
    benchmarkVideos.map(async video => {
      const detected = await detector.analyzeAll(video.frames);
      return computePrecisionRecall(detected, video.groundTruth);
    })
  );

  const avgPrecision = average(metrics.map(m => m.precision));
  const avgRecall = average(metrics.map(m => m.recall));

  expect(avgPrecision).toBeGreaterThan(0.95);
  expect(avgRecall).toBeGreaterThan(0.90);
}, 300000);
```

---

#### TC-F6-P2.2: Deduplication Hit Rate > 60% on Typical Conference Recordings
**Objective**: Verify that content-hash deduplication eliminates at least 60% of redundant slide re-uploads across a set of recordings from the same conference.

**Test Steps**:
1. Process 10 recordings from the same conference (common keynote slides re-used)
2. Assert deduplication store reports > 60% hash collision rate (existing-slide reuse)

**Expected Result**: > 60% of slide uploads are deduplicated; storage savings confirmed.

---

### 4.3 Storage Efficiency

#### TC-F6-P3.1: Slide Storage Size < 200KB per Slide (Compressed PNG)
**Objective**: Verify extracted slides are compressed to under 200KB as PNG without unacceptable quality loss.

**Test Steps**:
1. Extract 20 slides from benchmark video
2. Assert each stored PNG file size < 200KB
3. Assert SSIM vs. original frame > 0.95

**Expected Result**: All slides < 200KB; SSIM > 0.95.

---

#### TC-F6-P3.2: Deduplication Reduces Storage by >= 40% Across Test Dataset
**Objective**: Verify that across a 100-recording test dataset, content deduplication reduces total slide storage by at least 40%.

**Test Steps**:
1. Process 100 recordings without deduplication — record total storage
2. Process same 100 recordings with deduplication enabled — record total storage
3. Assert savings >= 40%

**Expected Result**: >= 40% storage reduction from deduplication.

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
| Frame processing rate | >= 30 fps |
| Detection-to-storage latency | < 5 seconds |
| Detection precision | > 95% |
| Detection recall | > 90% |
| Storage savings from deduplication | >= 40% |
