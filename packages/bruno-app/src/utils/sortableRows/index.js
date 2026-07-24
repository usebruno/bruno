const defaultGetName = (row) => row?.name;

export const sortRowsByName = (rows, mode, getName = defaultGetName) => {
  if (mode !== 'asc' && mode !== 'desc') {
    return rows;
  }
  const direction = mode === 'desc' ? -1 : 1;
  const compare = (a, b) => (getName(a) || '').localeCompare(getName(b) || '', undefined, { sensitivity: 'base', numeric: true });
  return [...rows].sort((a, b) => compare(a, b) * direction);
};

export const reconcileEditsToRealOrder = (realRows, editedDisplayRows) => {
  const editedByUid = new Map(editedDisplayRows.map((row) => [row.uid, row]));
  const realUids = new Set(realRows.map((row) => row.uid));

  const preserved = realRows.filter((row) => editedByUid.has(row.uid)).map((row) => editedByUid.get(row.uid));
  const added = editedDisplayRows.filter((row) => !realUids.has(row.uid));

  return [...preserved, ...added];
};

export const reorderWithinSubset = (fullList, belongsToSubset, fromUid, toUid) => {
  if (fromUid === toUid) {
    return fullList;
  }

  const subset = fullList.filter(belongsToSubset);
  const fromIndex = subset.findIndex((row) => row.uid === fromUid);
  const toIndex = subset.findIndex((row) => row.uid === toUid);
  if (fromIndex === -1 || toIndex === -1) {
    return fullList;
  }

  const reorderedSubset = [...subset];
  const [movedRow] = reorderedSubset.splice(fromIndex, 1);
  reorderedSubset.splice(toIndex, 0, movedRow);

  let pointer = 0;
  return fullList.map((row) => (belongsToSubset(row) ? reorderedSubset[pointer++] : row));
};
