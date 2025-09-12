import React from 'react';
import StyledWrapper from './StyledWrapper';

const TabNavigation = ({ activeTab, onTabChange, collectionProtoFiles, collectionImportPaths }) => {
  return (
    <StyledWrapper className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
      <div className="tab-container flex space-x-1 rounded-lg p-1">
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors tab-button ${activeTab === 'protofiles' ? 'active' : ''}`}
          onClick={e => {
            e.stopPropagation();
            onTabChange('protofiles');
          }}
        >
          Proto Files (
          {collectionProtoFiles?.length || 0}
          )
        </button>
        <button
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors tab-button ${activeTab === 'importpaths' ? 'active' : ''}`}
          onClick={e => {
            e.stopPropagation();
            onTabChange('importpaths');
          }}
        >
          Import Paths (
          {collectionImportPaths?.length || 0}
          )
        </button>
      </div>
    </StyledWrapper>
  );
};

export default TabNavigation;
