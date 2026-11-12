import { generateHtmlReport } from './generate-report';
import htmlTemplateString, { formatTotalRunDuration, getFilteredRequestResults } from './template';
import vm from 'vm';

const readEmbeddedReport = (html: string) => {
  const base64 = html.match(/decodeBase64\('([^']*)'\)/)?.[1];
  if (!base64) {
    throw new Error('The report did not embed its results as a base64 payload');
  }
  return JSON.parse(Buffer.from(base64, 'base64').toString());
};

const formatTotalRunDurationInVm = (runStartTime?: string, runCompletionTime?: string) => {
  const ctx = vm.createContext({ runStartTime, runCompletionTime });
  vm.runInContext(`var fn = ${formatTotalRunDuration.toString()}`, ctx);
  return vm.runInContext('fn(runStartTime, runCompletionTime)', ctx);
};

describe('getFilteredRequestResults', () => {
  it('preserves original request indexes when filtering failed results', () => {
    const results = [
      {
        path: '01-passing',
        status: 'pass',
        testResults: [{ description: 'status is 200', status: 'pass' }],
        assertionResults: []
      },
      {
        path: '02-failing',
        status: 'pass',
        testResults: [{ description: 'forced failure', status: 'fail' }],
        assertionResults: []
      }
    ];
    const ctx = vm.createContext({ results });
    vm.runInContext(`var fn = ${getFilteredRequestResults.toString()}`, ctx);

    const result = vm.runInContext('fn(results, true)', ctx);

    expect(result).toEqual([
      {
        value: results[1],
        index: 1
      }
    ]);
  });
});

describe('formatTotalRunDuration', () => {
  it('shows the time from the run\'s start to its completion', () => {
    expect(formatTotalRunDurationInVm('2026-03-17T09:41:27.385Z', '2026-03-17T09:43:05.619Z')).toBe('98.234s');
  });

  it('shows a dash when the run has no start time', () => {
    expect(formatTotalRunDurationInVm('', '2026-03-17T09:43:05.619Z')).toBe('-');
  });

  it('shows a dash when the run has no completion time', () => {
    expect(formatTotalRunDurationInVm('2026-03-17T09:41:27.385Z', undefined)).toBe('-');
  });

  it('shows a dash when the run completes before it starts', () => {
    expect(formatTotalRunDurationInVm('2026-03-17T09:43:05.619Z', '2026-03-17T09:41:27.385Z')).toBe('-');
  });

  it('shows a dash when a time is not a valid date', () => {
    expect(formatTotalRunDurationInVm('not-a-date', '2026-03-17T09:43:05.619Z')).toBe('-');
  });
});

describe('htmlTemplateString', () => {
  it('renders skipped requests off the request status, naming bail as the reason', () => {
    const template = htmlTemplateString('');

    expect(template).toContain('result.response.status === \'skipped\'');
    expect(template).toContain('result.skipReason === \'bail\' ? \'Request skipped due to bail\'');
  });
});

describe('generateHtmlReport', () => {
  it('keeps the skip reason, method and url of bail-skipped requests', () => {
    const bailSkippedResult = {
      path: 'Create User.yml',
      status: 'skipped',
      skipped: true,
      skipReason: 'bail',
      request: { method: 'POST', url: 'https://api.example.com/users' },
      response: { status: 'skipped', responseTime: 0 },
      runDuration: 0
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [bailSkippedResult], summary: { totalRequests: 1 } }] as any
    });
    const [iteration] = readEmbeddedReport(html).results;

    expect(iteration.results[0]).toMatchObject({
      status: 'skipped',
      skipReason: 'bail',
      request: { method: 'POST', url: 'https://api.example.com/users' },
      response: { status: 'skipped' }
    });
  });

  it('embeds the run\'s start and completion times', () => {
    const html = generateHtmlReport({
      runnerResults: [],
      runStartTime: '2026-03-17T09:41:27.385Z',
      runCompletionTime: '2026-03-17T09:43:05.619Z'
    });

    expect(readEmbeddedReport(html)).toMatchObject({
      runStartTime: '2026-03-17T09:41:27.385Z',
      runCompletionTime: '2026-03-17T09:43:05.619Z'
    });
  });
});
