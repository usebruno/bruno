import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EnvironmentVariablesTable from './index';

jest.mock('nanoid', () => {
  let n = 0;
  return {
    nanoid: () => `id-${++n}`,
    customAlphabet: () => () => `id-${++n}`
  };
});

jest.mock('react-virtuoso', () => {
  const R = require('react');
  return {
    TableVirtuoso: ({ data = [], itemContent, fixedHeaderContent, components, computeItemKey }) => {
      const Row = (components && components.TableRow) || ((p) => R.createElement('tr', p, p.children));
      return R.createElement(
        'table',
        null,
        R.createElement('thead', null, fixedHeaderContent ? fixedHeaderContent() : null),
        R.createElement(
          'tbody',
          null,
          data.map((item, i) =>
            R.createElement(
              Row,
              { 'key': computeItemKey ? computeItemKey(i, item) : i, item, 'data-index': i },
              itemContent(i, item)
            )
          )
        )
      );
    }
  };
});

jest.mock('components/MultiLineEditor/index', () => ({
  __esModule: true,
  default: ({ name, value, onChange, placeholder }) => {
    const R = require('react');
    return R.createElement('input', {
      'data-testid': `mle-${name}`,
      name,
      'value': value ?? '',
      placeholder,
      'onChange': (e) => onChange(e.target.value)
    });
  }
}));

jest.mock('components/DataTypeSelector', () => ({ __esModule: true, default: () => null }));

jest.mock('./StyledWrapper', () => ({
  __esModule: true,
  default: ({ children, ...rest }) => require('react').createElement('div', rest, children)
}));

jest.mock('providers/Theme', () => ({ useTheme: () => ({ storedTheme: 'light' }) }));

const makeStore = () =>
  configureStore({
    reducer: {
      globalEnvironments: (s = { globalEnvironments: [], activeGlobalEnvironmentUid: null }) => s,
      workspaces: (s = { activeWorkspaceUid: null, workspaces: [] }) => s,
      tabs: (s = { tabs: [], activeTabUid: 'tab-1' }) => s
    }
  });

const baseProps = (overrides = {}) => ({
  environment: { uid: 'env', variables: [] },
  collection: null,
  onSave: jest.fn(() => Promise.resolve()),
  draft: null,
  onDraftChange: jest.fn(),
  onDraftClear: jest.fn(),
  setIsModified: jest.fn(),
  searchQuery: '',
  ...overrides
});

const renderTable = (props) => {
  const store = makeStore();
  const ui = (p) => (
    <Provider store={store}>
      <EnvironmentVariablesTable {...p} />
    </Provider>
  );
  const utils = render(ui(props));
  return { ...utils, rerender: (p) => utils.rerender(ui(p)) };
};

const nameInput = (container, index = 0) => container.querySelector(`input[name="${index}.name"]`);
const valueInput = (container, index = 0) => container.querySelector(`[data-testid="mle-${index}.value"]`);
const saveButton = (container) => container.querySelector('[data-testid="save-env"]');

const persisted = (name, value = '') => ({ uid: `p-${name}`, name, value, type: 'text', secret: false, enabled: true });

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

// Type into an input and flush Formik's async validation microtask within act.
const type = async (input, value) => {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
    jest.advanceTimersByTime(0);
  });
};
const advance = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
const rerenderAct = async (rerender, props) => {
  await act(async () => {
    rerender(props);
  });
};

describe('EnvironmentVariablesTable — autosave cursor-jump regression', () => {
  it('does not reinitialize when the saved values match a locally emitted snapshot', async () => {
    const props = baseProps({ environment: { uid: 'env1', variables: [] } });
    const { container, rerender } = renderTable(props);

    await type(nameInput(container), 'ab');
    await advance(300);
    expect(props.onDraftChange).toHaveBeenCalled();

    await type(nameInput(container), 'abc');
    expect(nameInput(container).value).toBe('abc');

    await rerenderAct(rerender, { ...props, environment: { uid: 'env1', variables: [persisted('ab')] } });

    expect(nameInput(container).value).toBe('abc');
  });

  it('reinitializes when environment.variables changes from a genuine external source', async () => {
    const props = baseProps({ environment: { uid: 'env2', variables: [persisted('alpha', '1')] } });
    const { container, rerender } = renderTable(props);
    expect(nameInput(container).value).toBe('alpha');

    await rerenderAct(rerender, { ...props, environment: { uid: 'env2', variables: [persisted('beta', '1')] } });

    expect(nameInput(container).value).toBe('beta');
  });

  it('restores an in-progress draft over the saved values on mount', () => {
    const props = baseProps({
      environment: { uid: 'env3', variables: [] },
      draft: { environmentUid: 'env3', variables: [persisted('fromDraft', 'x')] }
    });
    const { container } = renderTable(props);

    expect(nameInput(container).value).toBe('fromDraft');
  });

  it('does not reset an in-progress Value edit when an autosave echo lands', async () => {
    const props = baseProps({ environment: { uid: 'env4', variables: [] } });
    const { container, rerender } = renderTable(props);

    await type(nameInput(container), 'k');
    await advance(300);

    await type(valueInput(container), 'secret-token');
    expect(valueInput(container).value).toBe('secret-token');

    await rerenderAct(rerender, { ...props, environment: { uid: 'env4', variables: [persisted('k', '')] } });

    expect(valueInput(container).value).toBe('secret-token');
    expect(nameInput(container).value).toBe('k');
  });

  it('records a snapshot on manual Save so the save echo does not reset later typing', async () => {
    const props = baseProps({ environment: { uid: 'env5', variables: [] } });
    const { container, rerender } = renderTable(props);

    await type(nameInput(container), 'm');
    await advance(0);

    await act(async () => {
      fireEvent.click(saveButton(container));
    });
    expect(props.onSave).toHaveBeenCalled();

    await type(nameInput(container), 'mn');
    expect(nameInput(container).value).toBe('mn');

    await rerenderAct(rerender, { ...props, environment: { uid: 'env5', variables: [persisted('m')] } });

    expect(nameInput(container).value).toBe('mn');
  });
});
