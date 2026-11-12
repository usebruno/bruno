// Mock electron module before requiring context-menu
let mockMainWindow;
let contextMenuHandler;
let mockMenu;
let capturedMenuItems;

jest.mock('electron', () => ({
  Menu: {
    buildFromTemplate: jest.fn()
  }
}));

const { setupContextMenu } = require('../../src/app/context-menu');
const { Menu } = require('electron');

describe('Context Menu', () => {
  beforeEach(() => {
    // Reset captured menu items
    capturedMenuItems = null;

    // Mock Menu.buildFromTemplate and popup
    mockMenu = {
      popup: jest.fn()
    };

    // Setup the mock to capture items and return mock menu
    Menu.buildFromTemplate.mockImplementation((items) => {
      capturedMenuItems = items;
      return mockMenu;
    });

    // Mock mainWindow with webContents
    mockMainWindow = {
      webContents: {
        on: jest.fn((event, handler) => {
          if (event === 'context-menu') {
            contextMenuHandler = handler;
          }
        })
      }
    };

    // Setup context menu
    setupContextMenu(mockMainWindow);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupContextMenu', () => {
    it('should register context-menu event listener', () => {
      expect(mockMainWindow.webContents.on).toHaveBeenCalledWith('context-menu', expect.any(Function));
    });
  });

  describe('Context menu with selected text', () => {
    it('should show Copy option when text is selected', () => {
      const params = {
        selectionText: 'selected text',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      expect(capturedMenuItems).toHaveLength(3); // Copy, separator, Select All
      expect(capturedMenuItems[0]).toMatchObject({
        label: 'Copy',
        role: 'copy',
        accelerator: 'CmdOrCtrl+C',
        enabled: true
      });
    });

    it('should show Copy with keyboard shortcut', () => {
      const params = {
        selectionText: 'test',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const copyItem = capturedMenuItems.find((item) => item.label === 'Copy');
      expect(copyItem.accelerator).toBe('CmdOrCtrl+C');
    });
  });

  describe('Context menu for editable fields', () => {
    it('should show Cut, Paste, and Select All for editable fields with selected text', () => {
      const params = {
        selectionText: 'selected',
        isEditable: true,
        editFlags: {
          canCopy: true,
          canCut: true,
          canPaste: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      expect(capturedMenuItems.length).toBeGreaterThan(0);

      const labels = capturedMenuItems.filter((item) => item.label).map((item) => item.label);

      expect(labels).toContain('Copy');
      expect(labels).toContain('Cut');
      expect(labels).toContain('Paste');
      expect(labels).toContain('Select All');
    });

    it('should show all keyboard shortcuts for editable fields', () => {
      const params = {
        selectionText: 'test',
        isEditable: true,
        editFlags: {
          canCopy: true,
          canCut: true,
          canPaste: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const copyItem = capturedMenuItems.find((item) => item.label === 'Copy');
      const cutItem = capturedMenuItems.find((item) => item.label === 'Cut');
      const pasteItem = capturedMenuItems.find((item) => item.label === 'Paste');
      const selectAllItem = capturedMenuItems.find((item) => item.label === 'Select All');

      expect(copyItem.accelerator).toBe('CmdOrCtrl+C');
      expect(cutItem.accelerator).toBe('CmdOrCtrl+X');
      expect(pasteItem.accelerator).toBe('CmdOrCtrl+V');
      expect(selectAllItem.accelerator).toBe('CmdOrCtrl+A');
    });

    it('should not show Cut when text is not selected in editable field', () => {
      const params = {
        selectionText: '',
        isEditable: true,
        editFlags: {
          canCopy: true,
          canCut: true,
          canPaste: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const labels = capturedMenuItems.filter((item) => item.label).map((item) => item.label);

      expect(labels).not.toContain('Cut');
      expect(labels).toContain('Paste');
      expect(labels).toContain('Select All');
    });
  });

  describe('Context menu for read-only fields (response pane)', () => {
    it('should show Select All for read-only content', () => {
      const params = {
        selectionText: '',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const selectAllItem = capturedMenuItems.find((item) => item.label === 'Select All');
      expect(selectAllItem).toBeDefined();
      expect(selectAllItem.accelerator).toBe('CmdOrCtrl+A');
      expect(selectAllItem.enabled).toBe(true);
    });

    it('should show Copy and Select All when text is selected in read-only field', () => {
      const params = {
        selectionText: 'response text',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const labels = capturedMenuItems.filter((item) => item.label).map((item) => item.label);

      expect(labels).toContain('Copy');
      expect(labels).toContain('Select All');
      expect(labels).not.toContain('Cut');
      expect(labels).not.toContain('Paste');
    });

    it('should include separator between Copy and Select All', () => {
      const params = {
        selectionText: 'text',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const separatorIndex = capturedMenuItems.findIndex((item) => item.type === 'separator');
      expect(separatorIndex).toBeGreaterThan(0);
    });
  });

  describe('Menu popup behavior', () => {
    it('should call menu.popup when menu items exist', () => {
      const params = {
        selectionText: 'test',
        isEditable: false,
        editFlags: {
          canCopy: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      expect(mockMenu.popup).toHaveBeenCalledWith({
        window: mockMainWindow
      });
    });

    it('should not show menu when no items are available', () => {
      const params = {
        selectionText: '',
        isEditable: false,
        editFlags: {
          canCopy: false,
          canSelectAll: false
        }
      };

      contextMenuHandler({}, params);

      expect(mockMenu.popup).not.toHaveBeenCalled();
    });
  });

  describe('Edit flags respect', () => {
    it('should disable Copy when canCopy is false', () => {
      const params = {
        selectionText: 'text',
        isEditable: false,
        editFlags: {
          canCopy: false,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const copyItem = capturedMenuItems.find((item) => item.label === 'Copy');
      expect(copyItem.enabled).toBe(false);
    });

    it('should disable Cut when canCut is false', () => {
      const params = {
        selectionText: 'text',
        isEditable: true,
        editFlags: {
          canCopy: true,
          canCut: false,
          canPaste: true,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const cutItem = capturedMenuItems.find((item) => item.label === 'Cut');
      expect(cutItem.enabled).toBe(false);
    });

    it('should disable Paste when canPaste is false', () => {
      const params = {
        selectionText: '',
        isEditable: true,
        editFlags: {
          canCopy: true,
          canCut: true,
          canPaste: false,
          canSelectAll: true
        }
      };

      contextMenuHandler({}, params);

      const pasteItem = capturedMenuItems.find((item) => item.label === 'Paste');
      expect(pasteItem.enabled).toBe(false);
    });
  });
});
