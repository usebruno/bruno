import { useEffect } from 'react';
import { useDragDropManager } from 'react-dnd';

// Catches "Expected to find a valid target" errors when a drag target unmounts mid-drag (e.g. cross-folder moves).
// Treats these dropped target IDs as "can't drop" to prevent react-dnd crashes; other errors still propagate.
const DndTargetErrorGuard = () => {
  const manager = useDragDropManager();

  useEffect(() => {
    const monitor = manager.getMonitor();
    const originalCanDropOnTarget = monitor.canDropOnTarget.bind(monitor);

    monitor.canDropOnTarget = (targetId) => {
      try {
        return originalCanDropOnTarget(targetId);
      } catch (error) {
        if (error?.message?.includes('Expected to find a valid target')) {
          console.warn('Ignored a stale react-dnd target lookup:', error.message);
          return false;
        }
        throw error;
      }
    };

    return () => {
      monitor.canDropOnTarget = originalCanDropOnTarget;
    };
  }, [manager]);

  return null;
};

export default DndTargetErrorGuard;
