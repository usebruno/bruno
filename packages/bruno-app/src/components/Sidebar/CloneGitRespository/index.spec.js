import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { openMultipleCollections, scanForBrunoFiles } from 'providers/ReduxStore/slices/collections/actions';
import CloneGitRepository from './index';

jest.mock('nanoid', () => ({ customAlphabet: () => () => 'mock-id' }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  cloneGitRepository: jest.fn(() => () => Promise.resolve()),
  fetchBranchesForRepositoryUrl: jest.fn(),
  openMultipleCollections: jest.fn(() => () => Promise.resolve()),
  scanForBrunoFiles: jest.fn()
}));

const payments = { name: 'Payments', pathname: '/collections/bruno-collections/payments' };
const orders = { name: 'Orders', pathname: '/collections/bruno-collections/orders' };

const renderCloneDialog = () => {
  const store = configureStore({
    reducer: {
      app: (state = {}) => state,
      workspaces: (state = {}) => state
    },
    preloadedState: {
      app: { gitVersion: '2.43.0', gitOperationProgress: {}, preferences: { general: { defaultLocation: '/collections' } } },
      workspaces: { workspaces: [], activeWorkspaceUid: null }
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <CloneGitRepository onClose={jest.fn()} onFinish={jest.fn()} />
      </ThemeProvider>
    </Provider>
  );
};

describe('CloneGitRepository', () => {
  it('opens the ticked collections from the cloned repository and has them recorded in Recents', async () => {
    scanForBrunoFiles.mockReturnValue(() => Promise.resolve({ items: [payments, orders], skippedItems: [] }));
    renderCloneDialog();

    fireEvent.change(screen.getByLabelText('Git Repository URL'), { target: { value: 'https://github.com/usebruno/bruno-collections.git' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }));
    await screen.findByRole('button', { name: 'Open' });

    fireEvent.click(screen.getByRole('checkbox', { name: /Payments/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(openMultipleCollections).toHaveBeenCalledWith([payments.pathname], { recordRecent: true });
  });
});
