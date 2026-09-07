import { useCallback, useMemo, useState } from 'react';
import { useSortCycle } from 'hooks/useSortCycle';
import { sortRowsByName, reconcileEditsToRealOrder } from 'utils/sortableRows';

export const useSortableEditableTableRows = ({ storageKey, rows, onChange, isDraft, getSortValue }) => {
  const { sortMode, cycleSortMode, SortIcon, sortLabel } = useSortCycle({ storageKey });

  const [previous, setPrevious] = useState({
    sortMode: 'default',
    isDraft,
    committedRows: isDraft === false ? rows : null
  });
  const [order, setOrder] = useState(null);

  const justCommitted = previous.isDraft && isDraft === false;
  const committedRowsChanged = isDraft === false && previous.committedRows !== rows;
  const sortModeChanged = previous.sortMode !== sortMode;

  if (previous.isDraft !== isDraft || sortModeChanged || committedRowsChanged) {
    setPrevious({
      sortMode,
      isDraft,
      committedRows: isDraft === false ? rows : previous.committedRows
    });
  }

  if (sortModeChanged || justCommitted || committedRowsChanged) {
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
