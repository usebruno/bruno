import { useCallback, useLayoutEffect, useRef } from 'react';
import { usePersistedState } from 'hooks/usePersistedState';
import {
  SCROLL_RESTORE_GUARD_MS,
  SCROLL_SAVE_DEBOUNCE_MS,
  SCROLL_TOP_EPSILON,
  SCROLL_ZERO_ACCEPT_DELAY_MS
} from '../constants';

const getScrollEl = (wrapper) => wrapper?.querySelector?.('.variables-scroll') || null;

/**
 * Owns the shared scroller's position: seeds it from persistence on mount, holds
 * it against Virtuoso's resets, saves it as the user scrolls, and writes the last
 * known position back on unmount.
 *
 * Both sections render into one scroller, so the position is a tab-level value
 * rather than a per-table one.
 */
export const useVariablesScroll = (wrapperRef) => {
  const [scroll, setScroll] = usePersistedState({ key: 'variables-scroll', default: 0 });

  // Live scroll position, seeded once from persistence. Kept in a ref so a
  // debounced save can't be clobbered by a re-render.
  const scrollPosRef = useRef(scroll);
  const saveTimeoutRef = useRef(null);
  const zeroTimeoutRef = useRef(null);

  useLayoutEffect(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;

    const target = scrollPosRef.current || 0;
    const mountedAt = performance.now();

    el.scrollTop = target;

    const flushSave = (value) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setScroll(value);
      }, SCROLL_SAVE_DEBOUNCE_MS);
    };

    const handleScroll = () => {
      const elapsed = performance.now() - mountedAt;
      // While Virtuoso is settling, ignore forced scroll-to-top.
      if (elapsed < SCROLL_RESTORE_GUARD_MS && target > 0 && el.scrollTop < SCROLL_TOP_EPSILON) {
        el.scrollTop = target;
        return;
      }

      const top = el.scrollTop;

      // Virtuoso teardown (child layout cleanup runs before ours) often forces
      // the shared parent to 0. If we accepted that immediately we'd persist
      // top and the next visit would start at 0. Debounce accepting "top".
      if (top < SCROLL_TOP_EPSILON && (scrollPosRef.current || 0) > SCROLL_TOP_EPSILON) {
        if (zeroTimeoutRef.current) clearTimeout(zeroTimeoutRef.current);
        zeroTimeoutRef.current = setTimeout(() => {
          scrollPosRef.current = el.scrollTop;
          flushSave(scrollPosRef.current);
        }, SCROLL_ZERO_ACCEPT_DELAY_MS);
        return;
      }

      if (zeroTimeoutRef.current) {
        clearTimeout(zeroTimeoutRef.current);
        zeroTimeoutRef.current = null;
      }

      scrollPosRef.current = top;
      flushSave(top);
    };

    el.addEventListener('scroll', handleScroll);

    let rafId = 0;
    const guard = () => {
      if (performance.now() - mountedAt >= SCROLL_RESTORE_GUARD_MS) return;
      if (target > 0 && Math.abs(el.scrollTop - target) > 1) {
        el.scrollTop = target;
      }
      rafId = requestAnimationFrame(guard);
    };
    rafId = requestAnimationFrame(guard);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (zeroTimeoutRef.current) clearTimeout(zeroTimeoutRef.current);
      // Persist last known user position from the ref. Do not read el.scrollTop —
      // Virtuoso may already have reset it to 0 during its own unmount.
      setScroll(scrollPosRef.current || 0);
    };
  }, [setScroll]);

  const captureScroll = useCallback(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    // Prefer ref (stable across Virtuoso resets) but refresh from DOM if the
    // guard window has passed and the element still has a real offset.
    const next = el.scrollTop > 0 ? el.scrollTop : (scrollPosRef.current || 0);
    scrollPosRef.current = next;
    setScroll(next);
  }, [setScroll]);

  const reassertScroll = useCallback(() => {
    const el = getScrollEl(wrapperRef.current);
    if (!el) return;
    el.scrollTop = scrollPosRef.current || 0;
  }, []);

  const resetScroll = useCallback(() => {
    scrollPosRef.current = 0;
    setScroll(0);
    const el = getScrollEl(wrapperRef.current);
    if (el) el.scrollTop = 0;
  }, [setScroll]);

  return { captureScroll, reassertScroll, resetScroll };
};
