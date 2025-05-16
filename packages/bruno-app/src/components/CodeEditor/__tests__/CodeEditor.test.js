import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import CodeEditor from '../index';
import { mockDataFunctions } from '@usebruno/common';

// Import mocks
import '../../../__mocks__/mockDependencies';

// Jest will automatically use our mock from __mocks__/codemirror.js
jest.mock('codemirror');

// Mock strip-json-comments since it's an ESM module
jest.mock('strip-json-comments', () => ({
  __esModule: true,
  default: (str) => str
}));

describe('CodeEditor - Mock Variables Autocompletion', () => {
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
      result = render(<CodeEditor {...mockProps} />);
    });
    editor = result.container.querySelector('.CodeMirror')?.CodeMirror;
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

  test('should not show suggestions when not typing mock variable syntax', async () => {
    await simulateInputAtCursor(editor, 'regular text');
    
    await waitFor(() => {
      expect(editor.showHint).not.toHaveBeenCalled();
    });
  });

  test('should correctly position suggestions', async () => {
    const text = 'before {{$random';
    await simulateInputAtCursor(editor, text);
    
    await waitFor(() => {
      const cursor = editor.getCursor();
      expect(cursor.ch).toBe(text.length);
      expect(cursor.line).toBe(0);
    });
  });

  test('should handle empty suggestions gracefully', async () => {
    await simulateInputAtCursor(editor, '{{$nonexistent');
    
    await waitFor(() => {
      expect(editor.showHint).not.toHaveBeenCalled();
    });
  });
});