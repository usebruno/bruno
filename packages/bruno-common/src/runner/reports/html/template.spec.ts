import { getFilteredRequestResults, htmlTemplateString } from './template';
import vm from 'vm';

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

describe('HTML runner report template', () => {
  it('renders a warning containing the request skip reason', () => {
    const html = htmlTemplateString('[]');

    expect(html).toContain('title="Skip reason" type="warning"');
    expect(html).toContain('result.skipReason || result.response.statusText || \'Request skipped\'');
  });
});
