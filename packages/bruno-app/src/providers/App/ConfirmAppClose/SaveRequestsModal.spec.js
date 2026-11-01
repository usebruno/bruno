import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { saveApiSpecToFile, clearApiSpecDraft } from 'providers/ReduxStore/slices/apiSpec';
import SaveRequestsModal from './SaveRequestsModal';

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

const renderModal = ({ apiSpecs = [], tabs = [], collections = [], forceCloseTabs = false, tabUidsToClose = [] } = {}) => {
  const onClose = jest.fn();
  const store = configureStore({
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
      globalEnvironments: { globalEnvironments: [], globalEnvironmentDraft: null }
    }
  });

  return {
    onClose,
    ...render(
      <Provider store={store}>
        <SaveRequestsModal onClose={onClose} forceCloseTabs={forceCloseTabs} tabUidsToClose={tabUidsToClose} />
      </Provider>
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

  it('lists API specs after the other unsaved items', () => {
    renderModal({
      collections: [{ uid: 'c1', name: 'My Collection', draft: { name: 'My Collection' }, items: [] }],
      apiSpecs: [{ uid: 'spec-1', name: 'Petstore', pathname: SPEC_PATHNAME, raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' }],
      tabs: [{ uid: 't1', collectionUid: 'c1', type: 'http-request' }, specTab(SPEC_PATHNAME)]
    });

    const entries = screen.getAllByRole('listitem').map((node) => node.textContent);
    expect(entries).toEqual(['Collection: My Collection', 'API Spec: Petstore']);
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
