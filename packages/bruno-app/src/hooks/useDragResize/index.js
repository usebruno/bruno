import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Drag-to-resize behavior for a horizontal split pane.
 *
 * Owns the transient drag state (cursor tracking, draft width, dragging flag)
 * and clamps to [minLeft, container.width - minRight]. The persisted width and
 * its setter are owned by the caller — pass them in as `width` / `onWidthChange`
 * and the hook treats it as a controlled value.
 *
 * Render pattern in the consumer:
 *   const effectiveWidth = dragging ? dragWidth : width;
 */
export function useDragResize({ containerRef, width, onWidthChange, minLeft, minRight }) {
  const draggingRef = useRef(false);
  // Mirror the live drag width in a ref so handleMouseUp can read the final
  // value and dispatch outside of a setState updater (updaters must be pure).
  const dragWidthRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragWidth, setDragWidth] = useState(null);

  const clamp = useCallback(
    (w) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return w;
      return Math.max(minLeft, Math.min(w, rect.width - minRight));
    },
    [containerRef, minLeft, minRight]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const clamped = Math.max(minLeft, Math.min(e.clientX - rect.left, rect.width - minRight));
      dragWidthRef.current = clamped;
      setDragWidth(clamped);
    },
    [containerRef, minLeft, minRight]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      draggingRef.current = false;
      const finalWidth = dragWidthRef.current;
      dragWidthRef.current = null;
      setDragging(false);
      setDragWidth(null);
      if (finalWidth != null && onWidthChange) {
        onWidthChange(finalWidth);
      }
    },
    [onWidthChange]
  );

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const seed = width != null ? width : rect ? rect.width / 2 : null;
      dragWidthRef.current = seed;
      setDragWidth(seed);
      draggingRef.current = true;
      setDragging(true);
    },
    [containerRef, width]
  );

  const onDoubleClick = useCallback(
    (e) => {
      e.preventDefault();
      if (onWidthChange) onWidthChange(null);
    },
    [onWidthChange]
  );

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Re-clamp the persisted width when the container resizes (e.g. window or
  // parent pane shrinks). Only dispatches if the clamped value differs.
  useEffect(() => {
    if (width == null || !containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const clamped = clamp(width);
      if (clamped !== width && onWidthChange) {
        onWidthChange(clamped);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, clamp, onWidthChange, containerRef]);

  return { dragging, dragWidth, dragbarProps: { onMouseDown, onDoubleClick } };
}
