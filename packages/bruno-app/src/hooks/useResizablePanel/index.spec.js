const { describe, it, expect, jest } = require('@jest/globals');
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from './index';

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const INITIAL_WIDTH = 400;

const renderResizablePanel = ({
  initialWidth = INITIAL_WIDTH,
  direction = 'right',
  onResizeEnd = jest.fn()
} = {}) => {
  const result = renderHook(
    ({ initialWidth, direction, onResizeEnd }) =>
      useResizablePanel({
        initialWidth,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        direction,
        onResizeEnd
      }),
    { initialProps: { initialWidth, direction, onResizeEnd } }
  );
  return { ...result, onResizeEnd };
};

const fireMouse = (type, clientX) => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
  });
};

describe('useResizablePanel', () => {
  it('returns the initial width on first render', () => {
    const { result } = renderResizablePanel();
    expect(result.current.width).toBe(INITIAL_WIDTH);
  });

  it('handleDragStart does not change width', () => {
    const { result } = renderResizablePanel();

    act(() => {
      result.current.handleDragStart({
        clientX: 500,
        preventDefault: jest.fn()
      });
    });

    expect(result.current.width).toBe(INITIAL_WIDTH);
  });

  it('mousemove without an active drag is a no-op', () => {
    const { result } = renderResizablePanel();

    fireMouse('mousemove', 300);

    expect(result.current.width).toBe(INITIAL_WIDTH);
  });

  it('mouseup without an active drag does not call onResizeEnd', () => {
    const { result, onResizeEnd } = renderResizablePanel();

    fireMouse('mouseup', 300);

    expect(onResizeEnd).not.toHaveBeenCalled();
  });

  describe('direction: right', () => {
    it('dragging left increases width', () => {
      const { result } = renderResizablePanel({ direction: 'right' });

      act(() => {
        result.current.handleDragStart({
          clientX: 500,
          preventDefault: jest.fn()
        });
      });

      fireMouse('mousemove', 400); // moved 100px left → delta = +100
      expect(result.current.width).toBe(INITIAL_WIDTH + 100);
    });

    it('dragging right decreases width', () => {
      const { result } = renderResizablePanel({ direction: 'right' });

      act(() => {
        result.current.handleDragStart({
          clientX: 500,
          preventDefault: jest.fn()
        });
      });

      fireMouse('mousemove', 600); // moved 100px right → delta = -100
      expect(result.current.width).toBe(INITIAL_WIDTH - 100);
    });
  });

  describe('direction: left', () => {
    it('dragging right increases width', () => {
      const { result } = renderResizablePanel({ direction: 'left' });

      act(() => {
        result.current.handleDragStart({
          clientX: 500,
          preventDefault: jest.fn()
        });
      });

      fireMouse('mousemove', 600); // moved 100px right → delta = +100
      expect(result.current.width).toBe(INITIAL_WIDTH + 100);
    });

    it('dragging left decreases width', () => {
      const { result } = renderResizablePanel({ direction: 'left' });

      act(() => {
        result.current.handleDragStart({
          clientX: 500,
          preventDefault: jest.fn()
        });
      });

      fireMouse('mousemove', 400); // moved 100px left → delta = -100
      expect(result.current.width).toBe(INITIAL_WIDTH - 100);
    });
  });

  it('clamps width to minWidth', () => {
    const { result } = renderResizablePanel({ direction: 'right' });

    act(() => {
      result.current.handleDragStart({
        clientX: 500,
        preventDefault: jest.fn()
      });
    });

    fireMouse('mousemove', 1000); // large rightward move → would go below minWidth
    expect(result.current.width).toBe(MIN_WIDTH);
  });

  it('clamps width to maxWidth', () => {
    const { result } = renderResizablePanel({ direction: 'right' });

    act(() => {
      result.current.handleDragStart({
        clientX: 500,
        preventDefault: jest.fn()
      });
    });

    fireMouse('mousemove', -1000); // large leftward move → would exceed maxWidth
    expect(result.current.width).toBe(MAX_WIDTH);
  });

  it('mouseup calls onResizeEnd with the final width', () => {
    const { result, onResizeEnd } = renderResizablePanel({
      direction: 'right'
    });

    act(() => {
      result.current.handleDragStart({
        clientX: 500,
        preventDefault: jest.fn()
      });
    });

    fireMouse('mousemove', 400);
    fireMouse('mouseup', 400);

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith(INITIAL_WIDTH + 100);
  });

  it('stops updating width after mouseup', () => {
    const { result } = renderResizablePanel({ direction: 'right' });

    act(() => {
      result.current.handleDragStart({
        clientX: 500,
        preventDefault: jest.fn()
      });
    });

    fireMouse('mousemove', 400);
    fireMouse('mouseup', 400);
    fireMouse('mousemove', 200); // further move after release — should be ignored

    expect(result.current.width).toBe(INITIAL_WIDTH + 100);
  });
});
