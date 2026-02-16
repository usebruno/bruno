import React from 'react';
import { IconFileOff } from '@tabler/icons';

const DotEnvEmptyState = () => {
  return (
    <div className="empty-state">
      <IconFileOff size={48} strokeWidth={1.5} />
      <div className="title">No .env File</div>
      <div className="description">
        Add a variable below to create a .env file in this location.
      </div>
    </div>
  );
};

export default DotEnvEmptyState;
