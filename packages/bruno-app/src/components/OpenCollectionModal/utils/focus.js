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
  if (element && document.activeElement === document.body) {
    element.focus();
  }
};

export const focusNextTabbable = (element) => {
  if (document.activeElement !== element) {
    return;
  }
  const tabbable = getTabbableElements(element.closest('[role="dialog"]') ?? document.body);
  const next = tabbable[tabbable.indexOf(element) + 1];
  if (next) {
    next.focus();
  }
};

export const returnFocusTo = (element) => {
  queueMicrotask(() => {
    if (element instanceof HTMLElement && element.isConnected) {
      focusWhenFocusIsLost(element);
    }
  });
};
