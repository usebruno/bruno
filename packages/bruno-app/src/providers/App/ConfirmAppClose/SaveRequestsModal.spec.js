import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { saveApiSpecToFile, clearApiSpecDraft } from 'providers/ReduxStore/slices/apiSpec';
import SaveRequestsModal from './SaveRequestsModal';

const theme = {
  border: { border0: '#ccc', radius: { base: '4px' } },
  modal: { title: { color: '#000' } },
  font: { size: { xs: '12px' } },
  request: { methods: { get: 'green' } }
};

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  saveApiSpecToFile: jest.fn(() => () => Promise.resolve()),
  clearApiSpecDraft: jest.fn(() => ({ type: 'test/clearApiSpecDraft' }))
}));

jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);

jest.mock('ui/Button', () => ({
  __esModule: true,
  default: ({ children, onClick }) => <button onClick={onClick}>{children}</button>
}));

const SCRATCH_UID = 'scratch-collection';
const SPEC_PATHNAME = '/workspace/petstore.yaml';

const specTab = (pathname) => ({
  uid: `api-spec::${SCRATCH_UID}::${pathname}`,
  collectionUid: SCRATCH_UID,
  type: 'api-spec',
  apiSpecPathname: pathname
});

beforeEach(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  saveApiSpecToFile.mockImplementation(() => () => Promise.resolve());
});

const renderModal = ({ apiSpecs = [], tabs = [], collections = [], globalEnvironments = [], globalEnvironmentDraft = null, forceCloseTabs = false, tabUidsToClose = [] } = {}) => {
  const onClose = jest.fn();
  const dispatched = [];
  const recordActions = () => (next) => (action) => {
    if (typeof action !== 'function') dispatched.push(action);
    return next(action);
  };
  const store = configureStore({
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(recordActions),
    reducer: {
      collections: (state = {}) => state,
      tabs: (state = {}) => state,
      apiSpec: (state = {}) => state,
      globalEnvironments: (state = {}) => state
    },
    preloadedState: {
      collections: { collections },
      tabs: { tabs },
      apiSpec: { apiSpecs },
      globalEnvironments: { globalEnvironments, globalEnvironmentDraft }
    }
  });

  return {
    onClose,
    dispatched,
    ...render(
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <SaveRequestsModal onClose={onClose} forceCloseTabs={forceCloseTabs} tabUidsToClose={tabUidsToClose} />
        </Provider>
      </ThemeProvider>
    )
  };
};

describe('the unsaved changes dialog shown while quitting', () => {
  it('lists an API spec that has edits the user has not saved', () => {
    renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [specTab(SPEC_PATHNAME)]
    });

    expect(screen.getByText('API Spec: Petstore')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('leaves out an API spec whose editor content matches what is on disk', () => {
    const { container } = renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.0.0' }],
      tabs: [specTab(SPEC_PATHNAME)]
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out an API spec that was never edited', () => {
    const { container } = renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0' }],
      tabs: [specTab(SPEC_PATHNAME)]
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('counts a spec open in two workspaces only once', () => {
    renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [
        specTab(SPEC_PATHNAME),
        { ...specTab(SPEC_PATHNAME), uid: 'api-spec::other-scratch::' + SPEC_PATHNAME, collectionUid: 'other-scratch' }
      ]
    });

    expect(screen.getAllByText('API Spec: Petstore')).toHaveLength(1);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('lists unsaved items in the order their tabs are open', () => {
    const item = { uid: 'r1', name: 'Users', type: 'http-request', pathname: '/c1/Users.yml', request: { method: 'GET', url: 'http://a' }, draft: { request: { method: 'GET', url: 'http://b' } } };
    renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', draft: { name: 'My Collection' }, items: [item] }],
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [specTab(SPEC_PATHNAME), { uid: 'r1', collectionUid: 'c1', type: 'request' }, { uid: 'c1', collectionUid: 'c1', type: 'collection-settings' }]
    });

    const entries = screen.getAllByRole('listitem').map((node) => node.querySelector('.truncate').textContent);
    expect(entries).toEqual(['API Spec: Petstore', 'Request: Users', 'Collection: My Collection']);
  });

  it('names every spec it could not save in one message and stays open', async () => {
    saveApiSpecToFile.mockImplementation(() => () => Promise.reject(new Error('EACCES')));

    const rendered = renderModal({
      apiSpecs: [
        { uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'a', draft: 'b' },
        { uid: 'spec-2', name: 'Orders', pathname: '/workspace/orders.yaml', raw: 'a', draft: 'b' }
      ],
      tabs: [specTab(SPEC_PATHNAME), specTab('/workspace/orders.yaml')]
    });

    const { onClose } = rendered;
    fireEvent.click(screen.getByText('Save All'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('Failed to save API specs: Petstore, Orders');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('main:complete-quit-flow');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('saves the specs that can be written even when one of them fails', async () => {
    saveApiSpecToFile.mockImplementation(({ uid }) => () =>
      uid === 'spec-1' ? Promise.reject(new Error('EACCES')) : Promise.resolve()
    );

    renderModal({
      apiSpecs: [
        { uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'a', draft: 'b' },
        { uid: 'spec-2', name: 'Orders', pathname: '/workspace/orders.yaml', raw: 'a', draft: 'b' }
      ],
      tabs: [specTab(SPEC_PATHNAME), specTab('/workspace/orders.yaml')]
    });

    fireEvent.click(screen.getByText('Save All'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('Failed to save API spec: Petstore');
    expect(saveApiSpecToFile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'spec-2' }));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith('main:complete-quit-flow');
  });

  it('discards the spec draft when the user closes tabs without saving', async () => {
    const tab = specTab(SPEC_PATHNAME);
    const { onClose } = renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [tab],
      forceCloseTabs: true,
      tabUidsToClose: [tab.uid]
    });

    fireEvent.click(screen.getByText('Don\'t Save'));

    await waitFor(() => expect(clearApiSpecDraft).toHaveBeenCalledWith({ uid: 'spec-1' }));
    expect(saveApiSpecToFile).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the spec draft when another workspace still has the same spec open', async () => {
    const tab = specTab(SPEC_PATHNAME);
    const otherWorkspaceTab = { ...tab, uid: 'api-spec::other-scratch::' + SPEC_PATHNAME, collectionUid: 'other-scratch' };
    const { onClose } = renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [tab, otherWorkspaceTab],
      forceCloseTabs: true,
      tabUidsToClose: [tab.uid]
    });

    fireEvent.click(screen.getByText('Don\'t Save'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(clearApiSpecDraft).not.toHaveBeenCalled();
  });

  it('discards the spec draft once the last tab showing it is closed', async () => {
    const tab = specTab(SPEC_PATHNAME);
    const otherWorkspaceTab = { ...tab, uid: 'api-spec::other-scratch::' + SPEC_PATHNAME, collectionUid: 'other-scratch' };
    renderModal({
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [tab, otherWorkspaceTab],
      forceCloseTabs: true,
      tabUidsToClose: [tab.uid, otherWorkspaceTab.uid]
    });

    fireEvent.click(screen.getByText('Don\'t Save'));

    await waitFor(() => expect(clearApiSpecDraft).toHaveBeenCalledWith({ uid: 'spec-1' }));
  });
});

describe('the unsaved changes dialog shown while closing a set of tabs', () => {
  const request = (uid, name, { edited = true } = {}) => {
    const item = { uid, name, type: 'http-request', pathname: `/c1/${name}.yml`, request: { method: 'GET', url: 'http://a' } };
    return edited ? { ...item, draft: { ...item, request: { method: 'GET', url: 'http://b' } } } : item;
  };
  const requestTab = (uid) => ({ uid, collectionUid: 'c1', type: 'request' });

  it('lists only the drafts held by the tabs being closed', () => {
    renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', items: [request('r1', 'Users'), request('r2', 'Orders')] }],
      tabs: [requestTab('r1'), requestTab('r2')],
      forceCloseTabs: true,
      tabUidsToClose: ['r1']
    });

    expect(screen.getByText('Request: Users')).toBeInTheDocument();
    expect(screen.queryByText('Request: Orders')).not.toBeInTheDocument();
  });

  it('discards and closes only the tabs in range when the user does not save', async () => {
    const { dispatched, onClose } = renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', items: [request('r1', 'Users'), request('r2', 'Orders')] }],
      tabs: [requestTab('r1'), requestTab('r2')],
      forceCloseTabs: true,
      tabUidsToClose: ['r1']
    });

    fireEvent.click(screen.getByText('Don\'t Save'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const draftDeletes = dispatched.filter((a) => a.type === 'collections/deleteRequestDraft');
    expect(draftDeletes.map((a) => a.payload.itemUid)).toEqual(['r1']);
    const tabCloses = dispatched.filter((a) => a.type === 'tabs/closeTabs');
    expect(tabCloses).toHaveLength(1);
    expect(tabCloses[0].payload.tabUids).toEqual(['r1']);
  });

  it('closes immediately when no tab in range has unsaved changes', async () => {
    const { container, dispatched, onClose } = renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', items: [request('r1', 'Users'), request('r2', 'Orders', { edited: false })] }],
      tabs: [requestTab('r1'), requestTab('r2')],
      forceCloseTabs: true,
      tabUidsToClose: ['r2']
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(dispatched.filter((a) => a.type === 'tabs/closeTabs')[0].payload.tabUids).toEqual(['r2']);
  });

  it('lists collection and folder drafts only when their settings tabs are in range', () => {
    const folder = { uid: 'f1', name: 'Admin', type: 'folder', items: [], draft: { name: 'Admin' } };
    const collections = [{ uid: 'c1', name: 'My Collection', draft: { name: 'My Collection' }, items: [folder] }];
    const tabs = [
      { uid: 'c1', collectionUid: 'c1', type: 'collection-settings' },
      { uid: 'f1', collectionUid: 'c1', type: 'folder-settings' }
    ];

    const { unmount } = renderModal({ collections, tabs, forceCloseTabs: true, tabUidsToClose: ['f1'] });
    expect(screen.getByText('Folder: Admin')).toBeInTheDocument();
    expect(screen.queryByText('Collection: My Collection')).not.toBeInTheDocument();
    unmount();

    renderModal({ collections, tabs, forceCloseTabs: true, tabUidsToClose: ['c1', 'f1'] });
    expect(screen.getByText('Collection: My Collection')).toBeInTheDocument();
    expect(screen.getByText('Folder: Admin')).toBeInTheDocument();
  });

  it('lists the global environment draft only when its tab is in range', () => {
    const globalEnvironments = [{ uid: 'g1', name: 'Prod', variables: [] }];
    const globalEnvironmentDraft = { environmentUid: 'g1', variables: [{ name: 'host', value: 'x' }] };
    const tabs = [requestTab('r1'), { uid: 'ge', collectionUid: null, type: 'global-environment-settings' }];
    const collections = [{ uid: 'c1', name: 'My Collection', items: [request('r1', 'Users')] }];

    const { unmount } = renderModal({ collections, tabs, globalEnvironments, globalEnvironmentDraft, forceCloseTabs: true, tabUidsToClose: ['r1'] });
    expect(screen.queryByText('Global Environment: Prod')).not.toBeInTheDocument();
    unmount();

    renderModal({ collections, tabs, globalEnvironments, globalEnvironmentDraft, forceCloseTabs: true, tabUidsToClose: ['r1', 'ge'] });
    expect(screen.getByText('Global Environment: Prod')).toBeInTheDocument();
  });

  it('focuses the tab and closes the dialog when an item is opened from the list', () => {
    const { dispatched, onClose } = renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', items: [request('r1', 'Users')] }],
      tabs: [requestTab('r1')],
      forceCloseTabs: true,
      tabUidsToClose: ['r1']
    });

    fireEvent.click(screen.getByLabelText('Inspect tab'));

    expect(dispatched).toContainEqual(expect.objectContaining({ type: 'tabs/focusTab', payload: { uid: 'r1' } }));
    expect(dispatched.some((a) => a.type === 'tabs/closeTabs')).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('still lists every draft in the collection when quitting the app', () => {
    renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', draft: { name: 'My Collection' }, items: [request('r1', 'Users'), request('r2', 'Orders')] }],
      tabs: [requestTab('r1')]
    });

    expect(screen.getByText('Collection: My Collection')).toBeInTheDocument();
    expect(screen.getByText('Request: Users')).toBeInTheDocument();
    expect(screen.getByText('Request: Orders')).toBeInTheDocument();
  });
});
