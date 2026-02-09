import React from 'react';
import { IconCategory } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import classNames from 'classnames';

const WorkspaceHeader = ({ workspace }) => {
  if (!workspace) {
    return null;
  }

  return (
    <StyledWrapper>
      <div className="flex items-center justify-between gap-2 py-2 px-4">
        <div className="workspace-title">
          <IconCategory size={20} strokeWidth={1.5} />
          <span className={classNames('workspace-name', { 'italic text-muted': !workspace?.name })}>
            {workspace?.name || 'Untitled Workspace'}
          </span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceHeader;
