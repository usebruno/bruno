import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import QueryEditor from './index';

jest.mock('codemirror', () => {
  const codemirror = require('test-utils/mocks/codemirror');
  return codemirror;
});

jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: jest.fn()
}));

const CodeMirror = require('codemirror');

const MOCK_THEME = {
  codemirror: {
    bg: '#fff',
    border: '#ddd',
    tokens: {
      definition: '#000',
      property: '#000',
      string: '#000',
      number: '#000',
      atom: '#000',
      variable: '#000',
      keyword: '#000',
      comment: '#000',
      operator: '#000',
      tag: '#000',
      tagBracket: '#000'
    },
    variable: {
      valid: '#000',
      invalid: '#000'
    }
  },
  status: {
    success: {
      background: '#e6ffed'
    },
    danger: {
      background: '#ffeef0'
    }
  },
  colors: {
    text: {
      danger: '#d73a49'
    }
  }
};

const renderQueryEditor = (props = {}) => {
  return render(
    <ThemeProvider theme={MOCK_THEME}>
      <QueryEditor {...props} />
    </ThemeProvider>
  );
};

describe('QueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('binds send-request shortcuts when onRun is provided', () => {
    const onRun = jest.fn();

    renderQueryEditor({ onRun });

    const options = CodeMirror.mock.calls[0][1];
    const cmdEnter = options.extraKeys['Cmd-Enter'];
    const ctrlEnter = options.extraKeys['Ctrl-Enter'];

    expect(cmdEnter).toEqual(expect.any(Function));
    expect(ctrlEnter).toEqual(expect.any(Function));

    cmdEnter();
    ctrlEnter();

    expect(onRun).toHaveBeenCalledTimes(2);
  });
});
