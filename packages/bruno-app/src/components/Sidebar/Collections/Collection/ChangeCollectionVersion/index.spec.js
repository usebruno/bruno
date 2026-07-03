import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import ChangeCollectionVersion from './index';

const mockSaveCollectionVersion = jest.fn();

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveCollectionVersion: (collectionUid, version) => {
    mockSaveCollectionVersion(collectionUid, version);
    return () => Promise.resolve();
  }
}));

jest.mock('components/Portal', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>
}));

jest.mock('./StyledWrapper', () => ({
  __esModule: true,
  default: ({ children, className }) => <div className={className}>{children}</div>
}));

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="mock-modal">
      <div data-testid="modal-title">{props.title}</div>
      {props.children}
      <button
        data-testid="change-version-submit-btn"
        disabled={props.confirmDisabled}
        onClick={props.handleConfirm}
      >
        {props.confirmText}
      </button>
    </div>
  )
}));

const buildCollection = (overrides = {}) => ({
  uid: 'collection-1',
  name: 'Bruno-Testbench',
  pathname: '/tmp/bruno-testbench',
  brunoConfig: { opencollection: '1.0.0', name: 'Bruno-Testbench', version: 'v1.0.0' },
  ...overrides
});

const renderModal = (collection, onClose = jest.fn()) => {
  const collections = collection ? [collection] : [];
  const slice = createSlice({ name: 'collections', initialState: { collections }, reducers: {} });
  const store = configureStore({ reducer: { collections: slice.reducer } });
  const utils = render(
    <Provider store={store}>
      <ChangeCollectionVersion collectionUid="collection-1" onClose={onClose} />
    </Provider>
  );
  return { ...utils, onClose };
};

beforeEach(() => {
  mockSaveCollectionVersion.mockClear();
});

describe('ChangeCollectionVersion', () => {
  it('lets you save only when the new version is different from the current one', () => {
    renderModal(buildCollection());
    const submit = screen.getByTestId('change-version-submit-btn');
    const input = screen.getByTestId('change-version-input');

    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: '2' } });
    expect(submit).toBeEnabled();
    fireEvent.change(input, { target: { value: 'v1.0.0' } });
    expect(submit).toBeDisabled();
  });

  it('limits the version input at 50 characters', () => {
    renderModal(buildCollection());
    expect(screen.getByTestId('change-version-input')).toHaveAttribute('maxlength', '50');
  });

  it('does not let you save an empty or blank version', () => {
    renderModal(buildCollection());
    fireEvent.change(screen.getByTestId('change-version-input'), { target: { value: '   ' } });
    expect(screen.getByTestId('change-version-submit-btn')).toBeDisabled();
  });

  it('removes extra spaces around the version before saving, then closes', async () => {
    const { onClose } = renderModal(buildCollection());

    fireEvent.change(screen.getByTestId('change-version-input'), { target: { value: '  2.0.0  ' } });
    fireEvent.click(screen.getByTestId('change-version-submit-btn'));

    expect(mockSaveCollectionVersion).toHaveBeenCalledWith('collection-1', '2.0.0');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('for a bru collection, the preview mentions bruno.json and collectionVersion', () => {
    renderModal(buildCollection({ brunoConfig: { version: '1', name: 'Legacy', type: 'collection' } }));
    fireEvent.change(screen.getByTestId('change-version-input'), { target: { value: '2' } });

    const preview = screen.getByTestId('change-version-preview');
    expect(preview).toHaveTextContent('collectionVersion');
    expect(preview).toHaveTextContent('bruno.json');
    expect(preview).not.toHaveTextContent('info.version');
  });

  it('shows "Not Set" for a yml collection that has no version yet', () => {
    renderModal(buildCollection({ brunoConfig: { opencollection: '1.0.0', name: 'Bruno-Testbench' } }));

    expect(screen.getByTestId('change-version-current')).toHaveTextContent('Not Set');
    expect(screen.getByTestId('change-version-input')).toHaveValue('');
  });

  it('shows a "Collection not found" message when the collection is missing', () => {
    renderModal(null);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Change Collection Version');
    expect(screen.getByText(/Collection not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('change-version-input')).not.toBeInTheDocument();
  });
});
