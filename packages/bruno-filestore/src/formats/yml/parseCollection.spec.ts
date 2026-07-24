import parseCollection from './parseCollection';

// Typed `request.variables` propagate through parseCollection into the
// collectionRoot's vars.req with their dataType + coerced value.

describe('parseCollection — typed request.variables', () => {
  it('coerces typed values, preserves raw value on un-coercible input, and treats explicit string as the implicit default', () => {
    const yml = `opencollection: "1.0.0"
info:
  name: c

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
    - name: cfg
      value:
        type: object
        data: 'not-json'
`;

    const { collectionRoot } = parseCollection(yml);
    const reqVars = collectionRoot.request!.vars!.req!;

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
    expect(reqVars[5]).toMatchObject({ name: 'cfg', value: 'not-json', dataType: 'object' });
  });
});

describe('parseCollection — script execution flow', () => {
  it('reads flow: sequential from the bruno extension', () => {
    const yml = `opencollection: "1.0.0"
info:
  name: c
extensions:
  bruno:
    scripts:
      flow: sequential
`;
    const { brunoConfig } = parseCollection(yml);
    expect(brunoConfig.scripts?.flow).toBe('sequential');
  });

  it('reads flow: sandwich from the bruno extension', () => {
    const yml = `opencollection: "1.0.0"
info:
  name: c
extensions:
  bruno:
    scripts:
      flow: sandwich
`;
    const { brunoConfig } = parseCollection(yml);
    expect(brunoConfig.scripts?.flow).toBe('sandwich');
  });

  it('ignores an unrecognized flow value', () => {
    const yml = `opencollection: "1.0.0"
info:
  name: c
extensions:
  bruno:
    scripts:
      flow: parallel
`;
    const { brunoConfig } = parseCollection(yml);
    expect(brunoConfig.scripts?.flow).toBeUndefined();
  });

  it('has no scripts.flow when the file does not set one', () => {
    const { brunoConfig } = parseCollection('opencollection: "1.0.0"\ninfo:\n  name: c\n');
    expect(brunoConfig.scripts?.flow).toBeUndefined();
  });
});

describe('parseCollection — reading the collection version', () => {
  it('reads the version from the file as text', () => {
    const { brunoConfig } = parseCollection('opencollection: "1.0.0"\ninfo:\n  name: c\n  version: v1.0.0\n');
    expect(brunoConfig.version).toBe('v1.0.0');
  });

  it('turns a number version into text (2 becomes "2")', () => {
    const { brunoConfig } = parseCollection('opencollection: "1.0.0"\ninfo:\n  name: c\n  version: 2\n');
    expect(brunoConfig.version).toBe('2');
  });

  it('has no version when the file does not have one', () => {
    const { brunoConfig } = parseCollection('opencollection: "1.0.0"\ninfo:\n  name: c\n');
    expect(brunoConfig.version).toBeUndefined();
  });
});
