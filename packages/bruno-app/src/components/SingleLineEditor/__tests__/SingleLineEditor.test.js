import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import SingleLineEditor from '../index';
import { mockDataFunctions } from '@usebruno/common';

// Import mocks
import '../../../__mocks__/mockDependencies';

// Jest will automatically use our mock from __mocks__/codemirror.js
jest.mock('codemirror');

describe('SingleLineEditor - Mock Variables Autocompletion', () => {
  let editor;
  let cleanupFunction;

  const mockProps = {
    value: '',
    theme: 'light',
    collection: {},
    onSave: jest.fn(),
    onChange: jest.fn(),
    onRun: jest.fn()
  };

  beforeEach(async () => {
    let result;
    await act(async () => {
      result = render(<SingleLineEditor {...mockProps} />);
    });
    editor = result.container.querySelector('.single-line-editor')?.CodeMirror;
    cleanupFunction = result.unmount;
  });

  afterEach(() => {
    cleanupFunction && cleanupFunction();
    jest.clearAllMocks();
  });

  const simulateInputAtCursor = async (editor, text, cursorPos) => {
    await act(async () => {
      editor.setValue(text);
      editor.setCursor(cursorPos || { line: 0, ch: text.length });
      
      // Simulate input event
      const event = new InputEvent('input');
      await editor.element.dispatchEvent(event);
    });
  };

  test('should show mock function suggestions when typing {{$', async () => {
    await simulateInputAtCursor(editor, '{{$');
    
    await waitFor(() => {
      const cursor = editor.getCursor();
      expect(editor.showHint).toHaveBeenCalled();
      expect(editor.getRange({ line: 0, ch: 0 }, cursor)).toBe('{{$');
    });
  });

  test('should filter suggestions based on typed text', async () => {
    await simulateInputAtCursor(editor, '{{$random');
    
    await waitFor(() => {
      const cursor = editor.getCursor();
      expect(editor.showHint).toHaveBeenCalled();
      expect(editor.getRange({ line: 0, ch: 0 }, cursor)).toBe('{{$random');
    });
  });

  test('should handle regular text input without suggestions', async () => {
    await simulateInputAtCursor(editor, 'regular text');
    
    await waitFor(() => {
      expect(editor.showHint).not.toHaveBeenCalled();
    });
  });

  test('should maintain cursor position after input', async () => {
    const text = 'before {{$random after';
    const cursorPos = { line: 0, ch: text.indexOf('after') };
    
    await simulateInputAtCursor(editor, text, cursorPos);
    
    await waitFor(() => {
      expect(editor.getCursor()).toEqual(cursorPos);
    });
  });

  test('should handle empty suggestions gracefully', async () => {
    await simulateInputAtCursor(editor, '{{$nonexistent');
    
    await waitFor(() => {
      expect(editor.showHint).not.toHaveBeenCalled();
    });
  });

  test('should respect single line mode', async () => {
    await simulateInputAtCursor(editor, 'first line\nsecond line');
    
    await waitFor(() => {
      expect(editor.getValue().includes('\n')).toBeFalsy();
    });
  });

  test('should update when collection variables change', async () => {
    const newProps = {
      ...mockProps,
      collection: { variables: { newVar: 'value' } }
    };
    
    let result;
    await act(async () => {
      result = render(<SingleLineEditor {...newProps} />);
    });
    const editor = result.container.querySelector('.single-line-editor')?.CodeMirror;
    
    await waitFor(() => {
      expect(editor.setOption).toHaveBeenCalledWith('mode', 'brunovariables');
    });
    result.unmount();
  });
});