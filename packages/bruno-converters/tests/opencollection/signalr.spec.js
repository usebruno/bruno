import { describe, it, expect } from '@jest/globals';
import {
  fromOpenCollectionSignalrItem,
  toOpenCollectionSignalrItem
} from '../../src/opencollection/items/signalr';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';

describe('fromOpenCollectionSignalrItem', () => {
  it('converts a single message from OC format', () => {
    const ocItem = {
      info: { name: 'broadcast', type: 'signalr', seq: 2 },
      signalr: {
        url: 'http://localhost:5246/hub',
        message: { type: 'json', data: '["hello"]', name: 'broadcast' }
      }
    };

    const result = fromOpenCollectionSignalrItem(ocItem);

    expect(result.type).toBe('signalr-request');
    expect(result.name).toBe('broadcast');
    expect(result.seq).toBe(2);
    expect(result.request.url).toBe('http://localhost:5246/hub');
    expect(result.request.body.mode).toBe('signalr');
    expect(result.request.body.signalr).toHaveLength(1);
    expect(result.request.body.signalr[0]).toMatchObject({
      name: 'broadcast',
      type: 'json',
      content: '["hello"]',
      selected: true
    });
  });

  it('converts multiple messages from OC format', () => {
    const ocItem = {
      info: { name: 'multi', type: 'signalr' },
      signalr: {
        url: 'http://localhost:5246/hub',
        message: [
          {
            title: 'join',
            selected: true,
            message: { type: 'json', data: '["room1"]' }
          },
          {
            title: 'leave',
            selected: false,
            message: { type: 'text', data: '["room2"]' }
          }
        ]
      }
    };

    const result = fromOpenCollectionSignalrItem(ocItem);

    expect(result.request.body.signalr).toHaveLength(2);
    expect(result.request.body.signalr[0]).toMatchObject({
      name: 'join',
      type: 'json',
      content: '["room1"]',
      selected: true
    });
    expect(result.request.body.signalr[1]).toMatchObject({
      name: 'leave',
      type: 'text',
      content: '["room2"]',
      selected: false
    });
  });

  it('converts OC item with headers and auth', () => {
    const ocItem = {
      info: { name: 'auth-test', type: 'signalr' },
      signalr: {
        url: 'http://localhost:5246/hub',
        headers: [
          { name: 'Authorization', value: 'Bearer tok123', enabled: true }
        ],
        auth: { type: 'bearer', token: 'tok123' }
      }
    };

    const result = fromOpenCollectionSignalrItem(ocItem);

    expect(result.request.headers).toHaveLength(1);
    expect(result.request.headers[0]).toMatchObject({
      name: 'Authorization',
      value: 'Bearer tok123'
    });
    expect(result.request.auth).toMatchObject({
      mode: 'bearer',
      bearer: { token: 'tok123' }
    });
  });

  it('handles missing signalr block gracefully', () => {
    const ocItem = {
      info: { name: 'empty', type: 'signalr' }
    };

    const result = fromOpenCollectionSignalrItem(ocItem);

    expect(result.request.body.mode).toBe('signalr');
    expect(result.request.body.signalr).toEqual([]);
    expect(result.request.url).toBe('');
  });
});

describe('toOpenCollectionSignalrItem', () => {
  it('serializes a BrunoItem with single message to OC format', () => {
    const brunoItem = {
      uid: 'u1',
      type: 'signalr-request',
      name: 'broadcast',
      seq: 1,
      request: {
        url: 'http://localhost:5246/hub',
        headers: [],
        body: {
          mode: 'signalr',
          signalr: [
            { uid: 'm1', name: 'broadcast', type: 'json', content: '["hello"]', selected: true }
          ]
        },
        auth: { mode: 'none' },
        script: { req: null, res: null },
        vars: { req: [], res: [] },
        tests: null,
        docs: ''
      }
    };

    const result = toOpenCollectionSignalrItem(brunoItem);

    expect(result.info).toMatchObject({ name: 'broadcast', type: 'signalr', seq: 1 });
    expect(result.signalr.url).toBe('http://localhost:5246/hub');
    expect(result.signalr.message).toMatchObject({
      type: 'json',
      data: '["hello"]',
      name: 'broadcast'
    });
  });

  it('serializes a BrunoItem with multiple messages', () => {
    const brunoItem = {
      uid: 'u1',
      type: 'signalr-request',
      name: 'multi',
      seq: 1,
      request: {
        url: 'http://localhost:5246/hub',
        headers: [],
        body: {
          mode: 'signalr',
          signalr: [
            { uid: 'm1', name: 'join', type: 'json', content: '["room1"]', selected: true },
            { uid: 'm2', name: 'leave', type: 'text', content: '["room2"]', selected: false }
          ]
        },
        auth: { mode: 'none' },
        script: { req: null, res: null },
        vars: { req: [], res: [] },
        tests: null,
        docs: ''
      }
    };

    const result = toOpenCollectionSignalrItem(brunoItem);

    expect(result.signalr.message).toHaveLength(2);
    expect(result.signalr.message[0]).toMatchObject({
      title: 'join',
      selected: true,
      message: { type: 'json', data: '["room1"]' }
    });
    expect(result.signalr.message[1]).toMatchObject({
      title: 'leave',
      message: { type: 'text', data: '["room2"]' }
    });
  });

  it('serializes headers and auth into OC format', () => {
    const brunoItem = {
      uid: 'u1',
      type: 'signalr-request',
      name: 'auth-test',
      seq: 1,
      request: {
        url: 'http://localhost:5246/hub',
        headers: [
          { name: 'Authorization', value: 'Bearer tok123', enabled: true }
        ],
        body: {
          mode: 'signalr',
          signalr: [
            { uid: 'm1', name: 'broadcast', type: 'json', content: '[]', selected: true }
          ]
        },
        auth: { mode: 'bearer', bearer: { token: 'tok123' } },
        script: { req: 'console.log("connected");', res: null },
        vars: { req: [{ uid: 'v1', name: 'env', value: 'prod', enabled: true }], res: [] },
        tests: null,
        docs: 'docstring'
      }
    };

    const result = toOpenCollectionSignalrItem(brunoItem);

    expect(result.signalr.headers).toEqual([{ name: 'Authorization', value: 'Bearer tok123' }]);
    expect(result.signalr.auth).toMatchObject({ type: 'bearer', token: 'tok123' });
    expect(result.runtime).toBeDefined();
    expect(result.docs).toBe('docstring');
  });
});

describe('OpenCollection signalr round-trip', () => {
  it('survives from→to→from for a single message', () => {
    const ocInput = {
      info: { name: 'broadcast', type: 'signalr', seq: 1 },
      signalr: {
        url: 'http://localhost:5246/hub',
        message: { type: 'json', data: '["hello"]', name: 'broadcast' },
        auth: { type: 'bearer', token: 'tok' }
      },
      runtime: {
        scripts: { req: 'console.log("ok");' },
        variables: [{ name: 'env', value: 'prod' }]
      },
      docs: 'test doc'
    };

    const bruno = fromOpenCollectionSignalrItem(ocInput);
    const result = toOpenCollectionSignalrItem(bruno);

    expect(result.info).toMatchObject({ name: 'broadcast', type: 'signalr' });
    expect(result.signalr.url).toBe('http://localhost:5246/hub');
    expect(result.signalr.message).toMatchObject({ type: 'json', data: '["hello"]', name: 'broadcast' });
    expect(result.signalr.auth).toBeDefined();
    expect(result.runtime).toBeDefined();
    expect(result.docs).toBe('test doc');
  });
});

describe('brunoToOpenCollection pipeline with signalr', () => {
  it('converts a collection containing a signalr request', () => {
    const brunoCollection = {
      name: 'SignalR Test',
      items: [
        {
          uid: 'u1',
          type: 'signalr-request',
          name: 'broadcast',
          seq: 1,
          request: {
            url: 'http://localhost:5246/hub',
            headers: [],
            body: {
              mode: 'signalr',
              signalr: [
                { name: 'broadcast', type: 'json', content: '["hello"]', selected: true }
              ]
            },
            auth: { mode: 'none' },
            script: { req: null, res: null },
            vars: { req: [], res: [] },
            tests: null,
            docs: 'test doc'
          }
        }
      ],
      environments: [],
      brunoConfig: {}
    };

    const result = brunoToOpenCollection(brunoCollection);

    expect(result.opencollection).toBe('1.0.0');
    expect(result.info.name).toBe('SignalR Test');
    expect(result.items).toHaveLength(1);

    const signalrItem = result.items[0];
    expect(signalrItem.info).toMatchObject({ name: 'broadcast', type: 'signalr', seq: 1 });
    expect(signalrItem.signalr).toBeDefined();
    expect(signalrItem.signalr.url).toBe('http://localhost:5246/hub');
    expect(signalrItem.signalr.message).toMatchObject({ type: 'json', data: '["hello"]', name: 'broadcast' });
    expect(signalrItem.docs).toBe('test doc');
  });

  it('converts a collection with signalr inside a folder', () => {
    const brunoCollection = {
      name: 'Nested SignalR',
      items: [
        {
          uid: 'f1',
          type: 'folder',
          name: 'SignalR Folder',
          seq: 1,
          items: [
            {
              uid: 'u2',
              type: 'signalr-request',
              name: 'nested-msg',
              seq: 1,
              request: {
                url: 'http://localhost:5246/hub',
                headers: [],
                body: {
                  mode: 'signalr',
                  signalr: [
                    { name: 'join', type: 'json', content: '["room1"]', selected: true }
                  ]
                },
                auth: { mode: 'none' },
                script: { req: null, res: null },
                vars: { req: [], res: [] },
                tests: null,
                docs: ''
              }
            }
          ],
          root: {}
        }
      ],
      environments: [],
      brunoConfig: {}
    };

    const result = brunoToOpenCollection(brunoCollection);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      info: { name: 'SignalR Folder', type: 'folder' }
    });

    const folder = result.items[0];
    expect(folder.items).toHaveLength(1);
    expect(folder.items[0].info).toMatchObject({ name: 'nested-msg', type: 'signalr' });
    expect(folder.items[0].signalr.message).toMatchObject({ type: 'json', data: '["room1"]', name: 'join' });
  });
});
