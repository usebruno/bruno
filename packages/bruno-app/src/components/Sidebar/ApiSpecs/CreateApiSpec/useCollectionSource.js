import { useEffect, useState } from 'react';
import { sanitizeName } from 'utils/common/regex';
import { getBasename } from 'utils/common/path';
import { formatIpcError } from 'utils/common/error';

const useCollectionSource = ({ collectionPathname, fallbackName, onEnvironmentsLoaded, onFilesSkipped }) => {
  const [collectionData, setCollectionData] = useState(null);
  const [environments, setEnvironments] = useState({});
  const [derivedName, setDerivedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!collectionPathname) {
      setCollectionData(null);
      setEnvironments({});
      setDerivedName('');
      setIsLoading(false);
      setLoadError('');
      onEnvironmentsLoaded('');
      return;
    }

    setDerivedName(sanitizeName(fallbackName || getBasename('', collectionPathname) || ''));
    setCollectionData(null);
    setEnvironments({});
    setIsLoading(true);
    setLoadError('');
    onEnvironmentsLoaded('');

    let cancelled = false;

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:get-collection-json', collectionPathname)
      .then(({ skipped, ...collection }) => {
        if (cancelled) {
          return;
        }

        setCollectionData(collection);
        setIsLoading(false);

        const collectionEnvironments = collection.envVariables || {};
        setEnvironments(collectionEnvironments);
        onEnvironmentsLoaded(Object.keys(collectionEnvironments)[0] || '');

        if (skipped?.length) {
          onFilesSkipped(skipped);
        }
      })
      .catch((err) => {
        console.error('Error loading collection:', err);
        if (cancelled) {
          return;
        }

        setCollectionData(null);
        setEnvironments({});
        setIsLoading(false);
        onEnvironmentsLoaded('');
        setLoadError(formatIpcError(err) || 'Failed to load collection');
      });

    return () => {
      cancelled = true;
    };
  }, [collectionPathname]);

  return { collectionData, environments, derivedName, isLoading, loadError };
};

export default useCollectionSource;
