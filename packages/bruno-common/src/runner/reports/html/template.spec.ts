import { generateHtmlReport } from './generate-report';
import htmlTemplateString, { getFilteredRequestResults } from './template';
import vm from 'vm';

const readEmbeddedIterations = (html: string) => {
  const base64 = html.match(/decodeBase64\('([^']*)'\)/)?.[1];
  if (!base64) {
    throw new Error('The report did not embed its results as a base64 payload');
  }
  return JSON.parse(Buffer.from(base64, 'base64').toString()).results;
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

describe('htmlTemplateString', () => {
  it('renders skipped requests off the request status, naming bail as the reason', () => {
    const template = htmlTemplateString('');

    expect(template).toContain('result.status === \'skipped\'');
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
      response: { status: '-', responseTime: 0 },
      runDuration: 0
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [bailSkippedResult], summary: { totalRequests: 1 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0]).toMatchObject({
      status: 'skipped',
      skipReason: 'bail',
      request: { method: 'POST', url: 'https://api.example.com/users' },
      response: { status: '-' }
    });
  });
});
