import React from 'react';
import CloseTabIcon from './CloseTabIcon';
import DraftTabIcon from './DraftTabIcon';
import { IconVariable, IconSettings, IconRun, IconFolder, IconShieldLock, IconX } from '@tabler/icons';

const SpecialTab = ({ handleCloseClick, type, tabName, handleDoubleClick, hasDraft }) => {
  const getTabInfo = (type, tabName) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <div onDoubleClick={handleDoubleClick} className="flex items-center flex-nowrap overflow-hidden">
            <IconSettings size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1 leading-6">Collection</span>
          </div>
        );
      }
      case 'collection-overview': {
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
          <div onDoubleClick={handleDoubleClick} className="flex items-center flex-nowrap overflow-hidden">
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
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center tab-name gap-1">
        {getTabInfo(type, tabName)}
        {hasDraft ? <DraftTabIcon /> : null}
      </div>
      <div className="flex items-center justify-center close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <IconX size={12} strokeWidth={2} />
      </div>
    </div>
  );
};

export default SpecialTab;
