import { useCallback } from 'react';
import { IconSortAscendingLetters, IconSortDescendingLetters, IconArrowsSort } from '@tabler/icons';
import { usePersistedState } from 'hooks/usePersistedState';

const NEXT_MODE = {
  default: 'asc',
  asc: 'desc',
  desc: 'default'
};

const ICON_BY_MODE = {
  default: IconSortAscendingLetters,
  asc: IconSortDescendingLetters,
  desc: IconArrowsSort
};

const LABEL_BY_MODE = {
  default: 'Sort A-Z',
  asc: 'Sort Z-A',
  desc: 'Clear sort'
};

export const useSortCycle = ({ storageKey, defaultMode = 'default' }) => {
  const [sortMode, setSortMode] = usePersistedState({ key: storageKey, default: defaultMode });

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => NEXT_MODE[prev] || 'default');
  }, [setSortMode]);

  return {
    sortMode,
    cycleSortMode,
    SortIcon: ICON_BY_MODE[sortMode],
    sortLabel: LABEL_BY_MODE[sortMode]
  };
};
