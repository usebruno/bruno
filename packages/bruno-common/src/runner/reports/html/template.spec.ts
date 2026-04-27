import { getFilteredRequestResults } from './template';

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

    const failedResults = getFilteredRequestResults(results, true);

    expect(failedResults).toEqual([
      {
        value: results[1],
        index: 1
      }
    ]);
  });
});
