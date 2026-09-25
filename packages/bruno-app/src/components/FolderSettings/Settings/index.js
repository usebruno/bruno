import React from 'react';
import { IconTag } from '@tabler/icons';
import Tags from './Tags/index';

const Settings = ({ folder, collection }) => {
  return (
    <div className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure settings for this folder.</div>
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium flex items-center gap-1 mb-4">
            <IconTag size={16} />
            Tags
          </h3>
          <Tags folder={folder} collection={collection} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
