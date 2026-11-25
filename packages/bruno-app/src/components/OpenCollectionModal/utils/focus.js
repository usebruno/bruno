const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]'
].join(', ');

const isTabbable = (element) => element.tabIndex >= 0 && !element.closest('[inert]') && element.checkVisibility();

export const getTabbableElements = (container) => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isTabbable);

export const focusWhenFocusIsLost = (element) => {
  const focused = document.activeElement;
  if (element && (focused === document.body || focused.closest('[hidden]'))) {
    element.focus();
  }
};

export const focusNextTabbable = (element, leaving) => {
  if (document.activeElement !== element) {
    return;
  }
  const tabbable = getTabbableElements(element.closest('[role="dialog"]') ?? document.body);
  const index = tabbable.indexOf(element);
  const next = tabbable[index + 1] ?? (leaving && tabbable.slice(0, index).findLast((candidate) => !leaving.contains(candidate)));
  if (next) {
    next.focus();
  }
};

export const returnFocusAfterOverlay = (element) => {
  queueMicrotask(() => {
    if (element instanceof HTMLElement && element.isConnected) {
      focusWhenFocusIsLost(element);
    }
  });
};
