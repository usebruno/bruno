import { useCallback, useMemo, useState } from 'react';
import { useSortCycle } from 'hooks/useSortCycle';
import { sortRowsByName, reconcileEditsToRealOrder } from 'utils/sortableRows';

export const useSortableEditableTableRows = ({ storageKey, rows, onChange, isDraft, getSortValue }) => {
  const { sortMode, cycleSortMode, SortIcon, sortLabel } = useSortCycle({ storageKey });

  const [prevSortMode, setPrevSortMode] = useState('default');
  const [prevIsDraft, setPrevIsDraft] = useState(isDraft);
  const [order, setOrder] = useState(null);

  const justCommitted = prevIsDraft && isDraft === false;
  if (prevIsDraft !== isDraft) {
    setPrevIsDraft(isDraft);
  }

  if (prevSortMode !== sortMode || justCommitted) {
    setPrevSortMode(sortMode);
    setOrder(sortMode === 'default' ? null : sortRowsByName(rows, sortMode, getSortValue).map((row) => row.uid));
  }

  const displayRows = useMemo(() => {
    if (sortMode === 'default' || !order) {
      return rows;
    }
    const byUid = new Map(rows.map((row) => [row.uid, row]));
    const knownUids = new Set(order);
    const ordered = order.filter((uid) => byUid.has(uid)).map((uid) => byUid.get(uid));
    const added = rows.filter((row) => !knownUids.has(row.uid));
    return [...ordered, ...added];
  }, [sortMode, order, rows]);

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
