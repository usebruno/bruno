import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import InlineWarningBar from './index';

const mockDismissItemWarnings = jest.fn((payload) => ({
  type: 'collections/dismissItemWarnings',
  payload
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  dismissItemWarnings: (payload) => mockDismissItemWarnings(payload)
}));

// Mock localStorage and matchMedia for ThemeProvider
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
    value: {
      getItem: jest.fn(() => 'dark'),
      setItem: jest.fn(),
      removeItem: jest.fn()
    }
  });
});

beforeEach(() => {
  mockDismissItemWarnings.mockClear();
});

const createTestStore = () => {
  const collectionsSlice = createSlice({
    name: 'collections',
    initialState: { collections: [] },
    reducers: {
      dismissItemWarnings: () => {}
    }
  });

  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences: {} },
    reducers: {}
  });

  return configureStore({
    reducer: {
      collections: collectionsSlice.reducer,
      app: appSlice.reducer
    }
  });
};

const renderComponent = (props) => {
  const store = createTestStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <InlineWarningBar {...props} />
        </ThemeProvider>
      </Provider>
    )
  };
};

const makeItem = (warnings) => ({
  uid: 'item-1',
  warnings,
  dismissedWarningRules: []
});

const makeWarning = (api, line, location = 'pre-request-script') => ({
  ruleId: 'untranslated-pm-api',
  type: 'untranslated-api',
  location,
  message: `Unsupported Postman API in pre-request script: ${api}`,
  line
});

describe('InlineWarningBar', () => {
  it('renders nothing when no warnings', () => {
    const { container } = renderComponent({
      item: makeItem([]),
      collectionUid: 'col-1',
      location: 'pre-request-script'
    });
    expect(container.innerHTML).toBe('');
  });

  it('shows correct count summary for multiple warnings', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 3),
      makeWarning('pm.iterationData.get', 7)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });
    expect(screen.getByText('2 unsupported Postman APIs found: pm.vault.get, pm.iterationData.get')).toBeInTheDocument();
  });

  it('shows singular form for single warning', () => {
    const item = makeItem([makeWarning('pm.vault.get', 3)]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });
    expect(screen.getByText('Unsupported Postman API found: pm.vault.get')).toBeInTheDocument();
  });

  it('truncates when more than 3 warnings and shows +N more', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 1),
      makeWarning('pm.iterationData.get', 2),
      makeWarning('pm.cookies.get', 3),
      makeWarning('pm.globals.set', 4),
      makeWarning('pm.test', 5)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    const title = screen.getByText(/5 unsupported Postman APIs found:/);
    expect(title.textContent).toContain('pm.vault.get');
    expect(title.textContent).toContain('pm.iterationData.get');
    expect(title.textContent).toContain('pm.cookies.get');
    expect(title.textContent).not.toContain('pm.globals.set');
    expect(title.textContent).not.toContain('pm.test');
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('expands to show all API names when +N more is clicked', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 1),
      makeWarning('pm.iterationData.get', 2),
      makeWarning('pm.cookies.get', 3),
      makeWarning('pm.globals.set', 4),
      makeWarning('pm.test', 5)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    fireEvent.click(screen.getByText('+2 more'));

    const title = screen.getByText(/5 unsupported Postman APIs found:/);
    expect(title.textContent).toContain('pm.globals.set');
    expect(title.textContent).toContain('pm.test');
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses back when Show less is clicked', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 1),
      makeWarning('pm.iterationData.get', 2),
      makeWarning('pm.cookies.get', 3),
      makeWarning('pm.globals.set', 4),
      makeWarning('pm.test', 5)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    fireEvent.click(screen.getByText('+2 more'));
    fireEvent.click(screen.getByText('Show less'));

    const title = screen.getByText(/5 unsupported Postman APIs found:/);
    expect(title.textContent).not.toContain('pm.globals.set');
    expect(title.textContent).not.toContain('pm.test');
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows all API names without truncation when exactly 3 warnings', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 1),
      makeWarning('pm.iterationData.get', 2),
      makeWarning('pm.cookies.get', 3)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    const title = screen.getByText(/3 unsupported Postman APIs found:/);
    expect(title.textContent).toContain('pm.vault.get');
    expect(title.textContent).toContain('pm.iterationData.get');
    expect(title.textContent).toContain('pm.cookies.get');
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('truncates when exactly 4 warnings, showing +1 more', () => {
    const item = makeItem([
      makeWarning('pm.vault.get', 1),
      makeWarning('pm.iterationData.get', 2),
      makeWarning('pm.cookies.get', 3),
      makeWarning('pm.globals.set', 4)
    ]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    const title = screen.getByText(/4 unsupported Postman APIs found:/);
    expect(title.textContent).toContain('pm.vault.get');
    expect(title.textContent).toContain('pm.iterationData.get');
    expect(title.textContent).toContain('pm.cookies.get');
    expect(title.textContent).not.toContain('pm.globals.set');
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('dismiss button dispatches dismissItemWarnings with correct args', () => {
    const item = makeItem([makeWarning('pm.vault.get', 3)]);
    renderComponent({ item, collectionUid: 'col-1', location: 'pre-request-script' });

    const dismissBtn = screen.getByTitle('Dismiss warnings');
    fireEvent.click(dismissBtn);

    expect(mockDismissItemWarnings).toHaveBeenCalledWith({
      collectionUid: 'col-1',
      itemUid: 'item-1',
      location: 'pre-request-script'
    });
  });
});
