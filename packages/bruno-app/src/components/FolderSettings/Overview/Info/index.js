import React from 'react';
import { getTotalRequestCountInCollection, getTreePathFromCollectionToItem, areItemsLoading, getItemsLoadStats } from 'utils/collections/';
import { IconFolder, IconApi, IconSubtask } from '@tabler/icons';

const Info = ({ collection, folder }) => {
  const totalRequestsInFolder = getTotalRequestCountInCollection(folder);
  const isFolderLoading = areItemsLoading(folder);
  const { loading: itemsLoadingCount, total: totalItems } = getItemsLoadStats(folder);

  // Count direct child folders
  const childFoldersCount = (folder.items || []).filter((item) => item.type === 'folder').length;

  // Get relative path from collection to folder
  const treePath = getTreePathFromCollectionToItem(collection, folder);
  const relativePath = treePath.map((item) => item.name).join(' / ');

  return (
    <div className="w-full flex flex-col h-fit">
      <div className="rounded-lg py-6">
        <div className="grid gap-5">
          {/* Location Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <IconFolder className="w-5 h-5 text-green-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">Location</div>
              <div className="mt-1 text-muted break-all text-xs">
                {relativePath}
              </div>
            </div>
          </div>

          {/* Requests Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <IconApi className="w-5 h-5 text-purple-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">Requests</div>
              <div className="mt-1 text-muted text-xs">
                {
                  isFolderLoading ? `${totalItems - itemsLoadingCount} out of ${totalItems} requests in the folder loaded` : `${totalRequestsInFolder} request${totalRequestsInFolder !== 1 ? 's' : ''} in folder`
                }
              </div>
            </div>
          </div>

          {/* Subfolders Row */}
          <div className="flex items-start">
            <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <IconSubtask className="w-5 h-5 text-blue-500" stroke={1.5} />
            </div>
            <div className="ml-4">
              <div className="font-medium">Subfolders</div>
              <div className="mt-1 text-muted text-xs">
                {childFoldersCount} subfolder{childFoldersCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;
