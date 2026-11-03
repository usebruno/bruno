import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import PostmanPackageReport from './index';

const mockSaveSecurityConfig = jest.fn();
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveCollectionSecurityConfig: (...args) => mockSaveSecurityConfig(...args)
}));

let mockCollection;
jest.mock('utils/collections', () => ({
  findCollectionByPathname: () => mockCollection
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

const baseReport = {
  hasAny: true,
  needsInstall: ['dayjs', 'zod'],
  unsupported: [],
  safeMode: [],
  devMode: []
};

const createStore = () => {
  const slice = createSlice({
    name: 'collections',
    initialState: { collections: [] },
    reducers: {}
  });
  return configureStore({ reducer: { collections: slice.reducer } });
};

const renderModal = (props = {}) =>
  render(
    <Provider store={createStore()}>
      <ThemeProvider>
        <PostmanPackageReport
          report={baseReport}
          collectionPath="/collections/demo"
          onClose={props.onClose || jest.fn()}
          {...props}
        />
      </ThemeProvider>
    </Provider>
  );

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  });
  Object.defineProperty(window, 'localStorage', {
    value: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }
  });
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue() },
    configurable: true
  });
});

beforeEach(() => {
  mockSaveSecurityConfig.mockReset();
  mockSaveSecurityConfig.mockReturnValue(() => Promise.resolve());
  mockCollection = { uid: 'col-1', pathname: '/collections/demo', securityConfig: { jsSandboxMode: 'safe' } };
  window.ipcRenderer = {
    invoke: jest.fn().mockResolvedValue({ success: true, installed: ['dayjs', 'zod'] }),
    send: jest.fn()
  };
});

describe('PostmanPackageReport', () => {
  it('renders the needs-install packages and the install action', () => {
    renderModal();
    expect(screen.getByText('Packages used in scripts')).toBeInTheDocument();
    expect(screen.getByText('dayjs')).toBeInTheDocument();
    expect(screen.getByText('zod')).toBeInTheDocument();
    expect(screen.getByTestId('postman-package-report-modal-submit-btn')).toHaveTextContent('Install 2 packages');
  });

  it('renders the manual install command', () => {
    renderModal();
    expect(screen.getByText('npm install --save dayjs zod')).toBeInTheDocument();
  });

  it('returns nothing when there is no actionable package', () => {
    const { container } = renderModal({
      report: { hasAny: false, needsInstall: [], unsupported: [], safeMode: ['uuid'], devMode: [] }
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts to switch to Developer Mode when only dev-mode libs are referenced (Safe Mode)', () => {
    renderModal({
      report: {
        hasAny: true,
        needsInstall: [],
        unsupported: [],
        safeMode: [],
        devMode: ['lodash', 'moment']
      }
    });
    expect(screen.getByText('Scripts use libraries that need Developer Mode')).toBeInTheDocument();
    expect(screen.getAllByText('lodash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('moment').length).toBeGreaterThan(0);
    expect(screen.getByTestId('switch-to-developer-mode')).toBeInTheDocument();
    expect(screen.getByTestId('postman-package-report-modal-submit-btn')).toHaveTextContent('Done');
  });

  it('auto-dismisses when only dev-mode libs are referenced and the collection is already in Developer Mode', () => {
    mockCollection = {
      uid: 'col-1',
      pathname: '/collections/demo',
      securityConfig: { jsSandboxMode: 'developer' }
    };
    const onClose = jest.fn();
    const { container } = renderModal({
      onClose,
      report: {
        hasAny: true,
        needsInstall: [],
        unsupported: [],
        safeMode: [],
        devMode: ['lodash']
      }
    });
    expect(onClose).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unsupported section when present', () => {
    renderModal({
      report: { ...baseReport, unsupported: ['postman-collection'] }
    });
    expect(screen.getByText('Not supported in Bruno')).toBeInTheDocument();
    expect(screen.getByText('postman-collection')).toBeInTheDocument();
  });

  it('installs packages and then prompts to enable Developer Mode (Safe Mode collection)', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('postman-package-report-modal-submit-btn'));

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:install-postman-packages',
      '/collections/demo',
      ['dayjs', 'zod']
    );

    expect(await screen.findByText(/Installed 2 packages into this collection/i)).toBeInTheDocument();
    expect(screen.getByText('External modules require Developer Mode')).toBeInTheDocument();
    expect(screen.getByTestId('switch-to-developer-mode')).toBeInTheDocument();
  });

  it('dispatches the Developer Mode switch when the user opts in', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('postman-package-report-modal-submit-btn'));
    const switchBtn = await screen.findByTestId('switch-to-developer-mode');

    fireEvent.click(switchBtn);
    await waitFor(() => {
      expect(mockSaveSecurityConfig).toHaveBeenCalledWith('col-1', { jsSandboxMode: 'developer' });
    });
  });

  it('skips the Developer Mode prompt when the collection is already in Developer Mode', async () => {
    mockCollection = {
      uid: 'col-1',
      pathname: '/collections/demo',
      securityConfig: { jsSandboxMode: 'developer' }
    };
    renderModal();
    fireEvent.click(screen.getByTestId('postman-package-report-modal-submit-btn'));

    expect(await screen.findByText(/runs in/i)).toHaveTextContent(/Developer Mode/i);
    expect(screen.queryByTestId('switch-to-developer-mode')).not.toBeInTheDocument();
  });

  it('surfaces a friendly message when npm is not on PATH', async () => {
    window.ipcRenderer.invoke = jest.fn().mockResolvedValue({
      success: false,
      exitCode: -1,
      errorCode: 'NPM_NOT_FOUND',
      stderr: 'npm was not found on your PATH.'
    });
    renderModal();
    fireEvent.click(screen.getByTestId('postman-package-report-modal-submit-btn'));

    const error = await screen.findByTestId('postman-package-install-error');
    expect(error).toHaveTextContent(/not found on your PATH/i);
  });

  it('shows the exit code for a generic install failure', async () => {
    window.ipcRenderer.invoke = jest.fn().mockResolvedValue({
      success: false,
      exitCode: 1,
      stderr: 'npm ERR! 404'
    });
    renderModal();
    fireEvent.click(screen.getByTestId('postman-package-report-modal-submit-btn'));

    const error = await screen.findByTestId('postman-package-install-error');
    expect(error).toHaveTextContent(/exit code 1/i);
  });
});
