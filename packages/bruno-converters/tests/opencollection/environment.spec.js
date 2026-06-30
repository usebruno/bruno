import { describe, it, expect } from '@jest/globals';
import {
  fromOpenCollectionEnvironments,
  toOpenCollectionEnvironments
} from '../../src/opencollection/environment';

describe('fromOpenCollectionEnvironments — typed values', () => {
  it('coerces typed values, omits dataType for the implicit string default, and drops dataType on secrets', () => {
    const ocEnvs = [
      {
        name: 'staging',
        variables: [
          { name: 'port', value: { type: 'number', data: '8080' } },
          { name: 'debug', value: { type: 'boolean', data: 'true' } },
          { name: 'config', value: { type: 'object', data: '{\n  "region": "us"\n}' } },
          { name: 'greeting', value: { type: 'string', data: 'hi' } },
          { name: 'plain', value: 'hello' },
          { name: 'apiKey', secret: true }
        ]
      }
    ];

    const [env] = fromOpenCollectionEnvironments(ocEnvs);

    expect(env.variables).toHaveLength(6);
    expect(env.variables[0]).toMatchObject({ name: 'port', value: 8080, dataType: 'number', secret: false });
    expect(env.variables[1]).toMatchObject({ name: 'debug', value: true, dataType: 'boolean', secret: false });
    expect(env.variables[2]).toMatchObject({ name: 'config', value: { region: 'us' }, dataType: 'object', secret: false });
    expect(env.variables[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(env.variables[3].dataType).toBeUndefined();
    expect(env.variables[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(env.variables[4].dataType).toBeUndefined();
    expect(env.variables[5]).toMatchObject({ name: 'apiKey', value: '', secret: true });
    expect(env.variables[5].dataType).toBeUndefined();
  });
});

describe('toOpenCollectionEnvironments — typed values', () => {
  it('serializes typed env vars as `{type, data}`, plain strings as raw, and never writes a value or dataType for secrets', () => {
    const envs = [
      {
        uid: 'e1',
        name: 'staging',
        variables: [
          { uid: 'v1', name: 'port', value: 8080, type: 'text', enabled: true, secret: false, dataType: 'number' },
          { uid: 'v2', name: 'debug', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' },
          { uid: 'v3', name: 'config', value: { region: 'us' }, type: 'text', enabled: true, secret: false, dataType: 'object' },
          { uid: 'v4', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, dataType: 'string' },
          { uid: 'v5', name: 'plain', value: 'hello', type: 'text', enabled: true, secret: false },
          { uid: 'v6', name: 'apiKey', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' }
        ],
        color: null
      }
    ];

    const out = toOpenCollectionEnvironments(envs);

    expect(out).toEqual([
      {
        name: 'staging',
        color: undefined,
        variables: [
          { name: 'port', value: { type: 'number', data: '8080' } },
          { name: 'debug', value: { type: 'boolean', data: 'true' } },
          { name: 'config', value: { type: 'object', data: '{\n  "region": "us"\n}' } },
          { name: 'greeting', value: 'hi' },
          { name: 'plain', value: 'hello' },
          { name: 'apiKey', secret: true }
        ]
      }
    ]);
  });
});

describe('OpenCollection environment round-trip', () => {
  it('survives from→to→from for typed env vars and secrets', () => {
    const ocEnvs = [
      {
        name: 'staging',
        color: undefined,
        variables: [
          { name: 'port', value: { type: 'number', data: '8080' } },
          { name: 'flag', value: { type: 'boolean', data: 'true' } },
          { name: 'config', value: { type: 'object', data: '{\n  "region": "us"\n}' } },
          { name: 'plain', value: 'hello' },
          { name: 'apiKey', secret: true }
        ]
      }
    ];

    const fromOc = fromOpenCollectionEnvironments(ocEnvs);
    const out = toOpenCollectionEnvironments(fromOc);

    expect(out).toEqual(ocEnvs);
  });
});
