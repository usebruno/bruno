import React, { useState } from 'react';
import { IconMenu2 } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const AppMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { ipcRenderer } = window;

  const menuItems = [
    {
      id: 'file',
      label: 'File',
      submenu: [
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
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      submenu: [
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
      ]
    },
    {
      id: 'view',
      label: 'View',
      submenu: [
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
      ]
    },
    {
      id: 'help',
      label: 'Help',
      submenu: [
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
      ]
    }
  ];

  return (
    <StyledWrapper>
      <MenuDropdown
        opened={isOpen}
        onChange={setIsOpen}
        placement="bottom-start"
        showTickMark={false}
        items={menuItems}
      >
        <ActionIcon label="Menu" size="lg">
          <IconMenu2 size={16} stroke={1.5} />
        </ActionIcon>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default AppMenu;
