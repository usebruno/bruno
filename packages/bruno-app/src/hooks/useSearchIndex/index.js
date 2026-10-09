import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

// The size of the search index and a way to clear it. The size is read again whenever indexing starts or finishes,
// since that is when it changes.
const useSearchIndex = () => {
  const [size, setSize] = useState(null);
  const building = useSelector((state) => state.app.searchIndexBuilding);

  const refreshSize = useCallback(() => {
    return window.ipcRenderer
      .invoke('renderer:get-search-index-size')
      .then(setSize)
      .catch((error) => {
        console.error('Failed to read the search index size', error);
        setSize(null);
      });
  }, []);

  useEffect(() => {
    refreshSize();
  }, [refreshSize, building]);

  const clear = useCallback(async () => {
    const { searchIndexSize } = await window.ipcRenderer.invoke('renderer:clear-search-index');
    setSize(searchIndexSize);
  }, []);

  return { size, building, clear };
};

export default useSearchIndex;
