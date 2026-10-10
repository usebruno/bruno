/**
 * Lightweight runtime profiler for the renderer.
 *
 * Deliberately plain module state rather than Redux: the thing being measured is
 * Redux dispatch and render cost, so recording through the store would perturb the
 * measurement and recurse. The Profiler tab polls `getProfilerSnapshot()` instead.
 *
 * Everything is a no-op until `setProfilerEnabled(true)` — one boolean check per probe —
 * so it is safe to ship in production builds, which matters because RTK's dev-only
 * middleware makes development numbers unrepresentative.
 */

export const SNAPSHOT_SCHEMA = 'bruno-profiler/1';

const RECENT_LIMIT = 300;
export const NO_ACTION = '(no action)';

let enabled = false;
let startedAt = null; // start of the current recording run; null while stopped
let accumulatedMs = 0; // time banked from earlier runs, so Stop freezes the clock

// actionType -> { count, total, max, inner, innerMax, renders, components: Map<name, count> }
// `total` is measured by the OUTERMOST middleware (the whole chain, RTK's dev-only
// immutableCheck/serializableCheck included). `inner` is measured by the INNERMOST one
// (reducer + Immer only). total - inner is what the middleware chain costs.
const dispatchStats = new Map();
const fnStats = new Map(); // fnName -> { count, total, max }
// componentName -> { count, total, max, mounts, compared, sameProps, propChanges: Map, actions: Map }
const renderStats = new Map();
// componentName -> instances mounted right now. Tracked even while not recording, so a
// recording started mid-session still knows how many rows exist.
const liveInstances = new Map();
const selectorStats = new Map(); // selectorName -> { count, total, max, recomputes, instances }
let recent = []; // [{ type, ms, at }]

let topLevelDispatches = 0;
let topLevelDispatchMs = 0;
let unattributedRenders = 0;

// Renders are attributed to the most recent top-level action. React commits the
// re-renders a dispatch causes after the dispatch returns (end of the event handler, or a
// microtask) but before the next macrotask, so the attribution is cleared on a timeout.
// Several dispatches batched into one commit are attributed to the last of them.
let dispatchDepth = 0;
let currentAction = null;
let clearActionTimer = null;

const getEntry = (map, key, init) => {
  let e = map.get(key);
  if (!e) {
    e = init();
    map.set(key, e);
  }
  return e;
};

const newTiming = () => ({ count: 0, total: 0, max: 0 });
const newDispatch = () => ({ count: 0, total: 0, max: 0, inner: 0, innerMax: 0, renders: 0, components: new Map() });
const newRender = () => ({
  count: 0,
  total: 0,
  max: 0,
  mounts: 0,
  compared: 0,
  sameProps: 0,
  propChanges: new Map(),
  actions: new Map(),
  instances: new Set()
});
const newSelector = () => ({ count: 0, total: 0, max: 0, recomputes: 0, instances: 0 });

const bump = (e, ms) => {
  e.count += 1;
  e.total += ms;
  if (ms > e.max) e.max = ms;
};

export const isProfilerEnabled = () => enabled;

export const setProfilerEnabled = (value) => {
  const next = Boolean(value);
  if (next === enabled) return;
  enabled = next;
  if (enabled) {
    startedAt = performance.now();
  } else if (startedAt !== null) {
    accumulatedMs += performance.now() - startedAt;
    startedAt = null;
  }
};

export const resetProfiler = () => {
  dispatchStats.clear();
  fnStats.clear();
  renderStats.clear();
  selectorStats.clear();
  recent = [];
  topLevelDispatches = 0;
  topLevelDispatchMs = 0;
  unattributedRenders = 0;
  currentAction = null;
  if (clearActionTimer) clearTimeout(clearActionTimer);
  clearActionTimer = null;
  accumulatedMs = 0;
  startedAt = enabled ? performance.now() : null;
};

/**
 * Called by the outer middleware before the action enters the chain. Tracks nesting so
 * an action dispatched from inside another (a middleware reacting to an action) is not
 * double-counted in the top-level totals.
 */
export const beginDispatch = (type) => {
  dispatchDepth += 1;
  if (!enabled || dispatchDepth > 1) return;
  currentAction = type;
  if (clearActionTimer) clearTimeout(clearActionTimer);
  clearActionTimer = setTimeout(() => {
    currentAction = null;
    clearActionTimer = null;
  }, 0);
};

export const endDispatch = (type, ms) => {
  const isTopLevel = dispatchDepth === 1;
  dispatchDepth = Math.max(0, dispatchDepth - 1);
  if (!enabled) return;
  bump(getEntry(dispatchStats, type, newDispatch), ms);
  if (isTopLevel) {
    topLevelDispatches += 1;
    topLevelDispatchMs += ms;
  }
  recent.push({ type, ms, at: performance.now(), nested: !isTopLevel });
  if (recent.length > RECENT_LIMIT) recent = recent.slice(-RECENT_LIMIT);
};

// Kept for callers/tests that record a dispatch directly, outside the middleware.
export const recordDispatch = (type, ms) => {
  beginDispatch(type);
  endDispatch(type, ms);
};

/**
 * Recorded by the innermost middleware — reducer + Immer, with the whole middleware
 * chain already unwound. Paired with the outer `total` this attributes the overhead
 * instead of leaving it to arithmetic.
 */
export const recordInnerDispatch = (type, ms) => {
  if (!enabled) return;
  const e = getEntry(dispatchStats, type, newDispatch);
  e.inner += ms;
  if (ms > e.innerMax) e.innerMax = ms;
};

export const instanceMounted = (name) => {
  liveInstances.set(name, (liveInstances.get(name) || 0) + 1);
};

export const instanceUnmounted = (name) => {
  const n = (liveInstances.get(name) || 0) - 1;
  if (n > 0) liveInstances.set(name, n);
  else liveInstances.delete(name);
};

/**
 * One committed render of a component. `ms` is inclusive — from the start of its render
 * to its layout effect, which runs after its children's — so parents include children.
 *
 * `changedProps` lists the props whose identity changed since the previous render, or is
 * null when props are not tracked or this is a mount.
 */
export const recordRender = (name, ms, { changedProps = null, isMount = false, instanceId } = {}) => {
  if (!enabled) return;
  const e = getEntry(renderStats, name, newRender);
  bump(e, ms);
  if (instanceId !== undefined) e.instances.add(instanceId);
  if (isMount) e.mounts += 1;
  if (changedProps) {
    e.compared += 1;
    if (changedProps.length === 0) e.sameProps += 1;
    changedProps.forEach((key) => e.propChanges.set(key, (e.propChanges.get(key) || 0) + 1));
  }

  const action = currentAction || NO_ACTION;
  e.actions.set(action, (e.actions.get(action) || 0) + 1);
  if (currentAction) {
    const d = getEntry(dispatchStats, currentAction, newDispatch);
    d.renders += 1;
    d.components.set(name, (d.components.get(name) || 0) + 1);
  } else {
    unattributedRenders += 1;
  }
};

export const recordFn = (name, ms) => {
  if (!enabled) return;
  bump(getEntry(fnStats, name, newTiming), ms);
};

/**
 * Wraps a function so its calls are timed while profiling is on.
 * Zero overhead beyond one boolean check when off.
 *
 * Note timings nest: findItemInCollection calls flattenItems, so the former's
 * total includes the latter's. The tab labels these as nested.
 */
export const profiled = (name, fn) =>
  function profiledFn(...args) {
    if (!enabled) return fn.apply(this, args);
    const t0 = performance.now();
    try {
      return fn.apply(this, args);
    } finally {
      recordFn(name, performance.now() - t0);
    }
  };

/* ----------------------------------------------------------------- selectors */

/**
 * Wraps a reselect selector to count calls against recomputes (cache misses) and time
 * them. Each call to the wrapper factory also counts as a new selector *instance* — a
 * component that builds its selector during render creates one per render, which throws
 * the memoisation away; that shows up here as instances ≈ calls.
 *
 * react-redux 7 runs every subscribed selector on every dispatch, so `calls` is real
 * per-dispatch work even when nothing re-renders.
 */
export const profiledSelector = (name, selector) => {
  if (enabled) getEntry(selectorStats, name, newSelector).instances += 1;
  const canCount = typeof selector.recomputations === 'function';

  const wrapped = (...args) => {
    if (!enabled) return selector(...args);
    const before = canCount ? selector.recomputations() : 0;
    const t0 = performance.now();
    const result = selector(...args);
    const e = getEntry(selectorStats, name, newSelector);
    bump(e, performance.now() - t0);
    if (!canCount || selector.recomputations() !== before) e.recomputes += 1;
    return result;
  };

  if (canCount) {
    wrapped.recomputations = selector.recomputations;
    wrapped.resetRecomputations = selector.resetRecomputations;
  }
  return wrapped;
};

const timingRow = (name, e) => ({
  name,
  count: e.count,
  total: e.total,
  mean: e.count ? e.total / e.count : 0,
  max: e.max
});

const byTotal = (a, b) => b.total - a.total;

export const getProfilerSnapshot = () => {
  const dispatches = Array.from(dispatchStats.entries())
    .map(([name, e]) => ({
      ...timingRow(name, e),
      inner: e.inner,
      overhead: Math.max(0, e.total - e.inner),
      renders: e.renders,
      rendersPerDispatch: e.count ? e.renders / e.count : 0,
      topComponents: Array.from(e.components.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([component, count]) => ({ component, count }))
    }))
    .sort(byTotal);

  const renders = Array.from(renderStats.entries())
    .map(([name, e]) => ({
      ...timingRow(name, e),
      mounts: e.mounts,
      compared: e.compared,
      sameProps: e.sameProps,
      propChanges: Array.from(e.propChanges.entries())
        .sort((x, y) => y[1] - x[1])
        .map(([prop, count]) => ({ prop, count })),
      mounted: liveInstances.get(name) || 0,
      instancesRendered: e.instances.size,
      actionTypes: e.actions.size,
      // perDispatch: how many renders of this component one dispatch of the action causes.
      // For a list component that is how many of its rows re-render per action.
      topActions: Array.from(e.actions.entries())
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([action, count]) => {
          const d = action === NO_ACTION ? null : dispatchStats.get(action);
          return { action, count, perDispatch: d && d.count ? count / d.count : null };
        })
    }))
    .sort((a, b) => b.count - a.count);

  const selectors = Array.from(selectorStats.entries())
    .map(([name, e]) => ({
      ...timingRow(name, e),
      recomputes: e.recomputes,
      hitRate: e.count ? 1 - e.recomputes / e.count : 0,
      instances: e.instances
    }))
    .sort(byTotal);

  const totalRenders = renders.reduce((s, r) => s + r.count, 0);

  return {
    enabled,
    elapsedMs: accumulatedMs + (startedAt === null ? 0 : performance.now() - startedAt),
    totals: {
      dispatches: topLevelDispatches,
      dispatchMs: topLevelDispatchMs,
      renders: totalRenders,
      renderMs: renders.reduce((s, r) => s + r.total, 0),
      rendersPerDispatch: topLevelDispatches ? (totalRenders - unattributedRenders) / topLevelDispatches : 0,
      unattributedRenders,
      selectorCalls: selectors.reduce((s, r) => s + r.count, 0),
      selectorRecomputes: selectors.reduce((s, r) => s + r.recomputes, 0)
    },
    dispatches,
    renders,
    selectors,
    fns: Array.from(fnStats.entries()).map(([name, e]) => timingRow(name, e)).sort(byTotal),
    recent: recent.slice()
  };
};

/**
 * Walks the live collections tree to report what the state actually holds.
 * On demand only — it is itself O(tree).
 */
export const measureStateSize = (state) => {
  const collections = state?.collections?.collections || [];
  let folders = 0;
  let requests = 0;
  let drafts = 0;
  let withResponse = 0;
  let responseBytes = 0;
  let timelineEntries = 0;

  const walk = (items = []) => {
    for (const item of items) {
      if (item?.type === 'folder') {
        folders += 1;
        walk(item.items);
        continue;
      }
      requests += 1;
      if (item?.draft) drafts += 1;
      if (item?.response) {
        withResponse += 1;
        try {
          responseBytes += JSON.stringify(item.response).length;
        } catch {
          /* circular or huge — skip */
        }
      }
    }
  };

  collections.forEach((c) => {
    walk(c.items);
    timelineEntries += (c.timeline || []).length;
  });

  return {
    collections: collections.length,
    folders,
    requests,
    drafts,
    withResponse,
    responseBytes,
    timelineEntries,
    openTabs: state?.tabs?.tabs?.length || 0
  };
};

/**
 * A JSON-safe export of the current snapshot, for before/after comparisons. `mode` is
 * passed in by the caller: `import.meta` is not available to this module under Jest.
 */
export const buildExport = ({ scenario = '', label = '', mode, state } = {}) => {
  const snapshot = getProfilerSnapshot();
  delete snapshot.recent;
  delete snapshot.enabled;
  return {
    schema: SNAPSHOT_SCHEMA,
    meta: {
      scenario,
      label,
      exportedAt: new Date().toISOString(),
      mode,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      stateSize: state ? measureStateSize(state) : null
    },
    snapshot
  };
};

export const parseExport = (text) => {
  const data = JSON.parse(text);
  if (data?.schema !== SNAPSHOT_SCHEMA || !data.snapshot) {
    throw new Error(`Not a profiler export (expected schema "${SNAPSHOT_SCHEMA}")`);
  }
  return data;
};
