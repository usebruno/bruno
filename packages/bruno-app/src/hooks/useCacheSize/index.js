import { useCallback, useEffect, useState } from 'react';

const identity = (value) => value;

// Size of a main-process cache, read on mount and again after clearing
const useCacheSize = ({ sizeChannel, clearChannel, toSize = identity }) => {
  const [size, setSize] = useState(null);

  const refreshSize = useCallback(() => {
    return window.ipcRenderer
      .invoke(sizeChannel)
      .then((value) => setSize(toSize(value)))
      .catch((error) => {
        console.error(`Failed to read cache size (${sizeChannel})`, error);
        setSize(null);
      });
  }, [sizeChannel, toSize]);

  useEffect(() => {
    refreshSize();
  }, [refreshSize]);

  const clear = useCallback(async () => {
    await window.ipcRenderer.invoke(clearChannel);
    await refreshSize();
  }, [clearChannel, refreshSize]);

  return { size, clear };
};

export default useCacheSize;
