import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sanitizeName } from 'utils/common/regex';
import { getBasename } from 'utils/common/path';

const useCollectionSource = ({ collectionPathname, fallbackName, onEnvironmentsLoaded, onFilesSkipped }) => {
  const [collectionData, setCollectionData] = useState(null);
  const [environments, setEnvironments] = useState({});
  const [derivedName, setDerivedName] = useState('');

  useEffect(() => {
    if (!collectionPathname) {
      setCollectionData(null);
      setEnvironments({});
      setDerivedName('');
      onEnvironmentsLoaded('');
      return;
    }

    setDerivedName(sanitizeName(fallbackName || getBasename('', collectionPathname) || ''));

    let cancelled = false;

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:get-collection-json', collectionPathname)
      .then(({ skipped, ...collection }) => {
        if (cancelled) {
          return;
        }

        setCollectionData(collection);

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
        onEnvironmentsLoaded('');
        toast.error(err?.message || 'Failed to load collection');
      });

    return () => {
      cancelled = true;
    };
  }, [collectionPathname]);

  return { collectionData, environments, derivedName };
};

export default useCollectionSource;
