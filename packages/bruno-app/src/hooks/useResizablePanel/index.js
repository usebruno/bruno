import { useEffect, useRef, useState } from 'react';

/**
 * Drag-to-resize behavior for a side panel.
 *
 * @param {object} options
 * @param {number} options.initialWidth   - Starting width in px
 * @param {number} options.minWidth       - Minimum allowed width in px
 * @param {number} options.maxWidth       - Maximum allowed width in px
 * @param {'left' | 'right'} options.direction - Panel side. 'right' means dragging
 *   left expands the panel; 'left' means dragging right expands it.
 * @param {function} [options.onResizeEnd] - Called with the final width on mouseup
 *
 * @returns {{ width: number, handleDragStart: function }}
 */
export function useResizablePanel({
  initialWidth,
  minWidth,
  maxWidth,
  direction = 'left',
  onResizeEnd
}) {
  const [width, setWidth] = useState(initialWidth);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const currentWidth = useRef(initialWidth);

  const clamp = (w) => Math.min(maxWidth, Math.max(minWidth, w));

  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = currentWidth.current;
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const delta
      = direction === 'right'
        ? dragStartX.current - e.clientX // drag left = expand
        : e.clientX - dragStartX.current; // drag right = expand
    const newWidth = clamp(dragStartWidth.current + delta);
    currentWidth.current = newWidth;
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      if (onResizeEnd) onResizeEnd(currentWidth.current);
    }
    isDragging.current = false;
  };

  useEffect(() => {
    // Note: tying the events to the document instead of the parent to avoid fast movement
    // from breaking the flow state of dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { width, handleDragStart };
}
