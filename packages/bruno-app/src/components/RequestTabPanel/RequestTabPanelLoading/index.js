import React from 'react';
import { IconLoader2 } from '@tabler/icons';

const RequestTabPanelLoading = ({ name }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
      <IconLoader2 className="animate-spin" size={24} strokeWidth={1.5} />
      <span>Loading {name ? `"${name}"` : 'request'}...</span>
    </div>
  );
};

export default RequestTabPanelLoading;
