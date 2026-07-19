# EPIC10 Feature 2 — Container Platform — Test Cases

## Test Overview
Comprehensive test suite for the Container Platform covering unit tests, integration tests, edge cases, and performance validation. Tests validate Kubernetes pod scheduling, horizontal pod autoscaling, rolling deployments, liveness/readiness probes, resource limit enforcement, and namespace isolation for the conference backend microservices.

---

## 1. UNIT TEST SCENARIOS

### 1.1 Kubernetes Manifest Validation

#### TC-F2-U1.1: Pod Spec Contains Required Resource Limits
**Objective**: Verify that all service pod specs define CPU and memory requests and limits to prevent noisy-neighbor resource exhaustion.

**Preconditions**:
- Manifest YAML files present in `k8s/` directory
- `@kubernetes/client-node` available for schema validation

**Test Steps**:
1. Parse all Deployment manifests in `k8s/deployments/`
2. For each container spec, assert `resources.requests.cpu` is defined
3. Assert `resources.requests.memory` is defined
4. Assert `resources.limits.cpu` is defined
5. Assert `resources.limits.memory` is defined

**Expected Result**: All containers have explicit resource requests and limits; no unbounded containers.

**Code Sample**:
```typescript
describe('KubernetesManifestValidator', () => {
  it('should require resource limits on all container specs', () => {
    const manifests = loadManifests('./k8s/deployments/');

    for (const manifest of manifests) {
      for (const container of manifest.spec.template.spec.containers) {
        expect(container.resources?.requests?.cpu).toBeDefined();
        expect(container.resources?.requests?.memory).toBeDefined();
        expect(container.resources?.limits?.cpu).toBeDefined();
        expect(container.resources?.limits?.memory).toBeDefined();
      }
    }
  });
});
```

---

#### TC-F2-U1.2: Liveness and Readiness Probes Defined on All Deployments
**Objective**: Confirm every service deployment defines both a liveness probe (restart on deadlock) and readiness probe (traffic gating) to ensure platform health management works correctly.

**Test Steps**:
1. Load all Deployment manifests
2. For each container, assert `livenessProbe` is present with `httpGet` or `exec`
3. Assert `readinessProbe` is present
4. Assert `initialDelaySeconds` >= 10 to avoid premature restarts

**Expected Result**: All containers have both probes with sane delays; no probe-less deployments.

**Code Sample**:
```typescript
it('should define liveness and readiness probes on all service containers', () => {
  const manifests = loadManifests('./k8s/deployments/');

  for (const manifest of manifests) {
    for (const container of manifest.spec.template.spec.containers) {
      expect(container.livenessProbe).toBeDefined();
      expect(container.readinessProbe).toBeDefined();
      expect(container.livenessProbe.initialDelaySeconds).toBeGreaterThanOrEqual(10);
    }
  }
});
```

---

#### TC-F2-U1.3: ImagePullPolicy Set to Always for Non-Latest Tags
**Objective**: Verify that all production container images use `imagePullPolicy: Always` and do not use the `latest` tag to ensure deterministic deployments.

**Test Steps**:
1. Parse all Deployment manifests
2. For each container, assert image tag is not `latest`
3. Assert `imagePullPolicy` is `Always`

**Expected Result**: No `latest` tags; pull policy enforced; deployments are reproducible.

**Code Sample**:
```typescript
it('should reject latest image tag and require Always pull policy', () => {
  const manifests = loadManifests('./k8s/deployments/');

  for (const manifest of manifests) {
    for (const container of manifest.spec.template.spec.containers) {
      expect(container.image).not.toMatch(/:latest$/);
      expect(container.imagePullPolicy).toBe('Always');
    }
  }
});
```

---

### 1.2 Horizontal Pod Autoscaling Logic

#### TC-F2-U2.1: HPA Scale-Up Triggered at 70% CPU Threshold
**Objective**: Verify the HPA controller issues a scale-up decision when average CPU utilization across pods exceeds 70%.

**Preconditions**:
- HPA configured: min 2, max 10 replicas, target CPU 70%
- Metrics server mock returning simulated CPU readings

**Test Steps**:
1. Mock metrics server to return 85% CPU utilization across current pods
2. Call `hpa.evaluate()`
3. Assert scale-up recommendation returned
4. Assert recommended replica count > current replica count

**Expected Result**: HPA recommends scale-up; new replica count calculated correctly.

**Code Sample**:
```typescript
describe('HorizontalPodAutoscaler', () => {
  it('should recommend scale-up when CPU exceeds 70% threshold', async () => {
    const hpa = new HpaController({
      minReplicas: 2,
      maxReplicas: 10,
      targetCpuPercent: 70,
      metricsClient: mockMetrics({ cpuPercent: 85, currentReplicas: 2 }),
    });

    const decision = await hpa.evaluate();

    expect(decision.action).toBe('scale-up');
    expect(decision.desiredReplicas).toBeGreaterThan(2);
    expect(decision.desiredReplicas).toBeLessThanOrEqual(10);
  });
});
```

---

#### TC-F2-U2.2: HPA Does Not Scale Below Minimum Replica Count
**Objective**: Verify that when load is zero, the HPA never scales below the configured minimum, preserving availability.

**Test Steps**:
1. Mock metrics server to return 0% CPU (no traffic)
2. Set current replicas to minimum (2)
3. Call `hpa.evaluate()`
4. Assert action is `none` or `scale-down` to exactly 2 (minimum floor)

**Expected Result**: Replica count never falls below 2 regardless of CPU reading.

**Code Sample**:
```typescript
it('should not scale below minimum replica count at zero CPU', async () => {
  const hpa = new HpaController({
    minReplicas: 2,
    maxReplicas: 10,
    targetCpuPercent: 70,
    metricsClient: mockMetrics({ cpuPercent: 0, currentReplicas: 2 }),
  });

  const decision = await hpa.evaluate();

  expect(decision.desiredReplicas).toBeGreaterThanOrEqual(2);
});
```

---

#### TC-F2-U2.3: Scale-Down Cooldown Period Respected
**Objective**: Verify that after a scale-up event, the HPA waits the configured cooldown period (300 seconds) before issuing a scale-down.

**Test Steps**:
1. Issue scale-up event (CPU 85%)
2. Drop CPU to 10% immediately after
3. Call `hpa.evaluate()` 200 seconds later (within cooldown)
4. Assert no scale-down issued
5. Advance time by 310 seconds
6. Assert scale-down now issued

**Expected Result**: Scale-down suppressed during cooldown window; issued after cooldown expires.

**Code Sample**:
```typescript
it('should respect 300s scale-down cooldown after scale-up', async () => {
  jest.useFakeTimers();
  const hpa = new HpaController({ cooldownMs: 300_000, minReplicas: 2, maxReplicas: 10, targetCpuPercent: 70 });

  await hpa.scaleUp(5);
  mockMetrics.setCpu(10);

  jest.advanceTimersByTime(200_000);
  expect((await hpa.evaluate()).action).not.toBe('scale-down');

  jest.advanceTimersByTime(110_000);
  expect((await hpa.evaluate()).action).toBe('scale-down');
});
```

---

### 1.3 Namespace and Network Policy Enforcement

#### TC-F2-U3.1: Network Policy Denies Cross-Namespace Traffic
**Objective**: Verify that NetworkPolicy rules prevent pods in the `frontend` namespace from directly calling pods in the `data` namespace.

**Test Steps**:
1. Apply NetworkPolicy denying ingress to `data` namespace from `frontend` namespace
2. Simulate connection from `frontend` pod to `data` pod
3. Assert connection refused

**Expected Result**: Cross-namespace direct traffic blocked; only gateway-mediated calls succeed.

**Code Sample**:
```typescript
it('should deny direct cross-namespace pod communication', async () => {
  const policyEngine = new NetworkPolicyEngine(mockKubeClient);
  await policyEngine.apply(denyFrontendToDataPolicy);

  const result = await policyEngine.evaluate({
    sourcePod: { namespace: 'frontend', labels: { app: 'web' } },
    destPod: { namespace: 'data', labels: { app: 'postgres' } },
    port: 5432,
  });

  expect(result.allowed).toBe(false);
  expect(result.reason).toContain('NetworkPolicy');
});
```

---

#### TC-F2-U3.2: Service Account Token Mounted Only Where Required
**Objective**: Verify that only designated controller pods have `automountServiceAccountToken: true`; all other pods have it set to `false`.

**Test Steps**:
1. Parse all Pod specs
2. Identify pods in `system` namespace (controllers)
3. Assert non-controller pods have `automountServiceAccountToken: false`

**Expected Result**: Attack surface minimized; service account tokens not auto-mounted on workload pods.

---

#### TC-F2-U3.3: PodSecurityContext Runs as Non-Root
**Objective**: Verify all container pod security contexts enforce `runAsNonRoot: true` and `readOnlyRootFilesystem: true`.

**Test Steps**:
1. Parse all Deployment manifests
2. For each container security context, assert `runAsNonRoot: true`
3. Assert `readOnlyRootFilesystem: true`
4. Assert `allowPrivilegeEscalation: false`

**Expected Result**: No containers run as root; filesystem immutable; privilege escalation blocked.

**Code Sample**:
```typescript
it('should enforce non-root security context on all containers', () => {
  const manifests = loadManifests('./k8s/deployments/');
  for (const manifest of manifests) {
    for (const container of manifest.spec.template.spec.containers) {
      const sc = container.securityContext;
      expect(sc?.runAsNonRoot).toBe(true);
      expect(sc?.readOnlyRootFilesystem).toBe(true);
      expect(sc?.allowPrivilegeEscalation).toBe(false);
    }
  }
});
```

---

## 2. INTEGRATION TEST SCENARIOS

### 2.1 Rolling Deployment

#### TC-F2-I1.1: Rolling Update Maintains Zero Downtime
**Objective**: Verify that deploying a new image version via rolling update keeps the service available (no dropped requests) throughout the rollout.

**Preconditions**:
- Deployment running with 3 replicas (v1 image)
- k6 sending 100 RPS during update
- maxUnavailable: 0, maxSurge: 1 configured

**Test Steps**:
1. Start k6 load test at 100 RPS
2. Trigger deployment update to v2 image
3. Monitor k6 error rate throughout rollout
4. Assert no `5xx` errors occur during rollout
5. Assert all pods eventually running v2

**Expected Result**: Zero-downtime rollout; no 5xx errors; all replicas updated to v2.

**Code Sample**:
```shell
# Trigger rolling update and validate zero downtime
kubectl set image deployment/session-service \
  session-service=registry/session-service:v2 \
  --record

# Monitor rollout
kubectl rollout status deployment/session-service --timeout=5m

# Verify no pods still on v1
kubectl get pods -l app=session-service -o jsonpath='{.items[*].spec.containers[0].image}' \
  | tr ' ' '\n' | grep -c 'v1' | grep -q '^0$'
```

---

#### TC-F2-I1.2: Failed Rollout Automatically Rolled Back
**Objective**: Verify that if the new deployment's readiness probe fails, Kubernetes automatically rolls back to the previous stable version.

**Test Steps**:
1. Deploy image with a deliberately broken readiness probe response
2. Wait for rollout failure (readiness probe timeout)
3. Assert deployment rolled back to v1 automatically
4. Assert service continues serving traffic on v1

**Expected Result**: Automatic rollback triggered; v1 pods restored; service availability maintained.

**Code Sample**:
```shell
# Deploy broken image and observe rollback
kubectl set image deployment/session-service session-service=registry/session-service:broken
kubectl rollout status deployment/session-service --timeout=2m || true

# Confirm rollback to previous revision
kubectl rollout history deployment/session-service | grep -q 'CHANGE-CAUSE'
CURRENT_IMAGE=$(kubectl get deployment session-service -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "Current image after rollback: $CURRENT_IMAGE"
[[ "$CURRENT_IMAGE" == *":v1"* ]] && echo "PASS: rolled back to v1"
```

---

### 2.2 Pod Autoscaling Under Conference Load

#### TC-F2-I2.1: Cluster Scales from 2 to 8 Replicas Under Conference Burst
**Objective**: Simulate end-of-keynote traffic burst and verify the session service autoscales from baseline (2 pods) to at least 8 pods within 5 minutes.

**Preconditions**:
- Session service running at min 2 replicas
- HPA target: 70% CPU, max 10 replicas
- Cluster Autoscaler enabled

**Test Steps**:
1. Ramp load from 100 to 5000 RPS over 2 minutes
2. Monitor HPA events and pod count
3. Assert pod count reaches 8+ within 5 minutes
4. Assert no requests dropped during scale-out

**Expected Result**: Autoscaler responds to CPU pressure; pod count reaches 8 within SLA; no errors.

**Code Sample**:
```shell
# Watch HPA scale-up in real time
kubectl get hpa session-service-hpa --watch &

# Drive load with k6
k6 run --vus 50 --stage '2m:5000,5m:5000,2m:0' conference-burst.js

# Verify pod count reached target
MAX_PODS=$(kubectl get hpa session-service-hpa -o jsonpath='{.status.currentReplicas}')
echo "Max replicas reached: $MAX_PODS"
[ "$MAX_PODS" -ge 8 ] && echo "PASS" || echo "FAIL"
```

---

#### TC-F2-I2.2: Pods Evenly Spread Across Availability Zones
**Objective**: Verify that when 6 replicas are running, the topology spread constraint distributes them across 3 AZs with no AZ having more than 2 pods.

**Test Steps**:
1. Scale deployment to 6 replicas
2. Query pod node assignments via `kubectl get pods -o wide`
3. Group pods by AZ label on their nodes
4. Assert each AZ has exactly 2 pods

**Expected Result**: Even AZ spread enforced by topology spread constraint; no single-AZ concentration.

**Code Sample**:
```shell
kubectl scale deployment session-service --replicas=6
sleep 30
kubectl get pods -l app=session-service -o wide \
  | awk 'NR>1 {print $7}' \
  | xargs -I{} kubectl get node {} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}{"\n"}' \
  | sort | uniq -c
```

---

### 2.3 Container Registry and Image Management

#### TC-F2-I3.1: Image Pull Completes Within 30 Seconds from Private Registry
**Objective**: Verify that the container runtime can pull a 500 MB service image from the private registry within 30 seconds from a cold node cache.

**Test Steps**:
1. Drain image cache on test node
2. Deploy pod referencing 500 MB image
3. Measure time from pod creation to `ContainersReady` state
4. Assert elapsed time < 30 seconds

**Expected Result**: Image pull completes within SLA; imagePullSecrets correctly configured.

---

#### TC-F2-I3.2: Registry Credentials Rotated Without Pod Restart
**Objective**: Verify that rotating the image pull secret does not require pod restarts; only new image pulls (deploys/scale-outs) use the new credential.

**Test Steps**:
1. Rotate registry credentials and update the `regcred` secret
2. Assert running pods continue serving traffic
3. Trigger new pod creation (scale-out)
4. Assert new pod pulls image successfully with new credentials

**Expected Result**: Zero-disruption credential rotation; existing pods unaffected; new pods use updated credentials.

---

## 3. EDGE CASE VALIDATION

### 3.1 Resource Exhaustion and Eviction

#### TC-F2-E1.1: Pod Evicted When Node Memory Approaches Threshold
**Objective**: Verify the kubelet evicts low-priority pods when node memory reaches the eviction threshold (85%), preserving critical service pods.

**Test Steps**:
1. Set node memory eviction threshold to 85%
2. Deploy a low-priority memory-hungry pod filling node to 87%
3. Assert kubelet evicts the low-priority pod
4. Assert high-priority session-service pods remain running

**Expected Result**: Priority-based eviction preserves critical workloads; low-priority pod evicted.

**Code Sample**:
```typescript
it('should evict low-priority pods when node memory threshold exceeded', async () => {
  await k8sClient.applyPod(lowPriorityMemoryHogPod);
  await waitForNodeMemory(87);

  const pods = await k8sClient.listPods({ namespace: 'production' });
  const criticalPods = pods.filter((p) => p.labels['priority'] === 'critical');
  const evictedPods = pods.filter((p) => p.status.phase === 'Failed' && p.status.reason === 'Evicted');

  expect(criticalPods.every((p) => p.status.phase === 'Running')).toBe(true);
  expect(evictedPods.some((p) => p.labels['priority'] === 'low')).toBe(true);
});
```

---

#### TC-F2-E1.2: CrashLoopBackOff Pod Does Not Consume All Restart Slots
**Objective**: Verify that a repeatedly crashing pod enters `CrashLoopBackOff` with exponential backoff and does not saturate the node's process table.

**Test Steps**:
1. Deploy a pod that immediately exits with code 1
2. Observe pod status progression: `Error` → `CrashLoopBackOff`
3. Assert restart count increments with increasing backoff delay
4. Assert no more than 5 restarts within first 10 minutes

**Expected Result**: Exponential backoff prevents restart storms; pod isolated in CrashLoopBackOff state.

---

### 3.2 Node Failure Simulation

#### TC-F2-E2.1: Pod Rescheduled to Healthy Node Within 60 Seconds of Node Failure
**Objective**: Verify that when a node becomes NotReady, pods are rescheduled to healthy nodes within the configured tolerationSeconds (60s).

**Test Steps**:
1. Record current pod-to-node assignments
2. Simulate node failure by draining and cordoning a node
3. Monitor pod events for rescheduling
4. Assert all displaced pods reach `Running` state on new nodes within 60 seconds

**Expected Result**: Node failure triggers pod rescheduling within SLA; no permanent service degradation.

**Code Sample**:
```shell
# Simulate node failure
kubectl cordon worker-node-2
kubectl drain worker-node-2 --ignore-daemonsets --delete-emptydir-data

# Monitor pod rescheduling
START=$(date +%s)
kubectl wait --for=condition=Ready pods -l app=session-service --timeout=60s
END=$(date +%s)
echo "Rescheduling completed in $((END - START)) seconds"
```

---

#### TC-F2-E2.2: PodDisruptionBudget Prevents Simultaneous Multi-Pod Eviction
**Objective**: Verify that a PodDisruptionBudget with `minAvailable: 2` prevents draining a node from evicting all 3 session-service pods simultaneously.

**Test Steps**:
1. Configure PDB: `minAvailable: 2` for session-service
2. Attempt to drain node hosting all 3 session-service pods
3. Assert drain blocks until one pod is rescheduled elsewhere
4. Assert service never drops below 2 running pods

**Expected Result**: PDB enforced; drain waits; service availability preserved at minimum 2 pods.

---

### 3.3 ConfigMap and Secret Hot Reload

#### TC-F2-E3.1: ConfigMap Update Propagated to Pods Without Restart
**Objective**: Verify that updating a ConfigMap mounted as a volume propagates to running pods within the kubelet sync period (60 seconds) without requiring pod restart.

**Test Steps**:
1. Mount `app-config` ConfigMap as volume in session-service pods
2. Update ConfigMap value `LOG_LEVEL` from `info` to `debug`
3. Wait 90 seconds
4. Assert running pod reads updated `LOG_LEVEL: debug` from mounted file

**Expected Result**: ConfigMap hot-reload works within 90 seconds; no pod restart needed.

---

#### TC-F2-E3.2: Secret Reference Failure Prevents Pod from Starting
**Objective**: Verify that if a Secret referenced by a pod's `envFrom` does not exist, the pod enters `Pending` state with a clear `CreateContainerConfigError` rather than starting with missing credentials.

**Test Steps**:
1. Deploy pod referencing non-existent Secret `db-credentials`
2. Assert pod status is `Pending`
3. Assert pod events contain `CreateContainerConfigError`
4. Create the missing Secret
5. Assert pod transitions to `Running`

**Expected Result**: Missing Secret causes controlled `Pending` state; pod does not start with empty credentials.

---

## 4. PERFORMANCE VALIDATION

### 4.1 Pod Startup Latency

#### TC-F2-P1.1: Pod Ready Within 10 Seconds of Scheduling
**Objective**: Verify that a new session-service pod reaches `Ready` state within 10 seconds of being scheduled, enabling fast autoscaling response during traffic spikes.

**Preconditions**:
- Container image pre-pulled on target nodes
- Resource quota available on node
- Readiness probe: HTTP GET /health, initialDelaySeconds: 5

**Test Steps**:
1. Record timestamp when pod enters `Pending` state
2. Record timestamp when pod condition `Ready: True` is set
3. Calculate elapsed time
4. Assert elapsed time < 10 seconds across 10 pod starts

**Expected Result**: All 10 pod startups complete within 10 seconds; autoscaling reaction time acceptable.

**Code Sample**:
```shell
# Measure pod startup time for 10 pods
for i in $(seq 1 10); do
  START=$(date +%s%N)
  kubectl run perf-pod-$i --image=registry/session-service:v2 --restart=Never
  kubectl wait --for=condition=Ready pod/perf-pod-$i --timeout=30s
  END=$(date +%s%N)
  ELAPSED=$(( (END - START) / 1000000 ))
  echo "Pod $i ready in ${ELAPSED}ms"
  kubectl delete pod perf-pod-$i --grace-period=0
done
```

---

#### TC-F2-P1.2: Horizontal Scale-Out 2 to 6 Pods Completes Within 90 Seconds
**Objective**: Measure the elapsed time from HPA scale-up decision to all 6 pods being Ready, ensuring autoscaling reacts fast enough for conference traffic bursts.

**Test Steps**:
1. Trigger manual HPA scale: `kubectl scale deployment session-service --replicas=6`
2. Record timestamp
3. Poll until all 6 pods show `Ready: True`
4. Assert elapsed time < 90 seconds

**Expected Result**: 4 additional pod starts complete within 90 seconds including image pull.

---

### 4.2 Cluster Autoscaler Node Provisioning

#### TC-F2-P2.1: New Node Provisioned and Ready Within 3 Minutes Under Resource Pressure
**Objective**: Verify the Cluster Autoscaler provisions a new worker node within 3 minutes when all existing nodes are at 90% resource utilization.

**Test Steps**:
1. Fill all existing nodes to 90% CPU with synthetic workloads
2. Deploy new session-service pod that cannot be scheduled
3. Observe Cluster Autoscaler events
4. Assert new node becomes Ready within 3 minutes
5. Assert pending pod scheduled onto new node

**Expected Result**: Node provisioned within 3-minute SLA; no manual intervention.

**Code Sample**:
```shell
# Watch cluster autoscaler logs for scale-out decision
kubectl -n kube-system logs -f deployment/cluster-autoscaler | grep -i "scale up"

# Verify new node joined
INITIAL_NODES=$(kubectl get nodes --no-headers | wc -l)
sleep 180
NEW_NODES=$(kubectl get nodes --no-headers | wc -l)
[ "$NEW_NODES" -gt "$INITIAL_NODES" ] && echo "PASS: new node provisioned" || echo "FAIL"
```

---

#### TC-F2-P2.2: Idle Node Deprovisioned Within 10 Minutes of Scale-Down
**Objective**: Verify that when load decreases and a node becomes idle (below 50% utilization with no critical pods), the Cluster Autoscaler decommissions it within 10 minutes.

**Test Steps**:
1. Scale down service replicas to release a node
2. Confirm node utilization drops below threshold
3. Wait 10 minutes
4. Assert node count decreased by 1

**Expected Result**: Cost-optimizing scale-down occurs within 10 minutes; workloads safely migrated first.

---

### 4.3 Network Performance Between Pods

#### TC-F2-P3.1: Pod-to-Pod Latency Within Same Namespace Under 1ms
**Objective**: Verify that internal service-to-service calls within the same Kubernetes namespace have p99 latency under 1 ms.

**Test Steps**:
1. Deploy latency measurement pods (session-service to contact-service call)
2. Send 10,000 consecutive internal HTTP requests
3. Measure p50, p95, p99 latency
4. Assert p99 < 1 ms

**Expected Result**: CNI overlay network introduces sub-millisecond overhead; p99 < 1 ms.

**Code Sample**:
```shell
# Measure inter-pod latency using netperf
kubectl exec -it session-service-pod -- \
  netperf -H contact-service.production.svc.cluster.local -l 30 -t TCP_RR \
  -- -r 1024,1024 -P 8080
```

---

#### TC-F2-P3.2: Egress Traffic Rate Limited to Prevent Node Saturation
**Objective**: Verify that per-pod egress bandwidth limits (500 Mbps) are enforced by the CNI plugin, preventing a single pod from saturating the node's network interface.

**Test Steps**:
1. Configure egress bandwidth limit annotation on session-service pod: `500M`
2. Run iperf3 from pod against external endpoint
3. Assert measured throughput does not exceed 500 Mbps

**Expected Result**: CNI enforces bandwidth limit; node NIC protected from single-pod saturation.

---

## Test Execution Summary

| Category | Suites | Test Cases |
|---|---|---|
| Unit Tests | 3 | 9 |
| Integration Tests | 3 | 6 |
| Edge Case Validation | 3 | 6 |
| Performance Validation | 3 | 6 |
| **Total** | **12** | **~27** |

**Coverage**: Pod spec validation, HPA scaling logic, network policies, rolling deployments, autoscaling under load, AZ spread, eviction policies, node failure recovery, PodDisruptionBudget, ConfigMap hot-reload, pod startup latency, Cluster Autoscaler, inter-pod network performance.
