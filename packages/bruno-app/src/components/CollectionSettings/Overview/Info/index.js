import React from "react";
import { getTotalRequestCountInCollection, isItemAFolder } from 'utils/collections/';
import { IconBox, IconFolder, IconWorld, IconApi, IconShare, IconGitBranch, IconArrowsHorizontal } from '@tabler/icons';
import { areItemsLoading, getItemsLoadStats } from "utils/collections/index";
import { useState } from "react";
import ShareCollection from "components/ShareCollection/index";
import StyledWrapper from './StyledWrapper';
import { each } from 'lodash';

const getTotalFolderCountInCollection = (collection) => {
  let count = 0;
  each(collection.items, (item) => {
    if (isItemAFolder(item)) {
      count++;
      count += getTotalFolderCountInCollection(item);
    }
  });
  return count;
};

const Info = ({ collection, isCollapsed, onExpand }) => {
  const totalRequestsInCollection = getTotalRequestCountInCollection(collection);
  const totalFoldersInCollection = getTotalFolderCountInCollection(collection);

  const isCollectionLoading = areItemsLoading(collection);
  const { loading: itemsLoadingCount, total: totalItems } = getItemsLoadStats(collection);
  const [showShareCollectionModal, toggleShowShareCollectionModal] = useState(false);
  
  const handleToggleShowShareCollectionModal = (value) => (e) => {
    toggleShowShareCollectionModal(value);
  }

  if (isCollapsed) {
    return (
      <StyledWrapper className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col flex-1 items-center gap-4">
          {/* Expand Button - First Item */}
          <div className="flex flex-col items-center justify-center cursor-pointer group gap-1.5" onClick={onExpand} title="Expand">
            <div className="flex-shrink-0 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
              <IconArrowsHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" stroke={1.5} />
            </div>
            <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Expand</span>
          </div>

          {/* Collection Name Row - Icon Only */}
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <IconBox className="w-5 h-5 text-amber-500 dark:text-amber-400" stroke={1.5} />
            </div>
          </div>

          {/* Location Row - Icon Only */}
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <IconFolder className="w-5 h-5 text-blue-500 dark:text-blue-400" stroke={1.5} />
            </div>
          </div>

          {/* Environments Row - Icon Only */}
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <IconWorld className="w-5 h-5 text-green-500 dark:text-green-400" stroke={1.5} />
            </div>
          </div>

          {/* Requests Row - Icon Only */}
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <IconApi className="w-5 h-5 text-purple-500 dark:text-purple-400" stroke={1.5} />
            </div>
          </div>

          {/* Git Row - Icon Only */}
          <div className="flex items-center justify-center">
            <div className="flex-shrink-0 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <IconGitBranch className="w-5 h-5 text-orange-500 dark:text-orange-400" stroke={1.5} />
            </div>
          </div>

          {/* Share Row - Icon Only */}
          <div className="flex items-center justify-center cursor-pointer" onClick={handleToggleShowShareCollectionModal(true)}>
            <div className="flex-shrink-0 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <IconShare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" stroke={1.5} />
            </div>
          </div>
          {showShareCollectionModal && <ShareCollection collectionUid={collection.uid} onClose={handleToggleShowShareCollectionModal(false)} />}
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col flex-1">
        {/* Collection Name Row */}
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <IconBox className="w-5 h-5 text-amber-500 dark:text-amber-400" stroke={1.5} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Collection</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs break-words">
              {collection?.name}
            </div>
          </div>
        </div>

        <div className="separator"></div>

        {/* Location Row */}
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <IconFolder className="w-5 h-5 text-blue-500 dark:text-blue-400" stroke={1.5} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Location</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs break-all">
              {collection.pathname}
            </div>
          </div>
        </div>

        <div className="separator"></div>

        {/* Environments Row */}
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <IconWorld className="w-5 h-5 text-green-500 dark:text-green-400" stroke={1.5} />
          </div>
          <div className="ml-4 flex-1">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Environments</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs">
              {collection.environments?.length || 0} collection-environment{collection.environments?.length !== 1 ? 's' : ''} configured
            </div>
          </div>
        </div>

        <div className="separator"></div>

        {/* Requests Row */}
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <IconApi className="w-5 h-5 text-purple-500 dark:text-purple-400" stroke={1.5} />
          </div>
          <div className="ml-4 flex-1">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Requests</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs">
              {
                isCollectionLoading ? `${totalItems - itemsLoadingCount} out of ${totalItems} requests in the collection loaded` : `${totalRequestsInCollection} request${totalRequestsInCollection !== 1 ? 's' : ''} and ${totalFoldersInCollection} folder${totalFoldersInCollection !== 1 ? 's' : ''} in collection`
              }
            </div>
          </div>
        </div>

        <div className="separator"></div>

        {/* Git Row */}
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <IconGitBranch className="w-5 h-5 text-orange-500 dark:text-orange-400" stroke={1.5} />
          </div>
          <div className="ml-4 flex-1 min-w-0">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Git</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 text-xs break-all">
              {collection?.gitRemote || collection?.brunoConfig?.git?.remote || 'Not configured'}
            </div>
          </div>
        </div>

        <div className="separator"></div>

        {/* Share Row */}
        <div className="flex items-start group cursor-pointer" onClick={handleToggleShowShareCollectionModal(true)}>
          <div className="flex-shrink-0 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <IconShare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" stroke={1.5} />
          </div>
          <div className="ml-4 h-full flex flex-col justify-start">
            <div className="font-medium text-[13px] h-fit my-auto">Share</div>
            <div className="mt-1.5 group-hover:underline text-link text-[11px]">
              Share Collection
            </div>
          </div>
        </div>
        {showShareCollectionModal && <ShareCollection collectionUid={collection.uid} onClose={handleToggleShowShareCollectionModal(false)} />}
      </div>
    </StyledWrapper>
  );
};

export default Info;