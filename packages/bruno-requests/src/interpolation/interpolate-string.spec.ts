import { interpolateString, interpolateObject } from './interpolate-string';

describe('interpolateString', () => {
  it('returns non-string and empty input unchanged', () => {
    expect(interpolateString(undefined, {})).toBeUndefined();
    expect(interpolateString('', {})).toBe('');
    expect(interpolateString(42, {})).toBe(42);
  });

  it('applies scope precedence: global < collection < env < folder < request < runtime < prompt', () => {
    const scopes = {
      globalEnvironmentVariables: { v: 'global' },
      collectionVariables: { v: 'collection' },
      envVars: { v: 'env' },
      folderVariables: { v: 'folder' },
      requestVariables: { v: 'request' },
      runtimeVariables: { v: 'runtime' },
      promptVariables: { v: 'prompt' }
    };
    expect(interpolateString('{{v}}', scopes)).toBe('prompt');
    expect(interpolateString('{{v}}', { ...scopes, promptVariables: undefined })).toBe('runtime');
    expect(interpolateString('{{v}}', { globalEnvironmentVariables: { v: 'global' }, collectionVariables: { v: 'collection' } })).toBe('collection');
  });

  it('resolves process.env references inside env vars without mutating the input', () => {
    const envVars = { host: '{{process.env.HOST}}' };
    const result = interpolateString('https://{{host}}/x', { envVars, processEnvVars: { HOST: 'example.com' } });
    expect(result).toBe('https://example.com/x');
    expect(envVars.host).toBe('{{process.env.HOST}}');
  });

  it('reports unresolved variables through onUnresolved', () => {
    const onUnresolved = jest.fn();
    expect(interpolateString('{{missing}}', { onUnresolved })).toBe('{{missing}}');
    expect(onUnresolved).toHaveBeenCalledWith('missing');
  });
});

describe('interpolateObject', () => {
  it('interpolates nested string values using the merged scopes', () => {
    const result = interpolateObject(
      { proxy: { hostname: '{{proxyHost}}', port: 8080 }, list: ['{{token}}'] },
      { envVars: { proxyHost: 'proxy.local' }, runtimeVariables: { token: 'abc' } }
    );
    expect(result).toEqual({ proxy: { hostname: 'proxy.local', port: 8080 }, list: ['abc'] });
  });
});
