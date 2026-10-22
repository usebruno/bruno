import { useCallback, useEffect, useState } from 'react';

const useFileCache = () => {
  const [size, setSize] = useState(null);

  const refreshSize = useCallback(() => {
    return window.ipcRenderer
      .invoke('datastore:file-index:file_index_size')
      .then((row) => setSize(row?.bytes ?? null))
      .catch((error) => {
        console.error('Failed to read the file cache size', error);
        setSize(null);
      });
  }, []);

  useEffect(() => {
    refreshSize();
  }, [refreshSize]);

  const clear = useCallback(async () => {
    await window.ipcRenderer.invoke('datastore:file-index:file_index_clear');
    await refreshSize();
  }, [refreshSize]);

  return { size, clear };
};

export default useFileCache;
