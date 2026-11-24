jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import CloneGitRepository from './index';

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  cloneGitRepository: jest.fn(),
  fetchBranchesForRepositoryUrl: jest.fn(() => () => Promise.resolve({ branches: [], defaultBranch: '' })),
  findCollectionsInClonedRepository: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const createStore = () =>
  configureStore({
    reducer: {
      app: () => ({ gitVersion: '2.40.0', gitOperationProgress: {}, preferences: {} }),
      workspaces: () => ({ workspaces: [], activeWorkspaceUid: null })
    }
  });

const renderFlow = (props = {}) =>
  render(
    <Provider store={createStore()}>
      <ThemeProvider theme={themes.light}>
        <CloneGitRepository onClose={jest.fn()} onFinish={jest.fn()} {...props} />
      </ThemeProvider>
    </Provider>
  );

describe('CloneGitRepository variants', () => {
  it('renders inside a modal by default', () => {
    renderFlow();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('clone-git-inline-layout')).toBeNull();
  });

  it('renders without a modal when variant is inline', () => {
    renderFlow({ variant: 'inline' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('clone-git-inline-layout')).toBeInTheDocument();
  });

  it('prefills an editable url from initialUrl', async () => {
    renderFlow({ variant: 'inline', initialUrl: 'https://gitlab.com/acme/api.git' });
    await act(async () => {});
    const input = screen.getByLabelText('Git Repository URL');
    expect(input).toHaveValue('https://gitlab.com/acme/api.git');
    expect(input).not.toHaveAttribute('readonly');
  });

  it('keeps the url locked when collectionRepositoryUrl is passed alongside initialUrl', async () => {
    renderFlow({
      variant: 'inline',
      initialUrl: 'https://gitlab.com/acme/other.git',
      collectionRepositoryUrl: 'https://github.com/acme/locked.git'
    });
    await act(async () => {});
    expect(screen.queryByLabelText('Git Repository URL')).toBeNull();
    expect(screen.getByText('https://github.com/acme/locked.git')).toBeInTheDocument();
  });

  it('shows the Clone button in the inline footer', () => {
    renderFlow({ variant: 'inline' });
    expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Clone');
    expect(screen.getByTestId('clone-git-inline-cancel')).toBeInTheDocument();
  });
});
