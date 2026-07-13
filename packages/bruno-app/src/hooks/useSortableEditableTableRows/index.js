import { useCallback, useRef } from 'react';
import { useSortCycle } from 'hooks/useSortCycle';
import { sortRowsByName, reconcileEditsToRealOrder } from 'utils/sortableRows';

export const useSortableEditableTableRows = ({ storageKey, rows, onChange, hasDraft }) => {
  const { sortMode, cycleSortMode, SortIcon, sortLabel } = useSortCycle({ storageKey });

  const orderRef = useRef(null);
  const prevSortModeRef = useRef();
  const prevHasDraftRef = useRef(hasDraft);
  const justCommitted = prevHasDraftRef.current === true && hasDraft === false;
  prevHasDraftRef.current = hasDraft;

  if (prevSortModeRef.current !== sortMode || justCommitted) {
    prevSortModeRef.current = sortMode;
    orderRef.current = sortMode === 'default' ? null : sortRowsByName(rows, sortMode).map((row) => row.uid);
  }

  const displayRows = (sortMode === 'default' || !orderRef.current)
    ? rows
    : (() => {
        const byUid = new Map(rows.map((row) => [row.uid, row]));
        const knownUids = new Set(orderRef.current);
        const ordered = orderRef.current.filter((uid) => byUid.has(uid)).map((uid) => byUid.get(uid));
        const added = rows.filter((row) => !knownUids.has(row.uid));
        return [...ordered, ...added];
      })();

  const handleChange = useCallback((editedRows) => {
    if (sortMode === 'default') {
      onChange(editedRows);
      return;
    }
    onChange(reconcileEditsToRealOrder(rows, editedRows));
  }, [sortMode, rows, onChange]);

  return {
    displayRows,
    handleChange,
    reorderable: sortMode === 'default',
    sortMode,
    cycleSortMode,
    SortIcon,
    sortLabel
  };
};
