/**
 * Statistical utility functions for benchmark analysis.
 */

function assertValid(values: number[]) {
  if (values.length === 0) {
    throw new Error('Values array must not be empty');
  }
  if (!values.every(Number.isFinite)) {
    throw new TypeError('All values must be finite numbers');
  }
}

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function mean(values: number[]): number {
  assertValid(values);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  assertValid(values);
  const s = sorted(values);
  const mid = Math.floor(s.length / 2);

  return s.length % 2 === 0
    ? (s[mid - 1] + s[mid]) / 2
    : s[mid];
}

export function percentile(values: number[], p: number): number {
  assertValid(values);

  if (p < 0 || p > 100) {
    throw new RangeError(`Percentile must be between 0 and 100, got ${p}`);
  }

  const s = sorted(values);
  const index = (p / 100) * (s.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return s[lower];

  const weight = index - lower;
  return s[lower] + weight * (s[upper] - s[lower]);
}

/**
 * Population standard deviation (divide by N)
 */
export function populationStdDev(values: number[]): number {
  assertValid(values);
  const avg = mean(values);

  const variance
    = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Sample standard deviation (divide by N - 1)
 */
export function sampleStdDev(values: number[]): number {
  assertValid(values);

  if (values.length < 2) {
    throw new Error('Sample standard deviation requires at least 2 values');
  }

  const avg = mean(values);

  const variance
    = values.reduce((sum, v) => sum + (v - avg) ** 2, 0)
      / (values.length - 1);

  return Math.sqrt(variance);
}

export function min(values: number[]): number {
  assertValid(values);
  return values.reduce((a, b) => (a < b ? a : b), Infinity);
}

export function max(values: number[]): number {
  assertValid(values);
  return values.reduce((a, b) => (a > b ? a : b), -Infinity);
}

/**
 * Summary for benchmarking (no rounding, keep precision)
 */
export function summarize(values: number[]) {
  assertValid(values);

  return {
    mean: mean(values),
    median: median(values),
    p50: percentile(values, 50),
    p90: percentile(values, 90),
    p99: percentile(values, 99),
    min: min(values),
    max: max(values),
    stdDev: populationStdDev(values),
    count: values.length
  };
}
