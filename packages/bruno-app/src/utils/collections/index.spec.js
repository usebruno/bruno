const { describe, it, expect } = require('@jest/globals');
import {
  mergeHeaders,
  transformRequestToSaveToFilesystem,
  getReorderedItemsInTargetDirectory,
  calculateDraggedItemNewPathname
} from './index';

describe('mergeHeaders', () => {
  it('should include headers from collection, folder and request (with correct precedence)', () => {
    const collection = {
      root: {
        request: {
          headers: [
            { name: 'X-Collection', value: 'c', enabled: true }
          ]
        }
      }
    };

    const folder = {
      type: 'folder',
      root: {
        request: {
          headers: [
            { name: 'X-Folder', value: 'f', enabled: true }
          ]
        }
      }
    };

    const request = {
      headers: [
        { name: 'X-Request', value: 'r', enabled: true }
      ]
    };

    const headers = mergeHeaders(collection, request, [folder]);
    const names = headers.map((h) => h.name);
    expect(names).toEqual(expect.arrayContaining(['X-Collection', 'X-Folder', 'X-Request']));
  });
});

describe('transformRequestToSaveToFilesystem', () => {
  it('preserves header and param annotations', () => {
    const item = {
      uid: 'requestuid123456789012',
      type: 'http-request',
      name: 'Annotated Request',
      seq: 1,
      settings: {},
      tags: [],
      examples: [],
      request: {
        method: 'GET',
        url: 'https://example.com',
        params: [
          {
            uid: 'paramuid1234567890123',
            name: 'q',
            value: '1',
            description: '',
            annotations: [{ name: 'param-note', value: 'keep me' }],
            type: 'query',
            enabled: true
          }
        ],
        headers: [
          {
            uid: 'headeruid123456789012',
            name: 'X-Test',
            value: '1',
            description: '',
            annotations: [{ name: 'header-note', value: 'keep me' }],
            enabled: true
          }
        ],
        auth: { mode: 'none' },
        body: { mode: 'none' },
        script: { req: '', res: '' },
        vars: { req: [], res: [] },
        assertions: [],
        tests: '',
        docs: ''
      }
    };

    const transformed = transformRequestToSaveToFilesystem(item);

    expect(transformed.request.params[0].annotations).toEqual([{ name: 'param-note', value: 'keep me' }]);
    expect(transformed.request.headers[0].annotations).toEqual([{ name: 'header-note', value: 'keep me' }]);
  });
});

describe('getReorderedItemsInTargetDirectory', () => {
  it('moves a request before a target when placement is \'before\'', () => {
    const items = [
      { uid: 'req-a', type: 'http-request', name: 'A', seq: 1, pathname: '/tmp/collection/req-a.bru' },
      { uid: 'req-b', type: 'http-request', name: 'B', seq: 2, pathname: '/tmp/collection/req-b.bru' },
      { uid: 'req-c', type: 'http-request', name: 'C', seq: 3, pathname: '/tmp/collection/req-c.bru' }
    ];

    const reordered = getReorderedItemsInTargetDirectory({
      items,
      draggedItemUid: 'req-c',
      targetItemUid: 'req-b',
      placement: 'before'
    });

    expect(reordered).toHaveLength(2);
    expect(reordered.find((i) => i.uid === 'req-c')?.seq).toBe(2);
    expect(reordered.find((i) => i.uid === 'req-b')?.seq).toBe(3);
  });

  it('moves a request after a target when placement is \'after\'', () => {
    const items = [
      { uid: 'req-a', type: 'http-request', name: 'A', seq: 1, pathname: '/tmp/collection/req-a.bru' },
      { uid: 'req-b', type: 'http-request', name: 'B', seq: 2, pathname: '/tmp/collection/req-b.bru' },
      { uid: 'req-c', type: 'http-request', name: 'C', seq: 3, pathname: '/tmp/collection/req-c.bru' }
    ];

    const reordered = getReorderedItemsInTargetDirectory({
      items,
      draggedItemUid: 'req-a',
      targetItemUid: 'req-b',
      placement: 'after'
    });

    expect(reordered).toHaveLength(2);
    expect(reordered.find((i) => i.uid === 'req-b')?.seq).toBe(1);
    expect(reordered.find((i) => i.uid === 'req-a')?.seq).toBe(2);
  });
});

describe('calculateDraggedItemNewPathname', () => {
  const requestFixtures = {
    reqA: {
      uid: 'req-a',
      type: 'http-request',
      name: 'req-a',
      seq: 1,
      filename: 'req-a.bru',
      pathname: '/tmp/collection/folder-a/req-a.bru'
    },
    reqB: {
      uid: 'req-b',
      type: 'http-request',
      name: 'req-b',
      seq: 2,
      filename: 'req-b.bru',
      pathname: '/tmp/collection/folder-b/req-b.bru'
    },
    reqC: {
      uid: 'req-c',
      type: 'http-request',
      name: 'req-c',
      seq: 3,
      filename: 'req-c.bru',
      pathname: '/tmp/collection/folder-c/req-c.bru'
    }
  };

  it('keeps sibling drops in the target parent directory for placement \'before\'', () => {
    const collectionPathname = '/tmp/collection';
    const draggedItem = { ...requestFixtures.reqA };
    const targetItem = { ...requestFixtures.reqB };

    const newPathname = calculateDraggedItemNewPathname({
      draggedItem,
      targetItem,
      placement: 'before',
      collectionPathname
    });

    expect(newPathname).toBe('/tmp/collection/folder-b/req-a.bru');
  });

  it('keeps sibling drops in the target parent directory for placement \'after\'', () => {
    const collectionPathname = '/tmp/collection';
    const draggedItem = { ...requestFixtures.reqA };
    const targetItem = { ...requestFixtures.reqB };

    const newPathname = calculateDraggedItemNewPathname({
      draggedItem,
      targetItem,
      placement: 'after',
      collectionPathname
    });

    expect(newPathname).toBe('/tmp/collection/folder-b/req-a.bru');
  });

  it('remains backward-compatible with legacy dropType \'adjacent\'', () => {
    const collectionPathname = '/tmp/collection';
    const draggedItem = { ...requestFixtures.reqC };
    const targetItem = { ...requestFixtures.reqB };

    const newPathname = calculateDraggedItemNewPathname({
      draggedItem,
      targetItem,
      dropType: 'adjacent',
      collectionPathname
    });

    expect(newPathname).toBe('/tmp/collection/folder-b/req-c.bru');
  });
});
