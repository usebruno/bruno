/**
 * Provides a "not-allowed" cursor when attempting to drag undroppable items (like Examples or blocked multi-selections).
 * Because native HTML5 drag-and-drop cannot customize mid-drag cursors, this module tracks mouse movements manually
 * and applies a global CSS class. It also intercepts the trailing click event to prevent unintended selections.
 */

const BLOCKED_CURSOR_CLASS = 'dnd-blocked-cursor';
const DRAG_THRESHOLD_PX = 4;

let dragStart = null;
let isTrackingDrag = false;
let suppressNextClick = false;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const stopTracking = () => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  document.body.classList.remove(BLOCKED_CURSOR_CLASS);
  dragStart = null;
  isTrackingDrag = false;
};

function onMouseMove(e) {
  if (!dragStart || isTrackingDrag) return;
  if (distance({ x: e.clientX, y: e.clientY }, dragStart) < DRAG_THRESHOLD_PX) return;

  isTrackingDrag = true;
  document.body.classList.add(BLOCKED_CURSOR_CLASS);
}

function onMouseUp() {
  if (isTrackingDrag) {
    suppressNextClick = true;
  }
  stopTracking();
}

export const startBlockedDragTracking = (e) => {
  if (e.button !== 0) return;

  dragStart = { x: e.clientX, y: e.clientY };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
}
