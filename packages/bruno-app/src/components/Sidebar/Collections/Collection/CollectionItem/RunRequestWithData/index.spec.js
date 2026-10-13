import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import RunRequestWithData from './index';

const mockRunCollectionFolder = jest.fn();
const mockUpdateRunnerConfiguration = jest.fn();
const mockAddTab = jest.fn();
const mockClearStoredRunnerExchanges = jest.fn(() => Promise.resolve());

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  runCollectionFolder: (...args) => () => mockRunCollectionFolder(...args),
  updateRunnerConfiguration: (...args) => () => mockUpdateRunnerConfiguration(...args)
}));

jest.mock('providers/ReduxStore/slices/tabs', () => ({
  addTab: (payload) => () => mockAddTab(payload)
}));

jest.mock('utils/common', () => ({
  uuid: () => 'tab-uid'
}));

jest.mock('hooks/useClearStoredRunnerExchanges', () => ({
  __esModule: true,
  default: () => mockClearStoredRunnerExchanges
}));

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: ({ title, children }) => (
    <div>
      <div data-testid="modal-title">{title}</div>
      {children}
    </div>
  )
}));

jest.mock('ui/Button', () => ({
  __esModule: true,
  default: ({ children, icon, ...props }) => <button {...props}>{children}</button>
}));

jest.mock('components/RunnerResults/RunnerDataFile', () => ({
  __esModule: true,
  default: ({ dataFile, onChange, defaultDirectory }) => (
    <button data-testid="mock-select-data-file" data-default-directory={defaultDirectory} onClick={() => onChange({ path: '/data/users.csv', rowCount: 3, columns: ['name'] })}>
      {dataFile ? dataFile.path : 'select'}
    </button>
  )
}));

const theme = {
  colors: { text: { muted: '#999', danger: '#ef4444' } },
  font: { size: { sm: '0.8rem' } },
  border: { radius: { sm: '4px' } },
  input: { bg: '#fff', border: '#ddd', focusBorder: '#00f' }
};

const ITEM = { uid: 'req-1', name: 'Get User', type: 'http-request', pathname: '/collections/shop/users/get-user.bru' };

const renderDialog = (collectionOverrides = {}) => {
  const collection = { uid: 'col-1', items: [ITEM], ...collectionOverrides };
  const slice = createSlice({ name: 'collections', initialState: { collections: [collection] }, reducers: {} });
  const store = configureStore({ reducer: { collections: slice.reducer } });
  const onClose = jest.fn();
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <RunRequestWithData collectionUid="col-1" item={ITEM} onClose={onClose} />
      </ThemeProvider>
    </Provider>
  );
  return { onClose };
};

describe('RunRequestWithData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the file picker in the request\'s folder', () => {
    renderDialog();
    expect(screen.getByTestId('mock-select-data-file')).toHaveAttribute('data-default-directory', '/collections/shop/users');
  });

  it('cannot run until a data file is selected', () => {
    renderDialog();
    expect(screen.getByTestId('run-request-with-data-submit')).toBeDisabled();

    fireEvent.click(screen.getByTestId('mock-select-data-file'));
    expect(screen.getByTestId('run-request-with-data-submit')).not.toBeDisabled();
  });

  it('runs only this request with the data file, ignoring runner tag filters', async () => {
    const { onClose } = renderDialog({ runnerTags: { include: ['smoke'], exclude: [] } });

    fireEvent.click(screen.getByTestId('mock-select-data-file'));
    fireEvent.change(screen.getByTestId('run-request-iterations-input'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('run-request-with-data-submit'));

    await waitFor(() => expect(mockRunCollectionFolder).toHaveBeenCalled());
    expect(mockRunCollectionFolder).toHaveBeenCalledWith(
      'col-1',
      null,
      true,
      null,
      { include: [], exclude: [] },
      ['req-1'],
      { dataFilePath: '/data/users.csv', iterations: 5 }
    );
    expect(mockUpdateRunnerConfiguration).toHaveBeenCalledWith('col-1', ['req-1'], [], undefined, {
      dataFile: { path: '/data/users.csv', rowCount: 3, columns: ['name'] },
      iterations: '5'
    });
    expect(mockAddTab).toHaveBeenCalledWith(expect.objectContaining({ collectionUid: 'col-1', type: 'collection-runner' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('blocks an invalid iteration count', () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('mock-select-data-file'));
    fireEvent.change(screen.getByTestId('run-request-iterations-input'), { target: { value: '0' } });

    expect(screen.getByText('Iterations must be a whole number of at least 1')).toBeInTheDocument();
    expect(screen.getByTestId('run-request-with-data-submit')).toBeDisabled();
  });

  it('offers to view the runner while a collection run is in progress', () => {
    renderDialog({ runnerResult: { info: { status: 'started' } } });

    expect(screen.getByText('A Collection Run is already in progress.')).toBeInTheDocument();
    expect(screen.queryByTestId('run-request-with-data-submit')).not.toBeInTheDocument();
    expect(screen.getByText('View Run')).toBeInTheDocument();
  });
});
