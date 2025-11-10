import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, {
  updateRequestBody,
  updateRequestBodyMode,
  updateRequestBodyTabs,
} from 'providers/ReduxStore/slices/collections';

describe('Tabbed Body Editor Integration Tests', () => {
  let store;

  const mockCollection = {
    uid: 'collection-1',
    name: 'Test Collection',
  };

  const mockItem = {
    uid: 'item-1',
    name: 'Test Request',
    type: 'http-request',
    request: {
      method: 'POST',
      body: {
        mode: 'json',
        json: '{"test": "data"}',
      },
    },
  };

  beforeEach(() => {
    const initialState = {
      collections: [
        {
          ...mockCollection,
          items: [mockItem],
        },
      ],
    };

    store = configureStore({
      reducer: { collections: collectionsReducer },
      preloadedState: { collections: initialState },
    });
  });

  describe('Body Tabs State Management', () => {
    it('should initialize with empty bodyTabs when none exist', () => {
      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.request.body.bodyTabs).toBeUndefined();
    });

    it('should update bodyTabs array', () => {
      const bodyTabs = [
        { id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{"tab1": "content"}' },
        { id: 2, name: 'Tab 2', bodyType: 'xml', bodyContent: '<xml>content</xml>' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
    });

    it('should preserve existing body mode when updating tabs', () => {
      store.dispatch(updateRequestBodyMode({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        mode: 'xml',
      }));

      const bodyTabs = [{ id: 1, name: 'Tab 1', bodyType: 'xml', bodyContent: '<xml>test</xml>' }];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.draft.request.body.mode).toBe('xml');
      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
    });

    it('should create draft when updating bodyTabs on non-draft item', () => {
      const bodyTabs = [{ id: 1, name: 'Draft Tab', bodyType: 'json', bodyContent: '{"draft": true}' }];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.draft).toBeDefined();
      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
      // Original item should remain unchanged
      expect(item.request.body.bodyTabs).toBeUndefined();
    });
  });

  describe('Request Body Content Sync', () => {
    it('should sync active tab content to main body content', () => {
      const bodyTabs = [
        { id: 1, name: 'Tab 1', bodyType: 'json', bodyContent: '{"active": "tab"}' },
        { id: 2, name: 'Tab 2', bodyType: 'json', bodyContent: '{"inactive": "tab"}' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      // Simulate updating main body content (what happens when active tab changes)
      store.dispatch(updateRequestBody({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        content: '{"active": "tab"}',
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.draft.request.body.json).toBe('{"active": "tab"}');
    });

    it('should handle different body modes correctly', () => {
      // Test XML mode
      store.dispatch(updateRequestBodyMode({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        mode: 'xml',
      }));

      store.dispatch(updateRequestBody({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        content: '<xml>test</xml>',
      }));

      let state = store.getState();
      let collection = state.collections.collections[0];
      let item = collection.items[0];

      expect(item.draft.request.body.mode).toBe('xml');
      expect(item.draft.request.body.xml).toBe('<xml>test</xml>');

      // Test switching to JSON mode
      store.dispatch(updateRequestBodyMode({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        mode: 'json',
      }));

      store.dispatch(updateRequestBody({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        content: '{"switched": "to json"}',
      }));

      state = store.getState();
      collection = state.collections.collections[0];
      item = collection.items[0];

      expect(item.draft.request.body.mode).toBe('json');
      expect(item.draft.request.body.json).toBe('{"switched": "to json"}');
    });
  });

  describe('Collection Persistence Scenarios', () => {
    it('should handle legacy format migration', () => {
      // Simulate loading a collection with old format (no bodyTabs)
      const legacyItem = {
        uid: 'legacy-item',
        name: 'Legacy Request',
        type: 'http-request',
        request: {
          method: 'POST',
          body: {
            mode: 'json',
            json: '{"legacy": "format"}',
            // No bodyTabs property
          },
        },
      };

      const initialState = {
        collections: [
          {
            ...mockCollection,
            items: [legacyItem],
          },
        ],
      };

      const legacyStore = configureStore({
        reducer: { collections: collectionsReducer },
        preloadedState: { collections: initialState },
      });

      let state = legacyStore.getState();
      let collection = state.collections.collections[0];
      let item = collection.items[0];

      // Legacy format should work without bodyTabs
      expect(item.request.body.json).toBe('{"legacy": "format"}');
      expect(item.request.body.bodyTabs).toBeUndefined();

      // When we add bodyTabs, it should work alongside legacy format
      const bodyTabs = [{ id: 1, name: 'Migrated Tab', bodyType: 'json', bodyContent: '{"migrated": true}' }];

      legacyStore.dispatch(updateRequestBodyTabs({
        itemUid: legacyItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      state = legacyStore.getState();
      collection = state.collections.collections[0];
      item = collection.items[0];

      expect(item.draft.request.body.bodyTabs).toEqual(bodyTabs);
      // Original legacy format should still exist
      expect(item.request.body.json).toBe('{"legacy": "format"}');
    });

    it('should handle new format with bodyTabs', () => {
      const newFormatItem = {
        uid: 'new-item',
        name: 'New Format Request',
        type: 'http-request',
        request: {
          method: 'POST',
          body: {
            mode: 'json',
            json: '{"fallback": "content"}',
            bodyTabs: [
              { id: 1, name: 'Primary Tab', bodyType: 'json', bodyContent: '{"primary": "content"}' },
              { id: 2, name: 'Secondary Tab', bodyType: 'xml', bodyContent: '<secondary>content</secondary>' },
            ],
          },
        },
      };

      const initialState = {
        collections: [
          {
            ...mockCollection,
            items: [newFormatItem],
          },
        ],
      };

      const newFormatStore = configureStore({
        reducer: { collections: collectionsReducer },
        preloadedState: { collections: initialState },
      });

      const state = newFormatStore.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.request.body.bodyTabs).toHaveLength(2);
      expect(item.request.body.bodyTabs[0].name).toBe('Primary Tab');
      expect(item.request.body.bodyTabs[1].bodyType).toBe('xml');
    });

    it('should preserve tab order and IDs', () => {
      const bodyTabs = [
        { id: 5, name: 'Tab Five', bodyType: 'json', bodyContent: '{"order": 1}' },
        { id: 2, name: 'Tab Two', bodyType: 'xml', bodyContent: '<order>2</order>' },
        { id: 8, name: 'Tab Eight', bodyType: 'text', bodyContent: 'order 3' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      const savedTabs = item.draft.request.body.bodyTabs;
      expect(savedTabs[0].id).toBe(5);
      expect(savedTabs[1].id).toBe(2);
      expect(savedTabs[2].id).toBe(8);
      expect(savedTabs).toEqual(bodyTabs);
    });
  });

  describe('Request Execution with Tabs', () => {
    it('should use active tab content for request execution', () => {
      const bodyTabs = [
        { id: 1, name: 'Development', bodyType: 'json', bodyContent: '{"env": "dev"}' },
        { id: 2, name: 'Production', bodyType: 'json', bodyContent: '{"env": "prod"}' },
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      // Simulate setting active tab content as main body content
      store.dispatch(updateRequestBody({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        content: '{"env": "prod"}', // Production tab is active
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      // The main body content should reflect the active tab
      expect(item.draft.request.body.json).toBe('{"env": "prod"}');
      // But all tabs should still be preserved
      expect(item.draft.request.body.bodyTabs).toHaveLength(2);
    });

    it('should handle empty tab content gracefully', () => {
      const bodyTabs = [
        { id: 1, name: 'Empty Tab', bodyType: 'json', bodyContent: '' },
        { id: 2, name: 'Null Content', bodyType: 'json', bodyContent: null },
        { id: 3, name: 'Undefined Content', bodyType: 'json' }, // No bodyContent property
      ];

      store.dispatch(updateRequestBodyTabs({
        itemUid: mockItem.uid,
        collectionUid: mockCollection.uid,
        bodyTabs,
      }));

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      expect(item.draft.request.body.bodyTabs).toHaveLength(3);
      expect(item.draft.request.body.bodyTabs[0].bodyContent).toBe('');
      expect(item.draft.request.body.bodyTabs[1].bodyContent).toBe(null);
      expect(item.draft.request.body.bodyTabs[2].bodyContent).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid collection UID gracefully', () => {
      const bodyTabs = [{ id: 1, name: 'Test Tab', bodyType: 'json', bodyContent: '{}' }];

      expect(() => {
        store.dispatch(updateRequestBodyTabs({
          itemUid: mockItem.uid,
          collectionUid: 'invalid-collection-uid',
          bodyTabs,
        }));
      }).not.toThrow();

      // State should remain unchanged
      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];
      expect(item.draft).toBeUndefined();
    });

    it('should handle invalid item UID gracefully', () => {
      const bodyTabs = [{ id: 1, name: 'Test Tab', bodyType: 'json', bodyContent: '{}' }];

      expect(() => {
        store.dispatch(updateRequestBodyTabs({
          itemUid: 'invalid-item-uid',
          collectionUid: mockCollection.uid,
          bodyTabs,
        }));
      }).not.toThrow();

      // State should remain unchanged
      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];
      expect(item.draft).toBeUndefined();
    });

    it('should handle malformed bodyTabs array', () => {
      const malformedTabs = [
        { name: 'No ID Tab', bodyType: 'json', bodyContent: '{}' }, // Missing id
        { id: 'string-id', name: 'String ID', bodyType: 'json', bodyContent: '{}' }, // String ID
        { id: 3, bodyType: 'json', bodyContent: '{}' }, // Missing name
        { id: 4, name: 'Invalid Type', bodyType: 'invalid', bodyContent: '{}' }, // Invalid bodyType
      ];

      expect(() => {
        store.dispatch(updateRequestBodyTabs({
          itemUid: mockItem.uid,
          collectionUid: mockCollection.uid,
          bodyTabs: malformedTabs,
        }));
      }).not.toThrow();

      const state = store.getState();
      const collection = state.collections.collections[0];
      const item = collection.items[0];

      // Should still save the tabs as-is for flexibility
      expect(item.draft.request.body.bodyTabs).toEqual(malformedTabs);
    });
  });
});
