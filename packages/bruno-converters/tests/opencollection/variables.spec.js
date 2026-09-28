import { describe, it, expect } from '@jest/globals';
import {
  fromOpenCollectionVariables,
  toOpenCollectionVariables
} from '../../src/opencollection/common/variables';

describe('fromOpenCollectionVariables — typed values', () => {
  it('coerces typed values, omits dataType for the implicit string default, and preserves plain strings', () => {
    const ocVars = [
      { name: 'count', value: { type: 'number', data: '42' } },
      { name: 'enabled', value: { type: 'boolean', data: 'true' } },
      { name: 'config', value: { type: 'object', data: '{"a":1}' } },
      { name: 'greeting', value: { type: 'string', data: 'hi' } },
      { name: 'plain', value: 'hello' }
    ];

    const { req } = fromOpenCollectionVariables(ocVars);

    expect(req).toHaveLength(5);
    expect(req[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
    expect(req[1]).toMatchObject({ name: 'enabled', value: true, dataType: 'boolean' });
    expect(req[2]).toMatchObject({ name: 'config', value: { a: 1 }, dataType: 'object' });
    expect(req[3]).toMatchObject({ name: 'greeting', value: 'hi' });
    expect(req[3].dataType).toBeUndefined();
    expect(req[4]).toMatchObject({ name: 'plain', value: 'hello' });
    expect(req[4].dataType).toBeUndefined();
  });
});

describe('toOpenCollectionVariables — typed values', () => {
  it('serializes typed bruno vars as `{type, data}` and emits raw strings for the implicit default', () => {
    const brunoVars = [
      { uid: 'u1', name: 'count', value: 42, enabled: true, dataType: 'number' },
      { uid: 'u2', name: 'enabled', value: true, enabled: true, dataType: 'boolean' },
      { uid: 'u3', name: 'config', value: { a: 1 }, enabled: true, dataType: 'object' },
      { uid: 'u4', name: 'greeting', value: 'hi', enabled: true, dataType: 'string' },
      { uid: 'u5', name: 'plain', value: 'hello', enabled: true }
    ];

    const out = toOpenCollectionVariables(brunoVars);

    expect(out).toEqual([
      { name: 'count', value: { type: 'number', data: '42' } },
      { name: 'enabled', value: { type: 'boolean', data: 'true' } },
      { name: 'config', value: { type: 'object', data: '{\n  "a": 1\n}' } },
      { name: 'greeting', value: 'hi' },
      { name: 'plain', value: 'hello' }
    ]);
  });

  it('accepts the {req, res} folder shape and only serializes req vars', () => {
    const out = toOpenCollectionVariables({
      req: [{ uid: 'u1', name: 'a', value: 7, enabled: true, dataType: 'number' }],
      res: [{ uid: 'u2', name: 'b', value: 'expr', enabled: true }]
    });

    expect(out).toEqual([{ name: 'a', value: { type: 'number', data: '7' } }]);
  });
});

describe('OpenCollection variables round-trip', () => {
  it('survives from→to→from for the full dataType matrix', () => {
    const ocVars = [
      { name: 'count', value: { type: 'number', data: '42' } },
      { name: 'flag', value: { type: 'boolean', data: 'false' } },
      { name: 'cfg', value: { type: 'object', data: '{\n  "k": 1\n}' } },
      { name: 'plain', value: 'hello' }
    ];

    const { req } = fromOpenCollectionVariables(ocVars);
    const out = toOpenCollectionVariables(req);

    expect(out).toEqual(ocVars);
  });
});
