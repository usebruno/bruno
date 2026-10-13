import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RunnerDataFile from './index';

const mockBrowseFiles = jest.fn();
const mockGetIterationDataPreview = jest.fn();

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseFiles: (...args) => () => mockBrowseFiles(...args),
  getIterationDataPreview: (filePath) => () => mockGetIterationDataPreview(filePath)
}));

jest.mock('ui/Button/index', () => ({
  __esModule: true,
  default: ({ children, icon, ...props }) => <button {...props}>{children}</button>
}));

const theme = { colors: { text: { danger: '#ef4444', muted: '#999' } } };

const renderDataFile = (props) => {
  const store = configureStore({ reducer: { app: (state = {}) => state } });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <RunnerDataFile dataFile={null} onChange={jest.fn()} {...props} />
      </ThemeProvider>
    </Provider>
  );
};

describe('RunnerDataFile', () => {
  beforeEach(() => {
    mockBrowseFiles.mockReset();
    mockGetIterationDataPreview.mockReset();
  });

  it('selects a csv or json file and reports its preview', async () => {
    const onChange = jest.fn();
    mockBrowseFiles.mockResolvedValue(['/data/users.csv']);
    mockGetIterationDataPreview.mockResolvedValue({ rowCount: 2, columns: ['name', 'age'] });

    renderDataFile({ onChange });
    fireEvent.click(screen.getByTestId('runner-data-file-select'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ path: '/data/users.csv', rowCount: 2, columns: ['name', 'age'] }));
    expect(mockBrowseFiles).toHaveBeenCalledWith([{ name: 'CSV or JSON', extensions: ['csv', 'json'] }], [], undefined);
  });

  it('opens the dialog in the default directory', async () => {
    mockBrowseFiles.mockResolvedValue([]);

    renderDataFile({ defaultDirectory: '/collections/shop/users' });
    fireEvent.click(screen.getByTestId('runner-data-file-select'));

    await waitFor(() => expect(mockBrowseFiles).toHaveBeenCalledWith(expect.any(Array), [], '/collections/shop/users'));
  });

  it('does nothing when the dialog is cancelled', async () => {
    const onChange = jest.fn();
    mockBrowseFiles.mockResolvedValue([]);

    renderDataFile({ onChange });
    fireEvent.click(screen.getByTestId('runner-data-file-select'));

    await waitFor(() => expect(mockBrowseFiles).toHaveBeenCalled());
    expect(mockGetIterationDataPreview).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the parse error without the IPC prefix and keeps the previous selection', async () => {
    const onChange = jest.fn();
    mockBrowseFiles.mockResolvedValue(['/data/broken.csv']);
    mockGetIterationDataPreview.mockRejectedValue(
      new Error('Error invoking remote method \'renderer:get-iteration-data-preview\': Error: broken.csv: Invalid CSV at line 3: expected 2 fields but found 1')
    );

    renderDataFile({ onChange });
    fireEvent.click(screen.getByTestId('runner-data-file-select'));

    expect(await screen.findByTestId('runner-data-file-error')).toHaveTextContent('broken.csv: Invalid CSV at line 3: expected 2 fields but found 1');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the selected file with its row count and columns', () => {
    renderDataFile({ dataFile: { path: '/data/users.csv', rowCount: 1, columns: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] } });

    expect(screen.getByTestId('runner-data-file-name')).toHaveTextContent('users.csv');
    expect(screen.getByTestId('runner-data-file-details')).toHaveTextContent('1 row · a, b, c, d, e +2 more');
  });

  it('clears the selection', () => {
    const onChange = jest.fn();
    renderDataFile({ dataFile: { path: '/data/users.csv', rowCount: 2, columns: [] }, onChange });

    fireEvent.click(screen.getByTestId('runner-data-file-remove'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
