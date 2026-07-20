import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    theme: { bg: '#fff', draftColor: '#000', requestTabs: { icon: { color: '#000' } } },
    displayedTheme: 'light'
  })
}));

jest.mock('./FileEditor/CodeEditor/index', () => () => <div data-testid="code-editor" />);

const swaggerSpecs = [];
jest.mock('./Renderers/Swagger', () => ({ spec, onComplete }) => {
  swaggerSpecs.push(spec);
  onComplete?.();
  return <div data-testid="swagger">{typeof spec === 'string' ? spec : JSON.stringify(spec)}</div>;
});

import SpecViewer from './SpecViewer';

const OPENAPI_CONTENT = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 't', version: '1' },
  paths: { '/pet': { get: { responses: { 200: { description: 'ok' } } } } }
});

const mockStore = configureStore({
  reducer: {
    app: (state = { preferences: {} }) => state
  }
});

const renderSpecViewer = (props) => render(
  <Provider store={mockStore}>
    <SpecViewer content={OPENAPI_CONTENT} {...props} />
  </Provider>
);

describe('SpecViewer $ref-resolution gating', () => {
  beforeEach(() => {
    swaggerSpecs.length = 0;
    window.ipcRenderer = { invoke: jest.fn() };
  });

  test('does not mount Swagger until the main-process resolution call settles', async () => {
    let resolveIpc;
    window.ipcRenderer.invoke.mockReturnValue(new Promise((resolve) => { resolveIpc = resolve; }));

    render(
      <Provider store={mockStore}>
        <SpecViewer content={OPENAPI_CONTENT} specFilePath="/collections/petstore.yaml" />
      </Provider>
    );

    expect(swaggerSpecs).toHaveLength(0);

    const resolvedSpec = { openapi: '3.1.0', paths: {} };
    await act(async () => {
      resolveIpc({ spec: resolvedSpec });
      await Promise.resolve();
    });

    await waitFor(() => expect(swaggerSpecs).toHaveLength(1));
    expect(swaggerSpecs[0]).toEqual(resolvedSpec);
  });

  test('falls back to raw content when the resolution call fails', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('boom'));

    render(
      <Provider store={mockStore}>
        <SpecViewer content={OPENAPI_CONTENT} specFilePath="/collections/petstore.yaml" />
      </Provider>
    );

    await waitFor(() => expect(swaggerSpecs).toHaveLength(1));
    expect(swaggerSpecs[0]).toBe(OPENAPI_CONTENT);
  });

  test('renders raw content immediately when there is no spec file path', async () => {
    renderSpecViewer({});

    await waitFor(() => expect(swaggerSpecs).toHaveLength(1));
    expect(swaggerSpecs[0]).toBe(OPENAPI_CONTENT);
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
