import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Drag-to-resize behavior for a multi-column grid.
 *
 * Columns always sum to the container width (no horizontal scroll).
 * Dragging a separator adjusts only the two adjacent columns (zero-sum).
 * Either column hitting minColWidth causes a hard stop.
 *
 * @param {object}   options
 * @param {number[]} options.defaultWidths  - Default px width for each column (used as proportions)
 * @param {number}   [options.minColWidth]  - Minimum column width in px (default: 60)
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
  const currentTotal = widths.reduce((s, w) => s + w, 0);
  const factor = targetTotal / currentTotal;
  const next = widths.slice(0, -1).map((w) => Math.max(minColWidth, Math.round(w * factor)));
  const last = Math.max(minColWidth, targetTotal - next.reduce((s, w) => s + w, 0));
  return [...next, last];
};

export function useResizableColumns({ defaultWidths, minColWidth = 60 }) {
  const containerRef = useRef(null);
  const [colWidths, setColWidths] = useState(null);
  const [resizingIdx, setResizingIdx] = useState(null);

  const gridTemplateColumns = useMemo(
    () => colWidths ? getGridTemplate(colWidths) : `repeat(${defaultWidths.length}, 1fr)`,
    [colWidths, defaultWidths.length]
  );

  const separatorPositions = useMemo(
    () => colWidths ? getSeparatorPositions(colWidths) : [],
    [colWidths]
  );

  // Measure container on mount and on every resize.
  // All columns scale proportionally so they always fill the container exactly.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const newWidth = Math.floor(entries[0].contentRect.width);
      if (!newWidth) return;

      setColWidths((prev) => {
        if (!prev) {
          return scaleWidthsToTotal(defaultWidths, newWidth, minColWidth);
        }
        const oldTotal = prev.reduce((s, w) => s + w, 0);
        if (Math.abs(oldTotal - newWidth) <= 1) return prev;
        return scaleWidthsToTotal(prev, newWidth, minColWidth);
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
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

    const onMouseUp = () => {
      setResizingIdx(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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
