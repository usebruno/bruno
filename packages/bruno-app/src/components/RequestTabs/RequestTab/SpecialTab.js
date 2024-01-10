import React from 'react';
import { Settings, Variable } from 'lucide-react';
import { Runner } from 'components/icons/Runner';

const SpecialTab = ({ handleCloseClick, type }) => {
  const getTabInfo = (type) => {
    switch (type) {
      case 'collection-settings': {
        return (
          <>
            <Settings size={18} className="text-amber-500" />
            <span className="ml-1">Collection</span>
          </>
        );
      }
      case 'variables': {
        return (
          <>
            <Variable size={18} className="text-amber-500 mr-1" />
            <span>Variables</span>
          </>
        );
      }
      case 'collection-runner': {
        return (
          <>
            <Runner size={18} className="text-amber-500 mr-1" />
            <span>Runner</span>
          </>
        );
      }
    }
  };

  return (
    <>
      <div className="flex items-center tab-label pl-2">{getTabInfo(type)}</div>
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
