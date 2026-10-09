import { beginDispatch, endDispatch, recordInnerDispatch } from 'utils/profiler';

/**
 * Two probes, one at each end of the middleware chain, so the cost of the chain itself
 * is measured rather than inferred.
 *
 * `profilerMiddleware` is PREPENDED — outermost. It times the entire dispatch, including
 * RTK's dev-only immutableCheck and serializableCheck, which deep-walk the whole state
 * tree twice per action and are invisible to anything nested inside them.
 *
 * `profilerInnerMiddleware` is CONCATENATED last — innermost, directly above the reducer.
 * It times reducer + Immer alone.
 *
 * total - inner = what the middleware chain costs, which is roughly what turning the dev
 * checks off would give back. Both are a single boolean check while recording is off.
 *
 * Thunks are skipped: the outer probe sits in front of the thunk middleware, so a thunk's
 * time would include every action it dispatches (each already measured on its own) plus
 * the synchronous part of whatever async work it starts.
 */
export const profilerMiddleware = () => (next) => (action) => {
  if (typeof action === 'function') return next(action);
  const type = action?.type || 'unknown';
  beginDispatch(type);
  const t0 = performance.now();
  try {
    return next(action);
  } finally {
    endDispatch(type, performance.now() - t0);
  }
};

export const profilerInnerMiddleware = () => (next) => (action) => {
  const t0 = performance.now();
  const result = next(action);
  recordInnerDispatch(action?.type || 'unknown', performance.now() - t0);
  return result;
};

export default profilerMiddleware;
