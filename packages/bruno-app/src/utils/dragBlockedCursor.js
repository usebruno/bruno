/**
 * Provides a "not-allowed" cursor when attempting to drag undroppable items (like Examples or blocked multi-selections).
 * Because native HTML5 drag-and-drop cannot customize mid-drag cursors, this module tracks mouse movements manually
 * and applies a global CSS class. It also intercepts the trailing click event to prevent unintended selections.
 */

const BLOCKED_CURSOR_CLASS = 'dnd-blocked-cursor';
const DRAG_THRESHOLD_PX = 4;

let dragStart = null;
let isTrackingDrag = false;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const stopTracking = () => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('blur', onWindowBlur);
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

// A click only follows mouseup when mousedown and mouseup shared a target, so releasing over a
// different element never fires one — drop the listener on the next tick instead of waiting
// indefinitely, or it would go on to swallow the user's next, unrelated click.
function suppressTrailingClickOnce() {
  const suppress = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener('click', suppress, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', suppress, true), 0);
}

function onMouseUp() {
  if (isTrackingDrag) {
    suppressTrailingClickOnce();
  }
  stopTracking();
}

function onWindowBlur() {
  stopTracking();
}

export const startBlockedDragTracking = (e) => {
  if (e.button !== 0) return;

  dragStart = { x: e.clientX, y: e.clientY };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onWindowBlur);
};
