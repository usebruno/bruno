import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

const grpcItem = (script, tests = null) => ({
  uid: 'i1',
  type: 'grpc-request',
  name: 'gr',
  seq: 1,
  request: {
    url: 'localhost:50051',
    method: '/pkg.Svc/Method',
    methodType: 'unary',
    headers: [],
    body: { mode: 'grpc', grpc: [] },
    auth: { mode: 'none' },
    script,
    tests,
    vars: { req: [], res: [] }
  }
});

const httpItem = (script) => ({
  uid: 'i2',
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
    script,
    tests: null,
    vars: { req: [], res: [] }
  }
});

const graphqlItem = (script) => ({
  uid: 'i3',
  type: 'graphql-request',
  name: 'gq',
  seq: 1,
  request: {
    url: 'https://example.com/graphql',
    method: 'POST',
    headers: [],
    params: [],
    body: { mode: 'graphql', graphql: { query: '{ me }', variables: '' } },
    auth: { mode: 'none' },
    script,
    tests: null,
    vars: { req: [], res: [] }
  }
});

const websocketItem = (script) => ({
  uid: 'i4',
  type: 'ws-request',
  name: 'ws',
  seq: 1,
  request: {
    url: 'wss://example.com',
    headers: [],
    body: { mode: 'ws', ws: [] },
    auth: { mode: 'none' },
    script,
    tests: null,
    vars: { req: [], res: [] }
  }
});

const ocGrpcItem = (scripts) => ({
  info: { name: 'gr', type: 'grpc' },
  grpc: { url: 'localhost:50051', method: '/pkg.Svc/Method', methodType: 'unary' },
  runtime: { scripts }
});

const exportItems = (items) => brunoToOpenCollection({ name: 'API', brunoConfig: {}, items });

describe('brunoToOpenCollection (export): grpc lifecycle scripts', () => {
  it('writes the lifecycle hooks as grpc-prefixed script types', () => {
    const oc = exportItems([
      grpcItem({
        beforeCallStart: 'before()',
        beforeMessageSend: 'beforeSend()',
        afterMessageReceive: 'afterReceive()',
        afterCallEnd: 'after()'
      })
    ]);

    expect(oc.items[0].runtime.scripts).toEqual([
      { type: 'grpc:before-call-start', code: 'before()' },
      { type: 'grpc:before-message-send', code: 'beforeSend()' },
      { type: 'grpc:after-message-receive', code: 'afterReceive()' },
      { type: 'grpc:after-call-end', code: 'after()' }
    ]);
  });

  it('keeps tests alongside the hooks', () => {
    const oc = exportItems([grpcItem({ beforeCallStart: 'before()' }, 'test()')]);

    expect(oc.items[0].runtime.scripts).toEqual([
      { type: 'grpc:before-call-start', code: 'before()' },
      { type: 'tests', code: 'test()' }
    ]);
  });

  it('trims the whitespace around the hooks', () => {
    const oc = exportItems([
      grpcItem({
        beforeCallStart: '  before()\n',
        beforeMessageSend: ' beforeSend() ',
        afterMessageReceive: '\n afterReceive() \n',
        afterCallEnd: '\n\tafter()  '
      })
    ]);

    expect(oc.items[0].runtime.scripts).toEqual([
      { type: 'grpc:before-call-start', code: 'before()' },
      { type: 'grpc:before-message-send', code: 'beforeSend()' },
      { type: 'grpc:after-message-receive', code: 'afterReceive()' },
      { type: 'grpc:after-call-end', code: 'after()' }
    ]);
  });

  it('drops hooks whose code is only whitespace', () => {
    const oc = exportItems([
      grpcItem({ beforeCallStart: '   ', beforeMessageSend: ' ', afterMessageReceive: '\t', afterCallEnd: '\n\t\n' })
    ]);

    expect(oc.items[0].runtime?.scripts).toBeUndefined();
  });

  it('drops a blank hook while keeping its populated sibling', () => {
    const oc = exportItems([
      grpcItem({ beforeCallStart: '   ', beforeMessageSend: '  ', afterMessageReceive: 'afterReceive()', afterCallEnd: 'after()' })
    ]);

    expect(oc.items[0].runtime.scripts).toEqual([
      { type: 'grpc:after-message-receive', code: 'afterReceive()' },
      { type: 'grpc:after-call-end', code: 'after()' }
    ]);
  });

  it('drops req/res carried by a grpc request', () => {
    const oc = exportItems([grpcItem({ req: 'pre()', res: 'post()' })]);

    expect(oc.items[0].runtime?.scripts).toBeUndefined();
  });

  it('drops grpc hooks carried by an http request', () => {
    const oc = exportItems([httpItem({ req: 'pre()', beforeCallStart: 'before()', afterMessageReceive: 'afterReceive()' })]);

    expect(oc.items[0].runtime.scripts).toEqual([{ type: 'before-request', code: 'pre()' }]);
  });

  // TODO: remove/modify once folder/collection accepts grpc hooks
  it('drops grpc hooks set on the collection root', () => {
    const oc = brunoToOpenCollection({
      name: 'API',
      brunoConfig: {},
      items: [],
      root: { request: { script: { req: 'root pre()', beforeCallStart: 'root before()' } } }
    });

    expect(oc.request.scripts).toEqual([{ type: 'before-request', code: 'root pre()' }]);
  });

  // TODO: remove/modify once folder/collection accepts grpc hooks
  it('drops grpc hooks set on a folder root', () => {
    const oc = exportItems([
      {
        uid: 'f1',
        type: 'folder',
        name: 'my-folder',
        items: [],
        root: { request: { script: { res: 'folder post()', afterCallEnd: 'folder after()' } } }
      }
    ]);

    expect(oc.items[0].request.scripts).toEqual([{ type: 'after-response', code: 'folder post()' }]);
  });
});

describe('openCollectionToBruno (import): grpc lifecycle scripts', () => {
  it('reads the grpc-prefixed script types into the lifecycle hooks', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        ocGrpcItem([
          { type: 'grpc:before-call-start', code: 'before()' },
          { type: 'grpc:before-message-send', code: 'beforeSend()' },
          { type: 'grpc:after-message-receive', code: 'afterReceive()' },
          { type: 'grpc:after-call-end', code: 'after()' },
          { type: 'tests', code: 'test()' }
        ])
      ]
    });

    expect(collection.items[0].request.script).toEqual({
      beforeCallStart: 'before()',
      beforeMessageSend: 'beforeSend()',
      afterMessageReceive: 'afterReceive()',
      afterCallEnd: 'after()'
    });
    expect(collection.items[0].request.tests).toBe('test()');
  });

  it('ignores req/res scripts found on a grpc request', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        ocGrpcItem([
          { type: 'before-request', code: 'pre()' },
          { type: 'grpc:before-call-start', code: 'before()' }
        ])
      ]
    });

    expect(collection.items[0].request.script).toEqual({ beforeCallStart: 'before()' });
  });

  it('leaves the hooks unset when the grpc request has no scripts', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        {
          info: { name: 'gr', type: 'grpc' },
          grpc: { url: 'localhost:50051', method: '/pkg.Svc/Method', methodType: 'unary' },
          runtime: {}
        }
      ]
    });

    expect(collection.items[0].request.script).toBeUndefined();
  });

  it('leaves a hook unset when its code is empty', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        ocGrpcItem([
          { type: 'grpc:before-call-start', code: '' },
          { type: 'grpc:before-message-send', code: '' },
          { type: 'grpc:after-message-receive', code: 'afterReceive()' },
          { type: 'grpc:after-call-end', code: 'after()' }
        ])
      ]
    });

    expect(collection.items[0].request.script).toEqual({
      afterMessageReceive: 'afterReceive()',
      afterCallEnd: 'after()'
    });
  });

  it('leaves the hooks unset when every hook has empty code', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        ocGrpcItem([
          { type: 'grpc:before-call-start', code: '' },
          { type: 'grpc:before-message-send', code: '' },
          { type: 'grpc:after-message-receive', code: '' },
          { type: 'grpc:after-call-end', code: '' }
        ])
      ]
    });

    expect(collection.items[0].request.script).toBeUndefined();
  });

  it('ignores grpc hooks found on an http request', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        {
          info: { name: 'r', type: 'http' },
          http: { url: 'https://example.com', method: 'GET' },
          runtime: {
            scripts: [
              { type: 'grpc:before-call-start', code: 'before()' },
              { type: 'grpc:after-call-end', code: '' },
              { type: 'before-request', code: 'pre()' },
              { type: 'after-response', code: 'post()' }
            ]
          }
        }
      ]
    });

    expect(collection.items[0].request.script).toEqual({ req: 'pre()', res: 'post()' });
  });

  it('ignores grpc hooks on the collection root', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      request: { scripts: [{ type: 'grpc:before-call-start', code: 'root before()' }] },
      items: []
    });

    expect(collection.root.request.script).toBeUndefined();
  });

  it('ignores grpc hooks on a folder root', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        {
          info: { name: 'my-folder', type: 'folder' },
          items: [],
          request: { scripts: [{ type: 'grpc:after-call-end', code: 'folder after()' }] }
        }
      ]
    });

    expect(collection.items[0].root.request.script).toBeUndefined();
  });
});

describe('graphql and websocket requests: grpc lifecycle scripts', () => {
  it('drops grpc hooks carried by a graphql request on export', () => {
    const oc = exportItems([graphqlItem({ req: 'pre()', beforeCallStart: 'before()' })]);

    expect(oc.items[0].runtime.scripts).toEqual([{ type: 'before-request', code: 'pre()' }]);
  });

  it('ignores grpc hooks found on a graphql request on import', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'API' },
      items: [
        {
          info: { name: 'gq', type: 'graphql' },
          graphql: { url: 'https://example.com/graphql', method: 'POST' },
          runtime: {
            scripts: [
              { type: 'grpc:before-call-start', code: 'before()' },
              { type: 'after-response', code: 'post()' }
            ]
          }
        }
      ]
    });

    expect(collection.items[0].request.script).toEqual({ res: 'post()' });
  });

  it('drops grpc hooks carried by a websocket request on export', () => {
    const oc = exportItems([websocketItem({ res: 'post()', afterCallEnd: 'after()' })]);

    expect(oc.items[0].runtime.scripts).toEqual([{ type: 'after-response', code: 'post()' }]);
  });

  it('ignores grpc hooks found on a websocket request on import', () => {
    const collection = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'ws', type: 'websocket' },
      items: [
        {
          info: { name: 'ws', type: 'websocket' },
          websocket: { url: 'wss://example.com' },
          runtime: {
            scripts: [
              { type: 'grpc:after-call-end', code: 'after()' },
              { type: 'before-request', code: 'pre()' }
            ]
          }
        }
      ]
    });

    expect(collection.items[0].request.script).toEqual({ req: 'pre()' });
  });
});

describe('grpc lifecycle scripts: export then import keeps them the same', () => {
  it('preserves every hook across a round trip', () => {
    const oc = exportItems([
      grpcItem(
        {
          beforeCallStart: 'before()',
          beforeMessageSend: 'beforeSend()',
          afterMessageReceive: 'afterReceive()',
          afterCallEnd: 'after()'
        },
        'test()'
      )
    ]);
    const collection = openCollectionToBruno(oc);

    expect(collection.items[0].request.script).toEqual({
      beforeCallStart: 'before()',
      beforeMessageSend: 'beforeSend()',
      afterMessageReceive: 'afterReceive()',
      afterCallEnd: 'after()'
    });
    expect(collection.items[0].request.tests).toBe('test()');
  });
});
