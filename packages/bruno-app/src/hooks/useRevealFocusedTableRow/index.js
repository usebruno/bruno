import { useEffect, useRef, useState } from 'react';

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

/**
 * Scroll a virtualized EditableTable row into view and flash it.
 */
export const useRevealFocusedTableRow = ({
  focusRow,
  rows,
  keyColumn,
  scrollParent,
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
    const finish = () => {
      if (!cancelled) onFocusRowHandledRef.current?.();
    };

    if (!virtuosoRef.current?.scrollIntoView) {
      finish();
      return;
    }

    virtuosoRef.current.scrollIntoView({
      index,
      behavior: 'auto',
      done: finish
    });

    return () => {
      cancelled = true;
    };
  }, [focusRowUid, focusRowName, focusRowRequestedAt, scrollParent, virtuosoRef]);

  useEffect(() => {
    if (!flashedRow) return;

    const timer = setTimeout(() => setFlashedRow(null), FOCUS_FLASH_DURATION);
    return () => clearTimeout(timer);
  }, [flashedRow]);

  return flashedRow?.uid || null;
};
