import { getEnvironmentVariablesKeyValuePairs } from './index';

describe('getEnvironmentVariablesKeyValuePairs', () => {
  it('ignores variables that are switched off or left blank', () => {
    const variables = [
      { name: 'baseUrl', value: 'https://api.test', enabled: true },
      { name: 'disabled', value: 'x', enabled: false },
      { name: 'blank', value: '', enabled: true },
      { name: '', value: 'noName', enabled: true }
    ];
    expect(getEnvironmentVariablesKeyValuePairs(variables)).toEqual({ baseUrl: 'https://api.test' });
  });
});
