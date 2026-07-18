# EPIC-02 AI Transcription & Media Pipeline — Comprehensive Test Suite

## Document Overview

This directory contains the complete test case documentation for all 10 features of EPIC-02 (AI Transcription & Media Pipeline). Each feature has a dedicated test case file covering:

- Unit test scenarios (component logic, model interfaces, data transforms)
- Integration test scenarios (pipeline hand-offs, database writes, API contracts)
- Edge case validation (malformed inputs, failure modes, boundary conditions)
- Performance validation (latency, throughput, accuracy benchmarks)

---

## Test Suite Organization

```
EPIC02-Test/
├── README.md                               (This file)
├── EPIC02-feature-1-test-cases.md          Audio Ingestion Service
├── EPIC02-feature-2-test-cases.md          Streaming Transcription
├── EPIC02-feature-3-test-cases.md          Speaker Diarization
├── EPIC02-feature-4-test-cases.md          OCR Extraction
├── EPIC02-feature-5-test-cases.md          Image Enhancement
├── EPIC02-feature-6-test-cases.md          Slide Extraction
├── EPIC02-feature-7-test-cases.md          Media Indexing
├── EPIC02-feature-8-test-cases.md          Timestamp Synchronization
├── EPIC02-feature-9-test-cases.md          Transcript Segmentation
└── EPIC02-feature-10-test-cases.md         Media Processing Orchestration
```

---

## Feature Index

| File | Feature | Domain Focus |
|---|---|---|
| `EPIC02-feature-1-test-cases.md` | Audio Ingestion Service | PCM/Opus validation, WebSocket streaming, queue management, resampling |
| `EPIC02-feature-2-test-cases.md` | Streaming Transcription | ASR model interface, partial/final events, WER benchmarks, language detection |
| `EPIC02-feature-3-test-cases.md` | Speaker Diarization | Embedding extraction, clustering, DER accuracy, overlap detection |
| `EPIC02-feature-4-test-cases.md` | OCR Extraction | Text block extraction, bounding boxes, CER accuracy, table recognition |
| `EPIC02-feature-5-test-cases.md` | Image Enhancement | Denoising, sharpening, perspective correction, SSIM benchmarks |
| `EPIC02-feature-6-test-cases.md` | Slide Extraction | Scene change detection, deduplication, content hashing, CDN storage |
| `EPIC02-feature-7-test-cases.md` | Media Indexing | Document construction, BM25/semantic search, faceted filtering, DLQ |
| `EPIC02-feature-8-test-cases.md` | Timestamp Synchronization | NTP offset, multi-stream alignment, drift correction, clock anomalies |
| `EPIC02-feature-9-test-cases.md` | Transcript Segmentation | Sentence splitting, topic detection, WinDiff accuracy, streaming mode |
| `EPIC02-feature-10-test-cases.md` | Media Processing Orchestration | DAG execution, retry policy, priority queuing, chaos testing |

---

## Test Coverage Summary

### By Category

| Test Type | Tests per Feature | Total (10 Features) |
|---|---|---|
| Unit Tests | ~9 (3 suites × 3 TCs) | ~90 |
| Integration Tests | ~6 (3 suites × 2 TCs) | ~60 |
| Edge Case Tests | ~6 (3 suites × 2 TCs) | ~60 |
| Performance Tests | ~6 (3 suites × 2 TCs) | ~60 |
| **Total** | **~27** | **~270** |

### By Feature

| Feature | Unit | Integration | Edge Cases | Performance | Total |
|---|---|---|---|---|---|
| F1 — Audio Ingestion | 9 | 6 | 6 | 6 | 27 |
| F2 — Streaming Transcription | 9 | 6 | 6 | 6 | 27 |
| F3 — Speaker Diarization | 9 | 6 | 6 | 6 | 27 |
| F4 — OCR Extraction | 9 | 6 | 6 | 6 | 27 |
| F5 — Image Enhancement | 9 | 6 | 6 | 6 | 27 |
| F6 — Slide Extraction | 9 | 6 | 6 | 6 | 27 |
| F7 — Media Indexing | 9 | 6 | 6 | 6 | 27 |
| F8 — Timestamp Synchronization | 9 | 6 | 6 | 6 | 27 |
| F9 — Transcript Segmentation | 9 | 6 | 6 | 6 | 27 |
| F10 — Orchestration | 9 | 6 | 6 | 6 | 27 |
| **TOTAL** | **90** | **60** | **60** | **60** | **270** |

---

## TC ID Format Reference

| Category | Format | Example |
|---|---|---|
| Unit Test | `TC-F{N}-U{suite}.{case}` | `TC-F1-U1.1` |
| Integration Test | `TC-F{N}-I{suite}.{case}` | `TC-F3-I2.1` |
| Edge Case | `TC-F{N}-E{suite}.{case}` | `TC-F6-E1.2` |
| Performance Test | `TC-F{N}-P{suite}.{case}` | `TC-F10-P3.1` |

Where `N` = feature number (1–10), `suite` = suite number within category (1–3), `case` = case number within suite (1–3 for unit, 1–2 for others).

---

## Setup and Prerequisites

### Runtime Environment

```bash
node --version    # v18+ required
npm --version     # v9+ required
```

### Install Dependencies

```bash
cd EPIC-02-AI-Transcription-Media-Pipeline
npm install

# Install ML model test fixtures
npm run download-test-fixtures

# Start local test infrastructure (PostgreSQL, Elasticsearch, Redis)
docker compose -f docker-compose.test.yml up -d
```

### Environment Variables for Tests

```bash
export DATABASE_URL=postgresql://test:test@localhost:5432/test_db
export ELASTICSEARCH_URL=http://localhost:9200
export REDIS_URL=redis://localhost:6379
export AWS_S3_BUCKET=test-media-bucket
export NTP_SERVER=pool.ntp.org
export MOCK_ASR_MODEL=true    # Use mock ASR model for unit tests
export MOCK_OCR_MODEL=true    # Use mock OCR model for unit tests
```

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 90, lines: 85, statements: 85 }
  }
};
```

---

## Test Execution Guide

### Run All Tests

```bash
npm run test:all
```

### Run by Category

```bash
# Unit tests only
npm run test:unit

# Integration tests (requires local services)
npm run test:integration

# Edge case tests
npm run test:edge

# Performance tests (long-running)
npm run test:perf
```

### Run by Feature

```bash
# Run tests for a specific feature
npm run test:unit -- --testPathPattern='feature-3'

# Run with verbose output
npm run test:unit -- --testPathPattern='feature-5' --verbose

# Run with coverage
npm run test:unit -- --coverage
```

### Run Performance Benchmarks

```bash
# Run all performance tests (may take 30+ minutes)
npm run test:perf

# Run specific performance suite
npm run test:perf -- --testPathPattern='feature-1.*P1'

# Run with profiling
NODE_ENV=bench npm run test:perf
```

---

## Key Performance Targets by Feature

| Feature | Primary Metric | Target |
|---|---|---|
| F1 — Audio Ingestion | P99 ingest latency | < 5ms |
| F2 — Streaming Transcription | Time to first partial | < 500ms |
| F3 — Speaker Diarization | Diarization Error Rate | < 10% |
| F4 — OCR Extraction | Character Error Rate | < 2% |
| F5 — Image Enhancement | Full pipeline latency (P95) | < 1.5 seconds |
| F6 — Slide Extraction | Frame detection rate | >= 30 fps |
| F7 — Media Indexing | Full-text query latency (P95) | < 200ms |
| F8 — Timestamp Synchronization | Mean sync error | < 10ms |
| F9 — Transcript Segmentation | 10,000-word segment latency | < 500ms |
| F10 — Orchestration | Concurrent runs (P95 dispatch) | < 500ms at 100 runs |

---

## Coverage Requirements

| Metric | Minimum Target |
|---|---|
| Line Coverage | > 85% |
| Branch Coverage | > 80% |
| Function Coverage | > 90% |
| Statement Coverage | > 85% |

---

## Mock Services Reference

All test suites use the following mock infrastructure:

```
mocks/
├── asrModel.ts           # Mock ASR transcription model
├── ocrModel.ts           # Mock OCR engine
├── embeddingModel.ts     # Mock speaker/semantic embedding model
├── audioIngestion.ts     # Mock audio ingestion service
├── searchClient.ts       # Mock Elasticsearch client
├── s3Client.ts           # Mock S3 object storage
├── ntpClient.ts          # Mock NTP time server
├── websocket.ts          # Mock WebSocket server
└── server.ts             # MSW HTTP mock server
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: EPIC-02 Media Pipeline Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      elasticsearch:
        image: elasticsearch:8.10.0
        env:
          discovery.type: single-node
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration

  performance-tests:
    runs-on: ubuntu-latest-4core
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:perf
        timeout-minutes: 60
```

---

## Quality Gates and Sign-Off Checklist

### Pre-Release Validation

- [ ] **Unit Tests**: All pass with > 85% line coverage
- [ ] **Integration Tests**: All pipeline hand-offs validated
- [ ] **Edge Cases**: Failure modes and boundary conditions confirmed
- [ ] **Performance Tests**: All targets met at specified loads
- [ ] **Model Accuracy**: WER, DER, CER, F1 benchmarks passing
- [ ] **No Memory Leaks**: Heap profiles stable over long-session tests
- [ ] **DLQ Routing**: Failed jobs properly captured and diagnosable
- [ ] **Distributed Tracing**: All spans linked, no missing spans
- [ ] **Search Indexing**: Cross-media search returns correct results

---

## Document Version

**Version**: 1.0
**Created**: 2026-07-18
**EPIC**: EPIC-02 — AI Transcription & Media Pipeline
**Features Covered**: 10 (F1–F10)
**Total Test Cases**: ~270
**Status**: Ready for Implementation
