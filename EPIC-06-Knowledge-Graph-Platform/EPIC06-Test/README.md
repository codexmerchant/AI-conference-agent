# EPIC-06 Test Cases — Knowledge Graph Platform

This folder contains comprehensive test case files for EPIC-06 (Knowledge Graph Platform), covering all 9 features with ~30 test cases each.

## Features & Test Files

| # | Feature | Test File |
|---|---------|-----------|
| 1 | Graph Schema Management | [EPIC06-feature-1-test-cases.md](EPIC06-feature-1-test-cases.md) |
| 2 | Entity Linking | [EPIC06-feature-2-test-cases.md](EPIC06-feature-2-test-cases.md) |
| 3 | Relationship Storage | [EPIC06-feature-3-test-cases.md](EPIC06-feature-3-test-cases.md) |
| 4 | Graph Traversal APIs | [EPIC06-feature-4-test-cases.md](EPIC06-feature-4-test-cases.md) |
| 5 | Temporal Relationship Modeling | [EPIC06-feature-5-test-cases.md](EPIC06-feature-5-test-cases.md) |
| 6 | Interaction Graph Updates | [EPIC06-feature-6-test-cases.md](EPIC06-feature-6-test-cases.md) |
| 7 | Graph Scoring | [EPIC06-feature-7-test-cases.md](EPIC06-feature-7-test-cases.md) |
| 8 | Network Analysis | [EPIC06-feature-8-test-cases.md](EPIC06-feature-8-test-cases.md) |
| 9 | Graph Visualization APIs | [EPIC06-feature-9-test-cases.md](EPIC06-feature-9-test-cases.md) |

## Test Structure

Each file follows a 4-section structure:
1. **Unit Tests** — 3 suites, ~12 test cases
2. **Integration Tests** — 3 suites, 6 test cases
3. **Edge Case Validation** — 3 suites, 6 test cases
4. **Performance Validation** — 3 suites, 6 test cases

**Total**: ~270 test cases across all 9 features

## TC ID Convention

`TC-F{featureNum}-{U|I|E|P}{suite}.{case}`

- `U` = Unit, `I` = Integration, `E` = Edge Case, `P` = Performance
