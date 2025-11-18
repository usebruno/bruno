import { setupLinkAware } from './linkAware';
import LinkifyIt from 'linkify-it';
import { isMacOS } from 'utils/common/platform';

// No need to mock CodeMirror since setupLinkAware works with an existing editor

// Mock linkify-it
jest.mock('linkify-it', () => {
  return jest.fn().mockImplementation(() => ({
    match: jest.fn()
  }));
});

jest.mock('utils/common/platform', () => ({
  isMacOS: jest.fn()
}));
// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => cb());

// Mock window.ipcRenderer
global.window = {
  ...global.window,
  ipcRenderer: {
    openExternal: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

describe('setupLinkAware', () => {
  let mockEditor;
  let mockDoc;
  let mockWrapperElement;
  let mockLinkify;
  let mockMark;
  let originalTimeout;
  let mockSetTimeout;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create a Jest mock for setTimeout
    mockSetTimeout = jest.spyOn(global, 'setTimeout');

    // Store original timeout and mock requestAnimationFrame
    originalTimeout = global.setTimeout;
    global.requestAnimationFrame = jest.fn((cb) => cb());

    // Setup DOM mocks
    mockWrapperElement = {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    mockMark = {
      clear: jest.fn(),
      className: 'CodeMirror-link'
    };

    mockDoc = {
      getValue: jest.fn().mockReturnValue('Check out https://example.com and http://test.org')
    };

    mockEditor = {
      getDoc: jest.fn().mockReturnValue(mockDoc),
      getAllMarks: jest.fn().mockReturnValue([mockMark]),
      markText: jest.fn(),
      posFromIndex: jest.fn().mockImplementation((index) => ({ line: 0, ch: index })),
      getWrapperElement: jest.fn().mockReturnValue(mockWrapperElement),
      on: jest.fn(),
      off: jest.fn(),
      _destroyLinkAware: undefined
    };

    mockLinkify = {
      match: jest.fn().mockReturnValue([
        { index: 10, lastIndex: 28, url: 'https://example.com' },
        { index: 33, lastIndex: 48, url: 'http://test.org' }
      ])
    };

    LinkifyIt.mockImplementation(() => mockLinkify);

    // Mock window and ipcRenderer
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ipcRenderer: {
        openExternal: jest.fn()
      }
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.requestAnimationFrame;
    global.setTimeout = originalTimeout;
    mockSetTimeout.mockRestore();
    jest.useRealTimers();
  });

  describe('editor setup and configuration', () => {
    it('should set up link awareness on an existing editor', () => {
      setupLinkAware(mockEditor);

      expect(mockEditor.getWrapperElement).toHaveBeenCalled();
      expect(mockEditor.on).toHaveBeenCalledWith('changes', expect.any(Function));
      expect(mockWrapperElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockWrapperElement.addEventListener).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockWrapperElement.addEventListener).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('should accept options parameter', () => {
      const options = { someOption: true };

      setupLinkAware(mockEditor, options);

      expect(mockEditor.getWrapperElement).toHaveBeenCalled();
    });

    it('should return early if editor is null', () => {
      const result = setupLinkAware(null);

      expect(result).toBeUndefined();
      expect(mockEditor.getWrapperElement).not.toHaveBeenCalled();
    });

    it('should add _destroyLinkAware method to editor', () => {
      setupLinkAware(mockEditor);

      expect(mockEditor._destroyLinkAware).toBeInstanceOf(Function);
    });
  });

  describe('platform-specific behavior', () => {
    it('should use Cmd key hint on macOS', () => {
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      // Verify that markUrls was called which sets the hint
      expect(mockEditor.markText).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          attributes: expect.objectContaining({
            title: 'Hold Cmd and click to open link'
          })
        })
      );
    });

    it('should use Ctrl key hint on non-macOS', () => {
      isMacOS.mockReturnValue(false);
      setupLinkAware(mockEditor);

      // Verify that markUrls was called which sets the hint
      expect(mockEditor.markText).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          attributes: expect.objectContaining({
            title: 'Hold Ctrl and click to open link'
          })
        })
      );
    });
  });

  describe('CSS class management', () => {
    it('should add cmd-ctrl-pressed class when modifier key is pressed', () => {
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      const keydownHandler = global.window.addEventListener.mock.calls.find((call) => call[0] === 'keydown')[1];
      const mockEvent = { metaKey: true };

      keydownHandler(mockEvent);

      expect(mockWrapperElement.classList.add).toHaveBeenCalledWith('cmd-ctrl-pressed');
    });

    it('should remove cmd-ctrl-pressed class when modifier key is released', () => {
      isMacOS.mockReturnValue(false);
      setupLinkAware(mockEditor);

      const keyupHandler = global.window.addEventListener.mock.calls.find((call) => call[0] === 'keyup')[1];
      const mockEvent = { ctrlKey: false };

      keyupHandler(mockEvent);

      expect(mockWrapperElement.classList.remove).toHaveBeenCalledWith('cmd-ctrl-pressed');
    });
  });

  describe('click handling', () => {
    it('should open external URL when Cmd+clicking on a link', () => {
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      const clickHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'click')[1];
      const mockEvent = {
        metaKey: true,
        target: {
          classList: { contains: (className) => className === 'CodeMirror-link' },
          getAttribute: () => 'https://example.com'
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      clickHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(global.window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://example.com');
    });

    it('should not open URL when clicking without modifier key', () => {
      setupLinkAware(mockEditor);

      const clickHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'click')[1];
      const mockEvent = {
        metaKey: false,
        ctrlKey: false,
        target: {
          classList: { contains: (className) => className === 'CodeMirror-link' },
          getAttribute: () => 'https://example.com'
        }
      };

      clickHandler(mockEvent);

      expect(global.window.ipcRenderer.openExternal).not.toHaveBeenCalled();
    });

    it('should not open URL when clicking on non-link element', () => {
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      const clickHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'click')[1];
      const mockEvent = {
        metaKey: true,
        target: {
          classList: { contains: () => false }
        }
      };

      clickHandler(mockEvent);

      expect(global.window.ipcRenderer.openExternal).not.toHaveBeenCalled();
    });

    it('should not open URL when data-url attribute is missing', () => {
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      const clickHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'click')[1];
      const mockEvent = {
        metaKey: true,
        target: {
          classList: { contains: (className) => className === 'CodeMirror-link' },
          getAttribute: () => null
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      clickHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(global.window.ipcRenderer.openExternal).not.toHaveBeenCalled();
    });
  });

  // Test debouncing behavior
  describe('debouncing', () => {
    it('should debounce URL marking on content changes', () => {
      setupLinkAware(mockEditor);

      // Clear the calls from initial setup
      mockEditor.getAllMarks.mockClear();

      // Simulate multiple rapid content changes
      const changeHandler = mockEditor.on.mock.calls.find((call) => call[0] === 'changes')[1];
      changeHandler();
      changeHandler();
      changeHandler();

      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 150);

      // Fast-forward timers
      jest.runAllTimers();

      // Should only mark URLs once
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(mockEditor.getAllMarks).toHaveBeenCalledTimes(1);
    });

    it('should apply link tooltips when marking URLs', () => {
      setupLinkAware(mockEditor);

      expect(mockEditor.markText).toHaveBeenCalledWith(
        { line: 0, ch: 10 },
        { line: 0, ch: 28 },
        {
          className: 'CodeMirror-link',
          attributes: {
            'data-url': 'https://example.com',
            title: 'Hold Cmd and click to open link'
          }
        }
      );
    });
  });

  // Test animation frame handling
  describe('animation frame handling', () => {
    it('should use requestAnimationFrame for URL marking', () => {
      setupLinkAware(mockEditor);

      const changeHandler = mockEditor.on.mock.calls.find((call) => call[0] === 'changes')[1];
      changeHandler();

      jest.runAllTimers();

      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('hover behavior', () => {
    it('should add hover class on mouseover for link elements', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn(),
          remove: jest.fn()
        },
        previousElementSibling: {
          classList: {
            contains: jest.fn().mockReturnValue(true),
            add: jest.fn(),
            remove: jest.fn()
          },
          previousElementSibling: null
        },
        nextElementSibling: {
          classList: {
            contains: jest.fn().mockReturnValue(true),
            add: jest.fn(),
            remove: jest.fn()
          },
          nextElementSibling: null
        }
      };

      const mockEvent = { target: mockTarget };
      mouseoverHandler(mockEvent);

      expect(mockTarget.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockTarget.previousElementSibling.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockTarget.nextElementSibling.classList.add).toHaveBeenCalledWith('hovered-link');
    });

    it('should not add hover class for non-link elements', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(false),
          add: jest.fn()
        }
      };

      const mockEvent = { target: mockTarget };
      mouseoverHandler(mockEvent);

      expect(mockTarget.classList.add).not.toHaveBeenCalled();
    });

    it('should remove hover class on mouseout', () => {
      setupLinkAware(mockEditor);

      const mouseoutHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'mouseout')[1];

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          remove: jest.fn()
        },
        previousElementSibling: {
          classList: {
            contains: jest.fn().mockReturnValue(true),
            remove: jest.fn()
          },
          previousElementSibling: null
        },
        nextElementSibling: {
          classList: {
            contains: jest.fn().mockReturnValue(true),
            remove: jest.fn()
          },
          nextElementSibling: null
        }
      };

      const mockEvent = { target: mockTarget };
      mouseoutHandler(mockEvent);

      expect(mockTarget.classList.remove).toHaveBeenCalledWith('hovered-link');
      expect(mockTarget.previousElementSibling.classList.remove).toHaveBeenCalledWith('hovered-link');
      expect(mockTarget.nextElementSibling.classList.remove).toHaveBeenCalledWith('hovered-link');
    });

    it('should handle multi-span links correctly on hover', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];

      // Create a mock with a chain of link spans
      const mockNestedPrev = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        previousElementSibling: null
      };

      const mockPrev = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        previousElementSibling: mockNestedPrev
      };

      const mockNestedNext = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        nextElementSibling: null
      };

      const mockNext = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        nextElementSibling: mockNestedNext
      };

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        previousElementSibling: mockPrev,
        nextElementSibling: mockNext
      };

      const mockEvent = { target: mockTarget };
      mouseoverHandler(mockEvent);

      expect(mockTarget.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockPrev.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockNestedPrev.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockNext.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockNestedNext.classList.add).toHaveBeenCalledWith('hovered-link');
    });
  });

  // Test memory cleanup
  describe('memory cleanup', () => {
    it('should properly clean up all event listeners and marks', () => {
      setupLinkAware(mockEditor);

      mockEditor._destroyLinkAware();

      expect(mockEditor.off).toHaveBeenCalled();
      expect(global.window.removeEventListener).toHaveBeenCalledTimes(2);
      expect(mockWrapperElement.removeEventListener).toHaveBeenCalledTimes(3); // click, mouseover, mouseout
      expect(mockWrapperElement.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockWrapperElement.removeEventListener).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockWrapperElement.removeEventListener).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });
  });

  describe('edge cases', () => {
    it('should handle missing target in mouse event', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];
      const mockEvent = { target: null };

      // Note: This will throw as the implementation accesses target.classList without null check
      expect(() => mouseoverHandler(mockEvent)).toThrow();
    });

    it('should handle missing ipcRenderer', () => {
      delete global.window.ipcRenderer;
      isMacOS.mockReturnValue(true);
      setupLinkAware(mockEditor);

      const clickHandler = mockWrapperElement.addEventListener.mock.calls.find((call) => call[0] === 'click')[1];
      const mockEvent = {
        metaKey: true,
        target: {
          classList: { contains: (className) => className === 'CodeMirror-link' },
          getAttribute: () => 'https://example.com'
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      expect(() => clickHandler(mockEvent)).not.toThrow();
    });

    it('should handle LinkifyIt returning null matches', () => {
      mockLinkify.match.mockReturnValue(null);

      expect(() => setupLinkAware(mockEditor)).not.toThrow();
      // markText may still be called to clear existing marks
    });

    it('should handle null siblings in mouseover events', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        previousElementSibling: null,
        nextElementSibling: null
      };

      const mockEvent = { target: mockTarget };

      expect(() => mouseoverHandler(mockEvent)).not.toThrow();
      expect(mockTarget.classList.add).toHaveBeenCalledWith('hovered-link');
    });

    it('should handle non-link siblings in mouseover events', () => {
      setupLinkAware(mockEditor);

      const mouseoverHandler = mockWrapperElement.addEventListener.mock.calls.find(
        (call) => call[0] === 'mouseover'
      )[1];

      const mockPrev = {
        classList: {
          contains: jest.fn().mockReturnValue(false),
          add: jest.fn()
        }
      };

      const mockNext = {
        classList: {
          contains: jest.fn().mockReturnValue(false),
          add: jest.fn()
        }
      };

      const mockTarget = {
        classList: {
          contains: jest.fn().mockReturnValue(true),
          add: jest.fn()
        },
        previousElementSibling: mockPrev,
        nextElementSibling: mockNext
      };

      const mockEvent = { target: mockTarget };
      mouseoverHandler(mockEvent);

      expect(mockTarget.classList.add).toHaveBeenCalledWith('hovered-link');
      expect(mockPrev.classList.add).not.toHaveBeenCalled();
      expect(mockNext.classList.add).not.toHaveBeenCalled();
    });
  });
});
