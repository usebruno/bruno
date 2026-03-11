import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ScriptError from './index';

const theme = {
  font: { size: { xs: '0.75rem' } },
  text: '#333',
  background: { base: '#fff', elevated: '#f5f5f5' },
  border: { border1: '#e0e0e0', border2: '#d0d0d0', radius: { base: '4px' } },
  colors: { text: { danger: '#ef4444', warning: '#f59e0b', muted: '#999' } }
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
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
    const { container } = renderWithTheme(<ScriptError item={{}} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should fall back to ErrorBanner when no errorContext', () => {
    const item = {
      preRequestScriptErrorMessage: 'something broke'
    };
    renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(screen.getByText('something broke')).toBeInTheDocument();
  });

  it('should show CodeSnippet when errorContext is available', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    const { container } = renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(container.querySelector('.code-snippet')).toBeInTheDocument();
  });

  it('should show error line highlighted', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    const { container } = renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(container.querySelector('.highlighted-error')).toBeInTheDocument();
  });

  it('should show error type and message', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(screen.getByText('ReferenceError: undefinedVar is not defined')).toBeInTheDocument();
  });

  it('should show file path', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(screen.getByText('echo json.bru')).toBeInTheDocument();
  });

  it('should toggle stack trace visibility', () => {
    const item = {
      preRequestScriptErrorMessage: 'undefinedVar is not defined',
      preRequestScriptErrorContext: mockErrorContext
    };
    renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);

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
    const { container } = renderWithTheme(<ScriptError item={item} onClose={onClose} />);
    const closeButton = container.querySelector('.close-button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
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
    renderWithTheme(<ScriptError item={item} onClose={jest.fn()} />);
    expect(screen.getByText('Pre-Request Script Error')).toBeInTheDocument();
    expect(screen.getByText('Test Script Error')).toBeInTheDocument();
    expect(screen.getByText('ReferenceError: pre error')).toBeInTheDocument();
    expect(screen.getByText('TypeError: test error')).toBeInTheDocument();
  });
});
