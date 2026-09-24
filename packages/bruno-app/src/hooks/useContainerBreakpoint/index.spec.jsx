import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import useContainerBreakpoint from './index';

// The global mock in jest.setup.js never fires its callback; these tests need to
// drive resizes by hand, so they install a controllable observer instead.
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

const originalResizeObserver = global.ResizeObserver;
let currentWidth = 1000;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => currentWidth
  });
  // Run rAF callbacks immediately so a resize lands within the act() that fired it.
  global.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };
  global.cancelAnimationFrame = () => {};
});

afterAll(() => {
  delete HTMLElement.prototype.clientWidth;
  global.ResizeObserver = originalResizeObserver;
});

beforeEach(() => {
  observers = [];
  disconnectCount = 0;
  currentWidth = 1000;
  global.ResizeObserver = ControllableResizeObserver;
});

const BREAKPOINTS = { compact: 720, tiny: 560 };

const resizeTo = (width) => {
  currentWidth = width;
  act(() => {
    observers.forEach((observer) => observer.callback());
  });
};

const setup = () => {
  const classes = [];
  let forceRender;
  const Probe = () => {
    const [, setCount] = useState(0);
    forceRender = setCount;
    const [containerRef, breakpointClass] = useContainerBreakpoint(BREAKPOINTS);
    classes.push(breakpointClass);
    return <div ref={containerRef} />;
  };
  const utils = render(<Probe />);
  return { classes, forceRender: (n) => act(() => forceRender(n)), ...utils };
};

describe('useContainerBreakpoint', () => {
  it('returns no classes while the container is wider than every breakpoint', () => {
    currentWidth = 900;
    const { classes } = setup();
    expect(classes.at(-1)).toBe('');
  });

  it('accumulates classes as the container crosses each breakpoint', () => {
    const { classes } = setup();
    expect(classes.at(-1)).toBe('');

    resizeTo(700);
    expect(classes.at(-1)).toBe('compact');

    resizeTo(500);
    expect(classes.at(-1)).toBe('compact tiny');

    resizeTo(1200);
    expect(classes.at(-1)).toBe('');
  });

  it('treats each breakpoint as an exclusive max width', () => {
    const { classes } = setup();
    resizeTo(720);
    expect(classes.at(-1)).toBe('');
    resizeTo(719);
    expect(classes.at(-1)).toBe('compact');
  });

  it('does not re-render while resizing within the same band', () => {
    const { classes } = setup();
    const rendersAfterMount = classes.length;

    resizeTo(950);
    resizeTo(880);
    resizeTo(760);

    expect(classes.length).toBe(rendersAfterMount);
    expect(classes.at(-1)).toBe('');
  });

  it('keeps the last answer while the container measures zero', () => {
    const { classes } = setup();
    resizeTo(500);
    expect(classes.at(-1)).toBe('compact tiny');

    resizeTo(0);
    expect(classes.at(-1)).toBe('compact tiny');
  });

  it('survives a re-render of the host component', () => {
    const { classes, forceRender } = setup();
    resizeTo(500);

    forceRender(1);

    expect(classes.at(-1)).toBe('compact tiny');
    // A re-render must not detach and re-attach the observer.
    expect(observers).toHaveLength(1);
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = setup();
    expect(observers).toHaveLength(1);
    unmount();
    expect(disconnectCount).toBeGreaterThan(0);
  });
});
