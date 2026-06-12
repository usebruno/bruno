import stringifyCollection from './stringifyCollection';
import parseCollection from './parseCollection';

// Typed collection-root vars serialize to OC's `{ type, data }` struct.
// `datatype: 'string'` is the implicit default and stays a raw string.

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
            { uid: 'v1', name: 'count', value: 42, enabled: true, datatype: 'number' },
            { uid: 'v2', name: 'enabled', value: true, enabled: true, datatype: 'boolean' },
            { uid: 'v3', name: 'config', value: { a: 1 }, enabled: true, datatype: 'object' },
            { uid: 'v4', name: 'greeting', value: 'hi', enabled: true, datatype: 'string' },
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
    expect(reqVars[0]).toMatchObject({ name: 'count', value: 42, datatype: 'number' });
    expect(reqVars[1]).toMatchObject({ name: 'enabled', value: true, datatype: 'boolean' });
    expect(reqVars[2]).toMatchObject({ name: 'config', value: { a: 1 }, datatype: 'object' });
    expect(reqVars[3]).toMatchObject({ name: 'greeting', value: 'hi' });
    expect(reqVars[3].datatype).toBeUndefined();
    expect(reqVars[4]).toMatchObject({ name: 'plain', value: 'hello' });
    expect(reqVars[4].datatype).toBeUndefined();
  });
});
