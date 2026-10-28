import { useCallback, useEffect, useState } from 'react';

// The size of the search index and a way to clear it. The size is read when the panel using this hook mounts and
// again after clearing.
const useSearchIndex = () => {
  const [size, setSize] = useState(null);

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
  }, [refreshSize]);

  const clear = useCallback(async () => {
    await window.ipcRenderer.invoke('renderer:clear-search-index');
    await refreshSize();
  }, [refreshSize]);

  return { size, clear };
};

export default useSearchIndex;
