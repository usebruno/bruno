import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import lightTheme from 'themes/light/light';
import { SetAsVariableContext } from 'providers/SetAsVariable/context';
import SingleLineEditor from './index';

const handlers = {};
const mockEditor = {
  on: jest.fn((event, fn) => {
    handlers[event] = fn;
  }),
  off: jest.fn((event) => {
    delete handlers[event];
  }),
  setValue: jest.fn(),
  getValue: jest.fn(() => ''),
  getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
  setCursor: jest.fn(),
  addOverlay: jest.fn(),
  removeOverlay: jest.fn(),
  getInputField: jest.fn(() => ({ classList: { add: jest.fn() } })),
  getWrapperElement: jest.fn(() => ({ remove: jest.fn() })),
  options: {},
  setOption: jest.fn()
};

jest.mock('codemirror', () => jest.fn(() => mockEditor));
jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn(() => jest.fn())
}));
jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: jest.fn()
}));
jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn(() => ({})),
  getVariableNamesWithScope: jest.fn(() => [])
}));
jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));
jest.mock('utils/common/masked-editor', () => ({
  MaskedEditor: jest.fn().mockImplementation(() => ({
    enable: jest.fn(),
    disable: jest.fn(),
    destroy: jest.fn(),
    isEnabled: jest.fn(() => false),
    update: jest.fn()
  }))
}));
jest.mock('utils/codemirror/selection', () => ({
  isSelectionPinned: jest.fn(() => false),
  pinSelectionOnContextMenu: jest.fn(),
  releasePinnedSelection: jest.fn()
}));
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);

const renderEditor = (props = {}) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <SetAsVariableContext.Provider value={{ openFromCodeMirror: jest.fn() }}>
        <SingleLineEditor value="" {...props} />
      </SetAsVariableContext.Provider>
    </ThemeProvider>
  );

describe('SingleLineEditor - stripNewlines', () => {
  beforeEach(() => {
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    jest.clearAllMocks();
  });

  it('strips pasted newlines via CodeMirror beforeChange when stripNewlines is enabled', () => {
    renderEditor({ stripNewlines: true });

    const update = jest.fn();
    const change = {
      from: { line: 0, ch: 0 },
      to: { line: 0, ch: 0 },
      text: ['https://auth.example.com', '/oauth/token', ''],
      origin: 'paste',
      update
    };

    handlers.beforeChange(mockEditor, change);

    expect(update).toHaveBeenCalledWith(change.from, change.to, ['https://auth.example.com/oauth/token']);
  });

  it('does not alter programmatic setValue changes even when stripNewlines is enabled', () => {
    renderEditor({ stripNewlines: true });

    const update = jest.fn();
    handlers.beforeChange(mockEditor, {
      from: { line: 0, ch: 0 },
      to: { line: 0, ch: 0 },
      text: ['line1', 'line2'],
      origin: 'setValue',
      update
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('leaves multi-line changes untouched when stripNewlines is not enabled', () => {
    renderEditor();

    const update = jest.fn();
    handlers.beforeChange(mockEditor, {
      from: { line: 0, ch: 0 },
      to: { line: 0, ch: 0 },
      text: ['line1', 'line2'],
      origin: 'paste',
      update
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('unregisters the beforeChange listener on unmount', () => {
    const { unmount } = renderEditor({ stripNewlines: true });
    unmount();

    expect(mockEditor.off).toHaveBeenCalledWith('beforeChange', expect.any(Function));
  });
});
