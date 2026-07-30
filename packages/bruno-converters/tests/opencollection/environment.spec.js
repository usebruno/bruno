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

describe('toOpenCollectionEnvironments — exports environment variable descriptions', () => {
  it('exports the description for both plain and secret variables, and skips it when empty or only whitespace', () => {
    const envs = [
      {
        uid: 'e1',
        name: 'staging',
        variables: [
          { uid: 'v1', name: 'baseUrl', value: 'https://api.example.com', type: 'text', enabled: true, secret: false, description: 'Base API URL' },
          { uid: 'v2', name: 'apiKey', value: '', type: 'text', enabled: true, secret: true, description: 'Secret auth key' },
          { uid: 'v3', name: 'plain', value: 'v', type: 'text', enabled: true, secret: false },
          { uid: 'v4', name: 'ws', value: 'v', type: 'text', enabled: true, secret: false, description: '   ' },
          { uid: 'v5', name: 'port', value: 8080, type: 'text', enabled: true, secret: false, dataType: 'number', description: 'Server port' },
          { uid: 'v6', name: 'config', value: { region: 'us' }, type: 'text', enabled: true, secret: false, dataType: 'object', description: 'Service config' }
        ],
        color: null
      }
    ];

    const [env] = toOpenCollectionEnvironments(envs);

    expect(env.variables[0]).toMatchObject({ name: 'baseUrl', value: 'https://api.example.com', description: 'Base API URL' });
    expect(env.variables[1]).toMatchObject({ name: 'apiKey', secret: true, description: 'Secret auth key' });
    expect(env.variables[2]).not.toHaveProperty('description');
    expect(env.variables[3]).not.toHaveProperty('description');
    expect(env.variables[4]).toMatchObject({ name: 'port', value: { type: 'number', data: '8080' }, description: 'Server port' });
    expect(env.variables[5]).toMatchObject({ name: 'config', value: { type: 'object', data: '{\n  "region": "us"\n}' }, description: 'Service config' });
  });
});

describe('OpenCollection environment round-trip — variable descriptions', () => {
  it('keeps plain and secret variable descriptions when converting OpenCollection to Bruno and back', () => {
    const ocEnvs = [
      {
        name: 'staging',
        color: undefined,
        variables: [
          { name: 'baseUrl', value: 'https://api.example.com', description: 'Base API URL' },
          { name: 'apiKey', secret: true, description: 'Secret auth key' }
        ]
      }
    ];

    const out = toOpenCollectionEnvironments(fromOpenCollectionEnvironments(ocEnvs));
    expect(out).toEqual(ocEnvs);
  });
});
