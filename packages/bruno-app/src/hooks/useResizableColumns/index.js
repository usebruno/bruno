import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Drag-to-resize behavior for a multi-column grid.
 *
 * Columns always sum to the container width (no horizontal scroll).
 * Dragging a separator adjusts only the two adjacent columns (zero-sum).
 * Either column hitting minColWidth causes a hard stop.
 *
 * @param {object}        options
 * @param {number[]}      options.defaultWidths  - Default px width for each column (used as proportions)
 * @param {number[]|null} [options.initialWidths] - Persisted widths to restore; falls back to defaultWidths
 * @param {number}        [options.minColWidth]   - Minimum column width in px (default: 60)
 * @param {function}      [options.onResizeEnd]   - Called with final colWidths array after a drag ends
 *
 * @returns {{
 *   containerRef: React.RefObject,
 *   colWidths: number[] | null,
 *   gridTemplateColumns: string,
 *   separatorPositions: number[],
 *   resizingIdx: number | null,
 *   handleResizeStart: (e: MouseEvent, separatorIdx: number) => void
 * }}
 */

const getGridTemplate = (widths) => widths.map((w) => `${w}px`).join(' ');

const getSeparatorPositions = (widths) => {
  const positions = [];
  let left = 0;
  for (let i = 0; i < widths.length - 1; i++) {
    left += widths[i];
    positions.push(left);
  }
  return positions;
};

// Container too narrow for everyone to get minColWidth — split evenly instead
// (columns clip instead of overflow).
const distributeEqually = (count, total) => {
  const each = Math.floor(total / count);
  return [
    ...Array(count - 1).fill(each),
    total - each * (count - 1)
  ];
};

// Pins any column that would shrink below minColWidth, then re-checks the
// rest (pinning one column shifts the math for the others). Returns the
// pinned widths plus what's left for the caller to hand out.
const pinColumnsAtMinimum = (widths, targetTotal, minColWidth) => {
  const result = Array(widths.length).fill(null);
  let remainingIdx = widths.map((_, i) => i);
  let remainingTotal = targetTotal;

  while (true) {
    const remainingWidth = remainingIdx.reduce((sum, i) => sum + widths[i], 0);
    const scale = remainingTotal / remainingWidth;

    const nextRemaining = [];
    for (const i of remainingIdx) {
      if (widths[i] * scale < minColWidth) {
        result[i] = minColWidth;
        remainingTotal -= minColWidth;
      } else {
        nextRemaining.push(i);
      }
    }

    if (nextRemaining.length === remainingIdx.length) {
      return { result, remainingIdx, remainingTotal };
    }
    remainingIdx = nextRemaining;
  }
};

// Largest remainder method: scales proportionally, floors each share, then
// gives the leftover whole pixels to whoever rounded down the most, so the
// sum always hits `total` exactly, with no single column eating the error.
const scaleAndRound = (widths, total) => {
  const widthSum = widths.reduce((a, b) => a + b, 0);
  const exact = widths.map((w) => (w / widthSum) * total);
  const rounded = exact.map(Math.floor);
  const leftover = total - rounded.reduce((a, b) => a + b, 0);

  exact
    .map((value, i) => ({ i, remainder: value - rounded[i] }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, leftover)
    .forEach(({ i }) => rounded[i]++);

  return rounded;
};

const scaleWidthsToTotal = (widths, targetTotal, minColWidth) => {
  if (targetTotal < minColWidth * widths.length) {
    return distributeEqually(widths.length, targetTotal);
  }

  const { result, remainingIdx, remainingTotal }
    = pinColumnsAtMinimum(widths, targetTotal, minColWidth);

  const scaled = scaleAndRound(
    remainingIdx.map((i) => widths[i]),
    remainingTotal
  );

  remainingIdx.forEach((colIndex, i) => {
    result[colIndex] = scaled[i];
  });

  return result;
};

export function useResizableColumns({ defaultWidths, initialWidths = null, minColWidth = 60, onResizeEnd = null }) {
  const [colWidths, setColWidths] = useState(null);
  const [resizingIdx, setResizingIdx] = useState(null);
  const dragCleanupRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      observerRef.current?.disconnect();
    };
  }, []);

  const gridTemplateColumns = useMemo(
    () => colWidths ? getGridTemplate(colWidths) : `repeat(${defaultWidths.length}, 1fr)`,
    [colWidths, defaultWidths.length]
  );

  const separatorPositions = useMemo(
    () => colWidths ? getSeparatorPositions(colWidths) : [],
    [colWidths]
  );

  // Callback ref: attaches the ResizeObserver whenever the element mounts,
  // even if it renders conditionally after the initial mount.
  const containerRef = useCallback((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const newWidth = Math.floor(entries[0].contentRect.width);
      if (!newWidth) return;

      setColWidths((prev) => {
        if (!prev) {
          return scaleWidthsToTotal(initialWidths ?? defaultWidths, newWidth, minColWidth);
        }
        const oldTotal = prev.reduce((s, w) => s + w, 0);
        if (Math.abs(oldTotal - newWidth) <= 1) return prev;
        return scaleWidthsToTotal(prev, newWidth, minColWidth);
      });
    });

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const handleResizeStart = useCallback((e, separatorIdx) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidths = [...colWidths];

    setResizingIdx(separatorIdx);

    const onMouseMove = (moveE) => {
      const delta = moveE.clientX - startX;

      // Hard stop: clamp so neither adjacent column goes below minColWidth
      const clampedDelta = Math.max(
        -(startWidths[separatorIdx] - minColWidth),
        Math.min(
          startWidths[separatorIdx + 1] - minColWidth,
          delta
        )
      );

      const next = [...startWidths];
      next[separatorIdx] = startWidths[separatorIdx] + clampedDelta;
      next[separatorIdx + 1] = startWidths[separatorIdx + 1] - clampedDelta;

      setColWidths(next);
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragCleanupRef.current = null;
    };

    const onMouseUp = () => {
      setResizingIdx(null);
      cleanup();
      // Capture final widths for persistence — read directly from state via functional update
      if (onResizeEnd) {
        setColWidths((current) => {
          onResizeEnd(current);
          return current;
        });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanupRef.current = cleanup;
  }, [colWidths, minColWidth]);

  return {
    containerRef,
    colWidths,
    gridTemplateColumns,
    separatorPositions,
    resizingIdx,
    handleResizeStart
  };
}
