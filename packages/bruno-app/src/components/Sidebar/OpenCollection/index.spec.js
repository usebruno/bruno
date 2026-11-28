import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { browseDirectories, openMultipleCollections, scanForBrunoFiles } from 'providers/ReduxStore/slices/collections/actions';
import OpenCollection from './index';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectories: jest.fn(),
  openMultipleCollections: jest.fn(() => () => Promise.resolve({ opened: [] })),
  scanForBrunoFiles: jest.fn()
}));

const payments = { name: 'Payments', pathname: '/collections/payments' };
const orders = { name: 'Orders', pathname: '/collections/orders' };

const renderOpenCollection = () => {
  const store = configureStore({
    reducer: { app: (state = {}) => state },
    preloadedState: { app: { isOpeningCollection: true } }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <OpenCollection />
      </ThemeProvider>
    </Provider>
  );
};

describe('OpenCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens picked collection folders straight away and has them recorded in Recents', async () => {
    browseDirectories.mockReturnValue(() => Promise.resolve([payments.pathname, orders.pathname]));
    scanForBrunoFiles.mockImplementation((folderPath) => () => Promise.resolve({
      items: [folderPath === payments.pathname ? payments : orders],
      skippedItems: []
    }));
    renderOpenCollection();

    await waitFor(() => expect(openMultipleCollections).toHaveBeenCalledWith([payments.pathname, orders.pathname], { silent: true, recordRecent: true }));
  });

  it('opens the ticked collections found in a picked folder and has them recorded in Recents', async () => {
    browseDirectories.mockReturnValue(() => Promise.resolve(['/collections']));
    scanForBrunoFiles.mockReturnValue(() => Promise.resolve({ items: [payments, orders], skippedItems: [] }));
    renderOpenCollection();

    await screen.findByRole('button', { name: 'Open' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Payments/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(openMultipleCollections).toHaveBeenCalledWith([payments.pathname], { silent: true, recordRecent: true });
  });
});
