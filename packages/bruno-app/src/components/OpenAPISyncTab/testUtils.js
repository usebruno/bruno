import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { act, render } from '@testing-library/react';
import themes from 'themes/index';

export const validOpenApiSpec = { openapi: '3.0.0', info: { title: 'Pets' }, paths: {} };

export const workspaceSpec = (uid, name, pathname, json = validOpenApiSpec) => ({ uid, name, pathname, json });

const SET_SPECS = 'test/setWorkspaceSpecs';

const toWorkspacesState = (specs) => ({
  activeWorkspaceUid: 'ws',
  workspaces: [{ uid: 'ws', apiSpecs: specs.map((spec) => ({ path: spec.pathname })) }]
});

export const renderWithWorkspaceSpecs = (ui, specs = []) => {
  const store = configureStore({
    reducer: {
      workspaces: (state = toWorkspacesState(specs), action) => (
        action.type === SET_SPECS ? toWorkspacesState(action.specs) : state
      ),
      apiSpec: (state = { apiSpecs: specs }, action) => (
        action.type === SET_SPECS ? { apiSpecs: action.specs } : state
      )
    }
  });

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>{ui}</ThemeProvider>
    </Provider>
  );

  const setWorkspaceSpecs = (nextSpecs) => act(() => {
    store.dispatch({ type: SET_SPECS, specs: nextSpecs });
  });

  return { ...utils, setWorkspaceSpecs };
};
