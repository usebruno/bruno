import React from 'react';
import { IconVariable, IconSettings, IconRun } from '@tabler/icons';
import { getSpecialTabName } from 'utils/tabs/index';

const getTabIcon = (type) => {
  switch (type) {
    case 'collection-settings': {
      return IconSettings;
    }
    case 'variables': {
      return IconVariable;
    }
    case 'collection-runner': {
      return IconRun;
    }
  }
};

const SpecialTab = ({ handleCloseClick, type }) => {
  const Icon = getTabIcon(type);

  return (
    <>
      <div className="flex items-center tab-label pl-2">
        <Icon size={18} strokeWidth={1.5} className="text-yellow-600" />
        <span className="ml-1">{getSpecialTabName(type)}</span>
      </div>
      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="close-icon">
          <path
            fill="currentColor"
            d="M207.6 256l107.72-107.72c6.23-6.23 6.23-16.34 0-22.58l-25.03-25.03c-6.23-6.23-16.34-6.23-22.58 0L160 208.4 52.28 100.68c-6.23-6.23-16.34-6.23-22.58 0L4.68 125.7c-6.23 6.23-6.23 16.34 0 22.58L112.4 256 4.68 363.72c-6.23 6.23-6.23 16.34 0 22.58l25.03 25.03c6.23 6.23 16.34 6.23 22.58 0L160 303.6l107.72 107.72c6.23 6.23 16.34 6.23 22.58 0l25.03-25.03c6.23-6.23 6.23-16.34 0-22.58L207.6 256z"
          ></path>
        </svg>
      </div>
    </>
  );
};

export default SpecialTab;
