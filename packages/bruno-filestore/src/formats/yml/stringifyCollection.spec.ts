import stringifyCollection from './stringifyCollection';
import parseCollection from './parseCollection';

// Typed collection-root vars serialize to OC's `{ type, data }` struct.
// `dataType: 'string'` is the implicit default and stays a raw string.

describe('stringifyCollection — typed request.variables', () => {
  it('round-trips typed values and omits a typed struct for the implicit string default', () => {
    const collectionRoot = {
      meta: null,
      request: {
        headers: [],
        auth: { mode: 'none' },
        script: { req: null, res: null },
        tests: null,
        vars: {
          req: [
            { uid: 'v1', name: 'count', value: 42, enabled: true, dataType: 'number' },
            { uid: 'v2', name: 'enabled', value: true, enabled: true, dataType: 'boolean' },
            { uid: 'v3', name: 'config', value: { a: 1 }, enabled: true, dataType: 'object' },
            { uid: 'v4', name: 'greeting', value: 'hi', enabled: true, dataType: 'string' },
            { uid: 'v5', name: 'plain', value: 'hello', enabled: true }
          ],
          res: []
        }
      },
      docs: null
    } as any;

    const brunoConfig = { name: 'c' };

    const yml = stringifyCollection(collectionRoot, brunoConfig);

    // `type: string` is never written out.
    expect(yml).not.toMatch(/type:\s*string/);

    const { collectionRoot: reparsed } = parseCollection(yml);
    const reqVars = reparsed.request!.vars!.req!;

    expect(reqVars).toHaveLength(5);
    expect(reqVars[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
    expect(reqVars[1]).toMatchObject({ name: 'enabled', value: true, dataType: 'boolean' });
    expect(reqVars[2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
    expect(reqVars[3]).toMatchObject({ name: 'greeting', value: 'hi' });
    expect(reqVars[3].dataType).toBeUndefined();
    expect(reqVars[4]).toMatchObject({ name: 'plain', value: 'hello' });
    expect(reqVars[4].dataType).toBeUndefined();
  });
});

describe('stringifyCollection — writing the collection version', () => {
  const baseRoot = {
    meta: null,
    request: { headers: [], auth: { mode: 'none' }, script: { req: null, res: null }, tests: null, vars: { req: [], res: [] } },
    docs: null
  } as any;

  it('writes the version as-is and reads back the same value', () => {
    const yml = stringifyCollection(baseRoot, { name: 'c', version: '2' });
    expect(yml).toMatch(/version:\s*['"]?2['"]?/);
    expect(parseCollection(yml).brunoConfig.version).toBe('2');
  });

  it('writes no version when the collection has none', () => {
    const yml = stringifyCollection(baseRoot, { name: 'c' });
    expect(parseCollection(yml).brunoConfig.version).toBeUndefined();
  });

  it('accepts any version text — there is no check on the format', () => {
    // The version is free-form: users can set whatever they like. Each of these should be
    // saved and read back exactly the same, without changing the format or rejecting it.
    ['v1.0.0', '2', '1.2.3-beta', '2024.01.15', 'release-2024-Q3', 'anything-goes'].forEach((version) => {
      const yml = stringifyCollection(baseRoot, { name: 'c', version });
      expect(parseCollection(yml).brunoConfig.version).toBe(version);
    });
  });
});
