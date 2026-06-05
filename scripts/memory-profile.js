#!/usr/bin/env node
/**
 * Memory profiler for the QuickJS sandbox leak (BRU memory regression POC).
 *
 * Exercises the two leak paths and records a memory-usage timeline so we can
 * see WHICH category of memory grows (RSS vs V8 heap vs external/WASM).
 *
 *   MODE=assert  -> sync path  (AssertRuntime -> executeQuickJsVm)
 *   MODE=script  -> async path (ScriptRuntime.runResponseScript -> executeQuickJsVmAsync)
 *
 * Run with --expose-gc so we can force GC and prove the memory is unreclaimable:
 *   node --expose-gc scripts/memory-profile.js
 *
 * Env:
 *   MODE=assert|script   (default: assert)
 *   ITERATIONS=<n>       (default: 300)
 *   SAMPLE_EVERY=<n>     (default: 50)  rows in the timeline
 */

const path = require('path');

const MODE = process.env.MODE || 'assert';
const ITERATIONS = Number(process.env.ITERATIONS || 300);
const SAMPLE_EVERY = Number(process.env.SAMPLE_EVERY || 50);

const MB = 1024 * 1024;
const mb = (n) => (n / MB).toFixed(1);
const kb = (n) => (n / 1024).toFixed(1);

function snapshot() {
  const m = process.memoryUsage();
  return { rss: m.rss, heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers };
}

function row(i, s) {
  return `${String(i).padStart(5)} | rss ${mb(s.rss).padStart(7)} | heapUsed ${mb(s.heapUsed).padStart(6)} | external ${mb(s.external).padStart(7)} | arrayBuffers ${mb(s.arrayBuffers).padStart(7)}  (MB)`;
}

async function runAssert(i) {
  const status = 200 + (i % 50);
  await assertRuntime.runAssertions(
    [{ name: 'res.status', value: `eq ${status}`, enabled: true }],
    { method: 'GET', url: 'http://localhost/', headers: {} },
    { status, statusText: 'OK', data: { id: i }, headers: {} },
    {},
    {},
    process.env
  );
}

async function runScript(i) {
  // A trivial post-response script. The leak is in the VM lifecycle, not the script body.
  await scriptRuntime.runResponseScript(
    `bru.setVar('i', ${i}); test('ok', () => { expect(res.status).to.equal(200); });`,
    { method: 'GET', url: 'http://localhost/', headers: {}, pathname: '/tmp/req.bru' },
    { status: 200, statusText: 'OK', data: { id: i }, headers: {} },
    {}, {}, process.cwd(), null, process.env, {}, null, 'profile'
  );
}

let assertRuntime, scriptRuntime;

async function main() {
  const AssertRuntime = require('../packages/bruno-js/src/runtime/assert-runtime');
  const ScriptRuntime = require('../packages/bruno-js/src/runtime/script-runtime');
  const { loader } = require('../packages/bruno-js/src/sandbox/quickjs');

  await loader(); // warm up the WASM module once (shared, memoized)
  assertRuntime = new AssertRuntime({ runtime: 'quickjs' });
  scriptRuntime = new ScriptRuntime({ runtime: 'quickjs' });

  const run = MODE === 'script' ? runScript : runAssert;

  if (global.gc) global.gc();
  const start = snapshot();
  console.log(`MODE=${MODE}  ITERATIONS=${ITERATIONS}  (gc ${global.gc ? 'available' : 'NOT available — run with --expose-gc'})`);
  console.log(row(0, start));

  for (let i = 1; i <= ITERATIONS; i++) {
    await run(i);
    if (i % SAMPLE_EVERY === 0) {
      console.log(row(i, snapshot()));
    }
  }

  // Force GC and resample: if memory does NOT drop, it is unreclaimable (native/WASM).
  if (global.gc) {
    global.gc();
    global.gc();
  }
  const end = snapshot();
  console.log(row(ITERATIONS, end) + '  <- after forced GC');

  const dRss = end.rss - start.rss;
  const dHeap = end.heapUsed - start.heapUsed;
  const dExt = end.external - start.external;
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`RSS growth:       ${mb(dRss)} MB  (${kb(dRss / ITERATIONS)} KB/request)`);
  console.log(`V8 heap growth:   ${mb(dHeap)} MB`);
  console.log(`external growth:  ${mb(dExt)} MB`);
  console.log(`Interpretation:   ${dRss > 4 * dHeap ? 'growth is OUTSIDE the V8 heap (native/WASM leak)' : 'growth is mostly in the V8 heap'}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
