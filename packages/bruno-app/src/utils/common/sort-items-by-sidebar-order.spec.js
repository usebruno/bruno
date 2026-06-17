const { describe, it, expect } = require('@jest/globals');
const { sortItemsBySidebarOrder } = require('../collections/index');

const folder = (name, seq, items = []) => ({ uid: name, type: 'folder', name, seq, items });
const request = (name, seq) => ({ uid: name, type: 'http-request', name, seq, request: { method: 'GET', url: '' } });

const names = (items) => items.map((i) => i.name);

describe('sortItemsBySidebarOrder', () => {
  describe('Grouping order (folders → requests)', () => {
    it('places folders first, then requests, then files regardless of input order', () => {
      const result = sortItemsBySidebarOrder([
        request('req', 1),
        folder('dir', 1)
      ]);
      expect(names(result)).toEqual(['dir', 'req']);
    });

    it('orders folders by seq (via sortByNameThenSequence)', () => {
      const result = sortItemsBySidebarOrder([
        folder('third', 3),
        folder('first', 1),
        folder('second', 2)
      ]);
      expect(names(result)).toEqual(['first', 'second', 'third']);
    });

    it('orders requests by seq', () => {
      const result = sortItemsBySidebarOrder([
        request('c', 3),
        request('a', 1),
        request('b', 2)
      ]);
      expect(names(result)).toEqual(['a', 'b', 'c']);
    });

    it('produces the full sidebar order for a mixed list', () => {
      const result = sortItemsBySidebarOrder([
        request('reqB', 2),
        folder('folderB', 2),
        request('reqA', 1),
        folder('folderA', 1)
      ]);
      expect(names(result)).toEqual(['folderA', 'folderB', 'reqA', 'reqB']);
    });
  });

  describe('Nested folders', () => {
    it('applies the same ordering recursively at every depth', () => {
      const result = sortItemsBySidebarOrder([
        folder('outer', 1, [
          request('innerReqB', 2),
          folder('innerFolder', 1, [request('deepB', 2), request('deepA', 1)]),
          request('innerReqA', 1)
        ])
      ]);

      const outer = result[0];
      expect(names(outer.items)).toEqual(['innerFolder', 'innerReqA', 'innerReqB']);

      const innerFolder = outer.items.find((i) => i.name === 'innerFolder');
      expect(names(innerFolder.items)).toEqual(['deepA', 'deepB']);
    });
  });

  describe('Filtering', () => {
    it('excludes transient folders and requests', () => {
      const transientReq = { ...request('ghost', 5), isTransient: true };
      const transientFolder = { ...folder('ghostDir', 5), isTransient: true };
      const result = sortItemsBySidebarOrder([
        transientFolder,
        folder('real', 1),
        transientReq,
        request('realReq', 1)
      ]);
      expect(names(result)).toEqual(['real', 'realReq']);
    });
  });

  describe('Purity & robustness', () => {
    it('does not mutate the input array', () => {
      const items = [request('b', 2), request('a', 1)];
      const snapshot = JSON.parse(JSON.stringify(items));
      sortItemsBySidebarOrder(items);
      expect(items).toEqual(snapshot);
    });

    it('returns an empty array for empty/no input', () => {
      expect(sortItemsBySidebarOrder([])).toEqual([]);
      expect(sortItemsBySidebarOrder()).toEqual([]);
    });
  });
});
