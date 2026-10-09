import { NO_ACTION } from './index';

/**
 * Analyze a profiler snapshot and highlight potential performance problems.
 *
 * Insights are ranked by severity, then by impact.
 */
export const THRESHOLDS = {
  minDispatches: 3,
  minRenders: 10,
  minCalls: 20,

  rendersPerDispatchMedium: 20,
  rendersPerDispatchHigh: 50,

  samePropsMedium: 0.5,
  samePropsHigh: 0.8,
  unstableProp: 0.8,
  manyActionTypes: 6,

  selectorRebuilt: 0.5,
  selectorMiss: 0.5,

  callsPerDispatch: 20,
  hotFnTotalMs: 50,

  frameMs: 16,
  slowMeanMs: 8,
  devOverhead: 0.6,
  unattributedShare: 0.3,

  fanOutMinMounted: 3,
  fanOutShare: 0.8,
  fanOutHighMounted: 10
};

const SEVERITY_RANK = {
  high: 0,
  medium: 1,
  info: 2
};

const formatPercent = (value) => `${Math.round(value * 100)}%`;
const formatMs = (value) => (value >= 10 ? value.toFixed(0) : value.toFixed(1));

const isCallbackProp = (name) =>
  /^(on|handle)[A-Z]/.test(name) || /Callback$|Handler$/.test(name);

const formatTopActions = (actions = []) =>
  actions.map(({ action, count }) => `${action} ×${count}`).join(', ');

const addInsight = (insights, insight) => {
  insights.push(insight);
};

/**
 * Find actions that trigger too many renders or take too long.
 */
const analyzeDispatches = (snapshot, thresholds, insights) => {
  const t = thresholds;

  for (const dispatch of snapshot.dispatches) {
    const {
      name,
      count,
      renders,
      rendersPerDispatch,
      max,
      mean,
      total,
      inner,
      overhead,
      topComponents
    } = dispatch;

    const hasEnoughDispatches = count >= t.minDispatches;

    // Too many components render after one action.
    if (hasEnoughDispatches && rendersPerDispatch >= t.rendersPerDispatchMedium) {
      addInsight(insights, {
        id: `render-storm/${name}`,
        severity: rendersPerDispatch >= t.rendersPerDispatchHigh ? 'high' : 'medium',
        impact: renders,
        subject: name,
        title: `${name} re-renders ${Math.round(rendersPerDispatch)} components per dispatch`,
        evidence: topComponents.map(({ component, count }) => `${component} ×${count}`).join(', '),
        suggestion:
          'Check which components actually need the changed data. '
          + 'Use narrower useSelector subscriptions to avoid unnecessary renders.'
      });
    }

    // A dispatch is slow either once or consistently.
    const hasSlowDispatch
      = max >= t.frameMs
        || (hasEnoughDispatches && mean >= t.slowMeanMs);

    if (!hasSlowDispatch) continue;

    const isSlowFrame = max >= t.frameMs;
    const isMiddlewareHeavy = total > 0 && overhead / total >= t.devOverhead;

    addInsight(insights, {
      id: `slow-dispatch/${name}`,
      severity: isSlowFrame ? 'high' : 'medium',
      impact: total,
      subject: name,
      title: isSlowFrame
        ? `${name} took ${formatMs(max)} ms in one dispatch, a whole frame on its own`
        : `${name} averages ${formatMs(mean)} ms per dispatch`,
      evidence: `reducer ${formatMs(inner)} ms of ${formatMs(total)} ms total over ${count} dispatches`,
      suggestion: isMiddlewareHeavy
        ? 'Most of the time is spent in middleware. Confirm in a production build before optimising.'
        : 'Check the reducer for expensive operations, such as repeatedly walking the entire tree.'
    });
  }
};

/**
 * Find actions that cause most instances of a component to re-render.
 */
const analyzeFanOut = (snapshot, thresholds, insights) => {
  const t = thresholds;

  for (const render of snapshot.renders) {
    const { name, mounted, compared, sameProps, topActions = [] } = render;

    if (!mounted || mounted < t.fanOutMinMounted) continue;

    for (const action of topActions) {
      const { action: actionName, count, perDispatch } = action;

      if (!perDispatch || perDispatch < mounted * t.fanOutShare) continue;

      const rendersPerDispatch = Math.round(perDispatch);
      const allInstancesRender = rendersPerDispatch >= mounted;
      const dispatchCount = Math.round(count / perDispatch);

      addInsight(insights, {
        id: `fan-out/${name}/${actionName}`,
        severity: mounted >= t.fanOutHighMounted ? 'high' : 'medium',
        impact: count,
        subject: name,
        title: allInstancesRender
          ? `Every mounted ${name} (${mounted}) re-renders on each ${actionName}`
          : `${rendersPerDispatch} of ${mounted} mounted ${name} re-render on each ${actionName}`,
        evidence:
          `${count} renders over ${dispatchCount} dispatch(es)`
          + (compared ? `; ${sameProps} of ${compared} with identical props` : ''),
        suggestion:
          'Each instance should subscribe only to its own data, '
          + 'rather than a shared collection or array.'
      });
    }
  }
};

/**
 * Find unnecessary renders and frequently changing props.
 */
const analyzeRenders = (snapshot, thresholds, insights) => {
  const t = thresholds;

  for (const render of snapshot.renders) {
    const {
      name,
      count,
      compared,
      sameProps,
      propChanges = [],
      actionTypes,
      topActions = []
    } = render;

    if (count < t.minRenders) continue;

    if (compared >= t.minRenders) {
      const samePropsRatio = sameProps / compared;

      // The component renders even though its props haven't changed.
      if (samePropsRatio >= t.samePropsMedium) {
        addInsight(insights, {
          id: `same-props/${name}`,
          severity:
            samePropsRatio >= t.samePropsHigh && count >= 50
              ? 'high'
              : 'medium',
          impact: sameProps,
          subject: name,
          title: `${name} re-rendered with identical props ${sameProps}× (${formatPercent(samePropsRatio)} of renders)`,
          evidence: `triggered by ${formatTopActions(topActions)}`,
          suggestion:
            'Check useSelector, context and parent renders. '
            + 'Select narrower store values or use React.memo for unnecessary parent-driven renders.'
        });
      }

      // A prop receives a new value on most renders.
      for (const { prop, count: changeCount } of propChanges) {
        const changeRatio = changeCount / compared;

        if (changeRatio < t.unstableProp) continue;

        addInsight(insights, {
          id: `unstable-prop/${name}/${prop}`,
          severity: 'medium',
          impact: changeCount,
          subject: `${name}.${prop}`,
          title: `${name} gets a new \`${prop}\` on ${formatPercent(changeRatio)} of renders`,
          evidence: `${changeCount} of ${compared} compared renders`,
          suggestion: isCallbackProp(prop)
            ? 'This callback may be recreated on each parent render. Consider useCallback where it is defined.'
            : 'This value may be recreated upstream. Memoise it where needed or pass only the data this component uses.'
        });
      }
    }

    // A component responds to many unrelated store actions.
    if (actionTypes >= t.manyActionTypes) {
      addInsight(insights, {
        id: `many-actions/${name}`,
        severity: 'info',
        impact: count,
        subject: name,
        title: `${name} re-renders for ${actionTypes} different action types`,
        evidence: formatTopActions(topActions),
        suggestion:
          'This component may subscribe to a broad slice of the store.'
      });
    }
  }

  analyzeUnattributedRenders(snapshot, t, insights);
};

/**
 * Find renders that weren't associated with a store action.
 */
const analyzeUnattributedRenders = (snapshot, thresholds, insights) => {
  const { renders: total, unattributedRenders } = snapshot.totals;

  if (total <= 0 || unattributedRenders < 20) return;

  const unattributedRatio = unattributedRenders / total;
  if (unattributedRatio < thresholds.unattributedShare) return;

  const topComponents = snapshot.renders
    .map(({ name, topActions = [] }) => ({
      name,
      count: topActions.find(({ action }) => action === NO_ACTION)?.count || 0
    }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  addInsight(insights, {
    id: 'unattributed-renders',
    severity: 'medium',
    impact: unattributedRenders,
    subject: 'renders without an action',
    title: `${unattributedRenders} renders (${formatPercent(unattributedRatio)}) weren't caused by a store action`,
    evidence: topComponents.map(({ name, count }) => `${name} ×${count}`).join(', '),
    suggestion:
      'Check local state, context, timers and event handlers. '
      + 'Look for effects that trigger unnecessary state updates.'
  });
};

/**
 * Find selectors that are recreated too often or rarely reuse cached results.
 */
const analyzeSelectors = (snapshot, thresholds, insights) => {
  const t = thresholds;

  for (const selector of snapshot.selectors) {
    const { name, count, instances, hitRate, recomputes } = selector;

    if (count < t.minCalls) continue;

    const creationRatio = instances / count;

    if (creationRatio >= t.selectorRebuilt) {
      addInsight(insights, {
        id: `selector-rebuilt/${name}`,
        severity: 'high',
        impact: instances,
        subject: name,
        title: `${name} is created ${instances}× for ${count} calls`,
        evidence: `hit rate ${formatPercent(hitRate)}`,
        suggestion:
          'This selector may be recreated during render, losing its cache. '
          + 'Create it once per component with useMemo.'
      });

      continue;
    }

    if (hitRate >= t.selectorMiss) continue;

    addInsight(insights, {
      id: `selector-miss/${name}`,
      severity: 'medium',
      impact: recomputes,
      subject: name,
      title: `${name} recomputes on ${formatPercent(1 - hitRate)} of calls`,
      evidence: `${recomputes} recomputes of ${count} calls`,
      suggestion:
        'Check whether an input selector returns a new object or array reference on each call.'
    });
  }
};

/**
 * Find frequently called or expensive functions.
 */
const analyzeFunctions = (snapshot, thresholds, insights) => {
  const t = thresholds;
  const dispatchCount = snapshot.totals.dispatches;

  for (const fn of snapshot.fns) {
    const { name, count, total, max } = fn;

    if (count < t.minCalls) continue;

    const callsPerDispatch
      = dispatchCount >= t.minDispatches ? count / dispatchCount : 0;

    const isCalledFrequently = callsPerDispatch >= t.callsPerDispatch;
    const isExpensive = total >= t.hotFnTotalMs;

    if (!isCalledFrequently && !isExpensive) continue;

    addInsight(insights, {
      id: `hot-fn/${name}`,
      severity: isExpensive ? 'high' : 'medium',
      impact: total,
      subject: name,
      title: isCalledFrequently
        ? `${name} runs ${Math.round(callsPerDispatch)}× per dispatch`
        : `${name} took ${formatMs(total)} ms in total`,
      evidence: `${count} calls, ${formatMs(total)} ms, max ${formatMs(max)} ms`,
      suggestion:
        'Consider caching repeated work or moving unnecessary calls '
        + 'out of renders and selectors.'
    });
  }
};

/**
 * Check whether middleware accounts for most dispatch time.
 */
const analyzeMiddleware = (snapshot, thresholds, insights) => {
  const { total, overhead } = snapshot.dispatches.reduce(
    (result, dispatch) => ({
      total: result.total + dispatch.total,
      overhead: result.overhead + dispatch.overhead
    }),
    { total: 0, overhead: 0 }
  );

  if (total < 20) return;

  const overheadRatio = overhead / total;
  if (overheadRatio < thresholds.devOverhead) return;

  addInsight(insights, {
    id: 'dev-overhead',
    severity: 'info',
    impact: overhead,
    subject: 'middleware',
    title: `Middleware is ${formatPercent(overheadRatio)} of dispatch time`,
    evidence: `${formatMs(overhead)} ms of ${formatMs(total)} ms`,
    suggestion:
      'Development middleware may account for this overhead. '
      + 'Measure in production before optimising reducers.'
  });
};

/**
 * Return potential performance problems, sorted by severity and impact.
 */
export const getInsights = (snapshot, thresholds = THRESHOLDS) => {
  if (!snapshot) return [];

  const insights = [];

  analyzeDispatches(snapshot, thresholds, insights);
  analyzeFanOut(snapshot, thresholds, insights);
  analyzeRenders(snapshot, thresholds, insights);
  analyzeSelectors(snapshot, thresholds, insights);
  analyzeFunctions(snapshot, thresholds, insights);
  analyzeMiddleware(snapshot, thresholds, insights);

  return insights.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      || b.impact - a.impact
  );
};

/**
 * Return baseline insights that are no longer present in the current run.
 */
export const getResolvedInsights = (current, baseline) => {
  const currentIds = new Set(current.map(({ id }) => id));

  return baseline.filter(({ id }) => !currentIds.has(id));
};
