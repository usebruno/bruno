import htmlTemplateString from './template';

describe('HTML report template', () => {
  it('preserves original request indexes when filtering failed results', () => {
    const htmlString = htmlTemplateString('');
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

    const indexedResults = results.map((value, index) => ({ value, index }));
    const failedResults = indexedResults.filter(
      ({ value }) =>
        value.status === 'error'
        || !!value?.testResults?.find((t) => t.status !== 'pass')
        || !!value?.assertionResults?.find((t) => t.status !== 'pass')
    );

    expect(failedResults).toEqual([
      {
        value: results[1],
        index: 1
      }
    ]);
    expect(htmlString).toContain('<x-result v-for="result in results" :result="result.value" :index="result.index" :key="result.index"></x-result>');
  });
});
