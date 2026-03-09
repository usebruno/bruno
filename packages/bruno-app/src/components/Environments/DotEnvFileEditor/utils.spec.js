/** @jest-environment node */

import { rawToVariables, variablesToRaw, __private__ } from './utils';

jest.mock('utils/common', () => ({
  uuid: () => 'test-uid'
}));

describe('DotEnvFileEditor utils', () => {
  it('quotes values containing hash characters before writing raw dotenv text', () => {
    const raw = variablesToRaw([{ name: 'TOKEN', value: 'ABC#DEF' }]);

    expect(raw).toBe('TOKEN="ABC#DEF"');
  });

  it('round trips quoted hash values without truncating them', () => {
    const variables = rawToVariables('TOKEN="ABC#DEF"');

    expect(variables).toEqual([
      expect.objectContaining({
        name: 'TOKEN',
        value: 'ABC#DEF'
      })
    ]);
  });

  it('marks leading or trailing whitespace as needing quotes', () => {
    expect(__private__.needsQuoting(' value')).toBe(true);
    expect(__private__.needsQuoting('value ')).toBe(true);
  });
});
