import React from 'react';
import CloseTabIcon from './CloseTabIcon';
import { IconVariable, IconSettings, IconRun, IconFolder, IconShieldLock } from '@tabler/icons';

const SpecialTab = ({ handleCloseClick, type, tabName }) => {
  const getTabInfo = (type, tabName) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <>
            <IconSettings size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1 leading-6">Collection</span>
          </>
        );
      }
      case 'security-settings': {
        return (
          <>
            <IconShieldLock size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1">Security</span>
          </>
        )
      }
      case 'folder-settings': {
        return (
          <div className="flex items-center flex-nowrap overflow-hidden">
            <IconFolder size={18} strokeWidth={1.5} className="text-yellow-600 min-w-[18px]" />
            <span className="ml-1 leading-6 truncate">{tabName || 'Folder'}</span>
          </div>
        );
      }
      case 'variables': {
        return (
          <>
            <IconVariable size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1 leading-6">Variables</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <IconRun size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1 leading-6">Runner</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div className="flex items-center tab-label pl-2">{getTabInfo(type, tabName)}</div>
      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <CloseTabIcon />
      </div>
    </>
  );
};

export default SpecialTab;
