import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import appReducer from 'providers/ReduxStore/slices/app';
import ChooseFolderHint from './index';

const renderInButton = (preferences = {}) => {
  const store = configureStore({
    reducer: { app: appReducer },
    preloadedState: { app: { ...appReducer(undefined, { type: 'init' }), preferences } }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <button type="button">
          Choose folder
          <ChooseFolderHint id="choose-folder-hint" />
        </button>
      </ThemeProvider>
    </Provider>
  );
};

describe('ChooseFolderHint', () => {
  it('explains the button and names its shortcut when the icon is hovered', async () => {
    renderInButton();

    fireEvent.mouseEnter(screen.getByTestId('choose-folder-hint'));

    expect(await screen.findByText(/^Select a Bruno collection folder manually \(.*(Shift|⇧).*O\)$/)).toBeInTheDocument();
  });

  it('leaves the shortcut out when keyboard shortcuts are turned off', async () => {
    renderInButton({ keybindingsEnabled: false });

    fireEvent.mouseEnter(screen.getByTestId('choose-folder-hint'));

    expect(await screen.findByText('Select a Bruno collection folder manually')).toBeInTheDocument();
  });

  it('keeps the name of the button to its label', () => {
    renderInButton();

    expect(screen.getByRole('button', { name: 'Choose folder' })).toBeInTheDocument();
  });
});
