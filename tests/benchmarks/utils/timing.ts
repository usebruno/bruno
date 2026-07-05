/**
 * Timing utilities for benchmarks.
 *
 * Capture:  const t = startTimer(); ...do work...; const ms = t.elapsed();
 * Convert:  convertDuration(1500, 'ms', 's') === 1.5
 */

export type DurationUnit = 'ns' | 'us' | 'ms' | 's';

const DURATION_TO_MS: Record<DurationUnit, number> = {
  ns: 1e-6,
  us: 1e-3,
  ms: 1,
  s: 1000
};

export function startTimer() {
  const start = performance.now();
  return { elapsed: () => performance.now() - start };
}

export function convertDuration(value: number, from: DurationUnit, to: DurationUnit): number {
  if (from === to) return value;
  return (value * DURATION_TO_MS[from]) / DURATION_TO_MS[to];
}
