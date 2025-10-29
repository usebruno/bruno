import makeLinkAwareCodeMirror from './makeLinkAwareCodeMirror';
import LinkifyIt from 'linkify-it';
import { isMacOS } from 'utils/common/platform';
const CodeMirror = require('codemirror');

// Mock dependencies
jest.mock('codemirror', () => {
  const mockEditor = {
    getDoc: jest.fn(),
    getAllMarks: jest.fn(),
    markText: jest.fn(),
    posFromIndex: jest.fn(),
    getWrapperElement: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    _destroyLinkAware: undefined
  };

  const CodeMirror = jest.fn(() => mockEditor);
  return CodeMirror;
});

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

describe('makeLinkAwareCodeMirror', () => {
  let mockHost;
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
    mockHost = document.createElement('div');
    mockWrapperElement = {
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    mockMark = {
      clear: jest.fn()
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
      off: jest.fn()
    };

    mockLinkify = {
      match: jest.fn().mockReturnValue([
        { index: 10, lastIndex: 28, url: 'https://example.com' },
        { index: 33, lastIndex: 48, url: 'http://test.org' }
      ])
    };

    // Setup mocks
    CodeMirror.mockReturnValue(mockEditor);

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

  describe('editor creation and configuration', () => {
    it('should create a CodeMirror editor with default options', () => {
      const result = makeLinkAwareCodeMirror(mockHost);

      expect(CodeMirror).toHaveBeenCalledWith(
        mockHost,
        expect.objectContaining({
          configureMouse: expect.any(Function)
        })
      );
      expect(result).toBe(mockEditor);
    });

    it('should merge custom options with default configuration', () => {
      const customOptions = { lineNumbers: true, theme: 'dark' };

      makeLinkAwareCodeMirror(mockHost, customOptions);

      expect(CodeMirror).toHaveBeenCalledWith(
        mockHost,
        expect.objectContaining({
          lineNumbers: true,
          theme: 'dark',
          configureMouse: expect.any(Function)
        })
      );
    });

    it('should return early if editor creation fails', () => {
      CodeMirror.mockReturnValue(null);

      const result = makeLinkAwareCodeMirror(mockHost);

      expect(result).toBeNull();
    });

    it('should add _destroyLinkAware method to editor', () => {
      const result = makeLinkAwareCodeMirror(mockHost);

      expect(result._destroyLinkAware).toBeInstanceOf(Function);
    });
  });

  describe('platform-specific key detection', () => {
    it('should detect Cmd key on macOS', () => {
      isMacOS.mockReturnValue(true);

      makeLinkAwareCodeMirror(mockHost);

      const configureMouse = CodeMirror.mock.calls[0][1].configureMouse;
      const mockEvent = { metaKey: true, ctrlKey: false, target: { classList: { contains: () => true } } };

      const result = configureMouse(null, null, mockEvent);

      expect(result).toEqual({ addNew: false });
    });

    it('should detect Ctrl key on non-macOS', () => {
      isMacOS.mockReturnValue(false);

      makeLinkAwareCodeMirror(mockHost);

      const configureMouse = CodeMirror.mock.calls[0][1].configureMouse;
      const mockEvent = { metaKey: false, ctrlKey: true, target: { classList: { contains: () => true } } };

      const result = configureMouse(null, null, mockEvent);

      expect(result).toEqual({ addNew: false });
    });

    it('should return empty object when modifier key is not pressed', () => {
      makeLinkAwareCodeMirror(mockHost);

      const configureMouse = CodeMirror.mock.calls[0][1].configureMouse;
      const mockEvent = { metaKey: false, ctrlKey: false, target: { classList: { contains: () => true } } };

      const result = configureMouse(null, null, mockEvent);

      expect(result).toEqual({});
    });

    it('should return empty object when target is not a link', () => {
      isMacOS.mockReturnValue(true);

      makeLinkAwareCodeMirror(mockHost);

      const configureMouse = CodeMirror.mock.calls[0][1].configureMouse;
      const mockEvent = { metaKey: true, target: { classList: { contains: () => false } } };

      const result = configureMouse(null, null, mockEvent);

      expect(result).toEqual({});
    });
  });

  describe('CSS class management', () => {
    it('should add cmd-ctrl-pressed class when modifier key is pressed', () => {
      isMacOS.mockReturnValue(true);
      makeLinkAwareCodeMirror(mockHost);

      const keydownHandler = global.window.addEventListener.mock.calls.find((call) => call[0] === 'keydown')[1];
      const mockEvent = { metaKey: true };

      keydownHandler(mockEvent);

      expect(mockWrapperElement.classList.add).toHaveBeenCalledWith('cmd-ctrl-pressed');
    });

    it('should remove cmd-ctrl-pressed class when modifier key is released', () => {
      isMacOS.mockReturnValue(false);
      makeLinkAwareCodeMirror(mockHost);

      const keyupHandler = global.window.addEventListener.mock.calls.find((call) => call[0] === 'keyup')[1];
      const mockEvent = { ctrlKey: false };

      keyupHandler(mockEvent);

      expect(mockWrapperElement.classList.remove).toHaveBeenCalledWith('cmd-ctrl-pressed');
    });
  });

  describe('click handling', () => {
    it('should open external URL when Cmd+clicking on a link', () => {
      isMacOS.mockReturnValue(true);
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

      const changeHandler = mockEditor.on.mock.calls.find((call) => call[0] === 'changes')[1];
      changeHandler();

      jest.runAllTimers();

      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('hover behavior', () => {
    it('should add hover class on mouseover for link elements', () => {
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
      const editor = makeLinkAwareCodeMirror(mockHost);

      editor._destroyLinkAware();

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
      makeLinkAwareCodeMirror(mockHost);

      const configureMouse = CodeMirror.mock.calls[0][1].configureMouse;
      const mockEvent = { metaKey: true, target: null };

      const result = configureMouse(null, null, mockEvent);

      expect(result).toEqual({});
    });

    it('should handle missing ipcRenderer', () => {
      delete global.window.ipcRenderer;
      isMacOS.mockReturnValue(true);
      makeLinkAwareCodeMirror(mockHost);

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

      expect(() => makeLinkAwareCodeMirror(mockHost)).not.toThrow();
      expect(mockEditor.markText).not.toHaveBeenCalled();
    });

    it('should handle null siblings in mouseover events', () => {
      makeLinkAwareCodeMirror(mockHost);

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
      makeLinkAwareCodeMirror(mockHost);

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
