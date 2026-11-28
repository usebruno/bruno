const { interpolateString, interpolateObject } = require('./interpolate-string');

describe('interpolate-string: default values', () => {
  it('should use the variable from the combined scope over the default in an env value', () => {
    const options = {
      envVars: { proxyHost: '{{host:-localhost}}' },
      runtimeVariables: { host: 'proxy.example.com' }
    };

    expect(interpolateString('{{proxyHost}}', options)).toBe('proxy.example.com');
    expect(interpolateObject({ hostname: '{{proxyHost}}' }, options)).toEqual({ hostname: 'proxy.example.com' });
  });

  it('should use the default when the variable is not set anywhere', () => {
    const options = { envVars: { proxyHost: '{{host:-localhost}}' } };

    expect(interpolateString('{{proxyHost}}', options)).toBe('localhost');
  });

  it('should still interpolate process.env values in env values', () => {
    const options = {
      envVars: { proxyHost: '{{process.env.HOST:-localhost}}' },
      processEnvVars: { HOST: 'env-host' }
    };

    expect(interpolateString('{{proxyHost}}', options)).toBe('env-host');
  });
});
