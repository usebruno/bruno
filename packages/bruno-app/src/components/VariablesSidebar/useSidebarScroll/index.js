import { useLayoutEffect, useRef } from 'react';
import { usePersistedState } from 'hooks/usePersistedState';
import {
  SCROLL_RESTORE_MAX_MS,
  SCROLL_RESTORE_STABLE_FRAMES,
  SCROLL_SAVE_DEBOUNCE_MS,
  SCROLL_TOP_EPSILON,
  SCROLL_ZERO_ACCEPT_DELAY_MS
} from '../constants';

const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
const TOP_POSITION = { top: 0, atBottom: false };

const maxScrollTop = (el) => el.scrollHeight - el.clientHeight;

const readPosition = (el) => ({
  top: el.scrollTop,
  atBottom: maxScrollTop(el) > 0 && maxScrollTop(el) - el.scrollTop <= 1
});

const useSidebarScroll = (scrollRef, view, isScrollerShown) => {
  const [positions, setPositions] = usePersistedState({ key: 'variables-sidebar.scroll', default: {} });
  const positionsRef = useRef(positions);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!isScrollerShown || !el) return;

    const saved = positionsRef.current[view] || TOP_POSITION;
    const targetTop = () => (saved.atBottom ? maxScrollTop(el) : saved.top);
    const startedAt = performance.now();
    let isRestoring = saved.atBottom || saved.top > 0;
    let stableFrames = 0;
    let lastPosition = saved;
    let saveTimeout = null;
    let zeroTimeout = null;

    const save = (position) => {
      positionsRef.current = { ...positionsRef.current, [view]: position };
      setPositions(positionsRef.current);
    };

    const scheduleSave = (position) => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => save(position), SCROLL_SAVE_DEBOUNCE_MS);
    };

    const stopRestoring = () => {
      isRestoring = false;
    };

    const handleScroll = () => {
      if (isRestoring) return;

      if (el.scrollTop < SCROLL_TOP_EPSILON && lastPosition.top > SCROLL_TOP_EPSILON) {
        clearTimeout(zeroTimeout);
        zeroTimeout = setTimeout(() => {
          lastPosition = readPosition(el);
          scheduleSave(lastPosition);
        }, SCROLL_ZERO_ACCEPT_DELAY_MS);
        return;
      }

      clearTimeout(zeroTimeout);
      lastPosition = readPosition(el);
      scheduleSave(lastPosition);
    };

    let rafId = 0;
    const holdTarget = () => {
      if (!isRestoring) return;
      if (performance.now() - startedAt > SCROLL_RESTORE_MAX_MS) {
        stopRestoring();
        lastPosition = readPosition(el);
        scheduleSave(lastPosition);
        return;
      }
      const target = targetTop();
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTop = Math.min(target, maxScrollTop(el));
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }
      if (stableFrames >= SCROLL_RESTORE_STABLE_FRAMES) {
        stopRestoring();
        return;
      }
      rafId = requestAnimationFrame(holdTarget);
    };

    el.scrollTop = targetTop();
    el.addEventListener('scroll', handleScroll);
    USER_SCROLL_EVENTS.forEach((type) => el.addEventListener(type, stopRestoring, { passive: true }));
    rafId = requestAnimationFrame(holdTarget);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', handleScroll);
      USER_SCROLL_EVENTS.forEach((type) => el.removeEventListener(type, stopRestoring));
      clearTimeout(saveTimeout);
      clearTimeout(zeroTimeout);
      save(lastPosition);
    };
  }, [scrollRef, view, isScrollerShown, setPositions]);
};

export default useSidebarScroll;
