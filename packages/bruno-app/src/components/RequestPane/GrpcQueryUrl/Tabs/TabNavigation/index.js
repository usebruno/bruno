import React from 'react';

const TabNavigation = ({ activeTab, onTabChange, collectionProtoFiles, collectionImportPaths }) => {
  return (
    <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
      <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'protofiles'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('protofiles');
          }}
        >
          Proto Files ({collectionProtoFiles?.length || 0})
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'importpaths'
              ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('importpaths');
          }}
        >
          Import Paths ({collectionImportPaths?.length || 0})
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;
