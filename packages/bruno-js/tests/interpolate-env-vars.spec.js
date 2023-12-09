const interpolateEnvVars = require('../src/interpolate-env-vars');

describe('interpolate wiht nested env vars', () => {
  test('until nested env vars are resolved', () => {
    const envVars = {
      level1: '{{level2}}{{level2}}',
      level2: '{{process.env.level3}}'
    };

    const processEnvVars = {
      level3: 'pony'
    };

    const expectedOutput = {
      level1: 'ponypony',
      level2: 'pony'
    };

    const result = interpolateEnvVars(processEnvVars, envVars);
    expect(result).toEqual(expectedOutput);
  });

  test('block infinite template', () => {
    const envVars = {
      level1: '{{level2}}',
      level2: '{{level1}}'
    };

    const processEnvVars = {};

    const expectedOutput = {
      level1: '{{level1}}',
      level2: '{{level1}}'
    };

    const result = interpolateEnvVars(processEnvVars, envVars);
    expect(result).toEqual(expectedOutput);
  });

  test('block infinite template', () => {
    const envVars = {
      level1: '{{level2}}',
      level2: '{{level1}}'
    };

    const processEnvVars = {};

    const expectedOutput = {
      level1: '{{level1}}',
      level2: '{{level1}}'
    };

    const result = interpolateEnvVars(processEnvVars, envVars);
    expect(result).toEqual(expectedOutput);
  });
});
