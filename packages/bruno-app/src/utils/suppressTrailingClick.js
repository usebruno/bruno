/**
 * Swallows the click the browser dispatches right after a drag gesture's mouseup, so releasing
 * over a clickable element (e.g. a sortable table header) doesn't also activate it.
 *
 * A click only follows mouseup when mousedown and mouseup shared a target, so releasing over a
 * different element never fires.
 */
export const suppressTrailingClickOnce = () => {
  const suppress = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  document.addEventListener('click', suppress, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', suppress, true), 0);
};
