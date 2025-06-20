import React, { Component, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addDebugError } from 'providers/ReduxStore/slices/logs';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError({
        message: error.message,
        stack: error.stack,
        error: error,
        timestamp: new Date().toISOString()
      });
    }

    setTimeout(() => {
      this.setState({ hasError: false });
    }, 100);
  }

  render() {
    return this.props.children;
  }
}

const serializeArgs = (args) => {
  return args.map(arg => {
    try {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return arg;
      }
      if (arg instanceof Error) {
        return {
          __type: 'Error',
          name: arg.name,
          message: arg.message,
          stack: arg.stack
        };
      }
      if (typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    } catch (e) {
      return '[Unserializable]';
    }
  });
};

// Helper function to extract file and line info from stack trace
const extractFileInfo = (stack) => {
  if (!stack) return { filename: null, lineno: null, colno: null };
  
  try {
    const lines = stack.split('\n');
    for (let line of lines) {
      if (line.includes('ErrorCapture') || line.trim() === 'Error') continue;
      
      const match = line.match(/(?:at\s+.*?\s+)?\(?([^)]+):(\d+):(\d+)\)?/);
      if (match) {
        return {
          filename: match[1],
          lineno: parseInt(match[2]),
          colno: parseInt(match[3])
        };
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return { filename: null, lineno: null, colno: null };
};

const useGlobalErrorCapture = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args) => {
      const currentStack = new Error().stack;
      
      originalConsoleError.apply(console, args);

      if (currentStack && currentStack.includes('useIpcEvents.js')) {
        return;
      }

      const errorMessage = args.join(' ');
      if (errorMessage.includes('removeConsoleLogListener')) {
        return;
      }

      const { filename, lineno, colno } = extractFileInfo(currentStack);

      const serializedArgs = serializeArgs(args);

      dispatch(addDebugError({
        message: errorMessage,
        stack: currentStack,
        filename: filename,
        lineno: lineno,
        colno: colno,
        args: serializedArgs,
        timestamp: new Date().toISOString()
      }));
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [dispatch]);
};

const ErrorCapture = ({ children }) => {
  const dispatch = useDispatch();
  
  useGlobalErrorCapture();

  const handleReactError = (errorData) => {
    dispatch(addDebugError(errorData));
  };

  return (
    <ErrorBoundary onError={handleReactError}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorCapture; 