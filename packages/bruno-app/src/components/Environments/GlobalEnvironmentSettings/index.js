import React from 'react';
import { useSelector } from 'react-redux';
import WorkspaceEnvironments from 'components/WorkspaceHome/WorkspaceEnvironments';

const GlobalEnvironmentSettings = () => {
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const workspace = useSelector((state) =>
    state.workspaces.workspaces.find((w) => w.uid === activeWorkspaceUid)
  );

  return <WorkspaceEnvironments workspace={workspace} />;
};

export default GlobalEnvironmentSettings;
