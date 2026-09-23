import { useCallback, useRef } from 'react';

// Suppresses transitions on the subtree for the length of a measuring pass, declared in global.css.
const MEASURING_CLASS = 'measuring-overflow';

/**
 * Collapses a container by levels until its contents fit.
 *
 * Levels are cumulative and ordered widest-first. The hook asks the browser how wide the
 * container would have to be at each level and then picks the fewest levels whose answer
 * fits the width it actually has.
 *
 * Classes are written straight to the node rather than through state: callers must therefore pass a
 * constant className to the observed element — a dynamic one would be rewritten by React on its next
 * render, taking the collapse classes with it.
 *
 * @param {string[]} levels - class names, widest-first; each is added on top of the last
 * @returns {Function} a callback ref for the container
 */
const useOverflowCollapse = (levels) => {
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  const nodeRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const mutationObserverRef = useRef(null);
  const frameRef = useRef(null);
  const scheduledRef = useRef(false);
  const staleRef = useRef(true);
  const widthsRef = useRef(null);

  /**
   * Turns the first `collapseDepth` level classes on and the rest off.
   *
   * classList.toggle with the force flag (2nd arg) either adds or removes based on the flag, and leaves the
   * class attribute untouched if the action is redundant.
   */
  const applyLevelClasses = useCallback((node, collapseDepth) => {
    levelsRef.current.forEach((level, index) => node.classList.toggle(level, index < collapseDepth));
  }, []);

  /**
   * Records the width the contents want at each level, for `collapseToFit` to read back.
   *
   * `max-content` lays the full content that the children need. Measured only on content
   * change, not on resize. The classes are restored within the same synchronous block, so
   * changes are invisible.
   */
  const measureLevelWidths = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;

    const all = levelsRef.current;
    const settledDepth = all.filter((level) => node.classList.contains(level)).length;
    const width = node.style.width;

    node.classList.add(MEASURING_CLASS);
    node.style.width = 'max-content';

    try {
      const widths = [];
      for (let depth = 0; depth <= all.length; depth += 1) {
        applyLevelClasses(node, depth);
        widths[depth] = node.offsetWidth;
      }
      widthsRef.current = widths;
    } finally {
      applyLevelClasses(node, settledDepth);
      node.style.width = width;
      node.classList.remove(MEASURING_CLASS);
    }
  }, [applyLevelClasses]);

  /** Picks the fewest levels whose measured width fits the width the container actually has. */
  const collapseToFit = useCallback(() => {
    const node = nodeRef.current;
    const widths = widthsRef.current;
    if (!node || !widths) return;

    const available = node.offsetWidth;
    if (!available) return;

    let depth = 0;
    while (depth < levelsRef.current.length && widths[depth] > available) depth += 1;
    applyLevelClasses(node, depth);
  }, [applyLevelClasses]);

  /** Settles a burst of mutations, or a mutation during a drag, into one pass per frame. */
  const scheduleCollapse = useCallback(() => {
    // Tracked apart from the frame handle, which is only ever needed to cancel: the
    // handle is not assigned until the callback has already run under a synchronous rAF.
    if (scheduledRef.current) return;
    scheduledRef.current = true;

    frameRef.current = requestAnimationFrame(() => {
      scheduledRef.current = false;
      if (staleRef.current) {
        staleRef.current = false;
        measureLevelWidths();
      }
      collapseToFit();
    });
  }, [measureLevelWidths, collapseToFit]);

  /**
   * Callback ref: tears down any previous node's observers and starts watching this one.
   *
   * A MutationObserver watches the subtree for children arriving and leaving and for text changing.
   * Attributes are left unwatched, and the classes and inline width this hook writes are attributes,
   * so measuring can never trigger another measuring pass.
   */
  const containerRef = useCallback(
    (node) => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      scheduledRef.current = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mutationObserverRef.current?.disconnect();
      mutationObserverRef.current = null;
      widthsRef.current = null;
      staleRef.current = true;
      nodeRef.current = node;

      // React calls the ref with null on unmount, so the teardown above is the cleanup.
      if (!node) return;

      if (typeof MutationObserver !== 'undefined') {
        mutationObserverRef.current = new MutationObserver(() => {
          staleRef.current = true;
          scheduleCollapse();
        });
        mutationObserverRef.current.observe(node, { childList: true, characterData: true, subtree: true });
      }

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(scheduleCollapse);
        resizeObserverRef.current.observe(node);
      }

      // Synchronously, so the first paint is already collapsed correctly.
      staleRef.current = false;
      measureLevelWidths();
      collapseToFit();
    },
    [measureLevelWidths, collapseToFit, scheduleCollapse]
  );

  return containerRef;
};

export default useOverflowCollapse;
