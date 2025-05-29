const { describe, it, expect, beforeEach } = require('@jest/globals');
import tabsReducer, { addTab, closeTabs, reopenLastClosedTab, focusTab, switchTab, makeTabPermanent } from './tabs';

describe('tabs slice', () => {
  let initialState;

  beforeEach(() => {
    initialState = {
      tabs: [],
      activeTabUid: null,
      recentlyClosedTabs: []
    };
  });

  describe('reopenLastClosedTab', () => {
    it('should reopen the most recently closed tab', () => {
      // Setup: Create a state with some closed tabs
      const stateWithClosedTabs = {
        tabs: [
          {
            uid: 'tab-2',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ],
        activeTabUid: 'tab-2',
        recentlyClosedTabs: [
          {
            uid: 'tab-1',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          },
          {
            uid: 'tab-3',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'headers',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ]
      };

      const action = reopenLastClosedTab();
      const newState = tabsReducer(stateWithClosedTabs, action);

      // Should add the most recently closed tab back to tabs
      expect(newState.tabs).toHaveLength(2);
      expect(newState.tabs[1]).toEqual({
        uid: 'tab-1',
        collectionUid: 'collection-1',
        requestPaneWidth: null,
        requestPaneTab: 'params',
        responsePaneTab: 'response',
        type: 'request',
        preview: false
      });

      // Should set the reopened tab as active
      expect(newState.activeTabUid).toBe('tab-1');

      // Should remove the tab from recentlyClosedTabs
      expect(newState.recentlyClosedTabs).toHaveLength(1);
      expect(newState.recentlyClosedTabs[0].uid).toBe('tab-3');
    });

    it('should do nothing when there are no recently closed tabs', () => {
      const stateWithNoClosedTabs = {
        tabs: [
          {
            uid: 'tab-1',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ],
        activeTabUid: 'tab-1',
        recentlyClosedTabs: []
      };

      const action = reopenLastClosedTab();
      const newState = tabsReducer(stateWithNoClosedTabs, action);

      // State should remain unchanged
      expect(newState).toEqual(stateWithNoClosedTabs);
    });

    it('should not duplicate tabs if the tab already exists', () => {
      const stateWithExistingTab = {
        tabs: [
          {
            uid: 'tab-1',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ],
        activeTabUid: 'tab-1',
        recentlyClosedTabs: [
          {
            uid: 'tab-1', // Same tab that's already open
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ]
      };

      const action = reopenLastClosedTab();
      const newState = tabsReducer(stateWithExistingTab, action);

      // Should not add duplicate tab
      expect(newState.tabs).toHaveLength(1);
      expect(newState.tabs[0].uid).toBe('tab-1');

      // Should still set as active tab
      expect(newState.activeTabUid).toBe('tab-1');

      // Should remove from recentlyClosedTabs
      expect(newState.recentlyClosedTabs).toHaveLength(0);
    });

    it('should handle empty recentlyClosedTabs array gracefully', () => {
      const stateWithEmptyClosedTabs = {
        tabs: [],
        activeTabUid: null,
        recentlyClosedTabs: []
      };

      const action = reopenLastClosedTab();
      const newState = tabsReducer(stateWithEmptyClosedTabs, action);

      expect(newState).toEqual(stateWithEmptyClosedTabs);
    });
  });

  describe('closeTabs integration with reopenLastClosedTab', () => {
    it('should store closed tabs in recentlyClosedTabs and allow reopening', () => {
      // Start with multiple tabs
      let state = {
        tabs: [
          {
            uid: 'tab-1',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          },
          {
            uid: 'tab-2',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'headers',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          },
          {
            uid: 'tab-3',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'body',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ],
        activeTabUid: 'tab-2',
        recentlyClosedTabs: []
      };

      // Close tab-1
      const closeAction = closeTabs({ tabUids: ['tab-1'] });
      state = tabsReducer(state, closeAction);

      // Verify tab was closed and stored
      expect(state.tabs).toHaveLength(2);
      expect(state.recentlyClosedTabs).toHaveLength(1);
      expect(state.recentlyClosedTabs[0].uid).toBe('tab-1');

      // Reopen the closed tab
      const reopenAction = reopenLastClosedTab();
      state = tabsReducer(state, reopenAction);

      // Verify tab was reopened
      expect(state.tabs).toHaveLength(3);
      expect(state.activeTabUid).toBe('tab-1');
      expect(state.recentlyClosedTabs).toHaveLength(0);
    });

    it('should maintain maximum of 10 recently closed tabs', () => {
      // Create state with 10 recently closed tabs
      const recentlyClosedTabs = Array.from({ length: 10 }, (_, i) => ({
        uid: `old-tab-${i}`,
        collectionUid: 'collection-1',
        requestPaneWidth: null,
        requestPaneTab: 'params',
        responsePaneTab: 'response',
        type: 'request',
        preview: false
      }));

      let state = {
        tabs: [
          {
            uid: 'new-tab',
            collectionUid: 'collection-1',
            requestPaneWidth: null,
            requestPaneTab: 'params',
            responsePaneTab: 'response',
            type: 'request',
            preview: false
          }
        ],
        activeTabUid: 'new-tab',
        recentlyClosedTabs
      };

      // Close the new tab (should push out the oldest closed tab)
      const closeAction = closeTabs({ tabUids: ['new-tab'] });
      state = tabsReducer(state, closeAction);

      // Should still have only 10 recently closed tabs
      expect(state.recentlyClosedTabs).toHaveLength(10);
      // The newest closed tab should be first
      expect(state.recentlyClosedTabs[0].uid).toBe('new-tab');
      // The oldest tab should be removed
      expect(state.recentlyClosedTabs.find((tab) => tab.uid === 'old-tab-9')).toBeUndefined();
    });
  });

  describe('basic tab operations', () => {
    it('should add a new tab', () => {
      const action = addTab({
        uid: 'tab-1',
        collectionUid: 'collection-1',
        type: 'request'
      });
      const newState = tabsReducer(initialState, action);

      expect(newState.tabs).toHaveLength(1);
      expect(newState.tabs[0]).toMatchObject({
        uid: 'tab-1',
        collectionUid: 'collection-1',
        type: 'request'
      });
      expect(newState.activeTabUid).toBe('tab-1');
    });

    it('should focus an existing tab', () => {
      const stateWithTabs = {
        tabs: [
          { uid: 'tab-1', collectionUid: 'collection-1' },
          { uid: 'tab-2', collectionUid: 'collection-1' }
        ],
        activeTabUid: 'tab-1',
        recentlyClosedTabs: []
      };

      const action = focusTab({ uid: 'tab-2' });
      const newState = tabsReducer(stateWithTabs, action);

      expect(newState.activeTabUid).toBe('tab-2');
    });

    it('should switch to next tab', () => {
      const stateWithTabs = {
        tabs: [
          { uid: 'tab-1', collectionUid: 'collection-1' },
          { uid: 'tab-2', collectionUid: 'collection-1' },
          { uid: 'tab-3', collectionUid: 'collection-1' }
        ],
        activeTabUid: 'tab-1',
        recentlyClosedTabs: []
      };

      const action = switchTab({ direction: 'pagedown' });
      const newState = tabsReducer(stateWithTabs, action);

      expect(newState.activeTabUid).toBe('tab-2');
    });

    it('should switch to previous tab', () => {
      const stateWithTabs = {
        tabs: [
          { uid: 'tab-1', collectionUid: 'collection-1' },
          { uid: 'tab-2', collectionUid: 'collection-1' },
          { uid: 'tab-3', collectionUid: 'collection-1' }
        ],
        activeTabUid: 'tab-2',
        recentlyClosedTabs: []
      };

      const action = switchTab({ direction: 'pageup' });
      const newState = tabsReducer(stateWithTabs, action);

      expect(newState.activeTabUid).toBe('tab-1');
    });

    it('should make tab permanent', () => {
      const stateWithPreviewTab = {
        tabs: [
          {
            uid: 'tab-1',
            collectionUid: 'collection-1',
            preview: true
          }
        ],
        activeTabUid: 'tab-1',
        recentlyClosedTabs: []
      };

      const action = makeTabPermanent({ uid: 'tab-1' });
      const newState = tabsReducer(stateWithPreviewTab, action);

      expect(newState.tabs[0].preview).toBe(false);
    });
  });
});
