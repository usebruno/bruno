import React from 'react';
import { IconTag } from '@tabler/icons';
import Tags from './Tags';

const Settings = ({ item, collection }) => {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className='flex flex-col gap-2'>
        <h3 className="text-sm text-gray-700/50 dark:text-gray-300 flex items-center gap-1">
          <IconTag size={16} />
          Tags
        </h3>
        <div label="Tags">
          <Tags item={item} collection={collection} />
        </div>
      </div>
    </div>
  );
};

export default Settings; 