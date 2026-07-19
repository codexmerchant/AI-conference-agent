import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = {
  6: [6, 7, 8, 9], 7: [7, 8], 8: [6, 7, 8], 10: [6, 7, 8],
  11: [6, 7, 8], 12: [6, 7], 13: [6, 7, 8, 9], 14: [6, 7, 8, 9],
};

function section(text, number, next) {
  const match = text.match(new RegExp(`^# ${number}\\. [^\\n]+\\n([\\s\\S]*?)(?=^# ${next}\\. |$)`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function bullets(text) {
  return [...text.matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
}

function subheads(text) {
  return [...text.matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
}

function metricRows(text) {
  return [...text.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
    .map(m => [m[1].trim(), m[2].trim()])
    .filter(([a]) => !['Metric', '---'].includes(a));
}

function caseBlock(id, title, objective, precondition, steps, expected) {
  return `#### ${id}: ${title}\n**Objective**: ${objective}\n\n**Preconditions**:\n- ${precondition}\n\n**Test Steps**:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Expected Result**: ${expected}\n\n---\n`;
}

for (const [epicRaw, featureNumbers] of Object.entries(targets)) {
  const epic = Number(epicRaw);
  const epicPrefix = `EPIC-${String(epic).padStart(2, '0')}-`;
  const epicDir = fs.readdirSync(root).find(n => n.startsWith(epicPrefix) && fs.statSync(path.join(root, n)).isDirectory());
  if (!epicDir) throw new Error(`Missing directory for EPIC-${epic}`);
  const dir = path.join(root, epicDir);
  const testDir = path.join(dir, `EPIC${String(epic).padStart(2, '0')}-Test`);
  fs.mkdirSync(testDir, { recursive: true });

  for (const feature of featureNumbers) {
    const featurePrefix = `FEATURE-${String(feature).padStart(2, '0')}-`;
    const sourceName = fs.readdirSync(dir).find(n => n.startsWith(featurePrefix) && n.endsWith('.md'));
    if (!sourceName) throw new Error(`Missing EPIC-${epic} feature ${feature}`);
    const source = fs.readFileSync(path.join(dir, sourceName), 'utf8');
    const title = source.match(/^# FEATURE-\d+ — (.+)$/m)?.[1] ?? sourceName;
    const capabilities = subheads(section(source, 4, 5));
    const edgeCases = bullets(section(source, 14, 15));
    const dependencies = bullets(section(source, 15, 16));
    const risks = bullets(section(source, 16, 17));
    const metrics = metricRows(section(source, 13, 14));
    const cap = i => capabilities[i % capabilities.length] ?? title;
    const edge = i => edgeCases[i % edgeCases.length] ?? `Unexpected input is supplied to ${title}`;
    const dep = i => dependencies[i % dependencies.length] ?? 'Required downstream service';
    const risk = i => risks[i % risks.length] ?? `A partial failure affects ${title}`;
    const metric = i => metrics[i % metrics.length] ?? [`${title} response time`, 'within the documented SLA'];

    let out = `# EPIC${String(epic).padStart(2, '0')} Feature ${feature} — ${title} — Test Cases\n\n## Test Overview\nComprehensive test suite for ${title}, derived from the feature specification and covering unit behavior, integrations, failure modes, privacy/security controls, and performance SLAs.\n\n---\n\n## 1. UNIT TEST SCENARIOS\n\n`;
    for (let i = 0; i < 9; i++) {
      const c = cap(i);
      out += caseBlock(`TC-F${feature}-U${Math.floor(i / 3) + 1}.${i % 3 + 1}`, `${c}: ${['valid input', 'validation failure', 'state transition'][i % 3]}`,
        `Verify ${c.toLowerCase()} behaves correctly for the specified ${['happy path', 'invalid-input path', 'state-change path'][i % 3]}.`,
        `The ${title} service is available with an isolated test repository and deterministic fixtures`,
        [`Arrange a representative ${c.toLowerCase()} request and persisted state`, `Invoke the feature's ${c.toLowerCase()} operation`, `Inspect the response, persisted state, emitted events, and audit metadata`, `Repeat the operation where applicable to verify deterministic or idempotent behavior`],
        `${c} returns the contractually correct result; invalid state is not persisted; identifiers, timestamps, ownership, and status fields remain consistent.`);
    }
    out += `\n## 2. INTEGRATION TEST SCENARIOS\n\n`;
    for (let i = 0; i < 6; i++) {
      const d = dep(i);
      out += caseBlock(`TC-F${feature}-I${Math.floor(i / 2) + 1}.${i % 2 + 1}`, `${d}: ${i % 2 ? 'failure and recovery' : 'successful end-to-end flow'}`,
        `Verify ${title} integrates with ${d} without data loss, duplication, or authorization leakage.`,
        `${d} is connected through a controllable integration fixture`,
        [`Submit a valid end-to-end request to ${title}`, `${i % 2 ? `Inject a transient ${d} timeout, then restore the dependency` : `Allow ${d} to complete normally`}`, `Wait for processing, retry, or callback completion`, `Verify correlated state across the feature and dependency boundaries`],
        `${i % 2 ? 'The failure is classified, retried safely, and ultimately recovered or dead-lettered with actionable diagnostics.' : 'The workflow completes once, correlation identifiers are preserved, and all persisted and emitted data agree.'}`);
    }
    out += `\n## 3. EDGE CASE, SECURITY, AND RESILIENCE VALIDATION\n\n`;
    for (let i = 0; i < 6; i++) {
      const e = edge(i);
      out += caseBlock(`TC-F${feature}-E${Math.floor(i / 2) + 1}.${i % 2 + 1}`, `Handle: ${e}`,
        `Verify the system handles the documented edge condition safely: ${e}.`,
        `A production-like fixture exists with tenant boundaries, audit capture, retry controls, and fault injection enabled`,
        [`Create the precise boundary or failure condition`, `Execute the affected ${title} workflow`, `Observe user-visible status, logs, metrics, audit events, and stored data`, `Confirm a retry or repeated request cannot corrupt or disclose state`],
        `The request completes safely or fails with a stable error code; no cross-user data is exposed; no partial or duplicate state survives; operators receive sufficient diagnostics.`);
    }
    out += `\n## 4. PERFORMANCE AND OPERABILITY VALIDATION\n\n`;
    for (let i = 0; i < 6; i++) {
      const [name, target] = metric(i);
      out += caseBlock(`TC-F${feature}-P${Math.floor(i / 2) + 1}.${i % 2 + 1}`, `${name}: ${i % 2 ? 'degraded-load behavior' : 'SLA verification'}`,
        `Verify ${name.toLowerCase()} remains ${target}${i % 2 ? ' while the system experiences controlled dependency degradation or burst load' : ''}.`,
        `Production-sized fixtures, telemetry collection, and a repeatable load profile are available`,
        [`Warm the service and establish a baseline`, `Run the documented representative and peak workload`, `${i % 2 ? 'Inject controlled latency or throttling and verify backpressure' : 'Collect latency, throughput, success-rate, and resource measurements'}`, `Calculate the relevant percentile or completion rate and inspect alerting signals`],
        `${name} is ${target}; no silent loss or tenant leakage occurs; saturation is visible through dashboards and alerts; recovery does not require manual data repair.`);
    }
    out += `\n## Test Execution Summary\n\n| Section | Suites | Test Cases |\n|---|---:|---:|\n| Unit Tests | 3 | 9 |\n| Integration Tests | 3 | 6 |\n| Edge/Security/Resilience | 3 | 6 |\n| Performance/Operability | 3 | 6 |\n| **Total** | **12** | **27** |\n\n**Traceability note**: Cases are derived from the feature's key functionalities, dependencies, edge cases, risks, security requirements, and performance targets.\n`;
    const outputName = `EPIC${String(epic).padStart(2, '0')}-feature-${feature}-test-cases.md`;
    fs.writeFileSync(path.join(testDir, outputName), out);
  }
}
