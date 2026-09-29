import { useCallback, useRef } from 'react';

const MEASURING_CLASS = 'measuring-overflow';

/**
 * Collapses a container by levels until its contents fit.
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

  const applyLevelClasses = useCallback((node, collapseDepth) => {
    levelsRef.current.forEach((level, index) => node.classList.toggle(level, index < collapseDepth));
  }, []);

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

  const scheduleCollapse = useCallback(() => {
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

      if (!node) return;

      if (typeof MutationObserver !== 'undefined') {
        mutationObserverRef.current = new MutationObserver((records) => {
          const contentChanged = records.some(
            (record) => record.type !== 'characterData' || (record.oldValue?.length ?? 0) !== (record.target?.data?.length ?? 0)
          );
          if (!contentChanged) return;
          staleRef.current = true;
          scheduleCollapse();
        });
        mutationObserverRef.current.observe(node, {
          childList: true,
          characterData: true,
          characterDataOldValue: true,
          subtree: true
        });
      }

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current = new ResizeObserver(scheduleCollapse);
        resizeObserverRef.current.observe(node);
      }

      staleRef.current = false;
      measureLevelWidths();
      collapseToFit();
    },
    [measureLevelWidths, collapseToFit, scheduleCollapse]
  );

  return containerRef;
};

export default useOverflowCollapse;
