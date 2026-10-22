import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import useOverflowCollapse from './index';

let observers = [];
let disconnectCount = 0;

class ControllableResizeObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {
    disconnectCount += 1;
  }
}

const LEVELS = ['compact', 'tiny'];
const MEASURING_CLASS = 'measuring-overflow';
const DEFAULT_REQUIRED_WIDTH = { '': 400, 'compact': 250, 'compact tiny': 180 };

// jsdom has no layout, so the test supplies one: how wide the toolbar wants to be at each
// level, and the room available otherwise. Calibration is the only moment offsetWidth should
// report a requirement, and it is recognised by the class the hook applies for exactly that
// window — jsdom's cssstyle rejects `max-content`, so style.width cannot be the tell.
const originalResizeObserver = global.ResizeObserver;
let availableWidth = 1000;
let requiredWidth = DEFAULT_REQUIRED_WIDTH;
let measurements = 0;

// Frames queue until the test flushes them, so coalescing and cancellation are observable.
let nextFrameId = 1;
const pending = new Map();

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      if (!this.classList.contains(MEASURING_CLASS)) return availableWidth;
      measurements += 1;
      return requiredWidth[LEVELS.filter((level) => this.classList.contains(level)).join(' ')];
    }
  });
  global.requestAnimationFrame = (cb) => {
    const id = nextFrameId++;
    pending.set(id, cb);
    return id;
  };
  global.cancelAnimationFrame = (id) => pending.delete(id);
});

afterAll(() => {
  delete HTMLElement.prototype.offsetWidth;
  global.ResizeObserver = originalResizeObserver;
});

beforeEach(() => {
  observers = [];
  disconnectCount = 0;
  availableWidth = 1000;
  requiredWidth = DEFAULT_REQUIRED_WIDTH;
  measurements = 0;
  pending.clear();
  global.ResizeObserver = ControllableResizeObserver;
});

const requires = (widths) => {
  requiredWidth = widths;
};

const flushFrames = () => act(() => {
  const due = [...pending.values()];
  pending.clear();
  due.forEach((cb) => cb());
});

const fireResize = (width) => {
  availableWidth = width;
  act(() => {
    observers.forEach((observer) => observer.callback());
  });
};

const resizeTo = (width) => {
  fireResize(width);
  flushFrames();
};

const setup = ({ actions = 1, count = null } = {}) => {
  let renderCount = 0;
  let forceRender;
  let setActions;
  let setCount;
  const Probe = () => {
    const [, setRenders] = useState(0);
    const [actionCount, setNextActions] = useState(actions);
    const [countLabel, setNextCount] = useState(count);
    forceRender = setRenders;
    setActions = setNextActions;
    setCount = setNextCount;
    renderCount += 1;
    const containerRef = useOverflowCollapse(LEVELS);
    return (
      <div ref={containerRef} className="toolbar" data-testid="toolbar">
        {Array.from({ length: actionCount }, (_, index) => (
          <button key={index} type="button" />
        ))}
        {count === null ? null : <span data-count>{countLabel}</span>}
      </div>
    );
  };
  const utils = render(<Probe />);
  const toolbar = utils.getByTestId('toolbar');

  return {
    toolbar,
    applied: () => LEVELS.filter((level) => toolbar.classList.contains(level)).join(' '),
    renderCount: () => renderCount,
    forceRender: (n) => act(() => forceRender(n)),
    setActions: async (n) => {
      await act(async () => setActions(n));
      flushFrames();
    },
    setCount: async (label) => {
      await act(async () => setCount(label));
      flushFrames();
    },
    ...utils
  };
};

describe('useOverflowCollapse', () => {
  it('leaves the container alone while its contents fit', () => {
    const { applied } = setup();
    expect(applied()).toBe('');
  });

  it('applies the fewest levels that fit the width available', () => {
    const { applied } = setup();

    resizeTo(300);
    expect(applied()).toBe('compact');
  });

  it('applies every level when even the leanest one overflows', () => {
    const { applied } = setup();

    resizeTo(100);
    expect(applied()).toBe('compact tiny');
  });

  it('gives levels back as the container grows again', () => {
    const { applied } = setup();

    resizeTo(100);
    expect(applied()).toBe('compact tiny');

    resizeTo(300);
    expect(applied()).toBe('compact');

    resizeTo(1000);
    expect(applied()).toBe('');
  });

  it('treats a level as fitting at exactly the width it needs', () => {
    const { applied } = setup();

    resizeTo(400);
    expect(applied()).toBe('');

    resizeTo(399);
    expect(applied()).toBe('compact');
  });

  it('re-measures when a child arrives, without being told to', async () => {
    const { applied, setActions } = setup();
    expect(applied()).toBe('');

    requires({ '': 1200, 'compact': 1050, 'compact tiny': 980 }); // available is 1000
    await setActions(2);

    expect(applied()).toBe('compact tiny');
  });

  it('re-measures when a child leaves', async () => {
    requires({ '': 1200, 'compact': 1050, 'compact tiny': 980 }); // available is 1000
    const { applied, setActions } = setup({ actions: 2 });
    expect(applied()).toBe('compact tiny');

    requires(DEFAULT_REQUIRED_WIDTH);
    await setActions(1);

    expect(applied()).toBe('');
  });

  it('re-measures when a child rewrites its text in place', async () => {
    const { applied, setCount } = setup({ count: '0' });
    expect(applied()).toBe('');

    requires({ '': 1100, 'compact': 950, 'compact tiny': 900 }); // available is 1000
    await setCount('12345678');

    expect(applied()).toBe('compact');
  });

  it('skips re-measuring when a text rewrite keeps its length', async () => {
    const { setCount } = setup({ count: '10' });
    const afterMount = measurements;

    await setCount('11');

    expect(measurements).toBe(afterMount);
  });

  it('never re-measures to resize', () => {
    setup();
    const afterMount = measurements;

    resizeTo(300);
    resizeTo(100);
    resizeTo(1000);

    expect(measurements).toBe(afterMount);
  });

  it('does not touch the class list while the answer stays put', () => {
    const { applied, toolbar } = setup();
    resizeTo(300);

    // takeRecords() reads the queue synchronously: one record per class write.
    const classWrites = new MutationObserver(() => {});
    classWrites.observe(toolbar, { attributes: true, attributeFilter: ['class'] });

    resizeTo(290);
    resizeTo(280);
    resizeTo(260);

    expect(applied()).toBe('compact');
    expect(classWrites.takeRecords()).toHaveLength(0);
    classWrites.disconnect();
  });

  it('coalesces a burst of resizes into one frame', () => {
    const { applied } = setup();

    fireResize(350);
    fireResize(320);
    fireResize(300);
    expect(pending.size).toBe(1);

    flushFrames();
    expect(applied()).toBe('compact');
  });

  it('cancels a pending frame when the container detaches', () => {
    const { unmount } = setup();

    fireResize(300);
    expect(pending.size).toBe(1);

    unmount();
    expect(pending.size).toBe(0);
  });

  it('keeps the last answer while the container measures zero', () => {
    const { applied } = setup();

    resizeTo(100);
    expect(applied()).toBe('compact tiny');

    resizeTo(0);
    expect(applied()).toBe('compact tiny');
  });

  it('leaves no trace of a calibration behind', () => {
    const { toolbar } = setup();

    expect(toolbar.classList.contains(MEASURING_CLASS)).toBe(false);
    expect(toolbar.style.width).toBe('');
  });

  it('never re-renders the host: the collapse is CSS-only', () => {
    const { renderCount } = setup();
    const rendersAfterMount = renderCount();

    resizeTo(300);
    resizeTo(100);
    resizeTo(1000);

    expect(renderCount()).toBe(rendersAfterMount);
  });

  it('survives a re-render of the host component', () => {
    const { applied, forceRender } = setup();
    resizeTo(100);

    forceRender(1);

    expect(applied()).toBe('compact tiny');
    expect(observers).toHaveLength(1);
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = setup();
    expect(observers).toHaveLength(1);
    unmount();
    expect(disconnectCount).toBeGreaterThan(0);
  });
});
