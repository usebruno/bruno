import { toOpenCollectionVariables, toBrunoVariables } from './variables';

describe('toOpenCollectionVariables', () => {
  it('returns undefined for null / empty input', () => {
    expect(toOpenCollectionVariables(null)).toBeUndefined();
    expect(toOpenCollectionVariables(undefined)).toBeUndefined();
    expect(toOpenCollectionVariables([])).toBeUndefined();
    expect(toOpenCollectionVariables({ req: [], res: [] })).toBeUndefined();
  });

  it('serializes plain string variables as a raw string value', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: true } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc' }]);
  });

  it('serializes typed variables as a {type, data} struct', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'port', value: 3000, enabled: true, dataType: 'number' } as any,
      { uid: 'u2', name: 'flag', value: true, enabled: true, dataType: 'boolean' } as any,
      { uid: 'u3', name: 'config', value: { a: 1 }, enabled: true, dataType: 'object' } as any
    ]);

    expect(out).toEqual([
      { name: 'port', value: { type: 'number', data: '3000' } },
      { name: 'flag', value: { type: 'boolean', data: 'true' } },
      { name: 'config', value: { type: 'object', data: '{\n  "a": 1\n}' } }
    ]);
  });

  it('does not emit a typed struct for the string default dataType', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: true, dataType: 'string' } as any
    ]);

    expect(out).toEqual([{ name: 'apiKey', value: 'abc' }]);
  });

  it('marks disabled variables and preserves description', () => {
    const out = toOpenCollectionVariables([
      { uid: 'u1', name: 'apiKey', value: 'abc', enabled: false, description: 'auth key' } as any
    ]);

    expect(out).toEqual([
      { name: 'apiKey', value: 'abc', description: 'auth key', disabled: true }
    ]);
  });

  it('accepts the folder { req, res } shape and only emits req vars', () => {
    const out = toOpenCollectionVariables({
      req: [{ uid: 'u1', name: 'a', value: '1', enabled: true } as any],
      res: [{ uid: 'u2', name: 'b', value: '2', enabled: true } as any]
    });

    expect(out).toEqual([{ name: 'a', value: '1' }]);
  });
});

describe('toBrunoVariables', () => {
  it('returns empty req/res for null / empty input', () => {
    expect(toBrunoVariables(null)).toEqual({ req: [], res: [] });
    expect(toBrunoVariables(undefined)).toEqual({ req: [], res: [] });
    expect(toBrunoVariables([])).toEqual({ req: [], res: [] });
  });

  it('parses plain string variables into Bruno req vars', () => {
    const { req } = toBrunoVariables([
      { name: 'apiKey', value: 'abc' } as any
    ]);

    expect(req).toHaveLength(1);
    const v = req![0];
    expect(v).toMatchObject({
      name: 'apiKey',
      value: 'abc',
      enabled: true,
      local: false
    });
    expect(v.uid).toEqual(expect.any(String));
    expect(v.dataType).toBeUndefined();
  });

  it('parses typed-value variables into typed Bruno variables', () => {
    const { req } = toBrunoVariables([
      { name: 'port', value: { type: 'number', data: '3000' } } as any,
      { name: 'flag', value: { type: 'boolean', data: 'true' } } as any,
      { name: 'config', value: { type: 'object', data: '{"a":1}' } } as any
    ]);

    expect(req![0]).toMatchObject({ name: 'port', value: 3000, dataType: 'number' });
    expect(req![1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean' });
    expect(req![2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
  });

  it('falls back to the raw string when typed data fails to coerce', () => {
    const { req } = toBrunoVariables([
      { name: 'port', value: { type: 'number', data: 'not-a-number' } } as any,
      { name: 'flag', value: { type: 'boolean', data: 'not-a-boolean' } } as any,
      { name: 'config', value: { type: 'object', data: 'not-a-object' } } as any
    ]);

    expect(req![0]).toMatchObject({ name: 'port', value: 'not-a-number', dataType: 'number' });
    expect(typeof req![0].value).toBe('string');
    expect(req![1]).toMatchObject({ name: 'flag', value: 'not-a-boolean', dataType: 'boolean' });
    expect(typeof req![1].value).toBe('string');
    expect(req![2]).toMatchObject({ name: 'config', value: 'not-a-object', dataType: 'object' });
    expect(typeof req![2].value).toBe('string');
  });

  it('respects the disabled flag', () => {
    const { req } = toBrunoVariables([
      { name: 'a', value: '1', disabled: true } as any
    ]);

    expect(req![0].enabled).toBe(false);
  });

  it('extracts description.content when description is a structured object', () => {
    const { req } = toBrunoVariables([
      { name: 'a', value: '1', description: { content: 'note' } } as any
    ]);

    expect(req![0].description).toBe('note');
  });
});
