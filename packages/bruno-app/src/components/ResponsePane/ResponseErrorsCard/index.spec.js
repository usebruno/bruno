import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import path from 'path';
import { getResponsePaneErrors } from 'utils/response-pane-errors';
import ResponseErrorsCard from './index';

jest.mock('platform', () => ({
  os: {
    family: process.platform === 'win32' ? 'Windows' : 'Linux'
  }
}));
jest.mock('components/ToolHint', () => () => null);

const collectionPath = path.resolve('workspace', 'collection');

const collection = {
  uid: 'col-1',
  pathname: collectionPath,
  items: [
    {
      uid: 'folder-1',
      type: 'folder',
      name: 'users',
      pathname: path.join(collectionPath, 'users'),
      items: [{ uid: 'req-1' }]
    }
  ]
};

const errorContext = {
  errorType: 'ReferenceError',
  filePath: 'echo json.yml',
  errorLine: 4,
  lines: [
    { lineNumber: 3, content: 'const data = res.body;', isError: false },
    { lineNumber: 4, content: 'console.log(undefinedVar);', isError: true }
  ],
  stack: '    at echo json.yml:4:5'
};

const postResponseError = {
  postResponseScriptErrorMessage: 'undefinedVar is not defined\nsecond line',
  postResponseScriptErrorContext: errorContext
};

const testError = {
  testScriptErrorMessage: 'expected 401 to equal 200',
  testScriptErrorContext: {
    errorType: 'AssertionError',
    filePath: 'users/folder.yml',
    errorLine: 6,
    lines: [
      { lineNumber: 5, content: 'const status = res.getStatus();', isError: false },
      { lineNumber: 6, content: 'expect(status).to.equal(200);', isError: true }
    ],
    stack: '    at users/folder.yml:6:1'
  }
};

const renderCard = (item, props = {}) => {
  const store = configureStore({ reducer: (state = {}) => state });

  jest.spyOn(store, 'dispatch');

  const utils = render(
    <Provider store={store}>
      <ThemeProvider>
        <ResponseErrorsCard
          errors={getResponsePaneErrors(item, collection)}
          item={item}
          collection={collection}
          isCardFullPane={false}
          onToggleCardFullPane={jest.fn()}
          onClose={jest.fn()}
          {...props}
        />
      </ThemeProvider>
    </Provider>
  );
  return { ...utils, store };
};

const dispatchedTypes = (store) => store.dispatch.mock.calls.map(([action]) => action.type);

beforeAll(() => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
});

describe('ResponseErrorsCard', () => {
  it('highlights the error line in the code snippet', () => {
    renderCard({ preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: errorContext });
    expect(screen.getByTestId('code-line-error')).toHaveTextContent('console.log(undefinedVar);');
  });

  it('does not make the file path navigable when the folder cannot be resolved', () => {
    renderCard({ uid: 'req-1', preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: { ...errorContext, filePath: 'other/folder.yml' } });
    expect(screen.getByTestId('response-errors-file-path')).not.toHaveClass('navigable');
  });

  it('calls onClose when close is pressed', () => {
    const onClose = jest.fn();
    renderCard({ preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: errorContext }, { onClose });
    fireEvent.click(screen.getByTestId('response-errors-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows one error with its title and header actions, then its source, file path, snippet and typed message without a row', () => {
    renderCard({ preRequestScriptErrorMessage: 'undefinedVar is not defined', preRequestScriptErrorContext: errorContext });

    expect(screen.getByTestId('response-errors-title')).toHaveTextContent('Pre-Request Script Error');
    expect(screen.getByTestId('response-errors-copy')).toBeInTheDocument();
    expect(screen.getByTestId('response-errors-full-pane-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('response-errors-toggle-all')).not.toBeInTheDocument();
    expect(screen.getByTestId('response-errors-source-label')).toHaveTextContent('Request');
    expect(screen.getByTestId('response-errors-file-path')).toHaveTextContent('echo json.yml:4');
    expect(screen.getByTestId('code-snippet')).toBeInTheDocument();
    expect(screen.getByTestId('response-errors-message')).toHaveTextContent('ReferenceError: undefinedVar is not defined');
    expect(screen.queryByTestId('response-errors-row')).not.toBeInTheDocument();
  });

  it('shows and hides the stack trace for its own row only', () => {
    renderCard({ ...postResponseError, ...testError });
    const [postRow, testRow] = screen.getAllByTestId('response-errors-row');
    fireEvent.click(within(postRow).getByTestId('response-errors-row-toggle'));
    fireEvent.click(within(testRow).getByTestId('response-errors-row-toggle'));

    fireEvent.click(within(postRow).getByText('Show stack trace'));
    expect(within(postRow).getByTestId('response-errors-stack-trace')).toHaveTextContent('at echo json.yml:4:5');
    expect(within(testRow).queryByTestId('response-errors-stack-trace')).not.toBeInTheDocument();

    fireEvent.click(within(postRow).getByText('Hide stack trace'));
    expect(within(postRow).queryByTestId('response-errors-stack-trace')).not.toBeInTheDocument();
  });

  it('calls onToggleCardFullPane and reflects the full-pane state in aria-pressed', () => {
    const onToggleCardFullPane = jest.fn();
    const item = { preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: errorContext };
    const { rerender, store } = renderCard(item, { onToggleCardFullPane });
    const toggle = screen.getByTestId('response-errors-full-pane-toggle');

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(onToggleCardFullPane).toHaveBeenCalledTimes(1);

    rerender(
      <Provider store={store}>
        <ThemeProvider>
          <ResponseErrorsCard errors={getResponsePaneErrors(item, collection)} item={item} collection={collection} isCardFullPane onToggleCardFullPane={onToggleCardFullPane} onClose={jest.fn()} />
        </ThemeProvider>
      </Provider>
    );
    expect(screen.getByTestId('response-errors-card')).toHaveClass('full-pane');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an error without context as its message without a type prefix or snippet', () => {
    renderCard({ postResponseScriptErrorMessage: 'Request failed with status code 401' });

    expect(screen.getByTestId('response-errors-message')).toHaveTextContent(/^Request failed with status code 401$/);
    expect(screen.queryByTestId('code-snippet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-errors-source-label')).not.toBeInTheDocument();
  });

  it('shows the error count in the header with expand all, expand to full pane and close', () => {
    renderCard({ ...postResponseError, ...testError });

    expect(screen.getByTestId('response-errors-title')).toHaveTextContent('2 errors');
    expect(screen.getByTestId('response-errors-toggle-all')).toHaveAttribute('data-tooltip-content', 'Expand all');
    expect(screen.getByTestId('response-errors-full-pane-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('response-errors-close')).toBeInTheDocument();
  });

  it('starts rows collapsed with their label and the first line of the message, titled with the full message', () => {
    renderCard({ ...postResponseError, testScriptErrorMessage: 'no context' });
    const [postRow, testRow] = screen.getAllByTestId('response-errors-row');

    expect(within(postRow).getByTestId('response-errors-row-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(within(postRow).getByText('Post-Response')).toBeInTheDocument();
    expect(within(postRow).getByTestId('response-errors-row-preview')).toHaveTextContent(/^undefinedVar is not defined$/);
    expect(within(postRow).getByTestId('response-errors-row-preview')).toHaveAttribute('title', 'ReferenceError: undefinedVar is not defined\nsecond line');
    expect(within(testRow).getByTestId('response-errors-row-preview')).toHaveAttribute('title', 'no context');
    expect(screen.queryByTestId('response-errors-message')).not.toBeInTheDocument();
  });

  it('opens and closes rows independently, showing the detail in place of the preview', () => {
    renderCard({ ...postResponseError, ...testError });
    const [postRow, testRow] = screen.getAllByTestId('response-errors-row');

    fireEvent.click(within(postRow).getByTestId('response-errors-row-toggle'));
    expect(within(postRow).getByTestId('response-errors-message')).toBeInTheDocument();
    expect(within(postRow).queryByTestId('response-errors-row-preview')).not.toBeInTheDocument();
    expect(within(testRow).queryByTestId('response-errors-message')).not.toBeInTheDocument();

    fireEvent.click(within(testRow).getByTestId('response-errors-row-toggle'));
    fireEvent.click(within(postRow).getByTestId('response-errors-row-toggle'));
    expect(within(postRow).queryByTestId('response-errors-message')).not.toBeInTheDocument();
    expect(within(testRow).getByTestId('response-errors-message')).toBeInTheDocument();
  });

  it('expands all rows and turns into collapse all, which collapses them again', () => {
    renderCard({ ...postResponseError, ...testError });
    const toggleAll = screen.getByTestId('response-errors-toggle-all');

    fireEvent.click(toggleAll);
    expect(screen.getAllByTestId('response-errors-message')).toHaveLength(2);
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Collapse all');

    fireEvent.click(toggleAll);
    expect(screen.queryByTestId('response-errors-message')).not.toBeInTheDocument();
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Expand all');
  });

  it('offers expand all while some rows are still collapsed, and expanding the rest turns it into collapse all', () => {
    renderCard({ ...postResponseError, ...testError });
    const toggleAll = screen.getByTestId('response-errors-toggle-all');
    const [postRowToggle, testRowToggle] = screen.getAllByTestId('response-errors-row-toggle');

    fireEvent.click(postRowToggle);
    expect(screen.getAllByTestId('response-errors-message')).toHaveLength(1);
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Expand all');

    fireEvent.click(toggleAll);
    expect(screen.getAllByTestId('response-errors-message')).toHaveLength(2);
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Collapse all');

    fireEvent.click(testRowToggle);
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Expand all');

    fireEvent.click(testRowToggle);
    expect(toggleAll).toHaveAttribute('data-tooltip-content', 'Collapse all');
  });

  it('copies only the error a row belongs to', async () => {
    renderCard({ ...postResponseError, ...testError });
    const [, testRow] = screen.getAllByTestId('response-errors-row');

    await act(async () => fireEvent.click(within(testRow).getByTestId('response-errors-copy')));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'File: users/folder.yml:6\n\nAssertionError: expected 401 to equal 200\n\nStack trace:\n    at users/folder.yml:6:1'
    );
  });

  it('copies the single error from the header', async () => {
    renderCard({ postResponseScriptErrorMessage: 'Request failed with status code 401' });

    await act(async () => fireEvent.click(screen.getByTestId('response-errors-copy')));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Request failed with status code 401');
  });

  it('opens the right editor tab at the error line from a navigable file path, which is a real button', () => {
    const { store } = renderCard({ uid: 'req-1', ...postResponseError, ...testError });
    const [postRow, testRow] = screen.getAllByTestId('response-errors-row');
    fireEvent.click(within(postRow).getByTestId('response-errors-row-toggle'));
    fireEvent.click(within(testRow).getByTestId('response-errors-row-toggle'));

    fireEvent.click(within(postRow).getByTestId('response-errors-file-path'));
    expect(dispatchedTypes(store)).toEqual(['tabs/addTab', 'tabs/updateRequestPaneTab', 'tabs/updateScriptPaneTab', 'tabs/setFocusErrorLine']);
    expect(store.dispatch.mock.calls[3][0].payload).toEqual(expect.objectContaining({ uid: 'req-1', scriptPhase: 'post-response', line: 4 }));

    store.dispatch.mockClear();
    const testFilePath = within(testRow).getByTestId('response-errors-file-path');
    expect(testFilePath).toHaveAttribute('type', 'button');
    fireEvent.click(testFilePath);
    expect(store.dispatch.mock.calls[0][0].payload).toEqual(expect.objectContaining({ uid: 'folder-1', type: 'folder-settings' }));
    expect(store.dispatch.mock.calls[1][0].payload).toEqual(expect.objectContaining({ folderUid: 'folder-1', tab: 'test' }));
  });

  it('opens collection settings for a collection-level error', () => {
    const { store } = renderCard({ uid: 'req-1', preRequestScriptErrorMessage: 'token is not defined', preRequestScriptErrorContext: { ...errorContext, filePath: 'opencollection.yml' } });

    fireEvent.click(screen.getByTestId('response-errors-file-path'));
    expect(store.dispatch.mock.calls[0][0].payload).toEqual(expect.objectContaining({ uid: 'col-1', type: 'collection-settings' }));
  });
});
