# EPIC-04 — Contact & Relationship Intelligence — Test Cases

This directory contains comprehensive test case files for all nine features of EPIC-04.

---

## Features and Test Files

| # | Feature | Test File |
|---|---------|-----------|
| 1 | Contact Creation | [EPIC04-feature-1-test-cases.md](./EPIC04-feature-1-test-cases.md) |
| 2 | Identity Resolution | [EPIC04-feature-2-test-cases.md](./EPIC04-feature-2-test-cases.md) |
| 3 | Duplicate Merging | [EPIC04-feature-3-test-cases.md](./EPIC04-feature-3-test-cases.md) |
| 4 | Relationship Scoring | [EPIC04-feature-4-test-cases.md](./EPIC04-feature-4-test-cases.md) |
| 5 | Contact Confidence Scoring | [EPIC04-feature-5-test-cases.md](./EPIC04-feature-5-test-cases.md) |
| 6 | Meeting Association | [EPIC04-feature-6-test-cases.md](./EPIC04-feature-6-test-cases.md) |
| 7 | Company Association | [EPIC04-feature-7-test-cases.md](./EPIC04-feature-7-test-cases.md) |
| 8 | Contact Enrichment | [EPIC04-feature-8-test-cases.md](./EPIC04-feature-8-test-cases.md) |
| 9 | Relationship Timeline | [EPIC04-feature-9-test-cases.md](./EPIC04-feature-9-test-cases.md) |

---

## Test Coverage Summary

Each feature file contains approximately 30 test cases across four categories:

- **Unit Tests**: 3 suites, ~12 test cases — isolated logic validation
- **Integration Tests**: 3 suites, 6 test cases — cross-system data flow
- **Edge Cases**: 3 suites, 6 test cases — boundary and failure conditions
- **Performance Tests**: 3 suites, 6 test cases — throughput and latency benchmarks

**Total across all features: ~270 test cases**

---

## TC ID Convention

```
TC-F{featureNum}-{type}{suite}.{case}
```

- `U` = Unit test
- `I` = Integration test
- `E` = Edge case
- `P` = Performance test

Example: `TC-F2-U1.3` = Feature 2 (Identity Resolution), Unit suite 1, case 3.

---

## Language & Tooling

All code samples are **TypeScript**. Tests are written for a Jest / Vitest compatible runner. Dependencies referenced:
- `jest` / `vitest` — test runner
- `@faker-js/faker` — synthetic data generation
- Custom service interfaces (`ContactService`, `RelationshipScorer`, etc.) from the EPIC-04 implementation layer
