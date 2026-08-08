import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import GrpcQueryUrl from './index';

const theme = {
  background: {
    surface2: '#222'
  },
  border: {
    radius: {
      base: '4px'
    }
  },
  colors: {
    text: {
      green: '#22c55e'
    }
  },
  dropdown: {
    hoverBg: '#333'
  },
  request: {
    grpc: '#0ea5e9'
  },
  requestTabPanel: {
    url: {
      bg: '#111',
      border: '1px solid #333'
    }
  },
  requestTabs: {
    icon: {
      color: '#aaa'
    }
  },
  text: '#fff'
};

jest.mock('providers/Theme', () => ({
  useTheme: () => ({
    theme,
    storedTheme: 'light'
  })
}));

jest.mock('components/SingleLineEditor/index', () => {
  const React = require('react');
  const { forwardRef, useEffect, useImperativeHandle, useState } = React;

  return forwardRef(({ value, onChange }, ref) => {
    const [inputValue, setInputValue] = useState(value || '');

    useEffect(() => {
      setInputValue(value || '');
    }, [value]);

    useImperativeHandle(ref, () => ({
      editor: {
        getCursor: jest.fn(() => ({ line: 0, ch: inputValue.length })),
        getValue: jest.fn(() => inputValue),
        setCursor: jest.fn()
      }
    }), [inputValue]);

    return (
      <input
        data-testid="grpc-url-editor"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange?.(e.target.value);
        }}
      />
    );
  });
});

jest.mock('./MethodDropdown', () => () => <div data-testid="grpc-method-dropdown" />);
jest.mock('./ProtoFileDropdown', () => () => <div data-testid="grpc-proto-dropdown" />);
jest.mock('./GrpcurlModal', () => () => null);
jest.mock('hooks/useReflectionManagement/index', () => () => ({
  loadMethodsFromReflection: jest.fn(() => new Promise(() => {}))
}));
jest.mock('hooks/useProtoFileManagement/index', () => () => ({
  loadMethodsFromProtoFile: jest.fn(() => new Promise(() => {}))
}));

const createStore = () => configureStore({
  reducer: {
    collections: (state = { activeConnections: [], lastUrl: '' }, action) => {
      if (action.payload?.url) {
        return {
          ...state,
          lastUrl: action.payload.url
        };
      }
      return state;
    }
  }
});

const renderGrpcQueryUrl = (requestUrl = 'grpc://localhost:50051') => {
  const store = createStore();
  const item = {
    uid: 'item-1',
    request: {
      method: '',
      protoPath: '',
      type: 'grpc',
      url: requestUrl
    }
  };
  const collection = {
    uid: 'collection-1'
  };

  render(
    <Provider store={store}>
      <StyledThemeProvider theme={theme}>
        <GrpcQueryUrl item={item} collection={collection} handleRun={jest.fn()} />
      </StyledThemeProvider>
    </Provider>
  );

  return store;
};

describe('GrpcQueryUrl', () => {
  it('keeps the editor scheme-less while persisting the TLS scheme on toggle', () => {
    const store = renderGrpcQueryUrl('grpc://localhost:50051');

    const editor = screen.getByTestId('grpc-url-editor');
    expect(editor).toHaveValue('localhost:50051');

    fireEvent.click(screen.getByTestId('grpc-tls-toggle'));

    expect(editor).toHaveValue('localhost:50051');
    expect(store.getState().collections.lastUrl).toBe('grpcs://localhost:50051');
  });

  it('uses the latest editor value when toggling before the debounced URL change runs', () => {
    const store = renderGrpcQueryUrl('grpc://localhost:50051');

    const editor = screen.getByTestId('grpc-url-editor');
    fireEvent.change(editor, { target: { value: 'api.example.com:443' } });
    fireEvent.click(screen.getByTestId('grpc-tls-toggle'));

    expect(editor).toHaveValue('api.example.com:443');
    expect(store.getState().collections.lastUrl).toBe('grpcs://api.example.com:443');
  });
});
