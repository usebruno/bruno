import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const useDefaultApiSpecLocation = () => {
  const activeWorkspace = useSelector((state) =>
    state.workspaces.workspaces.find((workspace) => workspace.uid === state.workspaces.activeWorkspaceUid)
  );
  const [location, setLocation] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let active = true;
    // The workspace can change while the folder lookup is in flight, so a late
    // answer for the previous workspace must not overwrite the current location.
    const settle = (nextLocation) => {
      if (!active) return;
      setLocation(nextLocation);
      setIsResolved(true);
    };

    if (!activeWorkspace?.pathname || activeWorkspace.type === 'default') {
      settle('');
      return;
    }

    setIsResolved(false);
    window.ipcRenderer
      .invoke('renderer:ensure-apispec-folder', activeWorkspace.pathname)
      .then((apiSpecPath) => settle(apiSpecPath || ''))
      .catch((error) => {
        console.error('Error getting apispec folder:', error);
        settle('');
      });

    return () => {
      active = false;
    };
  }, [activeWorkspace?.pathname, activeWorkspace?.type]);

  return { location, isResolved };
};

export default useDefaultApiSpecLocation;
