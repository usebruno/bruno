/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import MultiLineEditor from './index';

const mockDestroyLinkAware = jest.fn();

jest.mock('codemirror', () => {
  return jest.fn(() => ({
    getInputField: jest.fn(() => ({ classList: { add: jest.fn() } })),
    getWrapperElement: jest.fn(() => ({ classList: { add: jest.fn(), remove: jest.fn() }, remove: jest.fn() })),
    setValue: jest.fn(),
    getValue: jest.fn(() => ''),
    getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
    setCursor: jest.fn(),
    setOption: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    refresh: jest.fn(),
    options: {}
  }));
});

jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn(() => jest.fn())
}));

const mockResolveLinkClickHandler = jest.fn((item, collection) => `handler:${item?.uid}:${collection?.uid}`);
jest.mock('utils/codemirror/linkClickHandler', () => ({
  resolveLinkClickHandler: (...args) => mockResolveLinkClickHandler(...args)
}));

const mockSetupLinkAware = jest.fn((editor) => {
  editor._destroyLinkAware = mockDestroyLinkAware;
});
jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: (...args) => mockSetupLinkAware(...args)
}));

jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn(() => ({})),
  getRequestTypeFromCollectionPresets: jest.fn(() => undefined)
}));

jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));

jest.mock('components/CodeEditor/state-persistence', () => ({
  applyEditorState: jest.fn(),
  captureViewState: jest.fn(),
  readPersistedEditorState: jest.fn(),
  writePersistedEditorState: jest.fn()
}));

const theme = {
  colors: { text: {} },
  text: '#000',
  font: { size: { base: '13px' } },
  codemirror: { placeholder: { color: '#999', opacity: 0.5 } }
};

const itemA = { uid: 'item-a', type: 'http-request' };
const collectionA = { uid: 'collection-a' };
const itemB = { uid: 'item-b', type: 'graphql-request' };
const collectionB = { uid: 'collection-b' };

const renderEditor = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <MultiLineEditor value="http://example.test/foo" {...props} />
    </ThemeProvider>
  );

describe('MultiLineEditor link-aware reconfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconfigures the link-click handler when item/collection change', () => {
    const { rerender } = renderEditor({ item: itemA, collection: collectionA });

    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
    expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBe('handler:item-a:collection-a');

    rerender(
      <ThemeProvider theme={theme}>
        <MultiLineEditor value="http://example.test/foo" item={itemB} collection={collectionB} />
      </ThemeProvider>
    );

    expect(mockDestroyLinkAware).toHaveBeenCalledTimes(1);
    expect(mockSetupLinkAware).toHaveBeenCalledTimes(2);
    expect(mockSetupLinkAware.mock.calls[1][1].onLinkClick).toBe('handler:item-b:collection-b');
  });

  it('reconfigures once collection becomes available after mount', () => {
    const { rerender } = renderEditor({ item: itemA, collection: undefined });

    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
    expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBe('handler:item-a:undefined');

    rerender(
      <ThemeProvider theme={theme}>
        <MultiLineEditor value="http://example.test/foo" item={itemA} collection={collectionA} />
      </ThemeProvider>
    );

    expect(mockDestroyLinkAware).toHaveBeenCalledTimes(1);
    expect(mockSetupLinkAware).toHaveBeenCalledTimes(2);
    expect(mockSetupLinkAware.mock.calls[1][1].onLinkClick).toBe('handler:item-a:collection-a');
  });

  it('does not reconfigure when item/collection stay the same', () => {
    const { rerender } = renderEditor({ item: itemA, collection: collectionA });

    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);

    rerender(
      <ThemeProvider theme={theme}>
        <MultiLineEditor value="http://example.test/foo" item={itemA} collection={collectionA} theme="dark" />
      </ThemeProvider>
    );

    expect(mockDestroyLinkAware).not.toHaveBeenCalled();
    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
  });
});
