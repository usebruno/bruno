import React, { useState } from 'react';
import { IconMenu2 } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const AppMenu = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { ipcRenderer } = window;

  const menuItems = [
    {
      id: 'file',
      label: t('APP_MENU.FILE'),
      submenu: [
        {
          id: 'open-collection',
          label: t('APP_MENU.OPEN_COLLECTION'),
          onClick: () => ipcRenderer?.invoke('renderer:open-collection')
        },
        { type: 'divider', id: 'file-div-1' },
        {
          id: 'preferences',
          label: t('APP_MENU.PREFERENCES'),
          rightSection: <span className="shortcut">Ctrl+,</span>,
          onClick: () => ipcRenderer?.invoke('renderer:open-preferences')
        },
        { type: 'divider', id: 'file-div-2' },
        {
          id: 'quit',
          label: t('APP_MENU.QUIT'),
          rightSection: <span className="shortcut">Alt+F4</span>,
          onClick: () => ipcRenderer?.send('renderer:window-close')
        }
      ]
    },
    {
      id: 'edit',
      label: t('APP_MENU.EDIT'),
      submenu: [
        {
          id: 'undo',
          label: t('APP_MENU.UNDO'),
          rightSection: <span className="shortcut">Ctrl+Z</span>,
          onClick: () => document.execCommand('undo')
        },
        {
          id: 'redo',
          label: t('APP_MENU.REDO'),
          rightSection: <span className="shortcut">Ctrl+Y</span>,
          onClick: () => document.execCommand('redo')
        },
        { type: 'divider', id: 'edit-div-1' },
        {
          id: 'cut',
          label: t('APP_MENU.CUT'),
          rightSection: <span className="shortcut">Ctrl+X</span>,
          onClick: () => document.execCommand('cut')
        },
        {
          id: 'copy',
          label: t('APP_MENU.COPY'),
          rightSection: <span className="shortcut">Ctrl+C</span>,
          onClick: () => document.execCommand('copy')
        },
        {
          id: 'paste',
          label: t('APP_MENU.PASTE'),
          rightSection: <span className="shortcut">Ctrl+V</span>,
          onClick: () => document.execCommand('paste')
        },
        { type: 'divider', id: 'edit-div-2' },
        {
          id: 'select-all',
          label: t('APP_MENU.SELECT_ALL'),
          rightSection: <span className="shortcut">Ctrl+A</span>,
          onClick: () => document.execCommand('selectAll')
        }
      ]
    },
    {
      id: 'view',
      label: t('APP_MENU.VIEW'),
      submenu: [
        {
          id: 'toggle-devtools',
          label: t('APP_MENU.DEVELOPER_TOOLS'),
          rightSection: <span className="shortcut">Ctrl+Shift+I</span>,
          onClick: () => ipcRenderer?.invoke('renderer:toggle-devtools')
        },
        { type: 'divider', id: 'view-div-1' },
        {
          id: 'reset-zoom',
          label: t('APP_MENU.RESET_ZOOM'),
          rightSection: <span className="shortcut">Ctrl+0</span>,
          onClick: () => ipcRenderer?.invoke('renderer:reset-zoom')
        },
        {
          id: 'zoom-in',
          label: t('APP_MENU.ZOOM_IN'),
          rightSection: <span className="shortcut">Ctrl++</span>,
          onClick: () => ipcRenderer?.invoke('renderer:zoom-in')
        },
        {
          id: 'zoom-out',
          label: t('APP_MENU.ZOOM_OUT'),
          rightSection: <span className="shortcut">Ctrl+-</span>,
          onClick: () => ipcRenderer?.invoke('renderer:zoom-out')
        },
        { type: 'divider', id: 'view-div-2' },
        {
          id: 'toggle-fullscreen',
          label: t('APP_MENU.FULL_SCREEN'),
          rightSection: <span className="shortcut">F11</span>,
          onClick: () => ipcRenderer?.invoke('renderer:toggle-fullscreen')
        }
      ]
    },
    {
      id: 'help',
      label: t('APP_MENU.HELP'),
      submenu: [
        {
          id: 'about',
          label: t('APP_MENU.ABOUT_BRUNO'),
          onClick: () => ipcRenderer?.invoke('renderer:open-about')
        },
        {
          id: 'documentation',
          label: t('APP_MENU.DOCUMENTATION'),
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
        <ActionIcon label={t('APP_MENU.MENU')} size="lg">
          <IconMenu2 size={16} stroke={1.5} />
        </ActionIcon>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default AppMenu;
