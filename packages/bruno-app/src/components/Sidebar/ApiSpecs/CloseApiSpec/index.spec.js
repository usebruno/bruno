import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CloseApiSpec from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);

const SPEC_PATHNAME = '/workspace/petstore.yaml';
const SAVED_CONTENT = 'openapi: 3.0.0';

const apiSpec = {
  uid: 'runtime-uid',
  name: 'Petstore',
  pathname: SPEC_PATHNAME,
  raw: SAVED_CONTENT
};

const renderModal = ({ draft } = {}) => {
  const store = configureStore({ reducer: { tabs: (state = {}) => state }, preloadedState: { tabs: {} } });

  return render(
    <Provider store={store}>
      <CloseApiSpec
        apiSpec={draft === undefined ? apiSpec : { ...apiSpec, draft }}
        onClose={jest.fn()}
      />
    </Provider>
  );
};

describe('the dialog for removing an API spec from the workspace', () => {
  it('warns that unsaved changes will be discarded when the spec has been edited', () => {
    renderModal({ draft: 'openapi: 3.1.0' });

    expect(screen.getByTestId('api-spec-unsaved-warning')).toBeInTheDocument();
  });

  it('shows no warning when the spec has no unsaved changes', () => {
    renderModal();

    expect(screen.queryByTestId('api-spec-unsaved-warning')).not.toBeInTheDocument();
  });

  it('shows no warning when the editor content matches what is already on disk', () => {
    renderModal({ draft: SAVED_CONTENT });

    expect(screen.queryByTestId('api-spec-unsaved-warning')).not.toBeInTheDocument();
  });
});
