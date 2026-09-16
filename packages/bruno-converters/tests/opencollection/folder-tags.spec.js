import { describe, it, expect } from '@jest/globals';
import { getFolderTags } from '@usebruno/common';
import { fromOpenCollectionFolder, toOpenCollectionFolder } from '../../src/opencollection/folder';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('opencollection folder tags', () => {
  describe('fromOpenCollectionFolder', () => {
    it('maps info.tags onto root.meta', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Users', type: 'folder', seq: 2, tags: ['smoke', 'api'] }
      });

      expect(folder.root.meta).toEqual({ name: 'Users', seq: 2, tags: ['smoke', 'api'] });
    });

    it('creates a root for a folder that only carries tags', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Tagged Only', type: 'folder', tags: ['regression'] }
      });

      expect(folder.root).toBeDefined();
      expect(folder.root.request).toBeUndefined();
      expect(folder.root.docs).toBeUndefined();
      expect(folder.root.meta.tags).toEqual(['regression']);
    });

    it('does not create a root when the folder has no tags, request or docs', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Plain', type: 'folder' }
      });

      expect(folder.root).toBeUndefined();
    });

    it('trims, de-duplicates and drops non-string tags', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Messy', type: 'folder', tags: ['  smoke  ', 'smoke', '', '   ', 42, null, undefined, 'api'] }
      });

      expect(folder.root.meta.tags).toEqual(['smoke', 'api']);
    });

    it('ignores tags that normalize away entirely', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Blank Tags', type: 'folder', tags: ['', '   ', 7] }
      });

      expect(folder.root).toBeUndefined();
    });

    it('omits the tags key from root.meta when there are no tags but a root exists', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Docs Only', type: 'folder' },
        docs: 'some documentation'
      });

      expect(folder.root.docs).toBe('some documentation');
      expect(folder.root.meta).toEqual({ name: 'Docs Only', seq: 1 });
      expect('tags' in folder.root.meta).toBe(false);
    });

    it('keeps tags alongside folder level request settings', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Auth Folder', type: 'folder', tags: ['auth'] },
        request: {
          headers: [{ name: 'X-Key', value: 'secret', disabled: false }]
        }
      });

      expect(folder.root.meta.tags).toEqual(['auth']);
      expect(folder.root.request.headers).toHaveLength(1);
    });

    it('handles a non-array tags value', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Bad Tags', type: 'folder', tags: 'smoke' }
      });

      expect(folder.root).toBeUndefined();
    });

    it('carries tags on nested folders independently', () => {
      const folder = fromOpenCollectionFolder({
        info: { name: 'Parent', type: 'folder', tags: ['parent-tag'] },
        items: [
          {
            info: { name: 'Child', type: 'folder', tags: ['child-tag'] },
            items: []
          }
        ]
      });

      expect(folder.root.meta.tags).toEqual(['parent-tag']);
      expect(folder.items[0].name).toBe('Child');
      expect(folder.items[0].root.meta.tags).toEqual(['child-tag']);
    });
  });

  describe('toOpenCollectionFolder', () => {
    it('writes root.meta.tags to info.tags', () => {
      const ocFolder = toOpenCollectionFolder({
        uid: 'f1',
        type: 'folder',
        name: 'Users',
        seq: 3,
        root: { meta: { name: 'Users', seq: 3, tags: ['smoke', 'api'] } }
      });

      expect(ocFolder.info.tags).toEqual(['smoke', 'api']);
    });

    it('omits info.tags for a folder with no root file behind it', () => {
      const ocFolder = toOpenCollectionFolder({ uid: 'f4', type: 'folder', name: 'Users' });

      expect(ocFolder.info.tags).toBeUndefined();
    });

    it('trims, de-duplicates and drops non-string tags', () => {
      const ocFolder = toOpenCollectionFolder({
        uid: 'f5',
        type: 'folder',
        name: 'Messy',
        root: { meta: { name: 'Messy', seq: 1, tags: ['  smoke  ', 'smoke', '', 42, 'api'] } }
      });

      expect(ocFolder.info.tags).toEqual(['smoke', 'api']);
    });

    it('omits info.tags when the folder has no tags', () => {
      const ocFolder = toOpenCollectionFolder({
        uid: 'f6',
        type: 'folder',
        name: 'Plain',
        root: { meta: { name: 'Plain', seq: 1 } }
      });

      expect('tags' in ocFolder.info).toBe(false);
    });

    it('omits info.tags when every tag normalizes away', () => {
      const ocFolder = toOpenCollectionFolder({
        uid: 'f7',
        type: 'folder',
        name: 'Blank Tags',
        root: { meta: { name: 'Blank Tags', seq: 1, tags: ['', '   '] } }
      });

      expect('tags' in ocFolder.info).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('preserves folder tags through Bruno -> OpenCollection -> Bruno', () => {
      const brunoCollection = {
        uid: 'c1',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'f1',
            type: 'folder',
            name: 'Users',
            seq: 1,
            root: { meta: { name: 'Users', seq: 1, tags: ['smoke'] } },
            items: [
              {
                uid: 'f2',
                type: 'folder',
                name: 'Admin',
                seq: 1,
                root: { meta: { name: 'Admin', seq: 1, tags: ['admin', 'smoke'] } },
                items: []
              }
            ]
          }
        ]
      };

      const ocCollection = brunoToOpenCollection(brunoCollection);

      expect(ocCollection.items[0].info.tags).toEqual(['smoke']);
      expect(ocCollection.items[0].items[0].info.tags).toEqual(['admin', 'smoke']);

      const backToBruno = openCollectionToBruno(ocCollection);

      const users = backToBruno.items[0];
      expect(users.root.meta.tags).toEqual(['smoke']);

      const admin = users.items[0];
      expect(admin.root.meta.tags).toEqual(['admin', 'smoke']);
    });

    it('does not introduce tags for folders that have none', () => {
      const brunoCollection = {
        uid: 'c2',
        name: 'Test',
        version: '1',
        items: [
          {
            uid: 'f1',
            type: 'folder',
            name: 'Users',
            seq: 1,
            root: { meta: { name: 'Users', seq: 1 } },
            items: []
          }
        ]
      };

      const ocCollection = brunoToOpenCollection(brunoCollection);
      expect('tags' in ocCollection.items[0].info).toBe(false);

      const backToBruno = openCollectionToBruno(ocCollection);
      expect(getFolderTags(backToBruno.items[0])).toEqual([]);
    });
  });
});
