import type { HttpRequest } from '@usebruno/schema-types/requests/http';
import stringifyItem from './stringifyItem';
import parseItem from './parseItem';

// Typed bruno vars on `request.vars.req` serialize to OC's `{ type, data }`
// struct. `dataType: 'string'` is the implicit default and stays a raw string.

describe('stringifyItem — typed runtime.variables', () => {
  it('round-trips typed values and omits a typed struct for the implicit string default', () => {
    const item = {
      uid: 'i1',
      type: 'http-request',
      name: 'r',
      seq: 1,
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: [],
        params: [],
        body: { mode: 'none' },
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
      }
    } as any;

    const yml = stringifyItem(item);

    // `type: string` is never written out.
    expect(yml).not.toMatch(/type:\s*string/);

    const reparsed = parseItem(yml);
    const reqVars = (reparsed.request as HttpRequest).vars!.req!;

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

describe('stringifyItem — graphql-subscription', () => {
  it('round-trips url, headers, auth, body, connectionParams, settings and docs', () => {
    const item = {
      uid: 'i1',
      type: 'graphql-subscription-request',
      name: 'On Tick',
      seq: 2,
      tags: ['realtime'],
      request: {
        url: 'wss://api.example.com/graphql',
        headers: [{ uid: 'h1', name: 'X-Test', value: '1', enabled: true }],
        auth: { mode: 'inherit' },
        body: {
          mode: 'graphql',
          graphql: {
            query: 'subscription OnTick { tick { count } }',
            variables: '{}'
          }
        },
        connectionParams: '{"authToken": "{{token}}"}',
        docs: 'some docs'
      },
      settings: {
        timeout: 15,
        keepAliveInterval: 30
      }
    } as any;

    const yml = stringifyItem(item);

    expect(yml).toContain('type: graphql-subscription');
    expect(yml).toContain('url: wss://api.example.com/graphql');
    expect(yml).toContain('connectionParams:');

    const reparsed = parseItem(yml);
    expect(reparsed.type).toBe('graphql-subscription-request');
    expect(reparsed.request).toMatchObject({
      url: 'wss://api.example.com/graphql',
      connectionParams: '{"authToken": "{{token}}"}',
      docs: 'some docs',
      body: {
        mode: 'graphql',
        graphql: {
          query: 'subscription OnTick { tick { count } }',
          variables: '{}'
        }
      }
    });
    expect(reparsed.settings).toMatchObject({ timeout: 15, keepAliveInterval: 30 });
  });

  it('omits connectionParams entirely when unset', () => {
    const item = {
      uid: 'i1',
      type: 'graphql-subscription-request',
      name: 'On Tick',
      request: {
        url: 'wss://api.example.com/graphql',
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'graphql', graphql: { query: 'subscription { tick }' } },
        connectionParams: null,
        docs: null
      }
    } as any;

    const yml = stringifyItem(item);
    expect(yml).not.toContain('connectionParams');

    const reparsed = parseItem(yml);
    expect((reparsed.request as any).connectionParams).toBeNull();
  });
});
