const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useDragResize } from './index';

const CONTAINER_WIDTH = 1000;
const MIN_LEFT = 200;
const MIN_RIGHT = 300;

const makeContainer = (width = CONTAINER_WIDTH) => {
  const el = document.createElement('div');
  el.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width,
    height: 600,
    right: width,
    bottom: 600,
    x: 0,
    y: 0
  }));
  return el;
};

const renderDragResize = ({ width, onWidthChange = jest.fn(), container } = {}) => {
  const containerEl = container ?? makeContainer();
  const result = renderHook(
    ({ width, onWidthChange }) => {
      const containerRef = useRef(containerEl);
      return useDragResize({
        containerRef,
        width,
        onWidthChange,
        minLeft: MIN_LEFT,
        minRight: MIN_RIGHT
      });
    },
    { initialProps: { width, onWidthChange } }
  );
  return { ...result, containerEl, onWidthChange };
};

const fireMouse = (type, clientX) => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
  });
};

describe('useDragResize', () => {
  let observers;

  beforeEach(() => {
    observers = [];
    global.ResizeObserver = jest.fn().mockImplementation((callback) => {
      const instance = {
        callback,
        observe: jest.fn(),
        disconnect: jest.fn()
      };
      observers.push(instance);
      return instance;
    });
  });

  afterEach(() => {
    delete global.ResizeObserver;
  });

  it('returns false dragging and null dragWidth on initial render', () => {
    const { result } = renderDragResize({ width: 500 });
    expect(result.current.dragging).toBe(false);
    expect(result.current.dragWidth).toBe(null);
  });

  it('onMouseDown seeds dragWidth from the width prop and flips dragging on', () => {
    const { result } = renderDragResize({ width: 500 });

    act(() => {
      result.current.dragbarProps.onMouseDown({ preventDefault: jest.fn() });
    });

    expect(result.current.dragging).toBe(true);
    expect(result.current.dragWidth).toBe(500);
  });

  it('onMouseDown seeds dragWidth to half the container when width is null', () => {
    const { result } = renderDragResize({ width: null });

    act(() => {
      result.current.dragbarProps.onMouseDown({ preventDefault: jest.fn() });
    });

    expect(result.current.dragWidth).toBe(CONTAINER_WIDTH / 2);
  });

  it('onMouseDown clamps an out-of-bounds width seed; immediate mouseup commits the clamped value', () => {
    // Persisted width is past the right bound (max = 1000 - 300 = 700).
    // Without clamping the seed, an immediate mouseup would persist 800.
    const { result, onWidthChange } = renderDragResize({ width: 800 });

    act(() => {
      result.current.dragbarProps.onMouseDown({ preventDefault: jest.fn() });
    });

    expect(result.current.dragWidth).toBe(CONTAINER_WIDTH - MIN_RIGHT);

    fireMouse('mouseup', 800);

    expect(onWidthChange).toHaveBeenCalledTimes(1);
    expect(onWidthChange).toHaveBeenCalledWith(CONTAINER_WIDTH - MIN_RIGHT);
  });

  it('mousemove during drag updates dragWidth clamped to [minLeft, containerWidth - minRight]', () => {
    const { result } = renderDragResize({ width: 500 });

    act(() => {
      result.current.dragbarProps.onMouseDown({ preventDefault: jest.fn() });
    });

    // Within bounds
    fireMouse('mousemove', 600);
    expect(result.current.dragWidth).toBe(600);

    // Below minLeft → clamps up
    fireMouse('mousemove', 50);
    expect(result.current.dragWidth).toBe(MIN_LEFT);

    // Above containerWidth - minRight → clamps down
    fireMouse('mousemove', 950);
    expect(result.current.dragWidth).toBe(CONTAINER_WIDTH - MIN_RIGHT);
  });

  it('mouseup commits the final width via onWidthChange and clears drag state', () => {
    const { result, onWidthChange } = renderDragResize({ width: 500 });

    act(() => {
      result.current.dragbarProps.onMouseDown({ preventDefault: jest.fn() });
    });
    fireMouse('mousemove', 650);
    fireMouse('mouseup', 650);

    expect(onWidthChange).toHaveBeenCalledTimes(1);
    expect(onWidthChange).toHaveBeenCalledWith(650);
    expect(result.current.dragging).toBe(false);
    expect(result.current.dragWidth).toBe(null);
  });

  it('onDoubleClick calls onWidthChange(null) to reset', () => {
    const { result, onWidthChange } = renderDragResize({ width: 500 });

    act(() => {
      result.current.dragbarProps.onDoubleClick({ preventDefault: jest.fn() });
    });

    expect(onWidthChange).toHaveBeenCalledWith(null);
  });

  it('mousemove without an active drag is a no-op', () => {
    const { result } = renderDragResize({ width: 500 });

    fireMouse('mousemove', 600);

    expect(result.current.dragging).toBe(false);
    expect(result.current.dragWidth).toBe(null);
  });

  it('ResizeObserver re-clamps the persisted width when the container shrinks', () => {
    const containerEl = makeContainer(1000);
    const onWidthChange = jest.fn();
    renderDragResize({ width: 800, onWidthChange, container: containerEl });

    // 800 fits within 1000 - 300 (minRight) = 700? No: 800 > 700, so already
    // out of bounds — but the effect only re-clamps on observed resize, so
    // shrink the container and trigger the observer manually.
    containerEl.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 600,
      height: 600,
      right: 600,
      bottom: 600,
      x: 0,
      y: 0
    }));

    act(() => {
      observers[0].callback();
    });

    // 800 clamped to 600 - 300 = 300
    expect(onWidthChange).toHaveBeenCalledWith(300);
  });
});
