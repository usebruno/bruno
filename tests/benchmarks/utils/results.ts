/**
 * Standard read/write helpers for benchmark results and baselines.
 *
 * Results shape (written by benchmark tests):
 * {
 *   "entries": {
 *     "<key>": { mean, median, p50, p90, p99, stdDev, min, max, count, timings, ...meta }
 *   }
 * }
 *
 * Baseline shape (committed per suite):
 * {
 *   "thresholdPercent": 20,
 *   "entries": {
 *     "<key>": { mean, p50 }
 *   }
 * }
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { summarize } from './stats';

export interface ResultEntry {
  mean: number;
  median: number;
  p50: number;
  p90: number;
  p99: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  timings: number[];
  [key: string]: any;
}

export interface ResultsFile {
  entries: Record<string, ResultEntry>;
}

export interface BaselineEntry {
  mean: number;
  p50: number;
}

export interface BaselineFile {
  thresholdPercent: number;
  entries: Record<string, BaselineEntry>;
}

export function readResults(filePath: string): ResultsFile {
  if (!existsSync(filePath)) {
    throw new Error(`Results file not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function writeResults(filePath: string, entries: Record<string, ResultEntry>) {
  const data: ResultsFile = { entries };
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function buildResultEntry(timings: number[], meta: Record<string, any> = {}): ResultEntry {
  return { ...summarize(timings), timings, ...meta };
}

export function readBaseline(filePath: string): BaselineFile {
  if (!existsSync(filePath)) {
    throw new Error(`Baseline file not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function writeBaseline(filePath: string, results: ResultsFile, thresholdPercent: number) {
  const entries: Record<string, BaselineEntry> = {};
  for (const [key, data] of Object.entries(results.entries)) {
    entries[key] = { mean: data.mean, p50: data.p50 };
  }
  const data: BaselineFile = { thresholdPercent, entries };
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
