import React from 'react';
import { render } from '@testing-library/react';
import { DndProvider, useDragDropManager } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DndTargetErrorGuard from './index';

// dnd-core parses target ids as `T<number>`; an unregistered-but-well-formed id reproduces the
// exact "Expected to find a valid target" invariant seen in the real crash reports.
const STALE_TARGET_ID = 'T999';

const ManagerProbe = ({ onManager }) => {
  const manager = useDragDropManager();
  onManager(manager);
  return null;
};

const renderWithManager = ({ withGuard }) => {
  let manager;
  render(
    <DndProvider backend={HTML5Backend}>
      {withGuard && <DndTargetErrorGuard />}
      <ManagerProbe onManager={(m) => { manager = m; }} />
    </DndProvider>
  );
  return manager;
};

describe('DndTargetErrorGuard', () => {
  it('without the guard, asking about an unregistered target throws (reproduces the crash)', () => {
    const manager = renderWithManager({ withGuard: false });
    const monitor = manager.getMonitor();

    expect(() => monitor.canDropOnTarget(STALE_TARGET_ID)).toThrow(/Expected to find a valid target/);
  });

  it('with the guard, an unregistered target resolves to "cannot drop" instead of throwing', () => {
    const manager = renderWithManager({ withGuard: true });
    const monitor = manager.getMonitor();

    expect(() => monitor.canDropOnTarget(STALE_TARGET_ID)).not.toThrow();
    expect(monitor.canDropOnTarget(STALE_TARGET_ID)).toBe(false);
  });

  it('restores the original method on unmount', () => {
    let manager;
    const { unmount } = render(
      <DndProvider backend={HTML5Backend}>
        <DndTargetErrorGuard />
        <ManagerProbe onManager={(m) => { manager = m; }} />
      </DndProvider>
    );

    const monitor = manager.getMonitor();
    const patched = monitor.canDropOnTarget;

    unmount();

    expect(monitor.canDropOnTarget).not.toBe(patched);
    expect(() => monitor.canDropOnTarget(STALE_TARGET_ID)).toThrow(/Expected to find a valid target/);
  });

  it('re-throws unexpected errors (e.g. from target.canDrop)', () => {
    let manager;
    render(
      <DndProvider backend={HTML5Backend}>
        <ManagerProbe onManager={(m) => {
          manager = m;
          const monitor = manager.getMonitor();
          // Mock the monitor method before the guard patches it
          monitor.canDropOnTarget = jest.fn(() => {
            throw new Error('user error from target.canDrop');
          });
        }}
        />
        <DndTargetErrorGuard />
      </DndProvider>
    );

    const monitor = manager.getMonitor();
    expect(() => monitor.canDropOnTarget(STALE_TARGET_ID)).toThrow(/user error from target.canDrop/);
  });
});
