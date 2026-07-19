# EPIC10 Feature 3 — CI/CD Pipeline — Test Cases

## Test Overview
Comprehensive test suite for the CI/CD Pipeline covering unit tests, integration tests, edge cases, and performance validation. Tests validate GitHub Actions workflow triggers, automated test gating, Docker image build and scan, environment promotion logic, rollback mechanisms, and pipeline execution time compliance.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Workflow Trigger Validation

#### TC-F3-U1.1: Push to Main Branch Triggers Production Deployment Workflow
**Objective**: Verify that a push to the `main` branch triggers the production deployment workflow and that feature branch pushes do not.

**Preconditions**:
- GitHub Actions workflow file present at `.github/workflows/deploy-production.yml`
- `on.push.branches` configured to `['main']`

**Test Steps**:
1. Parse workflow YAML trigger configuration
2. Assert `on.push.branches` includes `main`
3. Assert `on.push.branches` does not include `feature/*` pattern
4. Simulate push event to `feature/new-endpoint` branch
5. Assert deployment job not triggered

**Expected Result**: Only `main` branch pushes trigger production deployment; feature branches are isolated.

**Code Sample**:
```typescript
describe('WorkflowTriggerValidator', () => {
  it('should trigger production deploy only on main branch push', () => {
    const workflow = parseWorkflow('.github/workflows/deploy-production.yml');
    const trigger = workflow.on.push;

    expect(trigger.branches).toContain('main');
    expect(trigger.branches).not.toContain('feature/*');
  });

  it('should not trigger deployment for feature branch push', () => {
    const event = { eventName: 'push', ref: 'refs/heads/feature/new-endpoint' };
    const shouldTrigger = evaluateTrigger(workflow, event);
    expect(shouldTrigger).toBe(false);
  });
});
```

---

#### TC-F3-U1.2: Pull Request Triggers Test and Lint Jobs Only
**Objective**: Verify that PR events trigger only CI validation jobs (test, lint, build) and never the deployment job.

**Test Steps**:
1. Parse `on.pull_request` trigger configuration
2. Assert `deploy` job has `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` condition
3. Simulate pull request opened event
4. Assert deploy job is skipped

**Expected Result**: PR events run validation only; deployment job skipped; no accidental deploys from PRs.

**Code Sample**:
```typescript
it('should skip deployment job on pull_request event', () => {
  const workflow = parseWorkflow('.github/workflows/ci.yml');
  const deployJob = workflow.jobs['deploy'];
  const prContext = { event_name: 'pull_request', ref: 'refs/heads/feature/auth' };

  const jobEnabled = evaluateJobCondition(deployJob.if, prContext);
  expect(jobEnabled).toBe(false);
});
```

---

#### TC-F3-U1.3: Tag Push Triggers Release Workflow With Version Extraction
**Objective**: Verify that pushing a semver tag (e.g., `v1.2.3`) triggers the release workflow and correctly extracts the version string for image tagging.

**Test Steps**:
1. Simulate push event with ref `refs/tags/v1.2.3`
2. Assert release workflow triggered
3. Assert version extraction step produces `VERSION=1.2.3`
4. Assert Docker image tagged as `registry/service:1.2.3`

**Expected Result**: Tag push triggers release; version extracted from ref; image tagged with semver.

**Code Sample**:
```typescript
it('should extract version from tag ref for image tagging', () => {
  const ref = 'refs/tags/v1.2.3';
  const version = extractVersionFromRef(ref);

  expect(version).toBe('1.2.3');
  expect(buildImageTag('session-service', version)).toBe('registry/conference-app/session-service:1.2.3');
});
```

---

### 1.2 Test Gating and Quality Gates

#### TC-F3-U2.1: Pipeline Fails Fast When Unit Tests Fail
**Objective**: Verify that a unit test failure in the CI run causes the pipeline to fail at the test stage and skips subsequent build and deploy stages.

**Preconditions**:
- Workflow defines jobs: `test` → `build` → `deploy` with `needs` dependencies
- `build` job has `needs: [test]`

**Test Steps**:
1. Parse workflow job dependency graph
2. Simulate test job failure (exit code 1)
3. Assert `build` job status is `skipped`
4. Assert `deploy` job status is `skipped`

**Expected Result**: Downstream jobs skipped on test failure; broken code never reaches build or deploy.

**Code Sample**:
```typescript
describe('PipelineDependencyResolver', () => {
  it('should skip build and deploy when test job fails', () => {
    const pipeline = new PipelineSimulator(workflow);
    pipeline.fail('test');

    const status = pipeline.evaluate();
    expect(status.jobs['build']).toBe('skipped');
    expect(status.jobs['deploy']).toBe('skipped');
  });
});
```

---

#### TC-F3-U2.2: Code Coverage Gate Rejects PRs Below 80% Coverage
**Objective**: Verify the coverage gate step fails the pipeline when test coverage drops below the 80% threshold.

**Test Steps**:
1. Mock coverage reporter returning 75% line coverage
2. Execute coverage gate check step
3. Assert step exits with non-zero status
4. Assert failure message includes actual vs required coverage

**Expected Result**: Coverage gate blocks merge when coverage < 80%; message shows gap.

**Code Sample**:
```typescript
it('should fail coverage gate when coverage below 80%', async () => {
  const gate = new CoverageGate({ threshold: 80 });
  const report = { lineCoverage: 75, branchCoverage: 68 };

  await expect(gate.evaluate(report)).rejects.toThrow(
    'Coverage gate failed: 75% < required 80%'
  );
});
```

---

#### TC-F3-U2.3: Linting Errors Block Pipeline Progression
**Objective**: Verify that ESLint errors caught during the lint stage prevent the build from proceeding even if tests pass.

**Test Steps**:
1. Inject an ESLint rule violation into a source file (unused variable)
2. Run lint step
3. Assert lint step exits with code 1
4. Assert build step is skipped

**Expected Result**: Lint error is a pipeline blocker; consistent code style enforced in CI.

**Code Sample**:
```typescript
it('should block build when lint errors present', async () => {
  const linter = new EslintRunner({ config: '.eslintrc.js' });
  const result = await linter.lint(['src/broken-file.ts']);

  expect(result.errorCount).toBeGreaterThan(0);
  expect(result.exitCode).toBe(1);
});
```

---

### 1.3 Docker Image Build and Security Scan

#### TC-F3-U3.1: Image Build Tags with Git SHA and Semver
**Objective**: Verify the build step produces an image tagged with both the short Git SHA and the semver version to support traceability and rollback.

**Test Steps**:
1. Mock Git context: SHA `a1b2c3d4`, version `1.3.0`
2. Execute image build step
3. Assert image tagged `registry/session-service:1.3.0`
4. Assert image also tagged `registry/session-service:a1b2c3d`

**Expected Result**: Dual-tagging ensures both human-readable and trace-friendly image references.

**Code Sample**:
```typescript
it('should tag image with both semver and git SHA', () => {
  const builder = new DockerImageBuilder({ registry: 'registry.conference.app' });
  const tags = builder.computeTags({ version: '1.3.0', gitSha: 'a1b2c3d4e5f6' });

  expect(tags).toContain('registry.conference.app/session-service:1.3.0');
  expect(tags).toContain('registry.conference.app/session-service:a1b2c3d');
});
```

---

#### TC-F3-U3.2: Container Scan Blocks Deploy on Critical CVE
**Objective**: Verify the Trivy vulnerability scan step fails the pipeline and blocks deployment when a critical CVE is found in the container image.

**Test Steps**:
1. Mock Trivy scan result with one CRITICAL severity CVE
2. Execute scan gate step
3. Assert pipeline fails with exit code 1
4. Assert failure message cites the CVE ID

**Expected Result**: Critical CVEs block deployment; image not pushed to production registry.

**Code Sample**:
```typescript
it('should block pipeline when Trivy finds CRITICAL CVE', async () => {
  const scanner = new TrivyScanner({ failOn: 'CRITICAL' });
  const mockReport = {
    vulnerabilities: [{ id: 'CVE-2024-12345', severity: 'CRITICAL', pkg: 'openssl' }],
  };

  await expect(scanner.evaluate(mockReport)).rejects.toThrow('CVE-2024-12345');
});
```

---

#### TC-F3-U3.3: Multi-Stage Build Produces Minimal Image Under 150MB
**Objective**: Verify the Dockerfile multi-stage build discards development dependencies and produces a production image under 150 MB.

**Test Steps**:
1. Build Docker image using production Dockerfile
2. Query final image size via `docker inspect`
3. Assert image size < 150 MB

**Expected Result**: Minimal production image reduces attack surface and improves pull times.

**Code Sample**:
```shell
# Build and verify image size
docker build -t session-service:test -f Dockerfile.prod .
SIZE=$(docker inspect session-service:test --format='{{.Size}}')
MAX_BYTES=$((150 * 1024 * 1024))
[ "$SIZE" -lt "$MAX_BYTES" ] && echo "PASS: ${SIZE} bytes < 150MB" || echo "FAIL: image too large"
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 End-to-End Pipeline on Feature Branch

#### TC-F3-I1.1: Full CI Pipeline Completes on Feature Branch Push
**Objective**: Verify that pushing to a feature branch runs the complete CI pipeline (checkout, lint, test, build) and reports status to GitHub.

**Preconditions**:
- Feature branch `feature/test-ci` created
- GitHub Actions runner configured
- All required secrets (`REGISTRY_TOKEN`, `SONAR_TOKEN`) present

**Test Steps**:
1. Push commit to `feature/test-ci`
2. Observe GitHub Actions workflow execution
3. Assert all jobs complete: `lint`, `test`, `build`
4. Assert GitHub commit status updated to `success`
5. Assert no deploy job runs

**Expected Result**: Full CI gate passes; commit marked green; deploy skipped as expected for feature branch.

**Code Sample**:
```shell
# Trigger CI and monitor via GitHub CLI
git push origin feature/test-ci
gh run watch $(gh run list --branch feature/test-ci --limit 1 --json databaseId -q '.[0].databaseId')
gh run view --branch feature/test-ci --json conclusion -q '.conclusion'
```

---

#### TC-F3-I1.2: Merge to Main Triggers Staging Deployment Automatically
**Objective**: Verify the complete promotion chain: PR merge to main → CI passes → staging deployment triggered automatically.

**Test Steps**:
1. Merge PR to main branch
2. Assert `deploy-staging` workflow triggered within 2 minutes
3. Assert staging deployment completes successfully
4. Assert smoke test against staging environment passes

**Expected Result**: Merge-to-main triggers automatic staging deploy; smoke test validates deployment.

**Code Sample**:
```shell
# Merge PR and wait for staging deploy
gh pr merge 42 --squash --auto

# Wait for deployment workflow
sleep 30
STAGING_RUN=$(gh run list --workflow=deploy-staging.yml --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$STAGING_RUN"

# Run smoke test
curl -sf https://staging-api.conference.app/health | jq '.status == "ok"'
```

---

### 2.2 Environment Promotion Gate

#### TC-F3-I2.1: Staging-to-Production Promotion Requires Manual Approval
**Objective**: Verify that the production deployment step is blocked by a GitHub Environments protection rule requiring manual approval from a senior engineer.

**Test Steps**:
1. Trigger staging deployment (succeeds automatically)
2. Observe `deploy-production` job enters `waiting` state
3. Assert job waits for reviewer approval
4. Approve via GitHub UI as authorized reviewer
5. Assert production deployment proceeds after approval

**Expected Result**: Production deployment gated by human approval; no auto-promote to production without review.

**Code Sample**:
```shell
# Check that production job is waiting for approval
gh run view --job=deploy-production --json status -q '.status'
# Expected: "waiting"

# Approve from authorized reviewer account
gh run approve "$RUN_ID"

# Verify deploy proceeds
gh run watch "$RUN_ID"
```

---

#### TC-F3-I2.2: Canary Deployment Sends 10% Traffic to New Version
**Objective**: Verify that the production promotion step first deploys the new version as a canary receiving 10% of traffic before full rollout.

**Test Steps**:
1. Trigger production promotion with canary strategy
2. Assert canary deployment created with 1 of 10 replicas
3. Monitor traffic split for 5 minutes
4. Assert error rate on canary < 1%
5. Assert automatic full rollout triggered if canary healthy

**Expected Result**: Canary receives 10% traffic; health verified before full rollout; blast radius limited.

---

### 2.3 Secrets Management in Pipeline

#### TC-F3-I3.1: Pipeline Secrets Injected as Environment Variables Without Appearing in Logs
**Objective**: Verify that CI secrets (registry tokens, database credentials) are injected as env vars and masked in all pipeline log output.

**Test Steps**:
1. Configure pipeline step that echoes all environment variables
2. Check GitHub Actions log output
3. Assert `REGISTRY_TOKEN` value is masked as `***`
4. Assert secret value does not appear in artifact logs

**Expected Result**: Secrets never appear in logs; GitHub masking works; no credential leakage.

---

#### TC-F3-I3.2: Pipeline Fails Loudly if Required Secret Missing
**Objective**: Verify that if a required secret is not configured, the pipeline fails at startup with a clear error message rather than silently running with empty credentials.

**Test Steps**:
1. Remove `REGISTRY_TOKEN` secret from GitHub repository settings
2. Trigger CI run
3. Assert pipeline fails in `setup` or `build` step
4. Assert error message identifies missing `REGISTRY_TOKEN`

**Expected Result**: Missing secret causes early, clear failure; does not partially execute with broken credentials.

**Code Sample**:
```typescript
it('should fail with clear error when required secret is missing', () => {
  const validator = new PipelineSecretValidator();
  const context = { secrets: {} }; // REGISTRY_TOKEN missing

  expect(() => validator.validate(context)).toThrow('Required secret REGISTRY_TOKEN is not configured');
});
```

---

## 3. EDGE CASE VALIDATION

### 3.1 Concurrent Pipeline Runs

#### TC-F3-E1.1: Concurrency Group Cancels Older Run When New Commit Pushed
**Objective**: Verify that the `concurrency` group setting cancels in-progress CI runs for the same branch when a newer commit is pushed, saving runner minutes.

**Test Steps**:
1. Push commit A to `feature/concurrent` (pipeline starts)
2. Push commit B to same branch while A's pipeline is running
3. Assert commit A's pipeline is cancelled
4. Assert commit B's pipeline proceeds to completion

**Expected Result**: Older pipeline cancelled; only latest commit's pipeline runs; runner resources not wasted.

**Code Sample**:
```typescript
it('should cancel older pipeline run when newer commit pushed to same branch', async () => {
  const scheduler = new ConcurrencyGroupScheduler({ group: 'ci-feature-concurrent', cancelInProgress: true });

  const run1 = scheduler.schedule({ ref: 'feature/concurrent', sha: 'aaa111' });
  const run2 = scheduler.schedule({ ref: 'feature/concurrent', sha: 'bbb222' });

  expect(run1.status).toBe('cancelled');
  expect(run2.status).toBe('running');
});
```

---

#### TC-F3-E1.2: Two PRs Merging Simultaneously Do Not Conflict in Staging
**Objective**: Verify that when two PRs merge to main within seconds of each other, the second deployment waits for the first to complete rather than deploying concurrently to staging.

**Test Steps**:
1. Merge PR-101 and PR-102 within 10 seconds of each other
2. Assert only one `deploy-staging` run active at a time
3. Assert second run queues and starts after first completes
4. Assert final staging state reflects both PRs' changes

**Expected Result**: Sequential deployment to staging; no race condition between concurrent merges.

---

### 3.2 Build Cache Behavior

#### TC-F3-E2.1: Cache Hit Reduces Build Time by at Least 50%
**Objective**: Verify that the GitHub Actions cache for `node_modules` and Docker layer cache produces measurable build time reduction on second run.

**Test Steps**:
1. Run pipeline on fresh cache (record build time T1)
2. Run pipeline again without code changes (record build time T2)
3. Assert T2 < T1 * 0.5 (50% faster)
4. Assert cache hit logged in workflow output

**Expected Result**: Cache reduces npm install and Docker build time by over 50%.

---

#### TC-F3-E2.2: Stale Cache Does Not Serve Incompatible node_modules After package.json Change
**Objective**: Verify that changing `package.json` invalidates the `node_modules` cache key and forces a fresh `npm ci`.

**Test Steps**:
1. Establish cache with key based on `package-lock.json` hash
2. Modify `package.json` (add new dependency)
3. Trigger CI
4. Assert cache miss logged
5. Assert `npm ci` runs fresh install

**Expected Result**: Cache key invalidated by lockfile change; no stale modules used.

**Code Sample**:
```typescript
it('should invalidate cache when package-lock.json changes', () => {
  const cache = new CacheKeyResolver();
  const key1 = cache.computeKey({ lockfileHash: 'abc123' });
  const key2 = cache.computeKey({ lockfileHash: 'def456' }); // lockfile changed

  expect(key1).not.toBe(key2);
});
```

---

### 3.3 Pipeline Failure Recovery

#### TC-F3-E3.1: Failed Deploy Triggers Automatic Rollback to Previous Version
**Objective**: Verify that if the post-deployment smoke test fails, the pipeline automatically triggers a Kubernetes rollback to the previous deployment revision.

**Test Steps**:
1. Deploy v2 (smoke test configured to fail)
2. Assert smoke test step fails
3. Assert rollback step executes: `kubectl rollout undo deployment/session-service`
4. Assert service returns to v1 within 60 seconds

**Expected Result**: Automatic rollback on deploy failure; service restored to last known good version.

**Code Sample**:
```shell
# Smoke test failure triggers rollback
run_smoke_test() {
  curl -sf https://staging-api.conference.app/health || return 1
}

if ! run_smoke_test; then
  echo "Smoke test failed — initiating rollback"
  kubectl rollout undo deployment/session-service
  kubectl rollout status deployment/session-service --timeout=60s
fi
```

---

#### TC-F3-E3.2: Re-Run of Failed Pipeline Step Resumes Without Re-Running Passed Steps
**Objective**: Verify that re-running a failed step in GitHub Actions only re-executes the failed job, not the entire pipeline, saving time and resources.

**Test Steps**:
1. Simulate pipeline failure in `deploy` job (lint and test already passed)
2. Re-run only failed jobs
3. Assert `lint` and `test` jobs are not re-executed
4. Assert `deploy` job re-runs

**Expected Result**: Selective job re-run preserves passed job results; faster failure recovery.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Pipeline Execution Time

#### TC-F3-P1.1: Full CI Pipeline Completes Within 8 Minutes
**Objective**: Verify the complete CI pipeline (checkout, lint, test, build, scan) completes within 8 minutes to maintain fast developer feedback loops.

**Preconditions**:
- GitHub-hosted runner: ubuntu-latest
- npm cache populated from prior run
- Docker layer cache available

**Test Steps**:
1. Push commit to feature branch
2. Record pipeline start time
3. Monitor all job completions
4. Assert total wall-clock time < 8 minutes

**Expected Result**: Fast pipeline; developer feedback under 8 minutes; no job exceeds 5 minutes individually.

**Code Sample**:
```shell
# Measure pipeline duration via GitHub CLI
RUN_ID=$(gh run list --branch feature/perf-test --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID"
gh run view "$RUN_ID" --json createdAt,updatedAt \
  | jq '((.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)) | . <= 480'
```

---

#### TC-F3-P1.2: Docker Build Step Completes Within 3 Minutes With Layer Cache
**Objective**: Measure Docker image build time with warm layer cache and assert it completes within 3 minutes.

**Test Steps**:
1. Run Docker build step twice (second run with warm cache)
2. Record second build duration
3. Assert duration < 3 minutes

**Expected Result**: Cached build under 3 minutes; layer cache effective for unchanged base layers.

---

### 4.2 Test Suite Execution Time

#### TC-F3-P2.1: Unit Test Suite Runs in Under 2 Minutes
**Objective**: Verify the unit test suite executes in under 2 minutes to maintain rapid CI feedback.

**Test Steps**:
1. Run `npm test -- --coverage` and record duration
2. Assert total time < 120 seconds
3. Assert all tests pass

**Expected Result**: Unit test suite fast enough for pre-commit hooks and CI; under 2 minutes.

**Code Sample**:
```shell
START=$(date +%s)
npm test -- --coverage --forceExit 2>&1 | tee test-output.log
END=$(date +%s)
DURATION=$((END - START))
echo "Test suite duration: ${DURATION}s"
[ "$DURATION" -lt 120 ] && echo "PASS" || echo "FAIL: exceeded 2 minute limit"
```

---

#### TC-F3-P2.2: Integration Test Suite Parallelised Across 4 Workers
**Objective**: Verify that the integration test suite uses 4 parallel workers and completes within 5 minutes (vs 15 minutes sequentially).

**Test Steps**:
1. Configure Jest with `--maxWorkers=4`
2. Run integration test suite
3. Assert completion within 5 minutes
4. Assert all tests pass

**Expected Result**: 4x parallelization keeps integration tests within 5-minute CI budget.

**Code Sample**:
```typescript
// jest.config.ts
export default {
  testEnvironment: 'node',
  maxWorkers: 4,
  testMatch: ['**/*.integration.test.ts'],
  testTimeout: 30_000,
};
```

---

### 4.3 Deployment Frequency and Change Failure Rate

#### TC-F3-P3.1: Pipeline Supports 20 Deployments Per Day Without Queue Buildup
**Objective**: Verify pipeline infrastructure can handle 20 concurrent deployment triggers per day without runners queuing for more than 2 minutes.

**Test Steps**:
1. Simulate 20 simultaneous workflow triggers
2. Measure queue wait time for each run
3. Assert no run waits more than 2 minutes for a runner

**Expected Result**: Runner pool scales to meet deployment frequency; no bottleneck.

---

#### TC-F3-P3.2: Change Failure Rate Below 5% Over 30-Day Window
**Objective**: Track the percentage of deployments that require rollback over 30 days and verify it stays below the 5% DORA target.

**Test Steps**:
1. Query GitHub Actions run history for 30 days
2. Count total deployments and rollback-triggered deployments
3. Calculate change failure rate
4. Assert rate < 5%

**Expected Result**: Change failure rate within DORA Elite performance target.

**Code Sample**:
```shell
# Calculate change failure rate from GitHub Actions history
TOTAL=$(gh run list --workflow=deploy-production.yml --limit 100 --json conclusion -q 'length')
FAILURES=$(gh run list --workflow=deploy-production.yml --limit 100 --json conclusion -q '[.[] | select(.conclusion == "failure")] | length')
echo "Change failure rate: $(echo "scale=2; $FAILURES * 100 / $TOTAL" | bc)%"
```

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **~27** |

**Coverage**: Workflow trigger logic, test gating, coverage thresholds, Docker build, Trivy scanning, E2E pipeline runs, environment promotion gates, secrets management, concurrency groups, cache invalidation, automatic rollback, pipeline duration, deployment frequency, DORA metrics.
