/**
 * True when a modal, dropdown or listbox is open. Keyboard navigation must not
 * steal focus from an overlay that the user opened after requesting focus.
 */
export const isOverlayOpen = () => Boolean(
  typeof document !== 'undefined'
  && document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')
);
