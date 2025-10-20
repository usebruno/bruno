const { Menu } = require('electron');

/**
 * Sets up context menu for the main window with standard editing operations
 * This enables right-click copy/paste functionality throughout the app
 */
const setupContextMenu = (mainWindow) => {
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { selectionText, isEditable, editFlags } = params;

    const menuItems = [];

    // If there's selected text, show copy option
    if (selectionText) {
      menuItems.push({
        label: 'Copy',
        role: 'copy',
        accelerator: 'CmdOrCtrl+C',
        enabled: editFlags.canCopy
      });
    }

    // If the field is editable, show cut, paste, and other edit options
    if (isEditable) {
      if (selectionText) {
        menuItems.push({
          label: 'Cut',
          role: 'cut',
          accelerator: 'CmdOrCtrl+X',
          enabled: editFlags.canCut
        });
      }

      menuItems.push({
        label: 'Paste',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V',
        enabled: editFlags.canPaste
      });

      if (selectionText) {
        menuItems.push({
          type: 'separator'
        });
      }
      menuItems.push({
        label: 'Select All',
        role: 'selectAll',
        accelerator: 'CmdOrCtrl+A',
        enabled: editFlags.canSelectAll
      });
    } else {
      // For read-only text areas (like response pane), still show "Select All"
      // if there's content that can be selected
      if (editFlags.canSelectAll) {
        // Add separator if there's already a Copy option
        if (selectionText) {
          menuItems.push({
            type: 'separator'
          });
        }
        menuItems.push({
          label: 'Select All',
          role: 'selectAll',
          accelerator: 'CmdOrCtrl+A',
          enabled: true
        });
      }
    }

    // Only show the menu if there are items to display
    if (menuItems.length > 0) {
      const menu = Menu.buildFromTemplate(menuItems);
      menu.popup({
        window: mainWindow
      });
    }
  });
};

module.exports = { setupContextMenu };
