import React, { useState, useCallback } from 'react';
import { IconMenu2, IconChevronRight } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const SubmenuTrigger = ({ label, submenuItems, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const submenuItemsWithClose = submenuItems.map((item) => {
    if (item.type === 'divider') return item;
    return {
      ...item,
      onClick: () => {
        item.onClick?.();
        onItemClick();
      }
    };
  });

  return (
    <div
      className="submenu-trigger"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <MenuDropdown
        items={submenuItemsWithClose}
        placement="right-start"
        opened={isOpen}
        onChange={setIsOpen}
        showTickMark={false}
        appendTo={() => document.body}
        offset={[0, 0]}
      >
        <div className="submenu-trigger-content">
          <span>{label}</span>
          <IconChevronRight size={14} />
        </div>
      </MenuDropdown>
    </div>
  );
};

const AppMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const { ipcRenderer } = window;

  const fileItems = [
    {
      id: 'open-collection',
      label: 'Open Collection',
      onClick: () => ipcRenderer?.invoke('renderer:open-collection')
    },
    { type: 'divider', id: 'file-div-1' },
    {
      id: 'preferences',
      label: 'Preferences',
      rightSection: <span className="shortcut">Ctrl+,</span>,
      onClick: () => ipcRenderer?.invoke('renderer:open-preferences')
    },
    { type: 'divider', id: 'file-div-2' },
    {
      id: 'quit',
      label: 'Quit',
      rightSection: <span className="shortcut">Alt+F4</span>,
      onClick: () => ipcRenderer?.send('renderer:window-close')
    }
  ];

  const editItems = [
    {
      id: 'undo',
      label: 'Undo',
      rightSection: <span className="shortcut">Ctrl+Z</span>,
      onClick: () => document.execCommand('undo')
    },
    {
      id: 'redo',
      label: 'Redo',
      rightSection: <span className="shortcut">Ctrl+Y</span>,
      onClick: () => document.execCommand('redo')
    },
    { type: 'divider', id: 'edit-div-1' },
    {
      id: 'cut',
      label: 'Cut',
      rightSection: <span className="shortcut">Ctrl+X</span>,
      onClick: () => document.execCommand('cut')
    },
    {
      id: 'copy',
      label: 'Copy',
      rightSection: <span className="shortcut">Ctrl+C</span>,
      onClick: () => document.execCommand('copy')
    },
    {
      id: 'paste',
      label: 'Paste',
      rightSection: <span className="shortcut">Ctrl+V</span>,
      onClick: () => document.execCommand('paste')
    },
    { type: 'divider', id: 'edit-div-2' },
    {
      id: 'select-all',
      label: 'Select All',
      rightSection: <span className="shortcut">Ctrl+A</span>,
      onClick: () => document.execCommand('selectAll')
    }
  ];

  const viewItems = [
    {
      id: 'toggle-devtools',
      label: 'Developer Tools',
      rightSection: <span className="shortcut">Ctrl+Shift+I</span>,
      onClick: () => ipcRenderer?.invoke('renderer:toggle-devtools')
    },
    { type: 'divider', id: 'view-div-1' },
    {
      id: 'reset-zoom',
      label: 'Reset Zoom',
      rightSection: <span className="shortcut">Ctrl+0</span>,
      onClick: () => ipcRenderer?.invoke('renderer:reset-zoom')
    },
    {
      id: 'zoom-in',
      label: 'Zoom In',
      rightSection: <span className="shortcut">Ctrl++</span>,
      onClick: () => ipcRenderer?.invoke('renderer:zoom-in')
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out',
      rightSection: <span className="shortcut">Ctrl+-</span>,
      onClick: () => ipcRenderer?.invoke('renderer:zoom-out')
    },
    { type: 'divider', id: 'view-div-2' },
    {
      id: 'toggle-fullscreen',
      label: 'Full Screen',
      rightSection: <span className="shortcut">F11</span>,
      onClick: () => ipcRenderer?.invoke('renderer:toggle-fullscreen')
    }
  ];

  const helpItems = [
    {
      id: 'about',
      label: 'About Bruno',
      onClick: () => ipcRenderer?.invoke('renderer:open-about')
    },
    {
      id: 'documentation',
      label: 'Documentation',
      onClick: () => ipcRenderer?.invoke('renderer:open-docs')
    }
  ];

  return (
    <StyledWrapper>
      <MenuDropdown
        opened={isOpen}
        onChange={setIsOpen}
        placement="bottom-start"
        showTickMark={false}
        items={[]}
        header={(
          <div className="app-menu-content">
            <SubmenuTrigger label="File" submenuItems={fileItems} onItemClick={handleClose} />
            <SubmenuTrigger label="Edit" submenuItems={editItems} onItemClick={handleClose} />
            <SubmenuTrigger label="View" submenuItems={viewItems} onItemClick={handleClose} />
            <SubmenuTrigger label="Help" submenuItems={helpItems} onItemClick={handleClose} />
          </div>
        )}
      >
        <ActionIcon label="Menu" size="lg">
          <IconMenu2 size={16} stroke={1.5} />
        </ActionIcon>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default AppMenu;
