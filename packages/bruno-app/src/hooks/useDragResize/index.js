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
  // Mirror the live drag width in a ref so handleMouseUp can read the final
  // value without taking dragWidth as a dep (would re-create the handler on
  // every mousemove and re-run the listener-attach effect).
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
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      e.preventDefault();
      const clamped = clamp(e.clientX - rect.left);
      dragWidthRef.current = clamped;
      setDragWidth(clamped);
    },
    [containerRef, clamp]
  );

  const handleMouseUp = useCallback(
    (e) => {
      e.preventDefault();
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
    if (!dragging) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Re-clamp the persisted width when the container resizes (e.g. window or
  // parent pane shrinks). Only dispatches if the clamped value differs.
  // widthRef avoids tearing down the observer on every width change — the
  // observer reads the latest width through the ref instead.
  const widthRef = useRef(width);
  widthRef.current = width;
  const hasWidth = width != null;
  useEffect(() => {
    if (!hasWidth || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const clamped = clamp(widthRef.current);
      if (clamped !== widthRef.current && onWidthChange) {
        onWidthChange(clamped);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [hasWidth, clamp, onWidthChange, containerRef]);

  return { dragging, dragWidth, dragbarProps: { onMouseDown, onDoubleClick } };
}
