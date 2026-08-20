import { useEffect } from 'react';
import { useDragDropManager } from 'react-dnd';

// react-dnd throws if a hovered drop target unmounts mid-drag (e.g. a sidebar row remounts
// under a new key) before its id is cleared. Treat an unknown id as "can't drop" instead of
// crashing.
const DndTargetErrorGuard = () => {
  const manager = useDragDropManager();

  useEffect(() => {
    const monitor = manager.getMonitor();
    const originalCanDropOnTarget = monitor.canDropOnTarget.bind(monitor);

    monitor.canDropOnTarget = (targetId) => {
      try {
        return originalCanDropOnTarget(targetId);
      } catch (error) {
        console.warn('Ignored a stale react-dnd target lookup:', error?.message);
        return false;
      }
    };

    return () => {
      monitor.canDropOnTarget = originalCanDropOnTarget;
    };
  }, [manager]);

  return null;
};

export default DndTargetErrorGuard;
