import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, { updateRequestBodyTabs } from 'providers/ReduxStore/slices/collections';

describe('Request Body Tabs Redux Store', () => {
  let store;
  const mockCollection = { uid: 'collection-1', name: 'Test Collection' };
  const mockItem = {
    uid: 'item-1',
    name: 'Test Request',
    type: 'http-request',
    request: { method: 'POST', body: { mode: 'json', json: '{"test": "data"}' } },
  };

  beforeEach(() => {
    const initialState = {
      collections: [{ ...mockCollection, items: [mockItem] }],
    };
    store = configureStore({
      reducer: { collections: collectionsReducer },
      preloadedState: { collections: initialState },
    });
  });

  describe('updateRequestBodyTabs', () => {
    it('should add bodyTabs to request', () => {
      const bodyTabs = [{ id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{"tab1": "content"}' }];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
    });

    it('should handle multiple tabs', () => {
      const bodyTabs = [
        { id: 1, name: 'JSON Tab', bodyType: 'json', bodyContent: '{"json": true}' },
        { id: 2, name: 'XML Tab', bodyType: 'xml', bodyContent: '<xml>true</xml>' },
        { id: 3, name: 'Text Tab', bodyType: 'text', bodyContent: 'plain text' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      expect(item.draft.request.body.bodyTabs).toHaveLength(3);
      expect(item.draft.request.body.bodyTabs[1].bodyType).toBe('xml');
    });

    it('should preserve tab order and properties', () => {
      const bodyTabs = [
        { id: 5, name: 'Fifth', bodyType: 'json', bodyContent: '{}' },
        { id: 1, name: 'First', bodyType: 'xml', bodyContent: '<xml/>' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      const savedTabs = item.draft.request.body.bodyTabs;

      expect(savedTabs[0].id).toBe(5);
      expect(savedTabs[0].name).toBe('Fifth');
      expect(savedTabs[1].id).toBe(1);
      expect(savedTabs[1].bodyType).toBe('xml');
    });

    it('should create draft when updating non-draft item', () => {
      const bodyTabs = [{ id: 1, name: 'Draft Tab', bodyType: 'json', bodyContent: '{}' }];

      // Ensure item has no draft initially
      expect(store.getState().collections.collections[0].items[0].draft).toBeUndefined();

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const item = state.collections.collections[0].items[0];

      expect(item.draft).toBeDefined();
      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
      expect(item.request.body.bodyTabs).toBeUndefined(); // Original unchanged
    });
  });

  describe('Legacy format compatibility', () => {
    it('should work with old format without bodyTabs', () => {
      const state = store.getState();
      const item = state.collections.collections[0].items[0];

      // Old format should have json content but no bodyTabs
      expect(item.request.body.json).toBe('{"test": "data"}');
      expect(item.request.body.bodyTabs).toBeUndefined();
    });

    it('should handle new format with existing bodyTabs', () => {
      const itemWithTabs = {
        uid: 'item-2',
        name: 'Item with Tabs',
        type: 'http-request',
        request: {
          method: 'POST',
          body: {
            mode: 'json',
            bodyTabs: [{ id: 1, name: 'Existing Tab', bodyType: 'json', bodyContent: '{"existing": true}' }],
          },
        },
      };

      const initialState = {
        collections: [{ ...mockCollection, items: [itemWithTabs] }],
      };

      const storeWithTabs = configureStore({
        reducer: { collections: collectionsReducer },
        preloadedState: { collections: initialState },
      });

      const state = storeWithTabs.getState();
      const item = state.collections.collections[0].items[0];

      expect(item.request.body.bodyTabs).toHaveLength(1);
      expect(item.request.body.bodyTabs[0].name).toBe('Existing Tab');
    });
  });

  describe('Error scenarios', () => {
    it('should handle invalid collection UID', () => {
      const bodyTabs = [{ id: 1, name: 'Test', bodyType: 'json', bodyContent: '{}' }];

      expect(() => {
        store.dispatch(updateRequestBodyTabs({
          itemUid: mockItem.uid,
          collectionUid: 'invalid-uid',
          bodyTabs,
        }));
      }).not.toThrow();

      // Original state should be unchanged
      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      expect(item.draft).toBeUndefined();
    });

    it('should handle invalid item UID', () => {
      const bodyTabs = [{ id: 1, name: 'Test', bodyType: 'json', bodyContent: '{}' }];

      expect(() => {
        store.dispatch(updateRequestBodyTabs({
          itemUid: 'invalid-uid',
          collectionUid: mockCollection.uid,
          bodyTabs,
        }));
      }).not.toThrow();

      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      expect(item.draft).toBeUndefined();
    });

    it('should handle empty bodyTabs array', () => {
      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs: [],
      }));

      const state = store.getState();
      const item = state.collections.collections[0].items[0];
      expect(item.draft.request.body.bodyTabs).toEqual([]);
    });
  });
});
