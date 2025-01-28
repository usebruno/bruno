import React from 'react';
import { getTotalRequestCountInCollection } from 'utils/collections/';
import { IconFolder, IconFileOff, IconWorld, IconApi } from '@tabler/icons';

const Info = ({ collection }) => {
  const totalRequestsInCollection = getTotalRequestCountInCollection(collection);

  return (
    <div className="w-full flex flex-col h-fit">
      <div className="rounded-lg py-6">
        <div className="grid gap-6">
          {/* Location Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <IconFolder className="w-5 h-5 text-blue-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-semibold text-sm">Location</div>
              <div className="mt-1 text-sm text-muted break-all">
                {collection.pathname}
              </div>
            </div>
          </div>

          {/* Environments Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <IconWorld className="w-5 h-5 text-green-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-semibold text-sm">Environments</div>
              <div className="mt-1 text-sm text-muted">
                {collection.environments?.length || 0} environment{collection.environments?.length !== 1 ? 's' : ''} configured
              </div>
            </div>
          </div>

          {/* Requests Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <IconApi className="w-5 h-5 text-purple-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-semibold text-sm">Requests</div>
              <div className="mt-1 text-sm text-muted">
                {totalRequestsInCollection} request{totalRequestsInCollection !== 1 ? 's' : ''} in collection
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;
