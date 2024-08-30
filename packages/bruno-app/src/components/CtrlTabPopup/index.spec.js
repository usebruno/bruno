import { tabStackToPopupTabs } from './index';

describe('CtrlTabPopup', () => {
  describe('tabStackToPopupTabs', () => {
    it('should return an empty array if collections is falsy', () => {
      const collections = null;
      const ctrlTabStack = [];

      const result = tabStackToPopupTabs(collections, ctrlTabStack);

      expect(result).toEqual([]);
    });

    it('should return an array of popup tabs', () => {
      const collections = [
        {
          name: 'Collection 1',
          uid: 'collection1',
          items: [{ name: 'Request 1', uid: 'aaa', type: 'http-request', collectionUid: 'collection1' }]
        },
        {
          name: 'Collection 2',
          uid: 'collection2',
          items: [
            { name: 'Request 2', uid: 'ccc', type: 'http-request', collectionUid: 'collection2' },
            {
              name: 'Folder 1',
              type: 'folder',
              items: [
                { name: 'Request 3', uid: 'ddd', type: 'http-request', collectionUid: 'collection2' },

                {
                  name: 'Folder 2',
                  type: 'folder',
                  items: [{ name: 'Request 4', uid: 'eee', type: 'http-request', collectionUid: 'collection2' }]
                }
              ]
            }
          ]
        }
      ];
      const ctrlTabStack = [
        { collectionUid: 'collection1', uid: 'aaa', type: 'http-request' },
        { collectionUid: 'collection2', uid: 'ddd', type: 'http-request' },
        { collectionUid: 'collection2', uid: 'eee', type: 'http-request' },
        { collectionUid: 'collection2', uid: 'yyy', type: 'collection-settings' }
      ];

      const result = tabStackToPopupTabs(collections, ctrlTabStack);

      expect(result).toEqual([
        { tabName: 'Request 1', path: 'Collection 1', uid: 'aaa' },
        { tabName: 'Request 3', path: 'Collection 2/Folder 1', uid: 'ddd' },
        { tabName: 'Request 4', path: 'Collection 2/Folder 1/Folder 2', uid: 'eee' },
        { tabName: 'Settings', path: 'Collection 2', uid: 'yyy' }
      ]);
    });
  });
});
