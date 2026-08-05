import store from 'providers/ReduxStore';
import { addTab, focusTab, updateRequestPaneTab, updateTabState } from 'providers/ReduxStore/slices/tabs';
import { openCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { goToVariableDefinition } from './goToVariableDefinition';

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ globalEnvironments: { activeGlobalEnvironmentUid: undefined } }))
  }
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  addTab: jest.fn((payload) => ({ type: 'tabs/addTab', payload })),
  focusTab: jest.fn((payload) => ({ type: 'tabs/focusTab', payload })),
  updateRequestPaneTab: jest.fn((payload) => ({ type: 'tabs/updateRequestPaneTab', payload })),
  updateTabState: jest.fn((payload) => ({ type: 'tabs/updateTabState', payload }))
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  openCollectionSettings: jest.fn((collectionUid, tab) => ({ type: 'collections/openCollectionSettings', payload: { collectionUid, tab } }))
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  updatedFolderSettingsSelectedTab: jest.fn((payload) => ({ type: 'collections/updatedFolderSettingsSelectedTab', payload }))
}));

describe('goToVariableDefinition', () => {
  const collection = { uid: 'col-1' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when scopeInfo, collection, or variableName is missing', () => {
    goToVariableDefinition(null, collection, null, 'apiKey');
    goToVariableDefinition({ type: 'collection' }, null, null, 'apiKey');
    goToVariableDefinition({ type: 'collection' }, collection, null, '');

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('opens the target request on its Variables tab for a request-scoped variable', () => {
    const targetItem = { uid: 'req-target', type: 'http-request', pathname: '/target.bru' };
    const scopeInfo = { type: 'request', data: { item: targetItem } };

    goToVariableDefinition(scopeInfo, collection, { uid: 'req-current' }, 'apiKey');

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'req-target', requestPaneTab: 'vars' }));
    expect(updateRequestPaneTab).toHaveBeenCalledWith({ uid: 'req-target', requestPaneTab: 'vars' });
    expect(focusTab).toHaveBeenCalledWith({ uid: 'req-target' });
  });

  it('opens folder settings on its Variables tab for a folder-scoped variable', () => {
    const folder = { uid: 'folder-1', pathname: '/folder' };
    const scopeInfo = { type: 'folder', data: { folder } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(updatedFolderSettingsSelectedTab).toHaveBeenCalledWith({ collectionUid: 'col-1', folderUid: 'folder-1', tab: 'vars' });
    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'folder-1', type: 'folder-settings' }));
  });

  it('opens collection settings on the Variables tab for a collection-scoped variable', () => {
    goToVariableDefinition({ type: 'collection', data: {} }, collection, null, 'apiKey');

    expect(openCollectionSettings).toHaveBeenCalledWith('col-1', 'vars');
  });

  it('selects the Variables sub-tab for a plain (non-secret) environment variable', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: false } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'col-1-environment-settings', type: 'environment-settings' }));
    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-environment-settings',
      tabState: { environment: { tab: 'variables' } }
    });
  });

  it('selects the Secrets sub-tab for a secret environment variable', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-environment-settings',
      tabState: { environment: { tab: 'secrets' } }
    });
  });

  it('pins the tab to the environment the variable actually lives in, overriding any stale selection', () => {
    const environment = { uid: 'env-prod', name: 'Prod' };
    const scopeInfo = { type: 'environment', data: { environment, variable: { name: 'apiKey', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-environment-settings',
      tabState: { envUid: 'env-prod', environment: { tab: 'secrets' } }
    });
  });

  it('does not set envUid when scopeInfo has no environment data', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    const [{ tabState }] = updateTabState.mock.calls[0];
    expect(tabState).not.toHaveProperty('envUid');
  });

  it('dispatches updateTabState after addTab so the tab already exists when it runs', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    const dispatchCalls = store.dispatch.mock.calls.map(([action]) => action.type);
    const addTabIndex = dispatchCalls.indexOf('tabs/addTab');
    const updateTabStateIndex = dispatchCalls.indexOf('tabs/updateTabState');

    expect(addTabIndex).toBeGreaterThanOrEqual(0);
    expect(updateTabStateIndex).toBeGreaterThan(addTabIndex);
  });

  it('selects the correct sub-tab for a global-scoped secret variable', () => {
    const scopeInfo = { type: 'global', data: { variable: { name: 'apiToken', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiToken');

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'col-1-global-environment-settings', type: 'global-environment-settings' }));
    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-global-environment-settings',
      tabState: { environment: { tab: 'secrets' } }
    });
  });

  it('pins the tab to the active global environment, overriding any stale selection', () => {
    store.getState.mockReturnValueOnce({ globalEnvironments: { activeGlobalEnvironmentUid: 'genv-1' } });
    const scopeInfo = { type: 'global', data: { variable: { name: 'apiToken', secret: false } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiToken');

    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-global-environment-settings',
      tabState: { envUid: 'genv-1', environment: { tab: 'variables' } }
    });
  });

  it('reuses the already-active Global Environment Settings tab instead of minting a new one from a collection-less context', () => {
    // Simulates clicking go-to-definition from inside the Global Environment table itself,
    // where `collection` is a synthetic `{}` with no uid.
    const syntheticCollection = {};
    store.getState.mockReturnValueOnce({
      globalEnvironments: { activeGlobalEnvironmentUid: undefined },
      tabs: {
        activeTabUid: 'col-1-global-environment-settings',
        tabs: [
          { uid: 'col-1-global-environment-settings', collectionUid: 'col-1', type: 'global-environment-settings' }
        ]
      }
    });
    const scopeInfo = { type: 'global', data: { variable: { name: 'apiToken', secret: true } } };

    goToVariableDefinition(scopeInfo, syntheticCollection, null, 'apiToken');

    // Reuses the, already-open global tab uid
    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'col-1-global-environment-settings',
      collectionUid: 'col-1',
      type: 'global-environment-settings'
    }));
    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-global-environment-settings',
      tabState: { environment: { tab: 'secrets' } }
    });
  });

  it('finds an already-open Global tab even when it is not the currently active tab', () => {
    const syntheticCollection = {};
    store.getState.mockReturnValueOnce({
      globalEnvironments: { activeGlobalEnvironmentUid: undefined },
      tabs: {
        activeTabUid: 'req-current',
        tabs: [
          { uid: 'req-current', collectionUid: 'col-1', type: 'http-request' },
          { uid: 'col-1-global-environment-settings', collectionUid: 'col-1', type: 'global-environment-settings' }
        ]
      }
    });
    const scopeInfo = { type: 'global', data: { variable: { name: 'apiToken', secret: false } } };

    goToVariableDefinition(scopeInfo, syntheticCollection, null, 'apiToken');

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'col-1-global-environment-settings' }));
  });
});
