import { useCallback, useRef } from 'react';

// Suppresses transitions on the subtree for the length of a calibration pass. Defined in
// globals.css because it has to reach descendants that this hook never sees.
const MEASURING_CLASS = 'measuring-overflow';

/**
 * Collapses a container by degrees until its contents fit.
 *
 * Levels are cumulative and ordered widest-first. The hook asks the browser how wide the
 * container would have to be at each level — by laying it out at `max-content` and reading
 * the result — and then picks the fewest levels whose answer fits the width it actually
 * has. Because the widths come from the contents themselves, a toolbar that renders one
 * Cancel button mid-run and four buttons afterwards collapses at the right point in both
 * cases.
 *
 * Measuring is destructive — it applies each level in turn to see what it saves — so it
 * happens only when the contents change, never on resize. Resizing compares a number
 * against a cached table and writes a class only when the answer moves. That split is the
 * whole design: mutating classes on every frame restarts the buttons' 150ms padding
 * transition each time, which reads as wobble, and mid-transition geometry feeding back
 * into the next decision is what makes a measured collapse oscillate at its own boundary.
 *
 * Contents changing is noticed rather than announced. A MutationObserver watches the
 * subtree for children arriving and leaving and for text being rewritten, so a caller
 * cannot forget to declare that a button is conditional — the failure that a
 * hand-maintained dependency list invites, and one that shows up as a quietly wrong
 * collapse point rather than as an error. characterData matters as much as childList: a
 * count ticking from 0 to 1000 in place widens a row without adding a node. Attributes are
 * left unwatched, and the classes and inline width this hook writes are attributes, so
 * calibrating can never trigger another calibration.
 *
 * Classes are written straight to the node rather than through state: CSS is the only
 * consumer, so a render per resize would buy nothing, and keeping React out of the
 * className stops it clobbering a measurement mid-flight. Callers must therefore pass a
 * constant className to the observed element — a dynamic one would be rewritten by React
 * on its next render, taking the collapse classes with it.
 *
 * Container queries would express this in CSS, but styled-components v5 compiles through
 * @emotion/stylis, which mangles `@container` into invalid — and un-scoped — output.
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

  // classList skips the write when a token is already in the wanted state, so a resize
  // that does not move the answer leaves the DOM — and the transitions — untouched.
  const applyLevels = useCallback((node, count) => {
    levelsRef.current.forEach((level, index) => node.classList.toggle(level, index < count));
  }, []);

  const calibrate = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;

    const all = levelsRef.current;
    const settled = all.filter((level) => node.classList.contains(level)).length;
    const width = node.style.width;

    // max-content lays the row out at the size its contents want rather than the size the
    // parent imposes, which is exactly the threshold being looked for. Nothing here
    // reaches the screen: the style is restored within the same synchronous block.
    node.classList.add(MEASURING_CLASS);
    node.style.width = 'max-content';

    try {
      const widths = [];
      for (let count = 0; count <= all.length; count += 1) {
        applyLevels(node, count);
        widths[count] = node.offsetWidth;
      }
      widthsRef.current = widths;
    } finally {
      applyLevels(node, settled);
      node.style.width = width;
      node.classList.remove(MEASURING_CLASS);
    }
  }, [applyLevels]);

  const apply = useCallback(() => {
    const node = nodeRef.current;
    const widths = widthsRef.current;
    if (!node || !widths) return;

    const available = node.offsetWidth;
    // Collapsed or not yet laid out: the last answer beats collapsing to nothing.
    if (!available) return;

    let count = 0;
    while (count < levelsRef.current.length && widths[count] > available) count += 1;
    applyLevels(node, count);
  }, [applyLevels]);

  // A burst of mutations, or a mutation during a drag, settles into one pass per frame.
  const schedule = useCallback(() => {
    // Tracked apart from the frame handle, which is only ever needed to cancel: the
    // handle is not assigned until the callback has already run under a synchronous rAF.
    if (scheduledRef.current) return;
    scheduledRef.current = true;

    frameRef.current = requestAnimationFrame(() => {
      scheduledRef.current = false;
      if (staleRef.current) {
        staleRef.current = false;
        calibrate();
      }
      apply();
    });
  }, [calibrate, apply]);

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
          schedule();
        });
        mutationObserverRef.current.observe(node, { childList: true, characterData: true, subtree: true });
      }

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(schedule);
        resizeObserverRef.current.observe(node);
      }

      // Synchronously, so the first paint is already collapsed correctly.
      staleRef.current = false;
      calibrate();
      apply();
    },
    [calibrate, apply, schedule]
  );

  return containerRef;
};

export default useOverflowCollapse;
