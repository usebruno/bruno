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
