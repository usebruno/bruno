import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import toast from 'react-hot-toast';
import themes from 'themes/index';
import MockResponsesList from './index';
import {
  generateMockResponsesFromSpec,
  loadMockResponsesFromSpec,
  syncMockResponsesFromExamples
} from 'providers/ReduxStore/slices/mock-server/index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn()
}));

jest.mock('components/Portal', () => ({ children }) => <div>{children}</div>);

jest.mock('components/Modal', () => ({ children, handleConfirm, confirmText }) => (
  <div>
    {children}
    <button type="button" onClick={handleConfirm}>{confirmText}</button>
  </div>
));

jest.mock('providers/ReduxStore/slices/mock-server/index', () => ({
  createMockResponse: jest.fn(),
  deleteMockResponse: jest.fn(),
  generateMockResponsesFromSpec: jest.fn(),
  loadMockResponses: jest.fn(() => ({ type: 'load-responses' })),
  loadMockResponsesFromSpec: jest.fn(),
  saveMockResponse: jest.fn(),
  syncMockResponsesFromExamples: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  addTab: jest.fn(),
  closeTabs: jest.fn(),
  updateTabMeta: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  removeMockResponseEditor: jest.fn()
}));

const NO_PATHS = 'API spec does not define any paths.';

const instance = {
  uid: 'ms-1',
  workspaceUid: 'ws-1',
  name: 'Pets',
  sourceType: 'spec',
  specPath: '/tmp/pet.yaml',
  port: 4000
};

const existingResponse = {
  uid: 'resp-1',
  name: 'List pets',
  request: { method: 'GET', url: '/pets' },
  rules: { conditions: [] }
};

const storeState = {
  collections: { collections: [] },
  workspaces: {
    activeWorkspaceUid: 'ws-1',
    workspaces: [{ uid: 'ws-1', pathname: '/tmp/ws' }]
  },
  apiSpec: {
    apiSpecs: [{ uid: 'spec-1', name: 'pet', pathname: '/tmp/pet.yaml' }]
  },
  mockServer: {
    mockResponses: { 'ms-1': [existingResponse] },
    servers: {}
  }
};

const rejection = (message) => ({
  unwrap: () => Promise.reject(new Error(message))
});

describe('MockResponsesList spec actions', () => {
  let dispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn((action) => {
      if (action?.type === 'generate-from-spec' || action?.type === 'load-from-spec') {
        return rejection(NO_PATHS);
      }
      return { unwrap: () => Promise.resolve({}) };
    });
    useDispatch.mockReturnValue(dispatch);
    useSelector.mockImplementation((selector) => selector(storeState));
    generateMockResponsesFromSpec.mockReturnValue({ type: 'generate-from-spec' });
    loadMockResponsesFromSpec.mockReturnValue({ type: 'load-from-spec' });
    syncMockResponsesFromExamples.mockReturnValue({ type: 'save-responses' });
  });

  const renderList = () => render(
    <ThemeProvider theme={themes.light}>
      <MockResponsesList instance={instance} />
    </ThemeProvider>
  );

  it('does not add responses when generating from a spec that has no paths', async () => {
    renderList();

    fireEvent.click(screen.getByTestId('mock-response-generate-from-spec-btn'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NO_PATHS));
    expect(syncMockResponsesFromExamples).not.toHaveBeenCalled();
    expect(screen.getByText('List pets')).toBeInTheDocument();
  });

  it('keeps existing responses when syncing a spec that has no paths', async () => {
    renderList();

    fireEvent.click(screen.getByTestId('mock-response-sync-spec-btn'));
    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NO_PATHS));
    expect(syncMockResponsesFromExamples).not.toHaveBeenCalled();
    expect(screen.getByText('List pets')).toBeInTheDocument();
  });
});
