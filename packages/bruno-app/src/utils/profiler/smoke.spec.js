import {
  profiled,
  profiledSelector,
  setProfilerEnabled,
  resetProfiler,
  getProfilerSnapshot,
  recordDispatch,
  beginDispatch,
  endDispatch,
  recordRender,
  instanceMounted,
  instanceUnmounted,
  measureStateSize,
  buildExport,
  parseExport
} from 'utils/profiler';
import { createSelector } from '@reduxjs/toolkit';
import { findItemInCollection, flattenItems } from 'utils/collections';

describe('profiler', () => {
  beforeEach(() => {
    setProfilerEnabled(false);
    resetProfiler();
  });

  afterAll(() => setProfilerEnabled(false));

  it('is a no-op when off and records helpers when on', () => {
    const col = { uid: 'c', items: [{ uid: 'f', type: 'folder', items: [{ uid: 'r1', type: 'http-request', request: {} }] }] };
    findItemInCollection(col, 'r1');
    recordRender('X', 1);
    expect(getProfilerSnapshot().fns.length).toBe(0);
    expect(getProfilerSnapshot().renders.length).toBe(0);

    setProfilerEnabled(true);
    expect(findItemInCollection(col, 'r1').uid).toBe('r1');
    expect(flattenItems(col.items).length).toBe(2);
    recordDispatch('collections/updateRequestBody', 1.5);
    const s = getProfilerSnapshot();
    expect(s.fns.find((f) => f.name === 'findItemInCollection').count).toBe(1);
    expect(s.dispatches[0].name).toBe('collections/updateRequestBody');
    expect(s.totals.dispatches).toBe(1);

    const size = measureStateSize({ collections: { collections: [col] }, tabs: { tabs: [{}, {}] } });
    expect(size.requests).toBe(1);
    expect(size.folders).toBe(1);
    expect(size.openTabs).toBe(2);
  });

  it('records why a component rendered when given props', () => {
    setProfilerEnabled(true);
    recordRender('C', 1, { changedProps: null, isMount: true });
    recordRender('C', 1, { changedProps: [] });
    recordRender('C', 1, { changedProps: ['item'] });
    recordRender('C', 1, { changedProps: ['item', 'onClick'] });
    const r = getProfilerSnapshot().renders.find((x) => x.name === 'C');
    expect(r.count).toBe(4);
    expect(r.mounts).toBe(1);
    expect(r.compared).toBe(3);
    expect(r.sameProps).toBe(1);
    expect(r.propChanges).toEqual([{ prop: 'item', count: 2 }, { prop: 'onClick', count: 1 }]);
    expect(r.topActions[0].action).toBe('(no action)');
  });

  it('attributes renders to the last top-level action until the next macrotask', () => {
    jest.useFakeTimers();
    setProfilerEnabled(true);
    beginDispatch('a/one');
    endDispatch('a/one', 1);
    recordRender('Row', 0.5);
    recordRender('Row', 0.5);
    recordRender('Panel', 2);
    jest.runAllTimers();
    recordRender('Row', 0.5); // after the timeout: no action

    const s = getProfilerSnapshot();
    const d = s.dispatches.find((r) => r.name === 'a/one');
    expect(d.renders).toBe(3);
    expect(d.rendersPerDispatch).toBe(3);
    expect(d.topComponents[0]).toEqual({ component: 'Row', count: 2 });
    expect(s.totals.renders).toBe(4);
    expect(s.totals.unattributedRenders).toBe(1);
    expect(s.totals.rendersPerDispatch).toBe(3);
    jest.useRealTimers();
  });

  it('tracks mounted instances and which of them rendered', () => {
    jest.useFakeTimers();
    instanceMounted('Row');
    instanceMounted('Row');
    instanceMounted('Row');
    setProfilerEnabled(true);
    beginDispatch('edit');
    endDispatch('edit', 1);
    recordRender('Row', 1, { instanceId: 1 });
    recordRender('Row', 1, { instanceId: 2 });
    recordRender('Row', 1, { instanceId: 3 });
    jest.runAllTimers();
    instanceUnmounted('Row');
    const r = getProfilerSnapshot().renders.find((x) => x.name === 'Row');
    expect(r.instancesRendered).toBe(3);
    expect(r.mounted).toBe(2);
    expect(r.topActions[0]).toEqual({ action: 'edit', count: 3, perDispatch: 3 });
    instanceUnmounted('Row');
    instanceUnmounted('Row');
    jest.useRealTimers();
  });

  it('counts nested dispatches in the table but not in the top-level totals', () => {
    setProfilerEnabled(true);
    beginDispatch('outer');
    beginDispatch('inner');
    endDispatch('inner', 1);
    endDispatch('outer', 3);
    const s = getProfilerSnapshot();
    expect(s.totals.dispatches).toBe(1);
    expect(s.totals.dispatchMs).toBe(3);
    expect(s.dispatches.map((r) => r.name).sort()).toEqual(['inner', 'outer']);
  });

  it('counts selector calls, recomputes and instances', () => {
    setProfilerEnabled(true);
    const make = () => profiledSelector('sel', createSelector([(s) => s.a], (a) => ({ a })));
    const sel = make();
    const state = { a: 1 };
    sel(state);
    sel(state);
    sel({ a: 2 });
    make(); // a second instance, as a component building its selector per render would
    const row = getProfilerSnapshot().selectors.find((r) => r.name === 'sel');
    expect(row.count).toBe(3);
    expect(row.recomputes).toBe(2);
    expect(row.instances).toBe(2);
    expect(row.hitRate).toBeCloseTo(1 / 3);
  });

  it('freezes the clock on stop and zeroes it on reset', () => {
    const now = jest.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    setProfilerEnabled(true);
    now.mockReturnValue(3000);
    setProfilerEnabled(false);
    now.mockReturnValue(9000);
    expect(getProfilerSnapshot().elapsedMs).toBe(2000);
    resetProfiler();
    expect(getProfilerSnapshot().elapsedMs).toBe(0);
    now.mockRestore();
  });

  it('round-trips an export', () => {
    setProfilerEnabled(true);
    recordDispatch('x', 1);
    profiled('f', () => 1)();
    const data = parseExport(JSON.stringify(buildExport({ scenario: 'S1', label: 'main' })));
    expect(data.meta.scenario).toBe('S1');
    expect(data.snapshot.totals.dispatches).toBe(1);
    expect(data.snapshot.recent).toBeUndefined();
    expect(() => parseExport('{"schema":"other"}')).toThrow();
  });
});
