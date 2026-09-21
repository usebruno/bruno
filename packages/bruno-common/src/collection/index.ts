export interface SortableItem {
  name?: string;
  seq?: number;
}

export const sortByNameThenSequence = <T extends SortableItem>(items: T[]): T[] => {
  const isSeqValid = (seq: unknown): boolean =>
    Number.isFinite(seq) && Number.isInteger(seq) && (seq as number) > 0;

  const alphabeticallySorted = [...items].sort((a, b) => (a.name && b.name && a.name.localeCompare(b.name)) || 0);

  const withoutSeq: (T | T[])[] = alphabeticallySorted.filter((f) => !isSeqValid(f.seq));
  const withSeq = alphabeticallySorted
    .filter((f) => isSeqValid(f.seq))
    .sort((a, b) => (a.seq as number) - (b.seq as number));

  const sortedItems = withoutSeq;

  withSeq.forEach((item) => {
    const position = (item.seq as number) - 1;
    const existingItem = withoutSeq[position];

    const hasItemWithSameSeq = Array.isArray(existingItem)
      ? existingItem?.[0]?.seq === item.seq
      : existingItem?.seq === item.seq;

    if (hasItemWithSameSeq) {
      const newGroup = Array.isArray(existingItem) ? [...existingItem, item] : [existingItem, item];
      withoutSeq.splice(position, 1, newGroup);
    } else {
      withoutSeq.splice(position, 0, item);
    }
  });

  return sortedItems.flat() as T[];
};

export const resolveCollectionVersion = (
  brunoConfig: { version?: string; collectionVersion?: string } | null | undefined,
  isOpenCollection: boolean
): string => {
  if (!brunoConfig) return '';
  return (isOpenCollection ? brunoConfig.version : brunoConfig.collectionVersion) || '';
};

export default sortByNameThenSequence;
