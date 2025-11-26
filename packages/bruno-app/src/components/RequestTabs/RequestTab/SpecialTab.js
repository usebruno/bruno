import React from 'react';
import CloseTabIcon from './CloseTabIcon';
import DraftTabIcon from './DraftTabIcon';
import { IconVariable, IconSettings, IconRun, IconFolder, IconShieldLock } from '@tabler/icons';

const SpecialTab = ({ handleCloseClick, type, tabName, handleDoubleClick, hasDraft }) => {
  const getTabInfo = (type, tabName) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <div onDoubleClick={handleDoubleClick} className="flex items-center flex-nowrap overflow-hidden">
            <IconSettings size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span>Collection</span>
          </div>
        );
      }
      case 'collection-overview': {
        return (
          <>
            <IconSettings size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span>Collection</span>
          </>
        );
      }
      case 'security-settings': {
        return (
          <>
            <IconShieldLock size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span>Security</span>
          </>
        )
      }
      case 'folder-settings': {
        return (
          <div onDoubleClick={handleDoubleClick} className="flex items-center flex-nowrap overflow-hidden">
            <IconFolder size={18} strokeWidth={1.5} className="text-yellow-600 min-w-[18px]" />
            <span className="truncate">{tabName || 'Folder'}</span>
          </div>
        );
      }
      case 'variables': {
        return (
          <>
            <IconVariable size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span>Variables</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <IconRun size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span>Runner</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div className="flex items-center tab-label pl-2">{getTabInfo(type, tabName)}</div>
      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        {hasDraft ? <DraftTabIcon /> : <CloseTabIcon />}
      </div>
    </>
  );
};

export default SpecialTab;
