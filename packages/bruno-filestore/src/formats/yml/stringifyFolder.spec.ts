import stringifyFolder from './stringifyFolder';
import parseFolder from './parseFolder';

// Typed folder vars serialize to OC's `{ type, data }` struct.
// `dataType: 'string'` is the implicit default and stays a raw string.

describe('stringifyFolder — typed request.variables', () => {
  it('round-trips typed values and omits a typed struct for the implicit string default', () => {
    const folderRoot = {
      meta: { name: 'my-folder', seq: 1 },
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

    const yml = stringifyFolder(folderRoot);

    // `type: string` is never written out.
    expect(yml).not.toMatch(/type:\s*string/);

    const reparsed = parseFolder(yml);
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

describe('stringifyFolder — seq', () => {
  it('omits seq when the folder has none', () => {
    const folderRoot = { meta: { name: 'no-seq-folder' }, docs: null } as any;

    const yml = stringifyFolder(folderRoot);
    const { meta } = parseFolder(yml);

    expect(yml).not.toMatch(/seq:/);
    expect(meta).toEqual(expect.objectContaining({ name: 'no-seq-folder' }));
    expect(meta!.seq).toBeUndefined();
  });

  it('preserves an explicit numeric seq', () => {
    const folderRoot = { meta: { name: 'ordered-folder', seq: 3 }, docs: null } as any;

    const yml = stringifyFolder(folderRoot);
    const { meta } = parseFolder(yml);

    expect(meta).toEqual(expect.objectContaining({ name: 'ordered-folder' }));
    expect(meta!.seq).toBe(3);
  });
});

describe('stringifyFolder — tags', () => {
  it('writes normalized tags and round-trips them through parseFolder', () => {
    const folderRoot = { meta: { name: 'tagged-folder', seq: 2, tags: ['  smoke  ', 'smoke', 'regression'] }, docs: null } as any;

    const yml = stringifyFolder(folderRoot);
    const { meta } = parseFolder(yml);

    expect(meta).toEqual(expect.objectContaining({ name: 'tagged-folder', seq: 2, tags: ['smoke', 'regression'] }));
  });

  it('omits tags when the folder has none', () => {
    const yml = stringifyFolder({ meta: { name: 'untagged-folder' }, docs: null } as any);

    expect(yml).not.toMatch(/tags:/);
    expect(parseFolder(yml).meta!.tags).toBeUndefined();
  });

  it('omits tags when the list is empty or normalizes away entirely', () => {
    expect(stringifyFolder({ meta: { name: 'f', tags: [] }, docs: null } as any)).not.toMatch(/tags:/);
    expect(stringifyFolder({ meta: { name: 'f', tags: ['', '  '] }, docs: null } as any)).not.toMatch(/tags:/);
  });

  it('omits tags when the value is not an array', () => {
    expect(stringifyFolder({ meta: { name: 'f', tags: 'smoke' }, docs: null } as any)).not.toMatch(/tags:/);
    expect(stringifyFolder({ meta: { name: 'f', tags: null }, docs: null } as any)).not.toMatch(/tags:/);
  });

  it('writes tags for a folder that has no seq', () => {
    const yml = stringifyFolder({ meta: { name: 'f', tags: ['smoke'] }, docs: null } as any);
    const { meta } = parseFolder(yml);

    expect(yml).not.toMatch(/seq:/);
    expect(meta!.tags).toEqual(['smoke']);
  });
});
