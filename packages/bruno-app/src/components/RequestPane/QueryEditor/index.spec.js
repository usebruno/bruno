/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import QueryEditor from './index';

const mockDestroyLinkAware = jest.fn();

jest.mock('codemirror', () => {
  const CodeMirror = jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    execCommand: jest.fn(),
    getValue: jest.fn(() => ''),
    getCursor: jest.fn(() => ({ line: 0, ch: 0 })),
    setCursor: jest.fn(),
    setValue: jest.fn(),
    getInputField: jest.fn(() => ({ classList: { add: jest.fn() } })),
    getWrapperElement: jest.fn(() => ({ classList: { add: jest.fn(), remove: jest.fn() }, remove: jest.fn() })),
    setOption: jest.fn(),
    refresh: jest.fn(),
    options: { lint: {}, hintOptions: {}, info: {}, jump: {} }
  }));
  CodeMirror.helpers = {};
  return CodeMirror;
});

jest.mock('utils/codemirror/resize', () => ({
  setupCodeMirrorResizeRefresh: jest.fn(() => jest.fn())
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

const theme = {
  colors: { text: { danger: '#f00' } },
  status: { danger: { background: '#f00' }, success: { background: '#0f0' } },
  codemirror: {
    bg: '#fff',
    border: '#ccc',
    tokens: {
      atom: '#000', comment: '#000', definition: '#000', keyword: '#000',
      number: '#000', operator: '#000', property: '#000', string: '#000',
      tag: '#000', tagBracket: '#000', variable: '#000'
    },
    variable: { invalid: '#f00', valid: '#000' }
  }
};

const itemA = { uid: 'item-a', type: 'graphql-request' };
const collectionA = { uid: 'collection-a' };
const itemB = { uid: 'item-b', type: 'graphql-request' };
const collectionB = { uid: 'collection-b' };

const renderEditor = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <QueryEditor value="query { foo }" {...props} />
    </ThemeProvider>
  );

describe('QueryEditor link-aware reconfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconfigures the link-click handler when item/collection change', () => {
    const { rerender } = renderEditor({ item: itemA, collection: collectionA });

    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
    expect(mockSetupLinkAware.mock.calls[0][1].onLinkClick).toBe('handler:item-a:collection-a');

    rerender(
      <ThemeProvider theme={theme}>
        <QueryEditor value="query { foo }" item={itemB} collection={collectionB} />
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
        <QueryEditor value="query { foo }" item={itemA} collection={collectionA} />
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
        <QueryEditor value="query { foo }" item={itemA} collection={collectionA} readOnly={true} />
      </ThemeProvider>
    );

    expect(mockDestroyLinkAware).not.toHaveBeenCalled();
    expect(mockSetupLinkAware).toHaveBeenCalledTimes(1);
  });
});
