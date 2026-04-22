import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LazyEditorCell from './index';

// Mock IntersectionObserver — does NOT trigger by default (simulates off-screen)
let intersectionCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  intersectionCallback = null;
  mockObserve.mockClear();
  mockDisconnect.mockClear();

  global.IntersectionObserver = jest.fn((callback) => {
    intersectionCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect
    };
  });
});

describe('LazyEditorCell', () => {
  const RealEditor = () => <div data-testid="real-editor">CodeMirror editor</div>;

  describe('initial render (off-screen)', () => {
    it('renders a placeholder input instead of children', () => {
      const { container } = render(
        <LazyEditorCell value="{{host}}" placeholder="Enter value">
          <RealEditor />
        </LazyEditorCell>
      );

      expect(screen.queryByTestId('real-editor')).not.toBeInTheDocument();

      const input = container.querySelector('input[type="text"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readonly');
      expect(input.value).toBe('{{host}}');
    });

    it('renders the placeholder text when value is empty', () => {
      const { container } = render(
        <LazyEditorCell value="" placeholder="Enter value">
          <RealEditor />
        </LazyEditorCell>
      );

      const input = container.querySelector('input[type="text"]');
      expect(input.value).toBe('');
      expect(input).toHaveAttribute('placeholder', 'Enter value');
    });

    it('sets up an IntersectionObserver', () => {
      render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '100px' }
      );
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  describe('activation triggers', () => {
    it('activates on click and renders children', () => {
      const { container } = render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      fireEvent.click(container.querySelector('.lazy-editor-placeholder'));
      expect(screen.getByTestId('real-editor')).toBeInTheDocument();
    });

    it('activates on mouseEnter', () => {
      const { container } = render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      fireEvent.mouseEnter(container.querySelector('.lazy-editor-placeholder'));
      expect(screen.getByTestId('real-editor')).toBeInTheDocument();
    });

    it('activates on focus', () => {
      const { container } = render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      fireEvent.focus(container.querySelector('input'));
      expect(screen.getByTestId('real-editor')).toBeInTheDocument();
    });

    it('activates when IntersectionObserver reports visible', () => {
      render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      expect(screen.queryByTestId('real-editor')).not.toBeInTheDocument();

      // Simulate the element scrolling into view
      act(() => {
        intersectionCallback([{ isIntersecting: true }]);
      });

      expect(screen.getByTestId('real-editor')).toBeInTheDocument();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('does not activate when IntersectionObserver reports not visible', () => {
      render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      act(() => {
        intersectionCallback([{ isIntersecting: false }]);
      });

      expect(screen.queryByTestId('real-editor')).not.toBeInTheDocument();
    });
  });

  describe('permanence', () => {
    it('stays active after activation — never reverts to placeholder', () => {
      const { container, rerender } = render(
        <LazyEditorCell value="test">
          <RealEditor />
        </LazyEditorCell>
      );

      fireEvent.click(container.querySelector('.lazy-editor-placeholder'));
      expect(screen.getByTestId('real-editor')).toBeInTheDocument();

      // Re-render with new props — should still show the real editor
      rerender(
        <LazyEditorCell value="updated">
          <RealEditor />
        </LazyEditorCell>
      );

      expect(screen.getByTestId('real-editor')).toBeInTheDocument();
    });
  });

  describe('bulk rendering (performance contract)', () => {
    it('does not render children for 200 off-screen cells', () => {
      const cells = Array.from({ length: 200 }, (_, i) => (
        <LazyEditorCell key={i} value={`value-${i}`}>
          <div data-testid={`editor-${i}`}>Editor {i}</div>
        </LazyEditorCell>
      ));

      render(<div>{cells}</div>);

      // None of the real editors should be rendered
      for (let i = 0; i < 200; i++) {
        expect(screen.queryByTestId(`editor-${i}`)).not.toBeInTheDocument();
      }

      // All 200 placeholders should exist
      const placeholders = document.querySelectorAll('.lazy-editor-placeholder');
      expect(placeholders.length).toBe(200);
    });
  });
});
