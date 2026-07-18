# EPIC05 Test Suite — Session & Conference Intelligence

This folder contains comprehensive test case files for all 8 features of **EPIC-05: Session & Conference Intelligence**. Each file covers unit tests, integration tests, edge cases, and performance validation (~30 test cases per feature, ~240 total).

---

## Test File Index

| # | Feature | Test Case File |
|---|---------|---------------|
| 1 | Panel Mode Analysis | [EPIC05-feature-1-test-cases.md](./EPIC05-feature-1-test-cases.md) |
| 2 | Speaker Recognition | [EPIC05-feature-2-test-cases.md](./EPIC05-feature-2-test-cases.md) |
| 3 | Quote Extraction | [EPIC05-feature-3-test-cases.md](./EPIC05-feature-3-test-cases.md) |
| 4 | Slide-to-Topic Linking | [EPIC05-feature-4-test-cases.md](./EPIC05-feature-4-test-cases.md) |
| 5 | Session Summarization | [EPIC05-feature-5-test-cases.md](./EPIC05-feature-5-test-cases.md) |
| 6 | Key Insight Extraction | [EPIC05-feature-6-test-cases.md](./EPIC05-feature-6-test-cases.md) |
| 7 | Session Search | [EPIC05-feature-7-test-cases.md](./EPIC05-feature-7-test-cases.md) |
| 8 | Topic Clustering | [EPIC05-feature-8-test-cases.md](./EPIC05-feature-8-test-cases.md) |

---

## Test Structure per Feature

Each file follows a consistent 4-section structure:

```
1. UNIT TEST SCENARIOS        — 3 suites, ~12 test cases
2. INTEGRATION TEST SCENARIOS — 3 suites,  6 test cases
3. EDGE CASE VALIDATION       — 3 suites,  6 test cases
4. PERFORMANCE VALIDATION     — 3 suites,  6 test cases
```

**TC ID format**:
- Unit: `TC-F{N}-U{suite}.{case}`
- Integration: `TC-F{N}-I{suite}.{case}`
- Edge Case: `TC-F{N}-E{suite}.{case}`
- Performance: `TC-F{N}-P{suite}.{case}`

---

## Feature Summaries

### Feature 1 — Panel Mode Analysis
Tests cover moderator/panelist role classification, Q&A boundary detection, cross-talk flagging, talk-time analytics, and panel timeline persistence. Key scenarios include single-speaker degenerate input, 8-hour session stress tests, and CPU usage during NLP classification.

### Feature 2 — Speaker Recognition
Tests cover self-introduction NLP detection, third-party introductions, voiceprint embedding cosine similarity, agenda/roster order matching, consent-gated voiceprint storage, and EER benchmarks. Key edge cases include ambiguous near-identical voiceprints, high background noise, and consent revocation.

### Feature 3 — Quote Extraction
Tests cover high-impact statement detection, statistical claim tagging, filler phrase exclusion, attribution with resolved speaker names, near-duplicate deduplication, real-time candidate surfacing, and multi-language extraction (French, Spanish). Edge cases cover self-corrections, audience role exclusion, and partial sentences.

### Feature 4 — Slide-to-Topic Linking
Tests cover slide OCR extraction accuracy, semantic alignment via embeddings, time-window-constrained alignment, topic label derivation, slide link persistence, and rapid slide advancement handling. Edge cases include image-only slides, pre-session captures, and no-text slides.

### Feature 5 — Session Summarization
Tests cover SHORT/DETAILED/BULLETS mode length constraints, action item and decision extraction, panel context incorporation, summary versioning, multi-language output (Japanese, Spanish-to-English translation), disfluency filtering, and LLM token chunking strategy. Performance tests include caching behavior and LLM call deduplication.

### Feature 6 — Key Insight Extraction
Tests cover KEY_FINDING / ACTIONABLE_INSIGHT / FORWARD_LOOKING classification, speaker-prominence-weighted scoring, uniqueness penalties, evidence linking (quotes and slides), cross-session trending detection, contradiction flagging between speakers, and user upvote/dismiss feedback loops.

### Feature 7 — Session Search
Tests cover keyword search, phrase search, semantic/vector search, hybrid BM25+vector ranking, speaker and topic label filters, time-range filters, multi-session conference-wide search, index lifecycle (update on correction, cleanup on delete), pagination, and cross-language semantic search. Performance tests include 100K-segment index latency and 1M-segment scalability.

### Feature 8 — Topic Clustering
Tests cover sentence embedding dimensionality and semantic distance, k-means cluster formation and elbow-method auto-k selection, LDA coherence scoring, TF-IDF and slide-based cluster labeling, cross-session cluster merging at conference level, user-initiated cluster rename and merge, outlier detection, deterministic seeding, and batch embedding throughput for 10,000 segments.

---

## Total Test Coverage

| Category | Test Cases |
|----------|-----------|
| Unit Tests | ~96 |
| Integration Tests | 48 |
| Edge Cases | 48 |
| Performance Tests | 48 |
| **Total** | **~240** |

---

## Related Files

- Feature specifications: `../FEATURE-01-Panel-Mode-Analysis.md` through `../FEATURE-08-Topic-Clustering.md`
- User stories: `../EPIC05-UserStories/`
- Epic overview: `../README.md`
