import React, { useEffect, useState } from 'react';
import Git from 'components/CollectionSettings/Git';

// Shows the Git panel for the workspace itself when the workspace folder
// is inside a git repository. The Git IPC handlers resolve the repo root by
// walking up from the given path, so passing the workspace path works the
// same way it does for a collection.
const WorkspaceGit = ({ workspace }) => {
  const [hasGitRepo, setHasGitRepo] = useState(false);

  useEffect(() => {
    if (!workspace?.pathname) {
      setHasGitRepo(false);
      return;
    }
    window.ipcRenderer
      .invoke('renderer:git-has-repo', { collectionPath: workspace.pathname })
      .then((result) => setHasGitRepo(result))
      .catch(() => setHasGitRepo(false));
  }, [workspace?.pathname]);

  if (!hasGitRepo) {
    return null;
  }

  return (
    <div className="git-section">
      <div className="section-title">Git</div>
      <Git
        target={{
          pathname: workspace.pathname,
          name: workspace.name,
          uid: workspace.uid
        }}
      />
    </div>
  );
};

export default WorkspaceGit;
