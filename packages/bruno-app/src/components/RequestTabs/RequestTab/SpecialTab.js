import React, { useRef } from 'react';
import CloseTabIcon from './CloseTabIcon';
import { IconVariable, IconSettings, IconRun, IconFolder, IconShieldLock } from '@tabler/icons';
import { TabContextMenu } from 'components/TabContextMenu/index';

const SpecialTab = ({ handleCloseClick, type, tabName, handleDoubleClick, tabIndex }) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

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
        );
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

  const handleRightClick = (_event) => {
    const menuDropdown = dropdownTippyRef.current;
    if (!menuDropdown) {
      return;
    }

    if (menuDropdown.state.isShown) {
      menuDropdown.hide();
    } else {
      menuDropdown.show();
    }
  };

  return (
    <>
      <div className="flex items-center tab-label pl-2" onContextMenu={handleRightClick}>
        {getTabInfo(type, tabName)}
        <TabContextMenu onDropdownCreate={onDropdownCreate} tabIndex={tabIndex} dropdownTippyRef={dropdownTippyRef} />
      </div>

      <div className="flex px-2 close-icon-container" onClick={(e) => handleCloseClick(e)}>
        <CloseTabIcon />
      </div>
    </>
  );
};

export default SpecialTab;
