import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import EditorCodeBlock from './index';
import { lowlight } from 'lowlight';

jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }) => <div data-testid="node-view-wrapper" className={className}>{children}</div>,
  NodeViewContent: ({ as, children }) => {
    const Tag = as || 'div';
    return <Tag data-testid="node-view-content">{children}</Tag>;
  }
}));

jest.mock('ui/MenuDropdown', () => {
  return ({ items, children }) => (
    <div data-testid="menu-dropdown">
      {children}
      <div data-testid="menu-dropdown-items">
        {items.map((item) => (
          <button key={item.id} data-item-id={item.id} onClick={item.onClick}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
});

jest.mock('lowlight', () => ({
  lowlight: {
    highlightAuto: jest.fn(),
    registerLanguage: jest.fn()
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
        editor={{ isEditable: true, on: jest.fn(), off: jest.fn() }}
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
    jest.advanceTimersByTime(100);
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

  it('should not update language on paste if language is already set', () => {
    lowlight.highlightAuto.mockReturnValue({ data: { language: 'python' } });

    const codeContent = 'def foo(): pass';
    renderComponent({
      attrs: { language: 'python' },
      textContent: codeContent
    });

    dispatchPasteEvent(codeContent);

    // Should not call highlightAuto nor update attributes since language is explicitly set
    expect(lowlight.highlightAuto).not.toHaveBeenCalled();
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

  it('should handle single line correctly and update language when clicking auto', () => {
    const { queryByTestId } = renderComponent({
      attrs: { language: 'python' },
      textContent: 'print("hello")' // single line
    });

    // Dropdown should not be rendered for single line
    expect(queryByTestId('code-block-lang-selector')).not.toBeInTheDocument();

    // Now re-render as multi line
    const { getByTestId: getByTestIdMulti } = renderComponent({
      attrs: { language: 'python' },
      textContent: 'print("hello")\nprint("world")' // multi line
    });

    // Dropdown should be rendered
    const autoOption = getByTestIdMulti('menu-dropdown-items').querySelector('[data-item-id="auto"]');
    autoOption.click();

    expect(updateAttributesMock).toHaveBeenCalledWith({ language: null });
  });

  it('should handle copy to clipboard success and error path', async () => {
    const originalClipboard = navigator.clipboard;
    const writeTextMock = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const { getByTestId } = renderComponent({
      attrs: { language: 'python' },
      textContent: 'print("test")'
    });

    const copyBtn = getByTestId('code-block-copy-btn');

    // Success path
    writeTextMock.mockResolvedValueOnce();
    copyBtn.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('print("test")');

    // Wait for promise to resolve
    await Promise.resolve();

    // Error path
    writeTextMock.mockRejectedValueOnce(new Error('clipboard error'));
    copyBtn.click();

    await Promise.resolve();

    Object.assign(navigator, { clipboard: originalClipboard });
  });
});
