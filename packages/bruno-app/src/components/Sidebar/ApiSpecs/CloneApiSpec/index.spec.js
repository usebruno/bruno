import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { cloneApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import { validateNameError } from 'utils/common/regex';
import CloneApiSpec from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  cloneApiSpec: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn()
}));

jest.mock('hooks/useDefaultApiSpecLocation', () => jest.fn());

jest.mock('components/Modal', () => ({ children, title, handleConfirm, confirmDisabled }) => (
  <div>
    <h1>{title}</h1>
    {children}
    <button type="button" onClick={handleConfirm} disabled={confirmDisabled}>confirm</button>
  </div>
));

const DEFAULT_LOCATION = '/workspace/apispec';
const apiSpec = { uid: 'runtime-uid', name: 'Petstore', pathname: '/workspace/petstore.yaml' };

const renderModal = ({ defaultLocation = DEFAULT_LOCATION } = {}) => {
  useDefaultApiSpecLocation.mockReturnValue(defaultLocation);
  const onClose = jest.fn();
  const store = configureStore({ reducer: { app: (state = {}) => state } });
  const ui = () => (
    <Provider store={store}>
      <CloneApiSpec apiSpec={apiSpec} onClose={onClose} />
    </Provider>
  );

  const { rerender } = render(ui());

  return {
    onClose,
    nameInput: () => screen.getByTestId('clone-api-spec-name'),
    locationInput: () => screen.getByTestId('api-spec-location'),
    defaultLocationArrives: (location) => {
      useDefaultApiSpecLocation.mockReturnValue(location);
      rerender(ui());
    }
  };
};

describe('the dialog for cloning an API spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cloneApiSpec.mockReturnValue(() => Promise.resolve('/workspace/apispec/Petstore copy.yaml'));
  });

  it('suggests a copy name and the workspace spec folder', () => {
    const { nameInput, locationInput } = renderModal();

    expect(screen.getByText('Clone API Spec')).toBeInTheDocument();
    expect(nameInput()).toHaveValue('Petstore copy');
    expect(locationInput()).toHaveValue(DEFAULT_LOCATION);
  });

  it('clones into the suggested folder, then confirms and closes', async () => {
    const { onClose, nameInput } = renderModal();

    fireEvent.change(nameInput(), { target: { value: '  Orders  ' } });
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(cloneApiSpec).toHaveBeenCalledWith({ uid: 'runtime-uid', name: 'Orders', location: DEFAULT_LOCATION });
    expect(toast.success).toHaveBeenCalledWith('API Spec cloned');
  });

  it('keeps a typed name when the suggested folder arrives after the dialog opened', () => {
    const { nameInput, locationInput, defaultLocationArrives } = renderModal({ defaultLocation: '' });

    fireEvent.change(nameInput(), { target: { value: 'Orders' } });
    defaultLocationArrives(DEFAULT_LOCATION);

    expect(nameInput()).toHaveValue('Orders');
    expect(locationInput()).toHaveValue(DEFAULT_LOCATION);
  });

  it('clones into a folder the user picked instead of the suggested one', async () => {
    browseDirectory.mockReturnValue(() => Promise.resolve('/elsewhere'));
    const { onClose, locationInput } = renderModal();

    fireEvent.click(screen.getByText('Browse'));
    await waitFor(() => expect(locationInput()).toHaveValue('/elsewhere'));
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(cloneApiSpec).toHaveBeenCalledWith(expect.objectContaining({ location: '/elsewhere' }));
  });

  it('asks for a folder when there is no suggestion and none was picked', async () => {
    renderModal({ defaultLocation: '' });

    fireEvent.click(screen.getByText('confirm'));

    expect(await screen.findByText('location is required')).toBeInTheDocument();
    expect(cloneApiSpec).not.toHaveBeenCalled();
  });

  it('refuses a name that cannot be a filename', async () => {
    const { nameInput } = renderModal();

    fireEvent.change(nameInput(), { target: { value: 'a/b' } });
    fireEvent.click(screen.getByText('confirm'));

    expect(await screen.findByText(validateNameError('a/b'))).toBeInTheDocument();
    expect(cloneApiSpec).not.toHaveBeenCalled();
  });

  it('shows why the clone failed and stays open', async () => {
    cloneApiSpec.mockReturnValue(() =>
      Promise.reject(new Error('Error invoking remote method \'renderer:clone-api-spec\': Error: path: /workspace/apispec/Petstore copy.yaml already exists'))
    );
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('path: /workspace/apispec/Petstore copy.yaml already exists')
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
