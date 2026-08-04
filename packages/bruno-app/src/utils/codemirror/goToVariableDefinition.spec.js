import store from 'providers/ReduxStore';
import { addTab, focusTab, updateRequestPaneTab, updateTabState } from 'providers/ReduxStore/slices/tabs';
import { openCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { goToVariableDefinition } from './goToVariableDefinition';

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn()
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

  it('does not dispatch updateTabState for a plain (non-secret) environment variable', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: false } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(addTab).toHaveBeenCalledWith(expect.objectContaining({ uid: 'col-1-environment-settings', type: 'environment-settings' }));
    expect(updateTabState).not.toHaveBeenCalled();
  });

  it('selects the Secrets sub-tab for a secret environment variable', () => {
    const scopeInfo = { type: 'environment', data: { variable: { name: 'apiKey', secret: true } } };

    goToVariableDefinition(scopeInfo, collection, null, 'apiKey');

    expect(updateTabState).toHaveBeenCalledWith({
      uid: 'col-1-environment-settings',
      tabState: { environment: { tab: 'secrets' } }
    });
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
});
