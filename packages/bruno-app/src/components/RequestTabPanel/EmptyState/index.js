import React from 'react';
import { IconClick, IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const EmptyState = ({ error }) => {
  if (error) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          <IconAlertTriangle size={48} strokeWidth={1.5} className="empty-icon error" />
          <h3 className="empty-title">Something went wrong</h3>
          <p className="empty-description">
            {error}
          </p>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="empty-state">
        <IconClick size={48} strokeWidth={1.5} className="empty-icon" />
        <h3 className="empty-title">No request open</h3>
        <p className="empty-description">
          Select a request from the sidebar to get started.
        </p>
      </div>
    </StyledWrapper>
  );
};

export default EmptyState;
