import { useCallback, useState } from 'react';
import { useSortCycle } from 'hooks/useSortCycle';
import { sortRowsByName, reconcileEditsToRealOrder } from 'utils/sortableRows';

export const useSortableEditableTableRows = ({ storageKey, rows, onChange, hasDraft }) => {
  const { sortMode, cycleSortMode, SortIcon, sortLabel } = useSortCycle({ storageKey });

  const [prevSortMode, setPrevSortMode] = useState(undefined);
  const [prevHasDraft, setPrevHasDraft] = useState(hasDraft);
  const [order, setOrder] = useState(null);

  const justCommitted = prevHasDraft === true && hasDraft === false;
  if (prevHasDraft !== hasDraft) {
    setPrevHasDraft(hasDraft);
  }

  if (prevSortMode !== sortMode || justCommitted) {
    setPrevSortMode(sortMode);
    setOrder(sortMode === 'default' ? null : sortRowsByName(rows, sortMode).map((row) => row.uid));
  }

  const displayRows = (sortMode === 'default' || !order)
    ? rows
    : (() => {
        const byUid = new Map(rows.map((row) => [row.uid, row]));
        const knownUids = new Set(order);
        const ordered = order.filter((uid) => byUid.has(uid)).map((uid) => byUid.get(uid));
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
