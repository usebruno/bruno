import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';

const useDefaultApiSpecLocation = () => {
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const preferences = useSelector((state) => state.app.preferences);

  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);
  const isDefaultWorkspace = !activeWorkspace || activeWorkspace.type === 'default';
  const preferredLocation = isDefaultWorkspace ? get(preferences, 'general.defaultLocation', '') : '';
  const workspacePathname = activeWorkspace?.pathname || '';

  const shouldResolveFolder = Boolean(workspacePathname) && !preferredLocation;

  const [apiSpecFolder, setApiSpecFolder] = useState('');

  useEffect(() => {
    if (!shouldResolveFolder) {
      setApiSpecFolder('');
    }
  }, [shouldResolveFolder]);

  useEffect(() => {
    if (!shouldResolveFolder) {
      return;
    }

    let cancelled = false;
    window.ipcRenderer
      .invoke('renderer:ensure-apispec-folder', workspacePathname)
      .then((apiSpecPath) => {
        if (!cancelled) {
          setApiSpecFolder(apiSpecPath);
        }
      })
      .catch((error) => {
        console.error('Error getting apispec folder:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [workspacePathname, shouldResolveFolder]);

  return preferredLocation || apiSpecFolder;
};

export default useDefaultApiSpecLocation;
