import type { HttpRequest } from '@usebruno/schema-types/requests/http';
import type { GrpcRequest } from '@usebruno/schema-types/requests/grpc';
import type { WebSocketRequest } from '@usebruno/schema-types/requests/websocket';
import type { GraphqlSubscriptionRequest } from '@usebruno/schema-types/requests/graphql-subscription';
import parseItem from './parseItem';

// Typed `runtime.variables` propagate through parseItem with their dataType
// + coerced value. Helper-level coverage lives in the variables/datatype specs.

describe('parseItem — typed runtime.variables', () => {
  it('coerces typed values, preserves raw value on un-coercible input, and treats explicit string as the implicit default', () => {
    const yml = `info:
  name: r
  type: http

http:
  url: https://example.com
  method: GET

runtime:
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
    - name: bad
      value:
        type: number
        data: 'not-a-number'
`;

    const item = parseItem(yml);
    const reqVars = (item.request as HttpRequest).vars!.req!;

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
    expect(reqVars[5]).toMatchObject({ name: 'bad', value: 'not-a-number', dataType: 'number' });
  });

  it('normalizes raw YAML scalars in `data` to a string before coercing', () => {
    // YAML parses unquoted scalars per their natural JS type. The `String(... ?? '')`
    // cast in fromOpenCollectionTypedValue keeps coercion consistent.
    const yml = `info:
  name: r
  type: http

http:
  url: https://example.com
  method: GET

runtime:
  variables:
    - name: stringy
      value:
        type: string
        data: 42
    - name: numeric
      value:
        type: number
        data: 42
    - name: nullish
      value:
        type: number
        data: null
`;

    const item = parseItem(yml);
    const reqVars = (item.request as HttpRequest).vars!.req!;

    // type=string: raw YAML number → string; no dataType field.
    expect(reqVars[0]).toMatchObject({ name: 'stringy', value: '42' });
    expect(reqVars[0].dataType).toBeUndefined();
    // type=number: '42' → 42.
    expect(reqVars[1]).toMatchObject({ name: 'numeric', value: 42, dataType: 'number' });
    // data: null → '' (the `?? ''` arm); coerce bails on empty → raw ''.
    expect(reqVars[2]).toMatchObject({ name: 'nullish', value: '', dataType: 'number' });
  });

  it('propagates typed variables for graphql/grpc/websocket requests too', () => {
    const graphqlYml = `info:
  name: g
  type: graphql

graphql:
  url: https://example.com/graphql
  method: POST

runtime:
  variables:
    - name: count
      value: { type: number, data: '7' }
`;
    expect((parseItem(graphqlYml).request as HttpRequest).vars!.req![0]).toMatchObject({
      name: 'count', value: 7, dataType: 'number'
    });

    const grpcYml = `info:
  name: gr
  type: grpc

grpc:
  url: localhost:50051

runtime:
  variables:
    - name: flag
      value: { type: boolean, data: 'false' }
`;
    expect((parseItem(grpcYml).request as GrpcRequest).vars!.req![0]).toMatchObject({
      name: 'flag', value: false, dataType: 'boolean'
    });

    const wsYml = `info:
  name: ws
  type: websocket

websocket:
  url: wss://example.com/socket

runtime:
  variables:
    - name: payload
      value: { type: object, data: '{"k":1}' }
`;
    expect((parseItem(wsYml).request as WebSocketRequest).vars!.req![0]).toMatchObject({
      name: 'payload', value: { k: 1 }, dataType: 'object'
    });
  });
});

describe('parseItem — graphql-subscription', () => {
  it('parses url, headers, auth, body, connectionParams, settings and docs', () => {
    const yml = `info:
  name: On Tick
  type: graphql-subscription
  seq: 3
  tags:
    - realtime

graphqlSubscription:
  url: wss://api.example.com/graphql
  headers:
    - name: X-Test
      value: '1'
  auth: inherit
  body:
    query: |-
      subscription OnTick { tick { count } }
    variables: |-
      {}
  connectionParams: |-
    {"authToken": "{{token}}"}

settings:
  timeout: 15
  keepAliveInterval: 30

docs: some docs
`;

    const item = parseItem(yml);
    const request = item.request as GraphqlSubscriptionRequest;

    expect(item.type).toBe('graphql-subscription-request');
    expect(item.seq).toBe(3);
    expect(item.tags).toEqual(['realtime']);
    expect(request.url).toBe('wss://api.example.com/graphql');
    expect(request.headers).toEqual([expect.objectContaining({ name: 'X-Test', value: '1' })]);
    expect(request.auth).toMatchObject({ mode: 'inherit' });
    expect(request.body).toEqual({
      mode: 'graphql',
      graphql: {
        query: 'subscription OnTick { tick { count } }',
        variables: '{}'
      }
    });
    expect(request.connectionParams).toBe('{"authToken": "{{token}}"}');
    expect(item.settings).toMatchObject({ timeout: 15, keepAliveInterval: 30 });
    expect(request.docs).toBe('some docs');
  });

  it('defaults connectionParams to null and settings to zero when absent', () => {
    const yml = `info:
  name: On Tick
  type: graphql-subscription

graphqlSubscription:
  url: wss://api.example.com/graphql
`;

    const item = parseItem(yml);
    const request = item.request as GraphqlSubscriptionRequest;

    expect(request.connectionParams).toBeNull();
    expect(item.settings).toMatchObject({ timeout: 0, keepAliveInterval: 0 });
  });
});
