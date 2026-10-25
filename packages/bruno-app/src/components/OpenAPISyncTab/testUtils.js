import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import themes from 'themes/index';

export const validOpenApiSpec = { openapi: '3.0.0', info: { title: 'Pets' }, paths: {} };

export const workspaceSpec = (uid, name, pathname, json = validOpenApiSpec) => ({ uid, name, pathname, json });

export const renderWithWorkspaceSpecs = (ui, specs = []) => {
  const store = configureStore({
    reducer: {
      workspaces: () => ({
        activeWorkspaceUid: 'ws',
        workspaces: [{ uid: 'ws', apiSpecs: specs.map((spec) => ({ path: spec.pathname })) }]
      }),
      apiSpec: () => ({ apiSpecs: specs })
    }
  });

  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>{ui}</ThemeProvider>
    </Provider>
  );
};

// ResponsiveTabs moves every tab into its overflow menu when widths measure 0, as they do in jsdom.
export const stubTabWidths = () => {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return this.getAttribute('role') === 'tablist' ? 800 : 60;
      }
    });
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', original);
  });
};
