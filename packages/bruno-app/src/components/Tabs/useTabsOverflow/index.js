import { useCallback, useEffect, useRef, useState } from 'react';

// This hook and `calculateTabVisibility` in `ui/ResponsiveTabs` take the same measure-and-overflow
// approach, but their width rules differ, so check whether a fix to one also applies to the other.

const areKeysEqual = (prevKeys, newKeys) => {
  if (prevKeys.length !== newKeys.length) return false;
  return prevKeys.every((key, i) => key === newKeys[i]);
};

/**
 * Splits an ordered list of tab keys into the ones that fit in the list element and the ones
 * that must collapse into the overflow dropdown.
 *
 * @param {Object} params
 * @param {string[]} params.keys - Trigger values in render order
 * @param {string} params.activeKey - The currently selected trigger value
 * @returns {{ listRef, measureRowRef, overflowTriggerMeasureRef, setMeasureRef, overflowKeys }}
 *   `listRef` goes on the list element (the width budget), `measureRowRef` on the hidden
 *   measurement row, `overflowTriggerMeasureRef` on the measured overflow-trigger clone,
 *   `setMeasureRef(key, el)` on each measured tab clone. Every key not in `overflowKeys` is
 *   visible.
 */
const useTabsOverflow = ({ keys, activeKey }) => {
  const [overflowKeys, setOverflowKeys] = useState([]);

  const listRef = useRef(null);
  const measureRowRef = useRef(null);
  const measureRefs = useRef({});
  const overflowTriggerMeasureRef = useRef(null);

  const calculate = () => {
    const list = listRef.current;
    if (!list || !keys.length) return;

    const listWidth = list.offsetWidth;
    // Not laid out yet (e.g. the pane is hidden); keep the current split rather than collapsing everything.
    if (!listWidth) return;

    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const overflowTriggerWidth = overflowTriggerMeasureRef.current?.offsetWidth || 0;
    const widthOf = (key) => (measureRefs.current[key]?.offsetWidth || 0) + gap;

    const split = (budget) => {
      const visible = [];
      const overflow = [];
      let used = 0;

      for (const key of keys) {
        const width = widthOf(key);
        if (!overflow.length && used + width <= budget) {
          visible.push(key);
          used += width;
        } else {
          overflow.push(key);
        }
      }

      return { visible, overflow };
    };

    // Compute without any overflow icon, if overflows, compute again with the icon width
    const overflowBudget = listWidth - overflowTriggerWidth;
    let { visible, overflow } = split(listWidth + gap);
    if (overflow.length) {
      ({ visible, overflow } = split(overflowBudget));
    }

    // The active tab is always visible: move trailing visible tabs into overflow until it fits.
    const activeIndex = overflow.indexOf(activeKey);
    if (activeIndex !== -1) {
      overflow.splice(activeIndex, 1);
      let used = visible.reduce((sum, key) => sum + widthOf(key), widthOf(activeKey));
      while (visible.length && used > overflowBudget) {
        const displaced = visible.pop();
        used -= widthOf(displaced);
        overflow.unshift(displaced);
      }
      visible.push(activeKey);
    }

    setOverflowKeys((prev) => (areKeysEqual(prev, overflow) ? prev : overflow));
  };

  const calculateRef = useRef(calculate);
  calculateRef.current = calculate;

  // calculate when keys change
  const keysSignature = keys.join('\u0000');
  useEffect(() => {
    const frameId = requestAnimationFrame(() => calculateRef.current());
    return () => cancelAnimationFrame(frameId);
  }, [keysSignature, activeKey]);

  useEffect(() => {
    let frameId = null;

    const observer = new ResizeObserver(() => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => calculateRef.current());
    });

    if (listRef.current) {
      observer.observe(listRef.current);
    }
    if (measureRowRef.current) {
      observer.observe(measureRowRef.current);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
    };
  }, []);

  const setMeasureRef = useCallback((key, el) => {
    if (el) {
      measureRefs.current[key] = el;
    } else {
      delete measureRefs.current[key];
    }
  }, []);

  return { listRef, measureRowRef, overflowTriggerMeasureRef, setMeasureRef, overflowKeys };
};

export default useTabsOverflow;
