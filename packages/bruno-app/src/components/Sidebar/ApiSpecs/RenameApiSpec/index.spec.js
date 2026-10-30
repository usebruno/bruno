import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { renameApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import RenameApiSpec from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  renameApiSpec: jest.fn()
}));

jest.mock('components/Modal', () => ({ children, title, handleConfirm, confirmDisabled }) => (
  <div>
    <h1>{title}</h1>
    {children}
    <button type="button" onClick={handleConfirm} disabled={confirmDisabled}>confirm</button>
  </div>
));

const apiSpec = { uid: 'runtime-uid', name: 'Petstore', pathname: '/workspace/petstore.yaml' };

const renderModal = () => {
  const onClose = jest.fn();
  const store = configureStore({ reducer: { app: (state = {}) => state } });

  render(
    <Provider store={store}>
      <RenameApiSpec apiSpec={apiSpec} onClose={onClose} />
    </Provider>
  );

  return { onClose, nameInput: screen.getByTestId('rename-api-spec-name') };
};

describe('the dialog for renaming an API spec', () => {
  beforeEach(() => {
    renameApiSpec.mockReset();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it('starts with the name the sidebar shows', () => {
    const { nameInput } = renderModal();

    expect(screen.getByText('Rename API Spec')).toBeInTheDocument();
    expect(nameInput).toHaveValue('Petstore');
  });

  it('renames to the trimmed name, then confirms and closes', async () => {
    renameApiSpec.mockReturnValue(() => Promise.resolve());
    const { onClose, nameInput } = renderModal();

    fireEvent.change(nameInput, { target: { value: '  Orders API  ' } });
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(renameApiSpec).toHaveBeenCalledWith({ uid: 'runtime-uid', newName: 'Orders API' });
    expect(toast.success).toHaveBeenCalledWith('API Spec renamed');
  });

  it('asks for a name instead of renaming to an empty one', async () => {
    const { onClose, nameInput } = renderModal();

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('confirm'));

    expect(await screen.findByText('name is required')).toBeInTheDocument();
    expect(renameApiSpec).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows why the rename failed and stays open', async () => {
    renameApiSpec.mockReturnValue(() =>
      Promise.reject(new Error('Error invoking remote method \'renderer:rename-api-spec\': Error: API spec name cannot contain line breaks or control characters'))
    );
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('API spec name cannot contain line breaks or control characters')
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
