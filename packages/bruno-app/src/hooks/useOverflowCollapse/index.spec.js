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

// jsdom has no layout, so the test supplies one: how wide the toolbar wants to be at each
// level, plus 100px for every action beyond the first and every character of the count
// beyond the first. Calibration is the only moment offsetWidth should report a requirement
// rather than the room available, and it is recognised by the class the hook applies for
// exactly that window — jsdom's cssstyle rejects `max-content`, so style.width cannot be
// the tell.
const REQUIRED_WIDTH = { '': 400, 'compact': 250, 'compact tiny': 180 };
const ACTION_WIDTH = 100;
const CHAR_WIDTH = 100;

const originalResizeObserver = global.ResizeObserver;
let availableWidth = 1000;
let calibrations = 0;
let classWrites = 0;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      if (!this.classList.contains('measuring-overflow')) return availableWidth;
      const applied = LEVELS.filter((level) => this.classList.contains(level)).join(' ');
      const actions = this.querySelectorAll('button').length;
      const count = this.querySelector('[data-count]')?.textContent ?? '';
      return (
        REQUIRED_WIDTH[applied]
        + (actions - 1) * ACTION_WIDTH
        + Math.max(count.length - 1, 0) * CHAR_WIDTH
      );
    }
  });
  // Run rAF callbacks immediately so a resize lands within the act() that fired it.
  global.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };
  global.cancelAnimationFrame = () => {};
});

afterAll(() => {
  delete HTMLElement.prototype.offsetWidth;
  global.ResizeObserver = originalResizeObserver;
});

beforeEach(() => {
  observers = [];
  disconnectCount = 0;
  availableWidth = 1000;
  calibrations = 0;
  classWrites = 0;
  global.ResizeObserver = ControllableResizeObserver;
});

const resizeTo = (width) => {
  availableWidth = width;
  act(() => {
    observers.forEach((observer) => observer.callback());
  });
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

  // Count real class mutations: repainting the same answer is what makes buttons wobble.
  // A calibration is recognisable by the class it adds for the length of the pass.
  new MutationObserver((records) => {
    classWrites += 1;
    if (records.some((r) => r.oldValue?.includes('measuring-overflow'))) calibrations += 1;
  }).observe(toolbar, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  return {
    toolbar,
    applied: () => LEVELS.filter((level) => toolbar.classList.contains(level)).join(' '),
    renderCount: () => renderCount,
    classWrites: () => classWrites,
    calibrations: () => calibrations,
    forceRender: (n) => act(() => forceRender(n)),
    setActions: async (n) => {
      await act(async () => setActions(n));
    },
    setCount: async (label) => {
      await act(async () => setCount(label));
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
    const { applied, setActions } = setup({ actions: 1 });
    expect(applied()).toBe('');

    await setActions(9);

    expect(applied()).toBe('compact tiny');
  });

  it('re-measures when a child leaves', async () => {
    const { applied, setActions } = setup({ actions: 9 });
    expect(applied()).toBe('compact tiny');

    await setActions(1);

    expect(applied()).toBe('');
  });

  it('re-measures when a child rewrites its text in place', async () => {
    const { applied, setCount } = setup({ actions: 1, count: '0' });
    expect(applied()).toBe('');

    await setCount('12345678');

    expect(applied()).toBe('compact');
  });

  it('skips re-measuring when a text rewrite keeps its length', async () => {
    const { calibrations, setCount } = setup({ actions: 1, count: '10' });
    const afterMount = calibrations();

    await setCount('11');

    expect(calibrations()).toBe(afterMount);
  });

  it('never re-measures to resize', () => {
    const { calibrations } = setup();
    const afterMount = calibrations();

    resizeTo(300);
    resizeTo(100);
    resizeTo(1000);

    expect(calibrations()).toBe(afterMount);
  });

  it('does not touch the class list while the answer stays put', () => {
    const { applied, classWrites } = setup();
    resizeTo(300);
    const writesAfterCollapse = classWrites();

    resizeTo(290);
    resizeTo(280);
    resizeTo(260);

    expect(applied()).toBe('compact');
    expect(classWrites()).toBe(writesAfterCollapse);
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

    expect(toolbar.classList.contains('measuring-overflow')).toBe(false);
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
