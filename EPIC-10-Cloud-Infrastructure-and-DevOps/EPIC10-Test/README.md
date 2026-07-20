# EPIC-10 Test Cases — Cloud Infrastructure & DevOps

This folder contains comprehensive test case files for EPIC-10 (Cloud Infrastructure & DevOps), covering all 8 features with ~30 test cases each.

## Features & Test Files

| # | Feature | Test File |
|---|---------|-----------|
| 1 | API Gateway Layer | [EPIC10-feature-1-test-cases.md](EPIC10-feature-1-test-cases.md) |
| 2 | Container Platform | [EPIC10-feature-2-test-cases.md](EPIC10-feature-2-test-cases.md) |
| 3 | CI/CD Pipeline | [EPIC10-feature-3-test-cases.md](EPIC10-feature-3-test-cases.md) |
| 4 | Event Streaming Platform | [EPIC10-feature-4-test-cases.md](EPIC10-feature-4-test-cases.md) |
| 5 | GPU Inference Infrastructure | [EPIC10-feature-5-test-cases.md](EPIC10-feature-5-test-cases.md) |
| 6 | Object Storage Platform | [EPIC10-feature-6-test-cases.md](EPIC10-feature-6-test-cases.md) |
| 7 | Database Infrastructure | [EPIC10-feature-7-test-cases.md](EPIC10-feature-7-test-cases.md) |
| 8 | Monitoring and Observability | [EPIC10-feature-8-test-cases.md](EPIC10-feature-8-test-cases.md) |

## Test Structure

Each file follows a 4-section structure:
1. **Unit Tests** — 3 suites, 9 test cases
2. **Integration Tests** — 3 suites, 6 test cases
3. **Edge Case Validation** — 3 suites, 6 test cases
4. **Performance Validation** — 3 suites, 6 test cases

**Total**: 216 test cases across all 8 features

## TC ID Convention

`TC-F{featureNum}-{U|I|E|P}{suite}.{case}`

- `U` = Unit, `I` = Integration, `E` = Edge Case, `P` = Performance
