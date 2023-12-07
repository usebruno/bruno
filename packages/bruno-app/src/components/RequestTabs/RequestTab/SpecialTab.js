import React from 'react';
import { IconVariable, IconSettings, IconRun } from '@tabler/icons';
import CloseTabIcon from './CloseTab/CloseTabIcon';

const SpecialTab = ({ handleCloseClick, type }) => {
  const getTabInfo = (type) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <>
            <IconSettings size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1">Collection</span>
          </>
        );
      }
      case 'variables': {
        return (
          <>
            <IconVariable size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1">Variables</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <IconRun size={18} strokeWidth={1.5} className="text-yellow-600" />
            <span className="ml-1">Runner</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div className="flex items-center tab-label pl-2">{getTabInfo(type)}</div>
      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <CloseTabIcon />
      </div>
    </>
  );
};

export default SpecialTab;
