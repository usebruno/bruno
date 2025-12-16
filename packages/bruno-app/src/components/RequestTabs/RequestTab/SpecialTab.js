import React from 'react';
import GradientCloseButton from './GradientCloseButton';
import { IconVariable, IconSettings, IconRun, IconFolder, IconShieldLock } from '@tabler/icons';

const SpecialTab = ({ handleCloseClick, type, tabName, handleDoubleClick, hasDraft }) => {
  const getTabInfo = (type, tabName) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <>
            <IconSettings size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">Collection</span>
          </>
        );
      }
      case 'collection-overview': {
        return (
          <>
            <IconSettings size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">Overview</span>
          </>
        );
      }
      case 'security-settings': {
        return (
          <>
            <IconShieldLock size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">Security</span>
          </>
        );
      }
      case 'folder-settings': {
        return (
          <>
            <IconFolder size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">{tabName || 'Folder'}</span>
          </>
        );
      }
      case 'variables': {
        return (
          <>
            <IconVariable size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">Variables</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <IconRun size={14} strokeWidth={1.5} className="text-yellow-600 flex-shrink-0" />
            <span className="ml-1 tab-name">Runner</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div
        className="flex items-baseline tab-label"
        onDoubleClick={handleDoubleClick}
      >
        {getTabInfo(type, tabName)}
      </div>
      <GradientCloseButton hasChanges={hasDraft} onClick={(e) => handleCloseClick(e)} />
    </>
  );
};

export default SpecialTab;
