import parseFolder from './parseFolder';

// Typed `request.variables` propagate through parseFolder into the folder's
// vars.req with their dataType + coerced value.

describe('parseFolder — typed request.variables', () => {
  it('coerces typed values, preserves raw value on un-coercible input, and treats explicit string as the implicit default', () => {
    const yml = `info:
  name: my-folder

request:
  variables:
    - name: count
      value:
        type: number
        data: "42"
    - name: enabled
      value:
        type: boolean
        data: "true"
    - name: config
      value:
        type: object
        data: '{"a":1}'
    - name: greeting
      value:
        type: string
        data: hi
    - name: plain
      value: hello
    - name: flag
      value:
        type: boolean
        data: 'maybe'
`;

    const folder = parseFolder(yml);
    const reqVars = folder.request!.vars!.req!;

    expect(reqVars).toHaveLength(6);
    expect(reqVars[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
    expect(reqVars[1]).toMatchObject({ name: 'enabled', value: true, dataType: 'boolean' });
    expect(reqVars[2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
    // Explicit `type: string` is the implicit default — no dataType materialized.
    expect(reqVars[3]).toMatchObject({ name: 'greeting', value: 'hi' });
    expect(reqVars[3].dataType).toBeUndefined();
    expect(reqVars[4]).toMatchObject({ name: 'plain', value: 'hello' });
    expect(reqVars[4].dataType).toBeUndefined();
    // Un-coercible: raw value preserved for the UI mismatch warning.
    expect(reqVars[5]).toMatchObject({ name: 'flag', value: 'maybe', dataType: 'boolean' });
  });
});

describe('parseFolder — seq', () => {
  it('leaves seq undefined when folder.yml has no seq field', () => {
    const yml = `info:\n  name: my-folder\n`;
    const { meta } = parseFolder(yml);

    expect(meta).toEqual(expect.objectContaining({ name: 'my-folder' }));
    expect(meta!.seq).toBeUndefined();
  });

  it('preserves an explicit numeric seq from the file', () => {
    const yml = `info:\n  name: my-folder\n  seq: 3\n`;
    const { meta } = parseFolder(yml);

    expect(meta).toEqual(expect.objectContaining({ name: 'my-folder' }));
    expect(meta!.seq).toBe(3);
  });
});

describe('parseFolder — tags', () => {
  it('leaves tags undefined when folder.yml has no tags field', () => {
    const { meta } = parseFolder(`info:\n  name: my-folder\n`);

    expect(meta!.tags).toBeUndefined();
  });

  it('parses tags, trimming and de-duplicating while preserving order', () => {
    const yml = `info:
  name: my-folder
  tags:
    - smoke
    - "  regression  "
    - smoke
`;

    const { meta } = parseFolder(yml);

    expect(meta!.tags).toEqual(['smoke', 'regression']);
  });

  it('omits tags when every entry is empty or whitespace-only', () => {
    const yml = `info:\n  name: my-folder\n  tags:\n    - ""\n    - "   "\n`;

    expect(parseFolder(yml).meta!.tags).toBeUndefined();
  });

  it('omits non-string entries and keeps the rest', () => {
    const yml = `info:\n  name: my-folder\n  tags:\n    - smoke\n    - 42\n    - true\n    - regression\n`;

    expect(parseFolder(yml).meta!.tags).toEqual(['smoke', 'regression']);
  });

  it('omits tags when the value is not a list', () => {
    expect(parseFolder(`info:\n  name: my-folder\n  tags: smoke\n`).meta!.tags).toBeUndefined();
    expect(parseFolder(`info:\n  name: my-folder\n  tags:\n    smoke: true\n`).meta!.tags).toBeUndefined();
  });

  it('keeps tags alongside seq without disturbing it', () => {
    const { meta } = parseFolder(`info:\n  name: my-folder\n  seq: 3\n  tags:\n    - smoke\n`);

    expect(meta).toEqual(expect.objectContaining({ name: 'my-folder', seq: 3, tags: ['smoke'] }));
  });
});
