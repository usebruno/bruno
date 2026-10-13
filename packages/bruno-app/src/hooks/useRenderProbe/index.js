import { useLayoutEffect, useRef } from 'react';
import { instanceMounted, instanceUnmounted, isProfilerEnabled, recordRender } from 'utils/profiler';

let nextInstanceId = 0;

/**
 * Counts committed renders of a component for the Profiler tab, and times them from the
 * start of render to this component's layout effect.
 */
export const useRenderProbe = (name, props) => {
  const startRef = useRef(0);
  const prevPropsRef = useRef(null);
  const instanceIdRef = useRef(0);
  if (!instanceIdRef.current) {
    nextInstanceId += 1;
    instanceIdRef.current = nextInstanceId;
  }
  startRef.current = isProfilerEnabled() ? performance.now() : 0;

  useLayoutEffect(() => {
    instanceMounted(name);
    return () => instanceUnmounted(name);
  }, [name]);

  useLayoutEffect(() => {
    const prev = prevPropsRef.current;
    prevPropsRef.current = props || null;
    if (!startRef.current) return;

    // null: props not tracked, or first render (a mount, nothing to compare against)
    let changedProps = null;
    if (props && prev) {
      changedProps = Object.keys(props).filter((key) => prev[key] !== props[key]);
    }

    recordRender(name, performance.now() - startRef.current, {
      changedProps,
      isMount: props ? !prev : undefined,
      instanceId: instanceIdRef.current
    });
    startRef.current = 0;
  });
};

export default useRenderProbe;
