import { useCallback } from 'react';
import { IconArrowUp, IconArrowDown } from '@tabler/icons';
import { usePersistedState } from 'hooks/usePersistedState';

const NEXT_MODE = {
  default: 'asc',
  asc: 'desc',
  desc: 'default'
};

const ICON_BY_MODE = {
  default: null,
  asc: IconArrowUp,
  desc: IconArrowDown
};

const LABEL_BY_MODE = {
  default: 'Default order',
  asc: 'Sorted A-Z',
  desc: 'Sorted Z-A'
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
