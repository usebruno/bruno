import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import EditorCodeBlock from './index';
import { lowlight } from 'lowlight';

// Mock Tiptap components
jest.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }) => <div data-testid="node-view-wrapper" className={className}>{children}</div>,
  NodeViewContent: ({ as }) => {
    const Tag = as || 'div';
    return <Tag data-testid="node-view-content" />;
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

  beforeEach(() => {
    updateAttributesMock = jest.fn();
    lowlight.highlightAuto.mockReset();
  });

  const renderComponent = (nodeProps) => {
    return render(
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
  };

  it('should auto-detect language on paste (large text content jump)', () => {
    lowlight.highlightAuto.mockReturnValue({ language: 'javascript' });

    const { rerender } = renderComponent({
      attrs: { language: null }, // 'auto'
      textContent: 'short'
    });

    expect(updateAttributesMock).not.toHaveBeenCalled();

    // Simulate a paste by jumping the text content length by > 5
    rerender(
      <EditorCodeBlock
        node={{
          attrs: { language: null },
          textContent: 'short\nconst a = 1;\nconsole.log(a);' // +27 chars
        }}
        updateAttributes={updateAttributesMock}
        extension={{}}
      />
    );

    expect(lowlight.highlightAuto).toHaveBeenCalledWith('short\nconst a = 1;\nconsole.log(a);');
    expect(updateAttributesMock).toHaveBeenCalledWith({ language: 'javascript' });
  });

  it('should not auto-detect language if length jump is small (typing)', () => {
    const { rerender } = renderComponent({
      attrs: { language: null },
      textContent: 'short'
    });

    rerender(
      <EditorCodeBlock
        node={{
          attrs: { language: null },
          textContent: 'shorta' // +1 char
        }}
        updateAttributes={updateAttributesMock}
        extension={{}}
      />
    );

    expect(lowlight.highlightAuto).not.toHaveBeenCalled();
    expect(updateAttributesMock).not.toHaveBeenCalled();
  });

  it('should not auto-detect language if language is already explicitly set', () => {
    const { rerender } = renderComponent({
      attrs: { language: 'python' },
      textContent: 'short'
    });

    rerender(
      <EditorCodeBlock
        node={{
          attrs: { language: 'python' },
          textContent: 'short\ndef foo(): pass' // large jump
        }}
        updateAttributes={updateAttributesMock}
        extension={{}}
      />
    );

    expect(lowlight.highlightAuto).not.toHaveBeenCalled();
    expect(updateAttributesMock).not.toHaveBeenCalled();
  });
});
