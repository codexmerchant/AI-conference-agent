# EPIC02 Feature 5 — Image Enhancement — Test Cases

## Test Overview
Comprehensive test suite for Image Enhancement covering unit tests, integration tests, edge cases, and performance validation. This feature applies preprocessing and enhancement algorithms (denoising, sharpening, HDR tone mapping, perspective correction) to improve image quality before OCR and slide extraction pipelines.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Noise Reduction

#### TC-F5-U1.1: Gaussian Noise Reduction — PSNR Improvement
**Objective**: Verify the denoising filter increases Peak Signal-to-Noise Ratio (PSNR) by at least 3dB on a noisy image.

**Preconditions**:
- `ImageEnhancer` initialized with denoising model
- Noisy fixture image (Gaussian noise sigma=25) available
- Clean reference image available

**Test Steps**:
1. Measure PSNR between noisy image and clean reference: `psnrBefore`
2. Apply `enhancer.denoise(noisyImage, { strength: 0.5 })`
3. Measure PSNR between enhanced and clean reference: `psnrAfter`
4. Assert `psnrAfter > psnrBefore + 3`

**Expected Result**: PSNR improvement >= 3dB after denoising; no structural distortion visible.

**Code Sample**:
```typescript
describe('ImageEnhancer - Noise Reduction', () => {
  it('should improve PSNR by at least 3dB', async () => {
    const enhancer = new ImageEnhancer(mockDenoisingModel);
    const psnrBefore = computePsnr(noisySlide, cleanReference);

    const denoised = await enhancer.denoise(noisySlide, { strength: 0.5 });
    const psnrAfter = computePsnr(denoised, cleanReference);

    expect(psnrAfter).toBeGreaterThan(psnrBefore + 3);
  });
});
```

---

#### TC-F5-U1.2: Denoising Does Not Over-Smooth Text Edges
**Objective**: Verify that denoising preserves text edge sharpness (Laplacian variance) to avoid making text illegible.

**Test Steps**:
1. Measure Laplacian variance (sharpness metric) of clean text image: `sharpnessBefore`
2. Apply denoising at maximum strength
3. Measure Laplacian variance after: `sharpnessAfter`
4. Assert `sharpnessAfter > sharpnessBefore * 0.7` (less than 30% sharpness loss)

**Expected Result**: Sharpness is retained at >= 70% of original level even at maximum denoising strength.

**Code Sample**:
```typescript
it('should not over-smooth text edges during denoising', async () => {
  const sharpnessBefore = computeLaplacianVariance(textSlideFixture);
  const denoised = await enhancer.denoise(textSlideFixture, { strength: 1.0 });
  const sharpnessAfter = computeLaplacianVariance(denoised);

  expect(sharpnessAfter).toBeGreaterThan(sharpnessBefore * 0.7);
});
```

---

#### TC-F5-U1.3: Adaptive Denoising Strength Based on Estimated Noise Level
**Objective**: Verify the enhancer automatically estimates noise level and applies appropriate denoising strength (low noise → light denoise, high noise → strong denoise).

**Test Steps**:
1. Call `enhancer.denoise(lowNoiseImage, { adaptive: true })` — assert `result.appliedStrength < 0.3`
2. Call `enhancer.denoise(highNoiseImage, { adaptive: true })` — assert `result.appliedStrength > 0.7`

**Expected Result**: Adaptive mode applies low strength for clean images and high strength for noisy images.

**Code Sample**:
```typescript
it('should adapt denoising strength to estimated noise level', async () => {
  const lowResult = await enhancer.denoise(lowNoiseFixture, { adaptive: true });
  const highResult = await enhancer.denoise(highNoiseFixture, { adaptive: true });

  expect(lowResult.appliedStrength).toBeLessThan(0.3);
  expect(highResult.appliedStrength).toBeGreaterThan(0.7);
});
```

---

### 1.2 Sharpening and Contrast

#### TC-F5-U2.1: Unsharp Masking — Edge Clarity Improvement
**Objective**: Verify the unsharp mask filter increases edge clarity as measured by the Sobel gradient magnitude.

**Test Steps**:
1. Compute average Sobel gradient magnitude of a soft-focus slide
2. Apply `enhancer.sharpen(image, { method: 'unsharp', amount: 1.5, radius: 1.0 })`
3. Compute gradient magnitude of sharpened image
4. Assert sharpened magnitude > original by at least 20%

**Expected Result**: Sobel gradient magnitude increases by >= 20% after unsharp masking.

**Code Sample**:
```typescript
describe('ImageEnhancer - Sharpening', () => {
  it('should increase edge clarity with unsharp masking', async () => {
    const gradBefore = computeSobelMagnitude(softFocusSlide);
    const sharpened = await enhancer.sharpen(softFocusSlide, { method: 'unsharp', amount: 1.5, radius: 1.0 });
    const gradAfter = computeSobelMagnitude(sharpened);

    expect(gradAfter).toBeGreaterThan(gradBefore * 1.2);
  });
});
```

---

#### TC-F5-U2.2: Histogram Equalization — Contrast Spread
**Objective**: Verify histogram equalization produces a more uniform pixel value distribution, improving contrast on low-contrast slides.

**Test Steps**:
1. Compute histogram standard deviation of low-contrast input
2. Apply `enhancer.equalizeHistogram(image)`
3. Compute histogram standard deviation of result
4. Assert output std dev > input std dev * 1.5

**Expected Result**: Histogram becomes more spread after equalization; contrast visibly improved.

**Code Sample**:
```typescript
it('should improve contrast via histogram equalization', async () => {
  const stdBefore = computeHistogramStdDev(lowContrastSlide);
  const equalized = await enhancer.equalizeHistogram(lowContrastSlide);
  const stdAfter = computeHistogramStdDev(equalized);

  expect(stdAfter).toBeGreaterThan(stdBefore * 1.5);
});
```

---

#### TC-F5-U2.3: CLAHE — Local Contrast Enhancement Without Halo
**Objective**: Verify Contrast Limited Adaptive Histogram Equalization (CLAHE) improves local contrast without introducing halo artifacts around text.

**Test Steps**:
1. Apply `enhancer.clahe(image, { clipLimit: 2.0, tileGridSize: 8 })`
2. Assert no visible halo rings around text (measure by comparing pixel values at text boundary regions)
3. Assert local contrast metric improves by >= 15%

**Expected Result**: Local contrast improved >= 15%; no halo artifact detected at text boundaries.

---

### 1.3 Perspective and Geometry Correction

#### TC-F5-U3.1: Perspective Correction for Angled Camera Shot
**Objective**: Verify the perspective transform correctly warps a slide photographed at a 20-degree camera angle to an orthogonal view.

**Test Steps**:
1. Use a slide image with known corner points representing a 20-degree tilt
2. Call `enhancer.correctPerspective(image, { autoDetect: true })`
3. Assert returned image has aspect ratio matching expected slide ratio (16:9)
4. Assert corner points of detected content region are near-orthogonal (< 5-degree deviation)

**Expected Result**: Perspective-corrected image has correct aspect ratio; corner angles < 5 degrees from 90.

**Code Sample**:
```typescript
describe('ImageEnhancer - Perspective Correction', () => {
  it('should correct perspective for a 20-degree angled camera shot', async () => {
    const corrected = await enhancer.correctPerspective(angledSlideFixture, { autoDetect: true });
    const aspectRatio = corrected.width / corrected.height;

    expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    const corners = detectCorners(corrected);
    corners.forEach(corner => {
      expect(Math.abs(corner.angle - 90)).toBeLessThan(5);
    });
  });
});
```

---

#### TC-F5-U3.2: Keystone Distortion Correction
**Objective**: Verify the enhancer corrects vertical keystone distortion (top-wider-than-bottom trapezoid shape) in projector-photographed slides.

**Test Steps**:
1. Load a slide image with keystone distortion (detected by trapezoidal boundary)
2. Apply `enhancer.correctKeystone(image)`
3. Assert output has parallel top and bottom edges (slope < 2 pixels/1000 pixels)

**Expected Result**: Keystoned slide corrected to parallel top/bottom edges.

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Enhancement Pipeline Chaining

#### TC-F5-I1.1: Full Enhancement Chain Applied in Correct Order
**Objective**: Verify the pipeline applies enhancement steps in the correct order: deskew → denoise → sharpen → contrast → output.

**Preconditions**:
- `EnhancementPipeline` configured with all 4 steps

**Test Steps**:
1. Process a degraded slide image through the full pipeline
2. Assert `result.appliedSteps` list equals `['deskew', 'denoise', 'sharpen', 'contrast']` in that order
3. Assert final image quality score > input quality score

**Expected Result**: Steps applied in correct sequence; output quality score improves.

**Code Sample**:
```typescript
it('should apply enhancement steps in the correct order', async () => {
  const pipeline = new EnhancementPipeline([deskewStep, denoiseStep, sharpenStep, contrastStep]);
  const result = await pipeline.process(degradedSlideFixture);

  expect(result.appliedSteps).toEqual(['deskew', 'denoise', 'sharpen', 'contrast']);
  expect(result.qualityScore).toBeGreaterThan(computeQualityScore(degradedSlideFixture));
});
```

---

#### TC-F5-I1.2: Enhanced Image Stored and Referenced Alongside Original
**Objective**: Verify the enhanced image is saved to object storage and the media record links to both original and enhanced versions.

**Test Steps**:
1. Upload original image and trigger enhancement
2. Query `MediaRecord` for the uploaded image
3. Assert `record.originalUrl` and `record.enhancedUrl` are both non-null and distinct
4. Assert both URLs are accessible (HTTP 200)

**Expected Result**: Both original and enhanced image URLs stored; both accessible.

---

### 2.2 OCR Quality Impact

#### TC-F5-I2.1: Enhancement Reduces OCR CER on Degraded Images
**Objective**: Verify that passing an image through the enhancement pipeline before OCR reduces Character Error Rate on degraded slides.

**Test Steps**:
1. Run OCR on degraded slide directly → `cerWithout`
2. Run OCR on enhanced version of same slide → `cerWith`
3. Assert `cerWith < cerWithout - 0.05` (at least 5 percentage points improvement)

**Expected Result**: Enhancement reduces CER by >= 5 percentage points on degraded slides.

**Code Sample**:
```typescript
it('should reduce OCR CER by at least 5% on degraded images', async () => {
  const cerWithout = await measureOcrCer(ocrEngine, degradedSlide, groundTruth);
  const enhanced = await enhancementPipeline.process(degradedSlide);
  const cerWith = await measureOcrCer(ocrEngine, enhanced.image, groundTruth);

  expect(cerWith).toBeLessThan(cerWithout - 0.05);
});
```

---

#### TC-F5-I2.2: Enhancement Skipped for Already High-Quality Images
**Objective**: Verify the pipeline skips unnecessary enhancement steps when input image quality is already above threshold, reducing latency.

**Test Steps**:
1. Submit a high-quality 4K slide image to the enhancement pipeline
2. Assert `result.appliedSteps` is empty or contains only `'quality_check'`
3. Assert processing time < 100ms (versus ~2s for full enhancement)

**Expected Result**: High-quality images skip enhancement steps; processing time < 100ms.

---

### 2.3 Real-Time Enhancement for Live Capture

#### TC-F5-I3.1: Enhancement Applied Within 1 Second for Live-Captured Images
**Objective**: Verify that images uploaded from a live mobile capture session are enhanced and ready for OCR within 1 second.

**Test Steps**:
1. Simulate mobile upload of a live-captured whiteboard image
2. Subscribe to `mediaService.onEnhanced(mediaId, callback)`
3. Assert callback fires within 1 second of upload

**Expected Result**: Enhancement completes and enhanced image available within 1000ms of upload.

---

#### TC-F5-I3.2: Enhancement Service Health Check Under Load
**Objective**: Verify the enhancement service health endpoint returns healthy status even when processing 10 concurrent enhancement jobs.

**Test Steps**:
1. Start 10 concurrent enhancement jobs
2. While jobs are running, poll `GET /health/enhancement`
3. Assert all health checks return `{ status: 'healthy', activeJobs: N }` with N <= 10

**Expected Result**: Health endpoint always responds 200 with accurate active job count during concurrent processing.

---

## 3. EDGE CASE VALIDATION

### 3.1 Extreme Image Conditions

#### TC-F5-E1.1: Completely Black Image Handled Without Error
**Objective**: Verify the enhancer does not crash or hang when given an all-black (zero-pixel) image.

**Test Steps**:
1. Create an all-black 1920x1080 pixel buffer
2. Call `enhancer.process(blackImage)`
3. Assert result returned (no exception)
4. Assert `result.qualityScore < 0.1` and `result.qualityWarning: 'UNDEREXPOSED'`

**Expected Result**: Process returns with underexposed warning; no crash.

**Code Sample**:
```typescript
it('should handle all-black image without crashing', async () => {
  const blackImage = createBlackImage(1920, 1080);
  const result = await enhancer.process(blackImage);

  expect(result).toBeDefined();
  expect(result.qualityScore).toBeLessThan(0.1);
  expect(result.qualityWarning).toBe('UNDEREXPOSED');
});
```

---

#### TC-F5-E1.2: Overexposed (All-White) Image Enhancement
**Objective**: Verify the enhancer flags overexposed images and applies gamma correction to recover any salvageable detail.

**Test Steps**:
1. Create an image with 95% of pixels at value 255
2. Apply enhancement with `recoverHighlights: true`
3. Assert `result.qualityWarning: 'OVEREXPOSED'`
4. Assert recovered image has fewer > 250-value pixels than input

**Expected Result**: Overexposed warning set; gamma correction reduces blown-out highlights.

---

### 3.2 Unusual Image Formats

#### TC-F5-E2.1: HEIC Image Conversion and Enhancement
**Objective**: Verify the enhancer correctly converts HEIC format (iOS default) to PNG before processing, without quality loss.

**Test Steps**:
1. Feed a HEIC image file to the enhancer
2. Assert `result.inputFormat: 'heic'` and `result.outputFormat: 'png'`
3. Assert result image is valid PNG and passes quality threshold

**Expected Result**: HEIC transparently converted; result is valid PNG.

**Code Sample**:
```typescript
it('should convert HEIC to PNG before enhancement', async () => {
  const heicBuffer = await loadFixture('slide-capture.heic');
  const result = await enhancer.process(heicBuffer, { outputFormat: 'png' });

  expect(result.inputFormat).toBe('heic');
  expect(result.outputFormat).toBe('png');
  expect(result.qualityScore).toBeGreaterThan(0.7);
});
```

---

#### TC-F5-E2.2: Very Small Image (< 100x100 pixels) Upscaling
**Objective**: Verify the enhancer applies super-resolution upscaling for very small images rather than attempting normal enhancement.

**Test Steps**:
1. Feed an 80x60 pixel thumbnail image
2. Assert `result.appliedSteps` contains `'super_resolution'`
3. Assert output image is at least 320x240 pixels (4x upscale)

**Expected Result**: Super-resolution applied; output >= 4x input dimensions.

---

### 3.3 Enhancement Failure Recovery

#### TC-F5-E3.1: Perspective Detection Failure Falls Back to Original
**Objective**: Verify that when automatic perspective detection fails (e.g., no clear slide boundary), the original image is returned unchanged with a `PERSPECTIVE_DETECTION_FAILED` flag.

**Test Steps**:
1. Feed an image with no detectable slide boundary (e.g., all-text page)
2. Call with `{ correctPerspective: true, autoDetect: true }`
3. Assert result image is unchanged (pixel-identical to input)
4. Assert `result.warnings` contains `'PERSPECTIVE_DETECTION_FAILED'`

**Expected Result**: Original image returned unchanged; warning flag set; no exception.

**Code Sample**:
```typescript
it('should fall back to original when perspective detection fails', async () => {
  const result = await enhancer.process(noSlideBoundaryFixture, { correctPerspective: true });

  expect(result.warnings).toContain('PERSPECTIVE_DETECTION_FAILED');
  expect(Buffer.from(result.image).equals(Buffer.from(noSlideBoundaryFixture))).toBe(true);
});
```

---

#### TC-F5-E3.2: Enhancement Timeout — Return Original After 5 Seconds
**Objective**: Verify that if enhancement processing exceeds 5 seconds, the service returns the original image with a timeout warning rather than blocking indefinitely.

**Test Steps**:
1. Mock the denoise model to hang for 10 seconds
2. Submit image with `timeout: 5000`
3. Assert response received within 5500ms
4. Assert `result.timedOut: true` and image equals original

**Expected Result**: Response returned within 5.5 seconds; `timedOut: true`; original image returned.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Processing Speed

#### TC-F5-P1.1: Full Enhancement Pipeline < 1.5 Seconds per Image
**Objective**: Verify the complete enhancement pipeline (all 4 steps) processes a 1920x1080 image in under 1.5 seconds.

**Test Steps**:
1. Time full pipeline (`deskew → denoise → sharpen → contrast`) on 50 benchmark images
2. Assert P95 latency < 1500ms
3. Assert P50 latency < 600ms

**Expected Result**: P95 < 1500ms; P50 < 600ms.

**Code Sample**:
```typescript
it('should process full enhancement pipeline in under 1.5s (P95)', async () => {
  const latencies: number[] = [];

  for (const image of benchmarkImages) {
    const start = performance.now();
    await fullPipeline.process(image);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  expect(latencies[Math.floor(latencies.length * 0.95)]).toBeLessThan(1500);
}, 120000);
```

---

#### TC-F5-P1.2: Parallel Enhancement Throughput — 50 Images per Minute
**Objective**: Verify the enhancement service processes at least 50 images per minute using parallel workers.

**Test Steps**:
1. Submit 50 images to the enhancement queue simultaneously
2. Measure time until all 50 are complete
3. Assert total time < 60 seconds

**Expected Result**: All 50 images enhanced within 60 seconds.

---

### 4.2 Quality Improvement Benchmarks

#### TC-F5-P2.1: Consistent SSIM Improvement >= 0.05 on Degraded Set
**Objective**: Verify the enhancement pipeline consistently achieves a Structural Similarity Index (SSIM) improvement of at least 0.05 across a degraded image benchmark set.

**Test Steps**:
1. Run enhancement on 20 pre-degraded slides with known clean originals
2. Compute SSIM before and after enhancement for each
3. Assert average SSIM delta >= 0.05

**Expected Result**: Average SSIM improvement >= 0.05 across 20 degraded slides.

**Code Sample**:
```typescript
it('should achieve mean SSIM improvement >= 0.05', async () => {
  const deltas = await Promise.all(
    degradedBenchmark.map(async item => {
      const enhanced = await fullPipeline.process(item.degraded);
      const before = computeSSIM(item.degraded, item.clean);
      const after = computeSSIM(enhanced.image, item.clean);
      return after - before;
    })
  );

  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  expect(avgDelta).toBeGreaterThanOrEqual(0.05);
}, 120000);
```

---

#### TC-F5-P2.2: Enhancement Does Not Degrade High-Quality Images (SSIM >= 0.99)
**Objective**: Verify that the quality-check bypass correctly identifies high-quality inputs and does not reduce their SSIM below 0.99.

**Test Steps**:
1. Run 10 high-quality images through the pipeline
2. Compute SSIM between input and output for each
3. Assert all SSIM values >= 0.99

**Expected Result**: High-quality images emerge from pipeline unchanged (SSIM >= 0.99).

---

### 4.3 Resource Usage

#### TC-F5-P3.1: Memory Usage Per Enhancement Job < 512MB
**Objective**: Verify that a single image enhancement job stays within 512MB memory allocation.

**Test Steps**:
1. Monitor process memory during enhancement of a 4K (3840x2160) image
2. Assert peak RSS delta < 512MB

**Expected Result**: Peak memory for a single 4K enhancement job < 512MB.

---

#### TC-F5-P3.2: CPU Usage Drops to < 5% Between Jobs
**Objective**: Verify the enhancement service releases CPU resources promptly between jobs and does not spin-idle.

**Test Steps**:
1. Process 5 images in sequence
2. Measure CPU usage in the 500ms gap between each job
3. Assert idle CPU usage < 5%

**Expected Result**: CPU drops to < 5% within 100ms of each job completion.

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
| Full pipeline latency (P95) | < 1.5 seconds |
| SSIM improvement on degraded images | >= 0.05 |
| Batch throughput | 50 images/minute |
| Memory per job | < 512MB |
