import { useEffect, useState } from 'react';

const useCollectionGitRemoteUrl = (pathname) => {
  const [gitCollectionUrl, setGitCollectionUrl] = useState(null);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let active = true;
    setIsResolved(false);
    if (!pathname) {
      setGitCollectionUrl(null);
      setIsResolved(true);
      return undefined;
    }
    window.ipcRenderer
      .invoke('renderer:get-collection-git-remote-url', pathname)
      .then((url) => {
        if (!active) return;
        setGitCollectionUrl(url || null);
        setIsResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setGitCollectionUrl(null);
        setIsResolved(true);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return { gitCollectionUrl, isResolved };
};

export default useCollectionGitRemoteUrl;
