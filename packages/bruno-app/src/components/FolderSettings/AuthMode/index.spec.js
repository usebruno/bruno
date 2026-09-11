import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import AuthMode from './index';

const renderAuthMode = (folder) => {
  const store = configureStore({
    reducer: (state = {}) => state
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.dark}>
        <AuthMode collection={{ uid: 'collection-1' }} folder={folder} />
      </ThemeProvider>
    </Provider>
  );
};

describe('FolderSettings AuthMode', () => {
  it('shows Inherit when the folder has no auth configuration', () => {
    renderAuthMode({
      uid: 'folder-1',
      type: 'folder'
    });

    expect(screen.getByTestId('auth-mode-label')).toHaveTextContent('Inherit');
  });

  it('shows No Auth when the folder explicitly disables auth', () => {
    renderAuthMode({
      uid: 'folder-1',
      type: 'folder',
      root: {
        request: {
          auth: {
            mode: 'none'
          }
        }
      }
    });

    expect(screen.getByTestId('auth-mode-label')).toHaveTextContent('No Auth');
  });
});
