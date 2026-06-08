#!/usr/bin/env node
/**
 * Runner memory benchmark (regression guard for the QuickJS sandbox leak).
 *
 * Background
 * ----------
 * In v3.4.x the runner consumed memory in proportion to the number of requests
 * executed (CLI grew from ~300 MB to 1.4+ GB; Desktop crashed with "memory
 * access out of bounds"). Root cause: each script / assertion / test evaluation
 * created a QuickJS (WASM) context that was never disposed, so QuickJS's WASM
 * linear memory ("external" memory, invisible to V8's GC) grew without bound.
 *
 * What this measures
 * ------------------
 * It drives the SAME bruno-js code paths the runner uses — the async response
 * script path (ScriptRuntime -> executeQuickJsVmAsync) and the sync assertion
 * path (AssertRuntime -> executeQuickJsVm) — sending the same request N times
 * (100 and 500), then reports memory growth with GC forced at start and end.
 *
 * The primary, low-noise signal is EXTERNAL (WASM) memory growth: with the leak
 * present it grows by tens to hundreds of MB; once fixed it stays flat. RSS is
 * recorded too but is noisier (V8 heap churn / fragmentation), so it is informational.
 *
 * Failure thresholds
 * ------------------
 * The benchmark exits non-zero if external (WASM) growth exceeds the per-scenario
 * threshold — a clear, deterministic regression gate. It also writes results in
 * the shared benchmark results format so trends are tracked alongside the
 * mounting benchmark.
 *
 * Run: node --expose-gc tests/benchmarks/memory/runner-memory.js
 */

const path = require('path');
const fs = require('fs');

const BRUNO_JS = path.join(__dirname, '../../../packages/bruno-js');
const AssertRuntime = require(path.join(BRUNO_JS, 'src/runtime/assert-runtime'));
const ScriptRuntime = require(path.join(BRUNO_JS, 'src/runtime/script-runtime'));
const { loader } = require(path.join(BRUNO_JS, 'src/sandbox/quickjs'));

const MB = 1024 * 1024;

const SCENARIOS = [
  { key: 'quickjs-scripts-100', mode: 'script', iterations: 100, maxExternalGrowthMB: 15 },
  { key: 'quickjs-scripts-500', mode: 'script', iterations: 500, maxExternalGrowthMB: 40 },
  { key: 'quickjs-assertions-100', mode: 'assert', iterations: 100, maxExternalGrowthMB: 15 },
  { key: 'quickjs-assertions-500', mode: 'assert', iterations: 500, maxExternalGrowthMB: 40 }
];

const baseRequest = { method: 'GET', url: 'http://localhost/', headers: {}, pathname: '/tmp/req.bru' };
const baseResponse = { status: 200, statusText: 'OK', data: { ok: true }, headers: {} };

async function runAssertScenario(iterations) {
  const rt = new AssertRuntime({ runtime: 'quickjs' });
  for (let i = 0; i < iterations; i++) {
    await rt.runAssertions(
      [{ name: 'res.status', value: 'eq 200', enabled: true }],
      baseRequest,
      baseResponse,
      {},
      {},
      process.env
    );
  }
}

async function runScriptScenario(iterations) {
  const rt = new ScriptRuntime({ runtime: 'quickjs' });
  const script = `bru.setVar('x', res.status); test('status is 200', () => { expect(res.status).to.equal(200); });`;
  for (let i = 0; i < iterations; i++) {
    await rt.runResponseScript(
      script,
      baseRequest,
      baseResponse,
      {}, {}, process.cwd(), null, process.env, {}, null, 'memory-benchmark'
    );
  }
}

function gc() {
  if (global.gc) {
    global.gc();
    global.gc();
  }
}

async function measureScenario(scenario) {
  const run = scenario.mode === 'script' ? runScriptScenario : runAssertScenario;

  // Warm up once so module/JIT/allocator costs are excluded from the measured window.
  await run(5);
  gc();

  const start = process.memoryUsage();
  await run(scenario.iterations);
  gc();
  const end = process.memoryUsage();

  const externalGrowthMb = (end.external - start.external) / MB;
  const rssGrowthMb = (end.rss - start.rss) / MB;

  return {
    externalGrowthMb,
    rssGrowthMb,
    externalPerReqKb: (externalGrowthMb * 1024) / scenario.iterations,
    rssPerReqKb: (rssGrowthMb * 1024) / scenario.iterations
  };
}

function buildEntry(scenario, m) {
  // The benchmark framework's ResultEntry is timing-oriented; we map external
  // (WASM) growth in MB onto it so it renders in the shared results/compare flow.
  const v = Number(m.externalGrowthMb.toFixed(3));
  return {
    mean: v, median: v, p50: v, p90: v, p99: v,
    stdDev: 0, min: v, max: v, count: 1, timings: [v],
    iterations: scenario.iterations,
    externalGrowthMb: Number(m.externalGrowthMb.toFixed(3)),
    rssGrowthMb: Number(m.rssGrowthMb.toFixed(3)),
    externalPerReqKb: Number(m.externalPerReqKb.toFixed(2)),
    rssPerReqKb: Number(m.rssPerReqKb.toFixed(2)),
    maxExternalGrowthMb: scenario.maxExternalGrowthMB,
    unit: 'MB'
  };
}

async function main() {
  if (!global.gc) {
    console.error('[BENCHMARK] Must be run with --expose-gc (node --expose-gc ...). Aborting.');
    process.exit(2);
  }

  await loader();

  const entries = {};
  const failures = [];

  for (const scenario of SCENARIOS) {
    const m = await measureScenario(scenario);
    entries[scenario.key] = buildEntry(scenario, m);

    const signed = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
    const status = m.externalGrowthMb > scenario.maxExternalGrowthMB ? 'FAIL' : 'ok';
    console.log(
      `[BENCHMARK] ${scenario.key.padEnd(24)} `
      + `external ${signed(m.externalGrowthMb)} MB `
      + `(${m.externalPerReqKb.toFixed(1)} KB/req), `
      + `rss ${signed(m.rssGrowthMb)} MB `
      + `[threshold external <= ${scenario.maxExternalGrowthMB} MB] -> ${status}`
    );

    if (m.externalGrowthMb > scenario.maxExternalGrowthMB) {
      failures.push(
        `${scenario.key}: external growth ${m.externalGrowthMb.toFixed(1)} MB exceeds `
        + `threshold ${scenario.maxExternalGrowthMB} MB`
      );
    }
  }

  const resultsDir = path.join(process.cwd(), 'tests', 'benchmarks', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const outputPath = path.join(resultsDir, 'memory.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      { suite: { name: 'Runner Memory', unit: 'MB', direction: 'smaller' }, entries },
      null,
      2
    )
  );
  console.log(`[BENCHMARK] Results written to ${outputPath}`);

  if (failures.length > 0) {
    console.error('\n[BENCHMARK] Memory regression detected:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('\n[BENCHMARK] All memory scenarios within thresholds.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
