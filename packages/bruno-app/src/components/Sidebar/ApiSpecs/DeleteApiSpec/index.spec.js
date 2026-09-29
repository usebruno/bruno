import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import toast from 'react-hot-toast';
import themes from 'themes/index';
import { deleteApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import DeleteApiSpec from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  deleteApiSpec: jest.fn()
}));

jest.mock('components/Modal', () => ({ children, title, handleConfirm, confirmDisabled }) => (
  <div>
    <h1>{title}</h1>
    {children}
    <button type="button" onClick={handleConfirm} disabled={confirmDisabled}>confirm</button>
  </div>
));

const SPEC_PATHNAME = '/workspace/apispec/petstore.yaml';
const SAVED_CONTENT = 'openapi: 3.0.0';

const apiSpec = {
  uid: 'runtime-uid',
  name: 'Petstore',
  pathname: SPEC_PATHNAME,
  raw: SAVED_CONTENT
};

const syncingCollection = (pathname) => ({ pathname, brunoConfig: { openapi: [{ sourceUrl: '../apispec/petstore.yaml' }] } });

const renderModal = ({ draft, collections = [], onClose = jest.fn() } = {}) => {
  const preloadedState = {
    collections: { collections },
    workspaces: {
      activeWorkspaceUid: 'ws1',
      workspaces: [{ uid: 'ws1', collections: collections.map((c) => ({ path: c.pathname })) }]
    }
  };
  const store = configureStore({
    reducer: { collections: (state = {}) => state, workspaces: (state = {}) => state },
    preloadedState
  });

  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <DeleteApiSpec apiSpec={draft === undefined ? apiSpec : { ...apiSpec, draft }} onClose={onClose} />
      </ThemeProvider>
    </Provider>
  );

  return { onClose };
};

describe('the dialog for deleting an API spec', () => {
  beforeEach(() => {
    deleteApiSpec.mockReset();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it('names the spec and its path, and says the file is deleted from disk', () => {
    renderModal();

    expect(screen.getByText('Delete API Spec')).toBeInTheDocument();
    expect(screen.getByText('Petstore')).toBeInTheDocument();
    expect(screen.getByText(SPEC_PATHNAME)).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted from disk/)).toBeInTheDocument();
  });

  it('warns that unsaved changes will be discarded when the spec has been edited', () => {
    renderModal({ draft: 'openapi: 3.1.0' });

    expect(screen.getByTestId('api-spec-unsaved-warning')).toHaveTextContent('Deleting it will discard them.');
  });

  it('shows no unsaved warning when the editor content matches what is already on disk', () => {
    renderModal({ draft: SAVED_CONTENT });

    expect(screen.queryByTestId('api-spec-unsaved-warning')).not.toBeInTheDocument();
  });

  it('warns how many collections in the workspace sync from the spec', () => {
    renderModal({ collections: [syncingCollection('/workspace/orders'), syncingCollection('/workspace/payments')] });

    expect(screen.getByTestId('api-spec-connected-collections-warning')).toHaveTextContent(
      '2 collections sync from this spec. Deleting it will stop them from getting updates.'
    );
  });

  it('uses the singular wording for one connected collection', () => {
    renderModal({ collections: [syncingCollection('/workspace/orders')] });

    expect(screen.getByTestId('api-spec-connected-collections-warning')).toHaveTextContent(
      '1 collection syncs from this spec. Deleting it will stop that collection from getting updates.'
    );
  });

  it('shows no collections warning when nothing syncs from the spec', () => {
    renderModal({ collections: [{ pathname: '/workspace/orders', brunoConfig: {} }] });

    expect(screen.queryByTestId('api-spec-connected-collections-warning')).not.toBeInTheDocument();
  });

  it('deletes the spec on confirm, then reports success and closes', async () => {
    deleteApiSpec.mockReturnValue(() => Promise.resolve());
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    expect(deleteApiSpec).toHaveBeenCalledWith({ uid: 'runtime-uid' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('API Spec deleted');
  });

  it('shows the error and stays open when the delete fails', async () => {
    deleteApiSpec.mockReturnValue(() => Promise.reject(new Error(
      'Error invoking remote method \'renderer:delete-api-spec\': Error: The file is in use by another program. Close it and try again.'
    )));
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('The file is in use by another program. Close it and try again.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a second confirm while the delete is still running', async () => {
    let finish;
    deleteApiSpec.mockReturnValue(() => new Promise((resolve) => { finish = resolve; }));
    renderModal();

    fireEvent.click(screen.getByText('confirm'));
    fireEvent.click(screen.getByText('confirm'));

    expect(deleteApiSpec).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('confirm')).toBeDisabled());
    finish();
    await waitFor(() => expect(screen.getByText('confirm')).not.toBeDisabled());
  });
});
