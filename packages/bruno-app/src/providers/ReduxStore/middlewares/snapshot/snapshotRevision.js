let snapshotRevision = 0;

export const getNextSnapshotRevision = () => {
  snapshotRevision += 1;
  return snapshotRevision;
};

export const resetSnapshotRevision = () => {
  snapshotRevision = 0;
};
