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

const viewportTop = (el) => el.getBoundingClientRect().top;

const readAnchor = (el) => {
  const top = viewportTop(el);
  const row = Array.from(el.querySelectorAll('[data-section-key] tr[data-item-index]'))
    .find((candidate) => candidate.getBoundingClientRect().bottom > top);
  if (!row) return null;
  return {
    sectionKey: row.closest('[data-section-key]').dataset.sectionKey,
    index: Number(row.dataset.itemIndex),
    offset: row.getBoundingClientRect().top - top
  };
};

const readPosition = (el) => ({
  top: el.scrollTop,
  atBottom: maxScrollTop(el) > 0 && maxScrollTop(el) - el.scrollTop <= 1,
  anchor: readAnchor(el)
});

const findAnchorRow = (el, anchor) =>
  el.querySelector(`[data-section-key="${anchor.sectionKey}"] tr[data-item-index="${anchor.index}"]`);

const useSidebarScroll = (scrollRef, tableRefs, view) => {
  const [positions, setPositions] = usePersistedState({ key: 'variables-sidebar.scroll', default: {} });
  const positionsRef = useRef(positions);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const saved = positionsRef.current[view] || TOP_POSITION;
    const distanceToTarget = () => {
      if (saved.atBottom) return maxScrollTop(el) - el.scrollTop;
      if (!saved.anchor) return saved.top - el.scrollTop;

      const anchorRow = findAnchorRow(el, saved.anchor);
      if (anchorRow) return anchorRow.getBoundingClientRect().top - viewportTop(el) - saved.anchor.offset;

      const table = tableRefs.current.get(saved.anchor.sectionKey);
      if (!table) return saved.top - el.scrollTop;
      table.scrollToIndex({ index: saved.anchor.index, align: 'start' });
      return null;
    };

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
      const distance = distanceToTarget();
      if (distance === null) {
        stableFrames = 0;
      } else if (Math.abs(distance) > 1) {
        el.scrollTop = Math.min(Math.max(el.scrollTop + distance, 0), maxScrollTop(el));
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

    el.scrollTop = saved.atBottom ? maxScrollTop(el) : saved.top;
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
  }, [scrollRef, tableRefs, view, setPositions]);
};

export default useSidebarScroll;
