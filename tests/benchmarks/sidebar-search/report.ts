import * as os from 'node:os';

export interface ScenarioResult {
  scenario: string;
  firstResultMs: number | null;
  indexingMs: number | null;
  settledMs: number | null;
  mountMs: number | null;
  error?: string;
}

export interface SizeResult {
  sizeKb: number;
  term: string;
  scenarios: ScenarioResult[];
}

export const formatDuration = (ms: number | null) => {
  if (ms === null) return '–';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 1000).toFixed(1)} s`;
};

export const describeMachine = () => {
  const cpus = os.cpus();
  const memoryGb = Math.round(os.totalmem() / 1024 ** 3);
  return `${cpus[0]?.model ?? 'unknown CPU'}, ${cpus.length} cores, ${memoryGb} GB RAM, ${os.platform()} ${os.release()}, Node ${process.version}`;
};

const buildTable = ({ sizeKb, scenarios }: SizeResult) => {
  const rows = scenarios.map((s) => {
    if (s.error) return `| ${s.scenario} | failed | – | – | – |`;
    return `| ${s.scenario} | ${formatDuration(s.firstResultMs)} | ${formatDuration(s.indexingMs)} | ${formatDuration(s.settledMs)} | ${formatDuration(s.mountMs)} |`;
  });
  return [
    `${sizeKb}KB interaction time`,
    '',
    '| Scenario | First result | Indexing | Settled | Mount |',
    '| --- | --- | --- | --- | --- |',
    ...rows
  ].join('\n');
};

export const buildReport = (results: SizeResult[]) => {
  const failures = results.flatMap((r) => r.scenarios.filter((s) => s.error).map((s) => `- ${r.sizeKb}KB ${s.scenario}: ${s.error}`));
  return [
    `Machine: ${describeMachine()}`,
    `Search term: ${results[0]?.term ?? ''}`,
    '',
    ...results.map((r) => `${buildTable(r)}\n`),
    ...(failures.length ? ['Failures:', ...failures, ''] : [])
  ].join('\n');
};
