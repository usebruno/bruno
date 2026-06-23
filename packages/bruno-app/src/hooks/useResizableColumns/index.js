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

const scaleWidthsToTotal = (widths, targetTotal, minColWidth) => {
  // When the container is too narrow to satisfy minColWidth for every column,
  // fall back to equal distribution so the total stays exact (columns clip instead of overflow).
  if (targetTotal < minColWidth * widths.length) {
    const each = Math.floor(targetTotal / widths.length);
    const last = targetTotal - each * (widths.length - 1);
    return [...Array(widths.length - 1).fill(each), last];
  }

  const currentTotal = widths.reduce((s, w) => s + w, 0);
  const factor = targetTotal / currentTotal;
  const next = widths.slice(0, -1).map((w) => Math.max(minColWidth, Math.round(w * factor)));
  const last = Math.max(minColWidth, targetTotal - next.reduce((s, w) => s + w, 0));
  return [...next, last];
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
