jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

const createStore = ({ gitVersion = '2.40.0' } = {}) =>
  configureStore({
    reducer: {
      app: () => ({ gitVersion, gitOperationProgress: {}, preferences: {} }),
      workspaces: () => ({ workspaces: [], activeWorkspaceUid: null })
    }
  });

const renderFlow = (props = {}, store = createStore()) =>
  render(
    <Provider store={store}>
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

  describe('when git is not installed', () => {
    it('says so inside the page in the inline variant, without opening a modal', () => {
      const onClose = jest.fn();
      renderFlow({ variant: 'inline', onClose }, createStore({ gitVersion: null }));

      expect(screen.getByTestId('git-not-found-message')).toHaveTextContent('Git was not detected on your system');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('Git Not Found')).toBeNull();
      expect(screen.queryByLabelText('Repository URL')).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('keeps the Git Not Found modal in the modal variant', () => {
      renderFlow({}, createStore({ gitVersion: null }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Git Not Found')).toBeInTheDocument();
      expect(screen.getByTestId('git-not-found-message')).toHaveTextContent('Git was not detected on your system');
    });
  });

  it('shows the locked repository URL instead of a URL field', async () => {
    renderFlow({ variant: 'inline', collectionRepositoryUrl: 'https://github.com/acme/locked.git' });
    await act(async () => {});
    expect(screen.queryByLabelText('Repository URL')).toBeNull();
    expect(screen.getByText('https://github.com/acme/locked.git')).toBeInTheDocument();
  });

  it('shows the url with a git icon and the location in the import page input style in the inline layout', () => {
    renderFlow({ variant: 'inline' });

    const url = screen.getByLabelText('Repository URL');
    expect(url).toHaveAttribute('placeholder', 'https://github.com/org/repo');
    expect(url).not.toHaveClass('textbox');
    expect(url.parentElement).toHaveClass('icon-input-field');
    expect(url.previousElementSibling.tagName).toBe('svg');
    expect(url.parentElement.nextElementSibling).toHaveTextContent('Any git host: GitHub, GitLab, Bitbucket or self-hosted.');

    const location = screen.getByLabelText('Clone to location');
    expect(location).not.toHaveClass('textbox');
    expect(location.parentElement).toHaveClass('icon-input-field', 'no-icon');
  });

  it('sizes the url, location and branch fields like the import page input in the inline layout', () => {
    renderFlow({ variant: 'inline' });

    const url = getComputedStyle(screen.getByLabelText('Repository URL'));
    const location = getComputedStyle(screen.getByLabelText('Clone to location'));
    const branch = getComputedStyle(screen.getByTestId('clone-git-repository-branch-select'));
    expect(url.height).toBe('2rem');
    expect(url.paddingLeft).toBe('2rem');
    expect(location.height).toBe('2rem');
    expect(location.paddingLeft).toBe('0.625rem');
    expect(branch.height).toBe('2rem');
  });

  it('keeps the fixed repository header and textbox location in the modal', async () => {
    renderFlow({ collectionRepositoryUrl: 'https://github.com/acme/locked.git' });
    await act(async () => {});

    expect(screen.getByText('https://github.com/acme/locked.git')).toBeInTheDocument();
    expect(screen.queryByLabelText('Repository URL')).toBeNull();
    expect(screen.queryByTestId('clone-git-repository-url-hint')).toBeNull();
    expect(screen.getByLabelText('Clone to location')).toHaveClass('textbox');
    expect(screen.getByLabelText('Clone to location').parentElement).not.toHaveClass('icon-input-field');
    expect(getComputedStyle(screen.getByTestId('clone-git-repository-branch-select')).height).not.toBe('2rem');
  });

  it('does not check a fixed repository URL again in the modal', async () => {
    renderFlow({ collectionRepositoryUrl: 'file:///tmp/acme/api.git' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clone' }));
    });

    expect(screen.queryByText('Please enter a valid git repository URL')).toBeNull();
  });

  it('lets the clone form fill the inline layout body', () => {
    renderFlow({ variant: 'inline' });

    const content = screen.getByTestId('clone-git-repository-content');
    expect(content.parentElement).toBe(screen.getByTestId('clone-git-inline-body'));
    expect(content).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
  });

  it('does not stretch the clone form in the modal', () => {
    renderFlow();

    expect(screen.getByTestId('clone-git-repository-content')).not.toHaveClass('flex-1');
  });

  it('shows the Clone button in the inline footer', () => {
    renderFlow({ variant: 'inline' });
    expect(screen.getByTestId('clone-git-inline-confirm')).toHaveTextContent('Clone');
    expect(screen.getByTestId('clone-git-inline-cancel')).toBeInTheDocument();
  });
});
