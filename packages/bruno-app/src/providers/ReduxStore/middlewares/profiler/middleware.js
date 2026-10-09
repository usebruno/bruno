import { beginDispatch, endDispatch, isProfilerEnabled, recordInnerDispatch } from 'utils/profiler';

/**
 * Measure Redux dispatch time using two middleware probes.
 *
 * The outer middleware runs first and measures the entire dispatch, including
 * RTK's development checks. The inner middleware runs last, just before the
 * reducer, and measures the reducer and Immer.
 *
 * The difference between the two timings gives us the middleware overhead.
 *
 * When profiling is disabled, both middleware simply pass the action through.
 * Thunks are skipped by the outer middleware because they can dispatch other
 * actions, which are already measured individually.
 */
export const profilerMiddleware = () => (next) => (action) => {
  if (!isProfilerEnabled() || typeof action === 'function') {
    return next(action);
  }

  const actionType = action?.type || 'unknown';
  const startTime = performance.now();

  beginDispatch(actionType);

  try {
    return next(action);
  } finally {
    endDispatch(actionType, performance.now() - startTime);
  }
};

/**
 * Measure the time spent in the reducer and Immer, excluding other middleware.
 */
export const profilerInnerMiddleware = () => (next) => (action) => {
  if (!isProfilerEnabled()) {
    return next(action);
  }

  const actionType = action?.type || 'unknown';
  const startTime = performance.now();

  try {
    return next(action);
  } finally {
    recordInnerDispatch(actionType, performance.now() - startTime);
  }
};

export default profilerMiddleware;
