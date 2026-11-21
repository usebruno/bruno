import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

jest.mock('providers/ReduxStore', () => ({
  __esModule: true,
  default: { getState: () => ({}) }
}));

jest.mock('./QueryResultPreview', () => () => <div data-testid="preview" />);
jest.mock('./QueryResultFilter', () => () => <div data-testid="filter" />);

jest.mock('providers/Theme/index', () => ({
  useTheme: () => ({ displayedTheme: 'light' })
}));

import QueryResult from './index';

const mockTheme = {
  colors: {
    text: {
      yellow: '#f59e0b',
      muted: '#6b7280',
      danger: '#ef4444'
    }
  },
  border: {
    border2: '#e5e7eb',
    radius: {
      sm: '4px'
    }
  },
  background: {
    base: '#ffffff'
  }
};

const renderWithTheme = (ui) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {ui}
    </ThemeProvider>
  );
};

describe('QueryResult error rendering', () => {
  const baseItem = {
    uid: 'req-1',
    filename: 'req-1.bru'
  };

  it('renders string error message correctly', () => {
    renderWithTheme(
      <QueryResult
        item={baseItem}
        collection={{}}
        error="Connection failed"
      />
    );

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders object error with message without crashing React (fixes issue #9708)', () => {
    const netError = {
      targetSite: 'Void CheckCredentials()',
      message: 'Invalid client credentials in request body',
      data: {},
      innerException: null,
      source: 'System.Web'
    };

    // Before fix, this would throw "Minified React error #31: Objects are not valid as a React child"
    expect(() => {
      renderWithTheme(
        <QueryResult
          item={baseItem}
          collection={{}}
          error={netError}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('Invalid client credentials in request body')).toBeInTheDocument();
  });

  it('renders object error with error_description correctly', () => {
    const oauthError = {
      error: 'invalid_grant',
      error_description: 'Grant expired or revoked'
    };

    renderWithTheme(
      <QueryResult
        item={baseItem}
        collection={{}}
        error={oauthError}
      />
    );

    expect(screen.getByText('invalid_grant: Grant expired or revoked')).toBeInTheDocument();
  });

  it('safely serializes arbitrary error objects without message', () => {
    const customError = {
      errorCode: 4001,
      reason: 'Rejected'
    };

    renderWithTheme(
      <QueryResult
        item={baseItem}
        collection={{}}
        error={customError}
      />
    );

    expect(screen.getByText((content) => content.includes('"errorCode": 4001'))).toBeInTheDocument();
  });

  it('strips send-http-request remote method prefix when present', () => {
    const prefixError = 'Error invoking remote method \'send-http-request\': Socket hang up';

    renderWithTheme(
      <QueryResult
        item={baseItem}
        collection={{}}
        error={prefixError}
      />
    );

    expect(screen.getByText('Socket hang up')).toBeInTheDocument();
  });
});
