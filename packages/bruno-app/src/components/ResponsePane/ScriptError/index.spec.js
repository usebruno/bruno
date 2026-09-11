import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import ScriptError from './index';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const theme = {
  font: { size: { xs: '0.75rem' } },
  text: '#333',
  background: { base: '#fff', elevated: '#f5f5f5' },
  border: { border1: '#e0e0e0', border2: '#d0d0d0', radius: { base: '4px' } },
  colors: { text: { danger: '#ef4444', warning: '#f59e0b', muted: '#999' } }
};

const mockStore = configureStore({
  reducer: {
    tabs: (state = { tabs: [], activeTabUid: null }) => state,
    collections: (state = { collections: [] }) => state
  }
});

const renderWithProviders = (component) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </Provider>
  );
};

const mockCollection = {
  uid: 'col-1',
  pathname: '/home/user/collection'
};

const mockErrorContext = {
  errorType: 'ReferenceError',
  filePath: 'echo json.bru',
  errorLine: 4,
  lines: [
    { lineNumber: 3, content: 'const data = res.body;', isError: false },
    { lineNumber: 4, content: 'console.log(undefinedVar);', isError: true },
    { lineNumber: 5, content: '', isError: false }
  ],
  stack: '    at echo json.bru:4:5'
};

describe('ScriptError', () => {
  it('should render nothing when no errors', () => {
    const { container } = renderWithProviders(<ScriptError item={{}} collection={mockCollection} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should fall back to ErrorBanner when no errorContext', () => {
    const item = {
      preRequestScriptErrorMessage: 'something broke'
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(screen.getByText('something broke')).toBeInTheDocument();
  });

  it('should show CodeSnippet when errorContext is available', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    const { container } = renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(container.querySelector('.code-snippet')).toBeInTheDocument();
  });

  it('should show error line highlighted', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    const { container } = renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(container.querySelector('.highlighted-error')).toBeInTheDocument();
  });

  it('should show error type and message', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('ReferenceError: undefinedVar is not defined')).toBeInTheDocument();
  });

  it('should show file path with source label', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    const { container } = renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(container.querySelector('.script-error-file-path')).toBeInTheDocument();
    expect(screen.getByText('echo json.bru')).toBeInTheDocument();
    expect(screen.getByText('Request')).toBeInTheDocument();
  });

  it('should show "Collection Script" label for collection-level errors', () => {
    const item = {
      preRequestScriptErrorMessage: 'collection error',
      preRequestScriptErrorContext: {
        ...mockErrorContext,
        filePath: 'collection.bru'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByText('collection.bru')).toBeInTheDocument();
  });

  it('should show "Folder Script" label for folder-level errors', () => {
    const item = {
      preRequestScriptErrorMessage: 'folder error',
      preRequestScriptErrorContext: {
        ...mockErrorContext,
        filePath: 'subfolder/folder.bru'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Folder')).toBeInTheDocument();
    expect(screen.getByText('subfolder/folder.bru')).toBeInTheDocument();
  });

  it('should show "Request Script" label for request-level errors', () => {
    const item = {
      postResponseScriptErrorMessage: 'request error',
      postResponseScriptErrorContext: {
        ...mockErrorContext,
        filePath: 'my-request.bru'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('my-request.bru')).toBeInTheDocument();
  });

  it('should toggle stack trace visibility', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);

    // Stack should be hidden by default
    expect(screen.queryByText(/at echo json\.bru/)).not.toBeInTheDocument();
    expect(screen.getByText('Show stack trace')).toBeInTheDocument();

    // Click to show
    fireEvent.click(screen.getByText('Show stack trace'));
    expect(screen.getByText(/at echo json\.bru/)).toBeInTheDocument();
    expect(screen.getByText('Hide stack trace')).toBeInTheDocument();

    // Click to hide
    fireEvent.click(screen.getByText('Hide stack trace'));
    expect(screen.queryByText(/at echo json\.bru/)).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    const item = {
      preRequestScriptErrorMessage: 'error',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('script-error-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should toggle expanded state of the error card', () => {
    const item = {
      preRequestScriptErrorMessage: 'error',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    const card = screen.getByTestId('script-error-card');
    const toggle = screen.getByTestId('script-error-expand-toggle');

    expect(card).not.toHaveClass('expanded');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(card).toHaveClass('expanded');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(card).not.toHaveClass('expanded');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  describe('copy error', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };

    const stubClipboard = (writeText) => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      return writeText;
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      delete navigator.clipboard;
    });

    it('should copy the error details and show a success toast', async () => {
      const writeText = stubClipboard(jest.fn().mockResolvedValue());
      renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);

      fireEvent.click(screen.getByTestId('script-error-copy'));

      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      const copiedText = writeText.mock.calls[0][0];
      expect(copiedText).toBe(
        `File: echo json.bru:4\n\nReferenceError: undefinedVar is not defined\n\nStack trace:\n${mockErrorContext.stack}`
      );
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Script error details copied to clipboard'));
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show an error toast when the clipboard write fails', async () => {
      stubClipboard(jest.fn().mockRejectedValue(new Error('denied')));
      renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);

      fireEvent.click(screen.getByTestId('script-error-copy'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to copy script error details'));
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('should fallback to "Error" when errorType is missing', () => {
    const item = {
      preRequestScriptErrorMessage: 'something went wrong',
      preRequestScriptErrorContext: {
        ...mockErrorContext,
        errorType: undefined
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Error: something went wrong')).toBeInTheDocument();
  });

  it('should not show pointer cursor on non-navigable file path', () => {
    const item = {
      preRequestScriptErrorMessage: 'error',
      preRequestScriptErrorContext: mockErrorContext
    };
    // No item.uid means request-level navigation is disabled
    const { container } = renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    const filePath = container.querySelector('.script-error-file-path');
    expect(filePath).not.toHaveClass('navigable');
  });

  it('should detect folder-level errors with Windows backslash paths', () => {
    const item = {
      preRequestScriptErrorMessage: 'folder error',
      preRequestScriptErrorContext: {
        ...mockErrorContext,
        filePath: 'subfolder\\folder.bru'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Folder')).toBeInTheDocument();
    expect(screen.getByText('subfolder/folder.bru')).toBeInTheDocument();
  });

  it('should detect request-level errors with Windows backslash paths', () => {
    const item = {
      postResponseScriptErrorMessage: 'request error',
      postResponseScriptErrorContext: {
        ...mockErrorContext,
        filePath: 'subfolder\\my-request.bru'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('subfolder/my-request.bru')).toBeInTheDocument();
  });

  it('should handle multiple errors with their own context', () => {
    const item = {
      preRequestScriptErrorMessage: 'pre error',
      preRequestScriptErrorContext: mockErrorContext,
      testScriptErrorMessage: 'test error',
      testScriptErrorContext: {
        ...mockErrorContext,
        errorType: 'TypeError'
      }
    };
    renderWithProviders(<ScriptError item={item} collection={mockCollection} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(screen.getByText('Test Script Error')).toBeInTheDocument();
    expect(screen.getByText('ReferenceError: pre error')).toBeInTheDocument();
    expect(screen.getByText('TypeError: test error')).toBeInTheDocument();
  });
});
