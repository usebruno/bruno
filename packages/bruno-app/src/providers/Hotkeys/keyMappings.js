export const DEFAULT_KEY_BINDINGS = {
  save: { mac: 'command+bind+s', windows: 'ctrl+bind+s', name: 'Save' },
  sendRequest: { mac: 'command+bind+enter', windows: 'ctrl+bind+enter', name: 'Send Request' },
  editEnvironment: { mac: 'command+bind+e', windows: 'ctrl+bind+e', name: 'Edit Environment' },
  newRequest: { mac: 'command+bind+n', windows: 'ctrl+bind+n', name: 'New Request' }, // Done
  importCollection: { mac: 'command+bind+o', windows: 'ctrl+bind+o', name: 'Import Collection' }, // Done
  globalSearch: { mac: 'command+bind+k', windows: 'ctrl+bind+k', name: 'Global Search' }, // Done
  sidebarSearch: { mac: 'command+bind+f', windows: 'ctrl+bind+f', name: 'Search Sidebar' }, // Done
  closeTab: { mac: 'command+bind+w', windows: 'ctrl+bind+w', name: 'Close Tab' },
  openPreferences: { mac: 'command+bind+,', windows: 'ctrl+bind+,', name: 'Open Preferences' },
  changeLayout: { mac: 'command+bind+j', windows: 'ctrl+bind+j', name: 'Change Orientation' }, // Done
  closeBruno: {
    mac: 'command+bind+q',
    windows: 'ctrl+bind+shift+bind+q',
    name: 'Close Bruno'
  },
  switchToPreviousTab: { // Done
    mac: 'command+bind+2',
    windows: 'ctrl+bind+2',
    name: 'Switch to Previous Tab'
  },
  switchToNextTab: { // Done
    mac: 'command+bind+1',
    windows: 'ctrl+bind+1',
    name: 'Switch to Next Tab'
  },
  moveTabLeft: { // Done
    mac: 'command+bind+shift+bind+pageup',
    windows: 'ctrl+bind+shift+bind+pageup',
    name: 'Move Tab Left'
  },
  moveTabRight: { // Done
    mac: 'command+bind+shift+bind+pagedown',
    windows: 'ctrl+bind+shift+bind+pagedown',
    name: 'Move Tab Right'
  },
  closeAllTabs: { mac: 'command+bind+shift+bind+w', windows: 'ctrl+bind+shift+bind+w', name: 'Close All Tabs' }, // Done
  collapseSidebar: { mac: 'command+bind+\\', windows: 'ctrl+bind+\\', name: 'Collapse Sidebar' }, // Done
  zoomIn: { mac: 'command+bind++', windows: 'ctrl+bind++', name: 'Zoom In' }, // Done
  zoomOut: { mac: 'command+bind+-', windows: 'ctrl+bind+-', name: 'Zoom Out' }, // Done
  resetZoom: { mac: 'command+bind+0', windows: 'ctrl+bind+0', name: 'Reset Zoom' }, // Done
  cloneItem: { mac: 'command+bind+d', windows: 'ctrl+bind+d', name: 'Clone Item' }, // Done
  copyItem: { mac: 'command+bind+c', windows: 'ctrl+bind+c', name: 'Copy Item' }, // Done
  pasteItem: { mac: 'command+bind+v', windows: 'ctrl+bind+v', name: 'Paste Item' } // Done
};
