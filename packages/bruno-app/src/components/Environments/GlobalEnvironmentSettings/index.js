import React from 'react';
import { useSelector } from 'react-redux';
import WorkspaceEnvironments from 'components/WorkspaceHome/WorkspaceEnvironments';
import { selectActiveWorkspace } from '../../../selectors/workspaces';

const GlobalEnvironmentSettings = () => {
  const workspace = useSelector(selectActiveWorkspace);

  return <WorkspaceEnvironments workspace={workspace} />;
};

export default GlobalEnvironmentSettings;
