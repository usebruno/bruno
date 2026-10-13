import { getInsights, getResolvedInsights } from 'utils/profiler/insights';
import { NO_ACTION } from 'utils/profiler';

const snapshot = (overrides = {}) => ({
  totals: { dispatches: 10, renders: 0, unattributedRenders: 0, ...(overrides.totals || {}) },
  dispatches: overrides.dispatches || [],
  renders: overrides.renders || [],
  selectors: overrides.selectors || [],
  fns: overrides.fns || []
});

const dispatch = (o) => ({ name: 'a', count: 10, total: 5, mean: 0.5, max: 1, inner: 4, overhead: 1, renders: 0, rendersPerDispatch: 0, topComponents: [], ...o });
const render = (o) => ({ name: 'C', count: 40, total: 4, mean: 0.1, max: 0.2, mounts: 0, compared: 40, sameProps: 0, propChanges: [], actionTypes: 1, topActions: [], ...o });
const ids = (s) => getInsights(s).map((i) => i.id);

describe('profiler insights', () => {
  it('flags nothing on an empty or healthy snapshot', () => {
    expect(getInsights(null)).toEqual([]);
    expect(getInsights(snapshot({ dispatches: [dispatch()], renders: [render()] }))).toEqual([]);
  });

  it('flags render storms and grades them', () => {
    const s = snapshot({ dispatches: [dispatch({ rendersPerDispatch: 60, renders: 600, topComponents: [{ component: 'Row', count: 500 }] })] });
    const [i] = getInsights(s);
    expect(i.id).toBe('render-storm/a');
    expect(i.severity).toBe('high');
    expect(i.evidence).toContain('Row ×500');
  });

  it('does not judge an action with too few dispatches', () => {
    expect(ids(snapshot({ dispatches: [dispatch({ count: 1, rendersPerDispatch: 99 })] }))).toEqual([]);
  });

  it('flags slow dispatches and attributes them to middleware or reducer', () => {
    const dev = getInsights(snapshot({ dispatches: [dispatch({ max: 30, total: 100, overhead: 80, inner: 20 })] }))
      .find((i) => i.id === 'slow-dispatch/a');
    expect(dev.severity).toBe('high');
    expect(dev.suggestion).toMatch(/middleware/);
    const reducer = getInsights(snapshot({ dispatches: [dispatch({ max: 30, total: 100, overhead: 5, inner: 95 })] }))
      .find((i) => i.id === 'slow-dispatch/a');
    expect(reducer.suggestion).toMatch(/reducer/);
  });

  it('flags renders with identical props', () => {
    expect(ids(snapshot({ renders: [render({ sameProps: 30 })] }))).toContain('same-props/C');
    expect(ids(snapshot({ renders: [render({ sameProps: 5 })] }))).not.toContain('same-props/C');
  });

  it('flags props that change identity on almost every render, with a callback-specific hint', () => {
    const s = snapshot({ renders: [render({ propChanges: [{ prop: 'collection', count: 38 }, { prop: 'onClose', count: 40 }, { prop: 'depth', count: 2 }] })] });
    const found = getInsights(s).filter((i) => i.id.startsWith('unstable-prop/'));
    expect(found.map((i) => i.subject).sort()).toEqual(['C.collection', 'C.onClose']);
    expect(found.find((i) => i.subject === 'C.onClose').suggestion).toMatch(/useCallback/);
    expect(found.find((i) => i.subject === 'C.collection').suggestion).not.toMatch(/useCallback/);
  });

  it('flags components that react to many action types', () => {
    expect(ids(snapshot({ renders: [render({ actionTypes: 8 })] }))).toContain('many-actions/C');
  });

  it('flags renders that no action explains', () => {
    const s = snapshot({
      totals: { renders: 50, unattributedRenders: 30 },
      renders: [render({ count: 50, topActions: [{ action: NO_ACTION, count: 30 }] })]
    });
    const i = getInsights(s).find((x) => x.id === 'unattributed-renders');
    expect(i.evidence).toContain('C ×30');
  });

  it('tells a selector rebuilt per render apart from one whose inputs churn', () => {
    const rebuilt = { name: 's', count: 100, recomputes: 100, hitRate: 0, instances: 100, total: 1 };
    const missing = { name: 's', count: 100, recomputes: 80, hitRate: 0.2, instances: 1, total: 1 };
    expect(ids(snapshot({ selectors: [rebuilt] }))).toEqual(['selector-rebuilt/s']);
    expect(ids(snapshot({ selectors: [missing] }))).toEqual(['selector-miss/s']);
  });

  it('flags helpers called many times per dispatch', () => {
    const s = snapshot({ fns: [{ name: 'findItemInCollection', count: 400, total: 3, mean: 0.01, max: 0.1 }] });
    expect(getInsights(s)[0].title).toMatch(/40× per dispatch/);
  });

  it('notes when middleware dominates dispatch time', () => {
    const s = snapshot({ dispatches: [dispatch({ total: 100, overhead: 90, inner: 10, max: 2, mean: 1 })] });
    expect(ids(s)).toContain('dev-overhead');
  });

  it('flags every mounted instance re-rendering on one action, even from one dispatch', () => {
    const s = snapshot({
      renders: [render({
        name: 'CollectionRow',
        count: 6,
        mounted: 6,
        compared: 5,
        sameProps: 5,
        topActions: [{ action: 'collections/requestUrlChanged', count: 6, perDispatch: 6 }]
      })]
    });
    const i = getInsights(s).find((x) => x.id.startsWith('fan-out/'));
    expect(i.title).toBe('Every mounted CollectionRow (6) re-renders on each collections/requestUrlChanged');
    expect(i.evidence).toContain('over 1 dispatch');
    expect(i.severity).toBe('medium');
  });

  it('does not call it fan-out when only the edited instance renders', () => {
    const s = snapshot({
      renders: [render({ name: 'Row', count: 3, mounted: 20, topActions: [{ action: 'x', count: 3, perDispatch: 1 }] })]
    });
    expect(ids(s).filter((id) => id.startsWith('fan-out/'))).toEqual([]);
  });

  it('ranks by severity, then impact', () => {
    const s = snapshot({
      renders: [render({ actionTypes: 9 })],
      selectors: [{ name: 's', count: 100, recomputes: 100, hitRate: 0, instances: 100, total: 1 }]
    });
    expect(getInsights(s).map((i) => i.severity)).toEqual(['high', 'info']);
  });

  it('lists what a change resolved', () => {
    const before = getInsights(snapshot({ renders: [render({ sameProps: 30 })] }));
    const after = getInsights(snapshot({ renders: [render()] }));
    expect(getResolvedInsights(after, before).map((i) => i.id)).toEqual(['same-props/C']);
  });

  it('tolerates baselines exported before props were tracked', () => {
    const old = { name: 'C', count: 40, total: 1, mean: 0, max: 0 };
    expect(() => getInsights(snapshot({ renders: [old] }))).not.toThrow();
  });
});
