import { useEffect } from 'react';
import { isElectron } from 'utils/common/platform';
import { parsedFileCacheStore } from 'store/parsedFileCache';

const useParsedFileCacheIpc = () => {
  useEffect(() => {
    if (!isElectron()) {
      return () => {};
    }

    const { ipcRenderer } = window;

    const handleCacheRequest = async (operation, requestId, ...args) => {
      try {
        let result = null;
        switch (operation) {
          case 'getEntry':
            result = await parsedFileCacheStore.getEntry(...args);
            break;
          case 'setEntry':
            await parsedFileCacheStore.setEntry(...args);
            break;
          case 'invalidate':
            await parsedFileCacheStore.invalidate(...args);
            break;
          case 'invalidateCollection':
            await parsedFileCacheStore.invalidateCollection(...args);
            break;
          case 'invalidateDirectory':
            await parsedFileCacheStore.invalidateDirectory(...args);
            break;
          case 'getStats':
            result = await parsedFileCacheStore.getStats();
            break;
          case 'clear':
            await parsedFileCacheStore.clear();
            break;
          default:
            throw new Error(`Unknown cache operation: ${operation}`);
        }
        ipcRenderer.send('renderer:parsed-file-cache-response', { requestId, success: true, data: result });
      } catch (error) {
        ipcRenderer.send('renderer:parsed-file-cache-response', { requestId, success: false, error: error.message });
      }
    };

    const removeListener = ipcRenderer.on('main:parsed-file-cache-request', handleCacheRequest);

    // Prune old cache entries on startup
    parsedFileCacheStore.prune().catch((err) => {
      console.error('ParsedFileCacheStore: Error during startup prune:', err);
    });

    return () => {
      removeListener();
    };
  }, []);
};

export default useParsedFileCacheIpc;
