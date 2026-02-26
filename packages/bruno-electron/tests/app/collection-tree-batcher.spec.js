const { CollectionTreeBatcher, getBatcher, removeBatcher, constants } = require('../../src/app/collection-tree-batcher');

// Mock BrowserWindow
const createMockWindow = (id = 1) => {
  const listeners = {};
  return {
    id,
    isDestroyed: jest.fn(() => false),
    once: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    emit: (event) => {
      if (listeners[event]) {
        listeners[event]();
      }
    },
    webContents: {
      send: jest.fn()
    }
  };
};

describe('CollectionTreeBatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with empty queue and no timer', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      expect(batcher.queue).toEqual([]);
      expect(batcher.timer).toBeNull();
      expect(batcher.isDestroyed).toBe(false);
    });
  });

  describe('add()', () => {
    it('should add events to the queue', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });

      expect(batcher.queue).toHaveLength(1);
      expect(batcher.queue[0]).toEqual({
        eventType: 'addFile',
        payload: { path: '/test/file.bru' }
      });
    });

    it('should schedule a flush after adding an event', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });

      expect(batcher.timer).not.toBeNull();
    });

    it('should not add events if window is destroyed', () => {
      const win = createMockWindow();
      win.isDestroyed.mockReturnValue(true);
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });

      expect(batcher.queue).toHaveLength(0);
    });

    it('should not add events if batcher is destroyed', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');
      batcher.destroy();

      batcher.add('addFile', { path: '/test/file.bru' });

      expect(batcher.queue).toHaveLength(0);
    });
  });

  describe('flush()', () => {
    it('should send batch to renderer and clear queue', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file1.bru' });
      batcher.add('addDir', { path: '/test/folder' });

      batcher.flush();

      expect(win.webContents.send).toHaveBeenCalledWith('main:collection-tree-batch-updated', [
        { eventType: 'addFile', payload: { path: '/test/file1.bru' } },
        { eventType: 'addDir', payload: { path: '/test/folder' } }
      ]);
      expect(batcher.queue).toHaveLength(0);
    });

    it('should not send if queue is empty', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.flush();

      expect(win.webContents.send).not.toHaveBeenCalled();
    });

    it('should clear pending timer on flush', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });
      expect(batcher.timer).not.toBeNull();

      batcher.flush();
      expect(batcher.timer).toBeNull();
    });

    it('should not send if window is destroyed', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });
      win.isDestroyed.mockReturnValue(true);

      batcher.flush();

      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('time-based flush', () => {
    it('should auto-flush after DISPATCH_INTERVAL_MS (200ms)', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });

      expect(win.webContents.send).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);

      expect(win.webContents.send).toHaveBeenCalledWith('main:collection-tree-batch-updated', [
        { eventType: 'addFile', payload: { path: '/test/file.bru' } }
      ]);
    });

    it('should not schedule multiple timers', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file1.bru' });
      const firstTimer = batcher.timer;

      batcher.add('addFile', { path: '/test/file2.bru' });

      expect(batcher.timer).toBe(firstTimer);
    });
  });

  describe('size-based flush', () => {
    it('should auto-flush when reaching MAX_BATCH_SIZE', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');
      const eventCount = constants.MAX_BATCH_SIZE - 1;
      // Add events - should not flush
      for (let i = 0; i < eventCount; i++) {
        batcher.add('addFile', { path: `/test/file${i}.bru` });
      }
      expect(win.webContents.send).not.toHaveBeenCalled();
      expect(batcher.queue).toHaveLength(eventCount);

      // Add 300th event - should trigger flush
      batcher.add('addFile', { path: '/test/file299.bru' });

      expect(win.webContents.send).toHaveBeenCalledTimes(1);
      expect(batcher.queue).toHaveLength(0);
    });
  });

  describe('size()', () => {
    it('should return current queue size', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      expect(batcher.size()).toBe(0);

      batcher.add('addFile', { path: '/test/file1.bru' });
      expect(batcher.size()).toBe(1);

      batcher.add('addFile', { path: '/test/file2.bru' });
      expect(batcher.size()).toBe(2);
    });
  });

  describe('clear()', () => {
    it('should clear the queue without sending', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });
      batcher.clear();

      expect(batcher.queue).toHaveLength(0);
      expect(batcher.timer).toBeNull();
      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('destroy()', () => {
    it('should mark batcher as destroyed and clear queue', () => {
      const win = createMockWindow();
      const batcher = new CollectionTreeBatcher(win, 'collection-1');

      batcher.add('addFile', { path: '/test/file.bru' });
      batcher.destroy();

      expect(batcher.isDestroyed).toBe(true);
      expect(batcher.queue).toHaveLength(0);
      expect(batcher.win).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle send errors gracefully', () => {
      const win = createMockWindow();
      win.webContents.send.mockImplementation(() => {
        throw new Error('Window closed');
      });
      const batcher = new CollectionTreeBatcher(win, 'collection-1');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      batcher.add('addFile', { path: '/test/file.bru' });
      batcher.flush();

      expect(consoleSpy).toHaveBeenCalledWith('CollectionTreeBatcher: Error sending batch:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});

describe('getBatcher / removeBatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create and return a batcher for a window', () => {
    const win = createMockWindow(100);
    const batcher = getBatcher(win, 'collection-1');

    expect(batcher).toBeInstanceOf(CollectionTreeBatcher);
  });

  it('should return the same batcher for the same window and collection', () => {
    const win = createMockWindow(101);
    const batcher1 = getBatcher(win, 'collection-1');
    const batcher2 = getBatcher(win, 'collection-1');

    expect(batcher1).toBe(batcher2);
  });

  it('should return different batchers for different collections', () => {
    const win = createMockWindow(102);
    const batcher1 = getBatcher(win, 'collection-1');
    const batcher2 = getBatcher(win, 'collection-2');

    expect(batcher1).not.toBe(batcher2);
  });

  it('should return different batchers for different windows', () => {
    const win1 = createMockWindow(103);
    const win2 = createMockWindow(104);
    const batcher1 = getBatcher(win1, 'collection-1');
    const batcher2 = getBatcher(win2, 'collection-1');

    expect(batcher1).not.toBe(batcher2);
  });

  it('should clean up batcher when window is closed', () => {
    const win = createMockWindow(105);
    const batcher = getBatcher(win, 'collection-1');

    batcher.add('addFile', { path: '/test/file.bru' });

    // Simulate window close
    win.emit('closed');

    expect(batcher.isDestroyed).toBe(true);
  });

  it('should remove batcher with removeBatcher', () => {
    const win = createMockWindow(106);
    const batcher = getBatcher(win, 'collection-1');

    removeBatcher(win, 'collection-1');

    expect(batcher.isDestroyed).toBe(true);

    // Getting batcher again should create a new one
    const newBatcher = getBatcher(win, 'collection-1');
    expect(newBatcher).not.toBe(batcher);
  });
});
