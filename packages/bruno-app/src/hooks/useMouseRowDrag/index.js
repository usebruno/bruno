import { useCallback, useEffect, useRef, useState } from 'react';

export const DRAG_ROW_KEY_ATTR = 'data-drag-row-key';

const movePreviewTo = (preview, x, y) => {
  preview.style.transform = `translate(${(x + 12) / 16}rem, ${(y + 12) / 16}rem)`;
};

const findRowKeyAt = (overlay, x, y) => {
  overlay.style.pointerEvents = 'none';
  const target = document.elementFromPoint(x, y);
  overlay.style.pointerEvents = 'auto';
  const row = target?.closest?.(`[${DRAG_ROW_KEY_ATTR}]`);
  return row?.getAttribute(DRAG_ROW_KEY_ATTR) ?? null;
};

export const useMouseRowDrag = ({ enabled, onReorder }) => {
  const [draggingKey, setDraggingKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const cleanupRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const handleDragHandleMouseDown = useCallback((e, key, label) => {
    if (!enabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; cursor: grabbing;';

    const preview = document.createElement('div');
    preview.textContent = label || '';
    preview.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      z-index: 10000;
      padding: 0.25rem 0.625rem;
      border-radius: 0.25rem;
      background: rgba(30, 30, 30, 0.9);
      color: #fff;
      font-size: 0.75rem;
      white-space: nowrap;
      pointer-events: none;
    `;
    movePreviewTo(preview, e.clientX, e.clientY);

    document.body.appendChild(overlay);
    document.body.appendChild(preview);
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    setDraggingKey(key);

    const handleMouseMove = (moveEvent) => {
      movePreviewTo(preview, moveEvent.clientX, moveEvent.clientY);
      setDragOverKey(findRowKeyAt(overlay, moveEvent.clientX, moveEvent.clientY));
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      overlay.remove();
      preview.remove();
      document.body.style.userSelect = prevUserSelect;
      cleanupRef.current = null;
    };

    const handleMouseUp = (upEvent) => {
      const toKey = findRowKeyAt(overlay, upEvent.clientX, upEvent.clientY);
      cleanup();
      setDraggingKey(null);
      setDragOverKey(null);
      if (toKey && toKey !== key) {
        onReorder(key, toKey);
      }
    };

    cleanupRef.current = cleanup;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enabled, onReorder]);

  const cancelDrag = useCallback(() => {
    cleanupRef.current?.();
    setDraggingKey(null);
    setDragOverKey(null);
  }, []);

  return { draggingKey, dragOverKey, handleDragHandleMouseDown, cancelDrag };
};
