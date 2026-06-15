const { describe, it, expect, jest, beforeEach } = require('@jest/globals');
import { render, act } from '@testing-library/react';
import React from 'react';
import { useResizableColumns } from './index';

const CONTAINER_WIDTH = 1000;
const DEFAULT_WIDTHS = [100, 200, 400, 200, 100]; // sums to CONTAINER_WIDTH
const MIN_COL_WIDTH = 60;

// Captures the latest hook return value on each render
let hookValue;

function Fixture({ defaultWidths = DEFAULT_WIDTHS, minColWidth = MIN_COL_WIDTH }) {
  const hook = useResizableColumns({ defaultWidths, minColWidth });
  hookValue = hook;
  return <div ref={hook.containerRef} />;
}

const setup = (props = {}) => render(<Fixture {...props} />);

const fireMouse = (type, clientX) => {
  act(() => {
    document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
  });
};

const startDrag = (separatorIdx, startX) => {
  act(() => {
    hookValue.handleResizeStart(
      { clientX: startX, preventDefault: jest.fn(), stopPropagation: jest.fn() },
      separatorIdx
    );
  });
};

describe('useResizableColumns', () => {
  let triggerResize;

  beforeEach(() => {
    hookValue = null;
    global.ResizeObserver = class {
      constructor(cb) {
        triggerResize = (w) => cb([{ contentRect: { width: w } }]);
      }

      observe() {
        triggerResize(CONTAINER_WIDTH);
      }

      disconnect() {}
    };
  });

  describe('initial state (before measurement)', () => {
    beforeEach(() => {
      global.ResizeObserver = class {
        constructor() {}
        observe() {}
        disconnect() {}
      };
      setup();
    });

    it('returns fallback state before measurement', () => {
      expect(hookValue.colWidths).toBeNull();
      expect(hookValue.gridTemplateColumns)
        .toBe(`repeat(${DEFAULT_WIDTHS.length}, 1fr)`);
      expect(hookValue.separatorPositions).toEqual([]);
    });
  });

  describe('container measurement', () => {
    it('columns sum to container width after first measurement', () => {
      setup();
      const total = hookValue.colWidths.reduce((s, w) => s + w, 0);
      expect(total).toBe(CONTAINER_WIDTH);
    });

    it('falls back to equal distribution when container is narrower than minColWidth * columns', () => {
      // 5 columns × 60px min = 300px minimum; container at 200px is unsatisfiable
      setup();
      act(() => { triggerResize(200); });
      const total = hookValue.colWidths.reduce((s, w) => s + w, 0);
      expect(total).toBe(200);
    });

    it('ignores a zero-width measurement', () => {
      global.ResizeObserver = class {
        constructor(cb) {
          triggerResize = (w) => cb([{ contentRect: { width: w } }]);
        }

        observe() {
          triggerResize(0);
        }

        disconnect() {}
      };

      setup();

      expect(hookValue.colWidths).toBeNull();
    });

    it('scales existing widths proportionally on container resize', () => {
      setup();

      act(() => {
        triggerResize(800);
      });

      const total = hookValue.colWidths.reduce((s, w) => s + w, 0);

      expect(total).toBe(800);
    });

    it('preserves manually-resized proportions when container resizes again', () => {
      setup();

      startDrag(1, 500);
      fireMouse('mousemove', 600);
      fireMouse('mouseup', 600);

      const userWidths = [...hookValue.colWidths];

      act(() => {
        triggerResize(1500);
      });

      expect(
        hookValue.colWidths.reduce((s, w) => s + w, 0)
      ).toBe(1500);

      expect(hookValue.colWidths[1]).toBeCloseTo(
        userWidths[1] * 1.5,
        0
      );
    });
  });

  describe('drag resize', () => {
    beforeEach(() => {
      setup();
    });

    it('dragging right grows left column and shrinks right column equally', () => {
      const before = [...hookValue.colWidths];

      startDrag(1, 500);
      fireMouse('mousemove', 550);

      expect(hookValue.colWidths[1]).toBe(before[1] + 50);
      expect(hookValue.colWidths[2]).toBe(before[2] - 50);
    });

    it('dragging left shrinks left column and grows right column equally', () => {
      const before = [...hookValue.colWidths];

      startDrag(1, 500);
      fireMouse('mousemove', 450);

      expect(hookValue.colWidths[1]).toBe(before[1] - 50);
      expect(hookValue.colWidths[2]).toBe(before[2] + 50);
    });

    it('only the two adjacent columns change', () => {
      const before = [...hookValue.colWidths];

      startDrag(1, 500);
      fireMouse('mousemove', 550);

      expect(hookValue.colWidths[0]).toBe(before[0]);
      expect(hookValue.colWidths[3]).toBe(before[3]);
      expect(hookValue.colWidths[4]).toBe(before[4]);
    });

    it('hard stop: left column clamps at minColWidth', () => {
      startDrag(0, 500);
      fireMouse('mousemove', 100);

      expect(hookValue.colWidths[0]).toBe(MIN_COL_WIDTH);
    });

    it('hard stop: right neighbor absorbs exactly the full available delta', () => {
      startDrag(0, 500);
      fireMouse('mousemove', 100);

      expect(hookValue.colWidths[1]).toBe(
        DEFAULT_WIDTHS[0] + DEFAULT_WIDTHS[1] - MIN_COL_WIDTH
      );
    });

    it('hard stop: right column clamps at minColWidth', () => {
      startDrag(0, 500);
      fireMouse('mousemove', 900);

      expect(hookValue.colWidths[1]).toBe(MIN_COL_WIDTH);
    });

    it('hard stop: left neighbor absorbs exactly the full available delta', () => {
      startDrag(0, 500);
      fireMouse('mousemove', 900);

      expect(hookValue.colWidths[0]).toBe(
        DEFAULT_WIDTHS[0] + DEFAULT_WIDTHS[1] - MIN_COL_WIDTH
      );
    });

    it('resizingIdx tracks active separator and clears on mouseup', () => {
      startDrag(2, 500);

      expect(hookValue.resizingIdx).toBe(2);

      fireMouse('mouseup', 500);

      expect(hookValue.resizingIdx).toBeNull();
    });

    it('stops updating after mouseup', () => {
      startDrag(1, 500);
      fireMouse('mousemove', 550);

      const widthAfterDrag = hookValue.colWidths[1];

      fireMouse('mouseup', 550);
      fireMouse('mousemove', 700);

      expect(hookValue.colWidths[1]).toBe(widthAfterDrag);
    });

    it('unmounting during an active drag does not throw', () => {
      const { unmount } = setup();

      startDrag(1, 500);
      fireMouse('mousemove', 600);

      expect(() => unmount()).not.toThrow();
    });
  });
});
