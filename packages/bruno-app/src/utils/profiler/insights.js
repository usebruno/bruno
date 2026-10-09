import { NO_ACTION } from './index';

/**
 * Turns a profiler snapshot into a ranked list of things that look like wasted work.
 */

export const THRESHOLDS = {
  minDispatches: 3, // an action needs this many dispatches before it is judged
  minRenders: 10, // a component needs this many renders before it is judged
  minCalls: 20, // a selector/function needs this many calls before it is judged
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
  fanOutMinMounted: 3, // a list needs this many mounted instances to count as fan-out
  fanOutShare: 0.8, // share of mounted instances re-rendering per dispatch
  fanOutHighMounted: 10
};

const SEVERITY_RANK = { high: 0, medium: 1, info: 2 };

const pct = (v) => `${Math.round(v * 100)}%`;
const ms = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
const isCallbackName = (prop) => /^(on|handle)[A-Z]/.test(prop) || /Callback$|Handler$/.test(prop);

const actionRules = (snapshot, t, out) => {
  snapshot.dispatches.forEach((d) => {
    if (d.count >= t.minDispatches && d.rendersPerDispatch >= t.rendersPerDispatchMedium) {
      out.push({
        id: `render-storm/${d.name}`,
        severity: d.rendersPerDispatch >= t.rendersPerDispatchHigh ? 'high' : 'medium',
        impact: d.renders,
        subject: d.name,
        title: `${d.name} re-renders ${Math.round(d.rendersPerDispatch)} components per dispatch`,
        evidence: d.topComponents.map((c) => `${c.component} ×${c.count}`).join(', '),
        suggestion:
          'Check which of these actually display what this action changed. The rest are subscribed to more '
          + 'than they render, narrow their useSelector to the item or field they use.'
      });
    }

    if (d.max >= t.frameMs || (d.count >= t.minDispatches && d.mean >= t.slowMeanMs)) {
      out.push({
        id: `slow-dispatch/${d.name}`,
        severity: d.max >= t.frameMs ? 'high' : 'medium',
        impact: d.total,
        subject: d.name,
        title: d.max >= t.frameMs
          ? `${d.name} took ${ms(d.max)} ms in one dispatch, a whole frame on its own`
          : `${d.name} averages ${ms(d.mean)} ms per dispatch`,
        evidence: `reducer ${ms(d.inner)} ms of ${ms(d.total)} ms total over ${d.count} dispatches`,
        suggestion: d.total > 0 && d.overhead / d.total >= t.devOverhead
          ? 'Most of it is middleware, not the reducer, confirm in a production build before optimising.'
          : 'The reducer is the cost: look for whole-tree walks (flattenItems, find…) inside it.'
      });
    }
  });
};

const fanOutRules = (snapshot, t, out) => {
  snapshot.renders.forEach((r) => {
    if (!r.mounted || r.mounted < t.fanOutMinMounted) return;
    (r.topActions || []).forEach((a) => {
      if (!a.perDispatch || a.perDispatch < r.mounted * t.fanOutShare) return;
      const all = Math.round(a.perDispatch) >= r.mounted;
      out.push({
        id: `fan-out/${r.name}/${a.action}`,
        severity: r.mounted >= t.fanOutHighMounted ? 'high' : 'medium',
        impact: a.count,
        subject: r.name,
        title: all
          ? `Every mounted ${r.name} (${r.mounted}) re-renders on each ${a.action}`
          : `${Math.round(a.perDispatch)} of ${r.mounted} mounted ${r.name} re-render on each ${a.action}`,
        evidence: `${a.count} renders over ${Math.round(a.count / a.perDispatch)} dispatch(es)`
          + (r.compared ? `; ${r.sameProps} of ${r.compared} with identical props` : ''),
        suggestion:
          'One action should wake only the instance it concerns. Each instance is subscribed to something shared '
          + '(the whole collection or collections array), select only this instance\'s own data.'
      });
    });
  });
};

const renderRules = (snapshot, t, out) => {
  snapshot.renders.forEach((r) => {
    if (r.count < t.minRenders) return;

    if (r.compared >= t.minRenders) {
      const sameShare = r.sameProps / r.compared;
      if (sameShare >= t.samePropsMedium) {
        out.push({
          id: `same-props/${r.name}`,
          severity: sameShare >= t.samePropsHigh && r.count >= 50 ? 'high' : 'medium',
          impact: r.sameProps,
          subject: r.name,
          title: `${r.name} re-rendered with identical props ${r.sameProps}× (${pct(sameShare)} of renders)`,
          evidence: `triggered by ${(r.topActions || []).map((a) => `${a.action} ×${a.count}`).join(', ')}`,
          suggestion:
            'None of its props changed, so the render came from its own useSelector, a context or its parent. '
            + 'A store subscription → select a narrower value. A parent re-render → React.memo would skip it.'
        });
      }

      (r.propChanges || []).forEach(({ prop, count }) => {
        const share = count / r.compared;
        if (share < t.unstableProp) return;
        out.push({
          id: `unstable-prop/${r.name}/${prop}`,
          severity: 'medium',
          impact: count,
          subject: `${r.name}.${prop}`,
          title: `${r.name} gets a new \`${prop}\` on ${pct(share)} of renders`,
          evidence: `${count} of ${r.compared} compared renders`,
          suggestion: isCallbackName(prop)
            ? 'Looks like a callback recreated on every parent render, wrap it in useCallback where it is defined.'
            : 'The value is rebuilt upstream every render (a new object or array, or a whole-collection '
              + 'subscription). Memoise it where it is created, or pass the smaller value this component uses.'
        });
      });
    }

    if (r.actionTypes >= t.manyActionTypes) {
      out.push({
        id: `many-actions/${r.name}`,
        severity: 'info',
        impact: r.count,
        subject: r.name,
        title: `${r.name} re-renders for ${r.actionTypes} different action types`,
        evidence: (r.topActions || []).map((a) => `${a.action} ×${a.count}`).join(', '),
        suggestion: 'A component that reacts to that many kinds of change usually subscribes to a broad slice.'
      });
    }
  });

  const { renders: total, unattributedRenders } = snapshot.totals;
  if (unattributedRenders >= 20 && total > 0 && unattributedRenders / total >= t.unattributedShare) {
    const offenders = snapshot.renders
      .map((r) => ({ name: r.name, n: (r.topActions || []).find((a) => a.action === NO_ACTION)?.count || 0 }))
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
    out.push({
      id: 'unattributed-renders',
      severity: 'medium',
      impact: unattributedRenders,
      subject: 'renders without an action',
      title: `${unattributedRenders} renders (${pct(unattributedRenders / total)}) weren't caused by a store action`,
      evidence: offenders.map((o) => `${o.name} ×${o.n}`).join(', '),
      suggestion: 'These come from local state, timers, context or resize/scroll handlers, check for effects that set state on every render.'
    });
  }
};

const selectorRules = (snapshot, t, out) => {
  snapshot.selectors.forEach((s) => {
    if (s.count < t.minCalls) return;
    if (s.instances / s.count >= t.selectorRebuilt) {
      out.push({
        id: `selector-rebuilt/${s.name}`,
        severity: 'high',
        impact: s.instances,
        subject: s.name,
        title: `${s.name} is created ${s.instances}× for ${s.count} calls`,
        evidence: `hit rate ${pct(s.hitRate)}`,
        suggestion: 'The selector is built during render, so its cache is thrown away each time. Create it once per component with useMemo.'
      });
    } else if (s.hitRate < t.selectorMiss) {
      out.push({
        id: `selector-miss/${s.name}`,
        severity: 'medium',
        impact: s.recomputes,
        subject: s.name,
        title: `${s.name} recomputes on ${pct(1 - s.hitRate)} of calls`,
        evidence: `${s.recomputes} recomputes of ${s.count} calls`,
        suggestion: 'One of its input selectors returns a new reference on most calls, memoisation is not holding.'
      });
    }
  });
};

const functionRules = (snapshot, t, out) => {
  const dispatches = snapshot.totals.dispatches;
  snapshot.fns.forEach((f) => {
    const perDispatch = dispatches >= t.minDispatches ? f.count / dispatches : 0;
    if (f.count >= t.minCalls && (perDispatch >= t.callsPerDispatch || f.total >= t.hotFnTotalMs)) {
      out.push({
        id: `hot-fn/${f.name}`,
        severity: f.total >= t.hotFnTotalMs ? 'high' : 'medium',
        impact: f.total,
        subject: f.name,
        title: perDispatch >= t.callsPerDispatch
          ? `${f.name} runs ${Math.round(perDispatch)}× per dispatch`
          : `${f.name} took ${ms(f.total)} ms in total`,
        evidence: `${f.count} calls, ${ms(f.total)} ms, max ${ms(f.max)} ms`,
        suggestion: 'Called far more often than anything changes. Cache the result, or move the call out of render/selectors into an event handler.'
      });
    }
  });
};

const overheadRule = (snapshot, t, out) => {
  const total = snapshot.dispatches.reduce((s, d) => s + d.total, 0);
  const overhead = snapshot.dispatches.reduce((s, d) => s + d.overhead, 0);
  if (total >= 20 && overhead / total >= t.devOverhead) {
    out.push({
      id: 'dev-overhead',
      severity: 'info',
      impact: overhead,
      subject: 'middleware',
      title: `Middleware is ${pct(overhead / total)} of dispatch time`,
      evidence: `${ms(overhead)} ms of ${ms(total)} ms`,
      suggestion: 'In a development build this is mostly RTK\'s immutable/serializable checks, which production builds drop. Measure in production before optimising reducers.'
    });
  }
};

export const getInsights = (snapshot, thresholds = THRESHOLDS) => {
  if (!snapshot) return [];
  const out = [];
  actionRules(snapshot, thresholds, out);
  fanOutRules(snapshot, thresholds, out);
  renderRules(snapshot, thresholds, out);
  selectorRules(snapshot, thresholds, out);
  functionRules(snapshot, thresholds, out);
  overheadRule(snapshot, thresholds, out);
  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.impact - a.impact);
};

/** Insights present in the baseline that the current run no longer triggers. */
export const getResolvedInsights = (current, baseline) => {
  const ids = new Set(current.map((i) => i.id));
  return baseline.filter((i) => !ids.has(i.id));
};
