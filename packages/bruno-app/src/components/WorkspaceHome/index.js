import React from 'react';
import { useSelector } from 'react-redux';
import WorkspaceOverview from './WorkspaceOverview';
import StyledWrapper from './StyledWrapper';

const WorkspaceHome = () => {
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  if (!activeWorkspace) {
    return null;
  }

  return (
    <StyledWrapper className="h-full">
      <div className="h-full flex flex-row">
        <div className="main-content">
          <div className="tab-content">
            <WorkspaceOverview workspace={activeWorkspace} />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceHome;
