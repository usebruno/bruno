import { getFilteredRequestResults } from './template';
import vm from 'vm';

describe('getFilteredRequestResults', () => {
  it('serialized function works in a plain JS context', () => {
    const ctx = vm.createContext({});
    vm.runInContext(`var fn = ${getFilteredRequestResults.toString()}`, ctx);

    const result = vm.runInContext(`fn([
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
    ], true)`, ctx);

    expect(result).toEqual([
      {
        value: expect.objectContaining({ path: '02-failing', status: 'pass' }),
        index: 1
      }
    ]);
  });
});
