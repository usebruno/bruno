import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import EditorCodeBlock from './index';
import { lowlight } from 'lowlight';

// Mock Tiptap components
jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }) => <div data-testid="node-view-wrapper" className={className}>{children}</div>,
  NodeViewContent: ({ as, children }) => {
    const Tag = as || 'div';
    return <Tag data-testid="node-view-content">{children}</Tag>;
  }
}));

// Mock Dropdown
jest.mock('../../../../components/Dropdown', () => {
  return ({ children }) => <div data-testid="dropdown">{children}</div>;
});

// Mock lowlight
jest.mock('lowlight', () => ({
  lowlight: {
    highlightAuto: jest.fn()
  }
}));

describe('EditorCodeBlock', () => {
  let updateAttributesMock;
  let preElement;

  beforeEach(() => {
    updateAttributesMock = jest.fn();
    lowlight.highlightAuto.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderComponent = (nodeProps) => {
    const result = render(
      <EditorCodeBlock
        node={{
          attrs: { language: 'auto' },
          textContent: '',
          ...nodeProps
        }}
        updateAttributes={updateAttributesMock}
        extension={{}}
      />
    );
    preElement = result.container.querySelector('pre');
    return result;
  };

  const dispatchPasteEvent = (textContent = '') => {
    // Set textContent on the pre element before dispatching paste
    if (preElement) {
      preElement.textContent = textContent;
    }
    const pasteEvent = new Event('paste', { bubbles: true });
    preElement.dispatchEvent(pasteEvent);
    jest.advanceTimersByTime(10);
  };

  it('should auto-detect language on paste with code content', () => {
    lowlight.highlightAuto.mockReturnValue({ data: { language: 'javascript' } });

    const codeContent = 'const a = 1;\nconsole.log(a);';
    renderComponent({
      attrs: { language: null },
      textContent: codeContent
    });

    dispatchPasteEvent(codeContent);

    expect(lowlight.highlightAuto).toHaveBeenCalledWith(codeContent);
    expect(updateAttributesMock).toHaveBeenCalledWith({ language: 'javascript' });
  });

  it('should call highlightAuto on paste even when language is already set', () => {
    lowlight.highlightAuto.mockReturnValue({ data: { language: 'python' } });

    const codeContent = 'def foo(): pass';
    renderComponent({
      attrs: { language: 'python' },
      textContent: codeContent
    });

    dispatchPasteEvent(codeContent);

    // Should call highlightAuto on paste and update attributes if detected language is in list
    expect(lowlight.highlightAuto).toHaveBeenCalledWith(codeContent);
    expect(updateAttributesMock).toHaveBeenCalledWith({ language: 'python' });
  });

  it('should not update language if detected language is not in LANGUAGES list', () => {
    lowlight.highlightAuto.mockReturnValue({ data: { language: 'unknown-lang' } });

    const codeContent = 'some code';
    renderComponent({
      attrs: { language: null },
      textContent: codeContent
    });

    dispatchPasteEvent(codeContent);

    expect(lowlight.highlightAuto).toHaveBeenCalledWith(codeContent);
    expect(updateAttributesMock).not.toHaveBeenCalled();
  });

  it('should not update language if highlightAuto returns no language', () => {
    lowlight.highlightAuto.mockReturnValue({ data: {} });

    const codeContent = 'some code';
    renderComponent({
      attrs: { language: null },
      textContent: codeContent
    });

    dispatchPasteEvent(codeContent);

    expect(lowlight.highlightAuto).toHaveBeenCalledWith(codeContent);
    expect(updateAttributesMock).not.toHaveBeenCalled();
  });
});
