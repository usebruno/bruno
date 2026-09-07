import { useEffect, useRef, useState } from 'react';

const ROW_HEIGHT = 35;
const FOCUS_SCROLL_FRAMES = 90;
// Keep in sync with the row-focus-flash animation in EditableTable/StyledWrapper.
const FOCUS_FLASH_DURATION = 2500;

const findFocusRowIndex = (rows, keyColumn, { uid, name } = {}) => {
  if (uid) {
    const byUid = rows.findIndex((row) => row.uid === uid);
    if (byUid !== -1) return byUid;
  }

  if (!keyColumn || !name) return -1;
  const targetName = String(name).toLowerCase();
  let index = -1;
  rows.forEach((row, rowIndex) => {
    const rowName = row[keyColumn.key];
    if (typeof rowName === 'string' && rowName.toLowerCase() === targetName) {
      index = rowIndex;
    }
  });
  return index;
};

const findRenderedRow = (wrapper, rowIndex) =>
  wrapper?.querySelector(`tr[data-item-index="${rowIndex}"]`) || null;

const isRowInViewport = (row, scrollParent) => {
  if (!row || !scrollParent?.getBoundingClientRect) return false;
  const rowRect = row.getBoundingClientRect();
  const parentRect = scrollParent.getBoundingClientRect();
  return rowRect.top >= parentRect.top && rowRect.bottom <= parentRect.bottom;
};

/** Scroll toward an unrendered row. Measure from the wrapper sticky thead moves the table. */
const scrollNearRow = (scrollParent, wrapper, rowIndex) => {
  if (!wrapper || !scrollParent?.getBoundingClientRect) return;

  const wrapperOffset = wrapper.getBoundingClientRect().top
    - scrollParent.getBoundingClientRect().top
    + scrollParent.scrollTop;
  const headerHeight = wrapper.querySelector('thead')?.offsetHeight || ROW_HEIGHT;
  const rowTop = wrapperOffset + headerHeight + (rowIndex * ROW_HEIGHT);
  const nextTop = Math.max(0, rowTop - (scrollParent.clientHeight / 2));

  if (Math.abs(scrollParent.scrollTop - nextTop) > 1) {
    scrollParent.scrollTop = nextTop;
  }
};

/**
 * Scroll a virtualized EditableTable row into view and flash it.
 */
export const useRevealFocusedTableRow = ({
  focusRow,
  rows,
  keyColumn,
  scrollParent,
  wrapperRef,
  virtuosoRef,
  onFocusRowHandled
}) => {
  const [flashedRow, setFlashedRow] = useState(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const keyColumnRef = useRef(keyColumn);
  keyColumnRef.current = keyColumn;
  const onFocusRowHandledRef = useRef(onFocusRowHandled);
  onFocusRowHandledRef.current = onFocusRowHandled;

  const focusRowUid = focusRow?.uid;
  const focusRowName = focusRow?.name;
  const focusRowRequestedAt = focusRow?.requestedAt;

  useEffect(() => {
    if ((!focusRowUid && !focusRowName) || !scrollParent) return;

    const currentRows = rowsRef.current;
    const index = findFocusRowIndex(currentRows, keyColumnRef.current, {
      uid: focusRowUid,
      name: focusRowName
    });
    if (index === -1) {
      onFocusRowHandledRef.current?.();
      return;
    }

    const uid = currentRows[index].uid;
    setFlashedRow((prev) => (
      prev?.uid === uid && prev?.requestedAt === focusRowRequestedAt
        ? prev
        : { uid, requestedAt: focusRowRequestedAt }
    ));

    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const finish = () => {
      if (!cancelled) onFocusRowHandledRef.current?.();
    };

    const revealRow = () => {
      if (cancelled) return;
      attempts += 1;

      // scrollToIndex is a no-op until measured; also set scrollTop so the row mounts.
      virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });
      scrollNearRow(scrollParent, wrapperRef.current, index);

      const row = findRenderedRow(wrapperRef.current, index);
      if (row) {
        row.scrollIntoView({ block: 'center', inline: 'nearest' });
        if (isRowInViewport(row, scrollParent)) {
          finish();
          return;
        }
      }

      if (attempts >= FOCUS_SCROLL_FRAMES) {
        finish();
        return;
      }

      frame = requestAnimationFrame(revealRow);
    };

    frame = requestAnimationFrame(revealRow);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [focusRowUid, focusRowName, focusRowRequestedAt, scrollParent, virtuosoRef, wrapperRef]);

  useEffect(() => {
    if (!flashedRow) return;

    const timer = setTimeout(() => setFlashedRow(null), FOCUS_FLASH_DURATION);
    return () => clearTimeout(timer);
  }, [flashedRow]);

  return flashedRow?.uid || null;
};
