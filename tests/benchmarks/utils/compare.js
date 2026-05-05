#!/usr/bin/env node

/**
 * Generic benchmark comparison: compares results against a baseline and exits
 * with code 1 if any metric exceeds the allowed regression threshold.
 *
 * Usage:
 *   node tests/benchmarks/utils/compare.js --results <path> --baseline <path> [--update-baseline]
 *
 * Examples:
 *   node tests/benchmarks/utils/compare.js \
 *     --results benchmark-results.json \
 *     --baseline tests/benchmarks/mounting/baseline.json
 *
 *   node tests/benchmarks/utils/compare.js \
 *     --results benchmark-results.json \
 *     --baseline tests/benchmarks/mounting/baseline.json \
 *     --update-baseline
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--results') args.results = argv[++i];
    else if (argv[i] === '--baseline') args.baseline = argv[++i];
    else if (argv[i] === '--update-baseline') args.updateBaseline = true;
  }
  return args;
}

function loadJSON(filepath) {
  if (!existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

function pctChange(baseline, current) {
  if (baseline === 0) return current === 0 ? 0 : Infinity;
  return ((current - baseline) / baseline) * 100;
}

function formatPct(pct) {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

const args = parseArgs(process.argv);

if (!args.results || !args.baseline) {
  console.error('Usage: compare.js --results <path> --baseline <path> [--update-baseline]');
  process.exit(1);
}

const results = loadJSON(args.results);
const baseline = loadJSON(args.baseline);
const threshold = baseline.thresholdPercent || 20;
const resultEntries = results.entries || results;
const baselineEntries = baseline.entries || baseline.collections || {};

if (args.updateBaseline) {
  const newBaseline = {
    thresholdPercent: threshold,
    entries: {}
  };
  for (const [key, data] of Object.entries(resultEntries)) {
    newBaseline.entries[key] = {
      mean: data.mean,
      p50: data.p50
    };
  }
  writeFileSync(args.baseline, JSON.stringify(newBaseline, null, 2) + '\n');
  console.log(`Baseline updated at ${args.baseline}`);
  process.exit(0);
}

let hasRegression = false;
const rows = [];

console.log('');
console.log('='.repeat(72));
console.log(' BENCHMARK COMPARISON');
console.log('='.repeat(72));
console.log(`  Regression threshold: ${threshold}%`);
console.log('');

for (const [key, data] of Object.entries(resultEntries)) {
  const base = baselineEntries[key];
  if (!base) {
    console.log(`  [SKIP] No baseline for ${key}`);
    continue;
  }

  const meanPct = pctChange(base.mean, data.mean);
  const p50Pct = pctChange(base.p50, data.p50);

  const meanStatus = meanPct > threshold ? 'FAIL' : meanPct < -threshold ? 'IMPROVED' : 'OK';
  const p50Status = p50Pct > threshold ? 'FAIL' : p50Pct < -threshold ? 'IMPROVED' : 'OK';

  if (meanStatus === 'FAIL' || p50Status === 'FAIL') {
    hasRegression = true;
  }

  rows.push({
    key,
    'mean (ms)': `${Math.round(data.mean)} (baseline: ${base.mean})`,
    'mean change': formatPct(meanPct),
    'mean status': meanStatus,
    'p50 (ms)': `${Math.round(data.p50)} (baseline: ${base.p50})`,
    'p50 change': formatPct(p50Pct),
    'p50 status': p50Status
  });
}

console.table(rows);
console.log('');

if (hasRegression) {
  console.error(`FAILED: One or more benchmarks regressed beyond the ${threshold}% threshold.`);
  console.error('If this regression is expected, update the baseline:');
  console.error(`  node tests/benchmarks/utils/compare.js --results ${args.results} --baseline ${args.baseline} --update-baseline`);
  process.exit(1);
} else {
  console.log('PASSED: All benchmarks are within the acceptable threshold.');
  process.exit(0);
}
