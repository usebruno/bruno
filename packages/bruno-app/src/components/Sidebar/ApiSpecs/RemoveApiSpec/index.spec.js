import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import toast from 'react-hot-toast';
import themes from 'themes/index';
import { removeApiSpecFromWorkspace } from 'providers/ReduxStore/slices/apiSpec';
import RemoveApiSpec from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  removeApiSpecFromWorkspace: jest.fn()
}));

jest.mock('components/Modal', () => ({ children, title, handleConfirm, confirmDisabled }) => (
  <div>
    <h1>{title}</h1>
    {children}
    <button type="button" onClick={handleConfirm} disabled={confirmDisabled}>confirm</button>
  </div>
));

const SPEC_PATHNAME = '/workspace/petstore.yaml';
const SAVED_CONTENT = 'openapi: 3.0.0';

const apiSpec = {
  uid: 'runtime-uid',
  name: 'Petstore',
  pathname: SPEC_PATHNAME,
  raw: SAVED_CONTENT
};

const renderModal = ({ draft, onClose = jest.fn() } = {}) => {
  const store = configureStore({ reducer: { tabs: (state = {}) => state }, preloadedState: { tabs: {} } });

  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <RemoveApiSpec apiSpec={draft === undefined ? apiSpec : { ...apiSpec, draft }} onClose={onClose} />
      </ThemeProvider>
    </Provider>
  );

  return { onClose };
};

describe('the dialog for removing an API spec from the workspace', () => {
  beforeEach(() => {
    removeApiSpecFromWorkspace.mockReset();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it('is titled after the action, names the spec and its path, and says the file stays on disk', () => {
    renderModal();

    expect(screen.getByText('Remove from Workspace')).toBeInTheDocument();
    expect(screen.getByText('Petstore')).toBeInTheDocument();
    expect(screen.getByText(SPEC_PATHNAME)).toBeInTheDocument();
    expect(screen.getByText(/stays on disk/)).toBeInTheDocument();
  });

  it('warns that unsaved changes will be discarded when the spec has been edited', () => {
    renderModal({ draft: 'openapi: 3.1.0' });

    expect(screen.getByTestId('api-spec-unsaved-warning')).toHaveTextContent('Removing it from the workspace will discard them.');
  });

  it('shows no warning when the spec has no unsaved changes', () => {
    renderModal();

    expect(screen.queryByTestId('api-spec-unsaved-warning')).not.toBeInTheDocument();
  });

  it('shows no warning when the editor content matches what is already on disk', () => {
    renderModal({ draft: SAVED_CONTENT });

    expect(screen.queryByTestId('api-spec-unsaved-warning')).not.toBeInTheDocument();
  });

  it('removes the spec on confirm, then reports success and closes', async () => {
    removeApiSpecFromWorkspace.mockReturnValue(() => Promise.resolve());
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    expect(removeApiSpecFromWorkspace).toHaveBeenCalledWith({ uid: 'runtime-uid' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('API Spec removed from workspace');
  });

  it('reports a failure and stays open', async () => {
    removeApiSpecFromWorkspace.mockReturnValue(() => Promise.reject(new Error('locked')));
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('An error occurred while removing the API Spec'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
