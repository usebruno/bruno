import { flattenSidebarTree, buildIndexes } from './flattenSidebarTree';

// fixtures — request: has `request` prop + http/graphql/grpc/ws type + NO items;
// folder: no `request` prop + type 'folder'; app: type 'app'
let uid = 0;
const nextUid = (p) => `${p}-${++uid}`;
const request = (name, props = {}) => ({ uid: props.uid || nextUid('req'), name, type: 'http-request', seq: props.seq, request: {}, ...props });
const folder = (name, items = [], props = {}) => ({ uid: props.uid || nextUid('fol'), name, type: 'folder', seq: props.seq, items, ...props });
const app = (name, props = {}) => ({ uid: props.uid || nextUid('app'), name, type: 'app', seq: props.seq, ...props });
const collection = (name, items = [], props = {}) => ({ uid: props.uid || nextUid('col'), name, pathname: `/c/${name}`, mountStatus: 'mounted', isLoading: false, collapsed: false, items, ...props });
const loaded = (c) => ({ kind: 'loaded', collection: c });
const kinds = (rows) => rows.map((r) => r.kind);
const names = (rows) => rows.map((r) => r.sortName);

beforeEach(() => { uid = 0; });

describe('flattenSidebarTree', () => {
  describe('ordering and depth', () => {
    it('emits collection header then folders -> apps -> requests', () => {
      const c = collection('C', [request('r1', { seq: 1 }), app('a1', { seq: 1 }), folder('f1', [], { seq: 1, collapsed: true })]);
      expect(kinds(flattenSidebarTree([loaded(c)]))).toEqual(['collection', 'folder', 'app', 'request']);
    });
    it('sorts requests/apps by seq, folders alphabetically', () => {
      const c = collection('C', [request('rB', { seq: 2 }), request('rA', { seq: 1 }), folder('zeta'), folder('alpha')]);
      const rows = flattenSidebarTree([loaded(c)]);
      expect(names(rows.filter((r) => r.kind === 'request'))).toEqual(['rA', 'rB']);
      expect(names(rows.filter((r) => r.kind === 'folder'))).toEqual(['alpha', 'zeta']);
    });
    it('stamps depth: header 0, top-level 1, nested 2', () => {
      const byName = Object.fromEntries(flattenSidebarTree([loaded(collection('C', [folder('f1', [request('r1')])]))]).map((r) => [r.sortName, r.depth]));
      expect(byName.C).toBe(0); expect(byName.f1).toBe(1); expect(byName.r1).toBe(2);
    });
  });

  it('drops transient items', () => {
    const c = collection('C', [request('real', { seq: 1 }), request('draft', { seq: 2, isTransient: true })]);
    expect(names(flattenSidebarTree([loaded(c)]).filter((r) => r.kind === 'request'))).toEqual(['real']);
  });

  describe('collapse', () => {
    it('collapsed collection = header only', () => {
      expect(kinds(flattenSidebarTree([loaded(collection('C', [request('r1')], { collapsed: true }))]))).toEqual(['collection']);
    });
    it('collapsed folder = row without subtree', () => {
      const rows = flattenSidebarTree([loaded(collection('C', [folder('f1', [request('hidden')], { collapsed: true })]))]);
      expect(kinds(rows)).toEqual(['collection', 'folder']);
      expect(names(rows)).not.toContain('hidden');
    });
  });

  describe('search', () => {
    it('includes only matching requests, force-expanded', () => {
      const c = collection('C', [folder('f1', [request('login'), request('logout')], { collapsed: true }), request('health')]);
      const r = names(flattenSidebarTree([loaded(c)], { searchText: 'log' }).filter((x) => x.kind === 'request'));
      expect(r).toEqual(expect.arrayContaining(['login', 'logout']));
      expect(r).not.toContain('health');
    });
    it('drops a collection with no matching request', () => {
      expect(flattenSidebarTree([loaded(collection('C', [request('health')]))], { searchText: 'zzz' })).toHaveLength(0);
    });
    it('includes a folder only if it has a matching descendant', () => {
      const c = collection('C', [folder('match', [request('login')]), folder('nomatch', [request('health')])]);
      expect(names(flattenSidebarTree([loaded(c)], { searchText: 'login' }).filter((x) => x.kind === 'folder'))).toEqual(['match']);
    });
    it('hides apps and empty-cta while searching', () => {
      const k = kinds(flattenSidebarTree([loaded(collection('C', [app('a'), request('login')]))], { searchText: 'login' }));
      expect(k).not.toContain('app');
      expect(k).not.toContain('empty-cta');
    });
  });

  describe('empty-cta', () => {
    it('collection cta when mounted, empty, expanded', () => {
      const rows = flattenSidebarTree([loaded(collection('C', []))]);
      expect(kinds(rows)).toEqual(['collection', 'empty-cta']);
      expect(rows[1].depth).toBe(1);
      expect(rows[1].itemUid).toBeNull();
    });
    it('suppressed while loading or unmounted', () => {
      expect(kinds(flattenSidebarTree([loaded(collection('C', [], { isLoading: true }))]))).toEqual(['collection']);
      expect(kinds(flattenSidebarTree([loaded(collection('D', [], { mountStatus: 'unmounted' }))]))).toEqual(['collection']);
    });
    it('folder cta at depth+1 for an empty expanded folder', () => {
      const rows = flattenSidebarTree([loaded(collection('C', [folder('empty', [])]))]);
      const cta = rows.find((r) => r.kind === 'empty-cta');
      expect(cta.depth).toBe(2);
      expect(cta.itemUid).toBe(rows.find((r) => r.kind === 'folder').itemUid);
    });
  });

  it('emits a ghost row', () => {
    const rows = flattenSidebarTree([{ kind: 'ghost', entry: { path: '/repo/x', name: 'X' } }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'ghost', collectionPathname: '/repo/x', sortName: 'X', depth: 0 });
  });

  describe('examples', () => {
    it('emits example rows when expanded at request depth + 1', () => {
      const c = collection('C', [request('r1', { examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }, { uid: 'ex2', name: 'err' }] })]);
      const rows = flattenSidebarTree([loaded(c)]);
      const ex = rows.filter((r) => r.kind === 'example');
      expect(names(ex)).toEqual(['ok', 'err']);
      const reqDepth = rows.find((r) => r.kind === 'request').depth;
      expect(ex.every((r) => r.depth === reqDepth + 1)).toBe(true);
    });
    it('omits example rows when not expanded', () => {
      const c = collection('C', [request('r1', { examples: [{ uid: 'ex1', name: 'ok' }] })]);
      expect(kinds(flattenSidebarTree([loaded(c)]))).not.toContain('example');
    });
  });
});

describe('buildIndexes', () => {
  it('maps item uid and collection uid to row index', () => {
    const c = collection('C', [request('r1', { uid: 'req-x' })], { uid: 'col-x' });
    const rows = flattenSidebarTree([loaded(c)]);
    const { rowIndexByItemUid, rowIndexByCollectionUid } = buildIndexes(rows);
    expect(rows[rowIndexByItemUid.get('req-x')].kind).toBe('request');
    expect(rowIndexByCollectionUid.get('col-x')).toBe(0);
  });
  it('item-uid map targets the item row, not its example rows', () => {
    const c = collection('C', [request('r1', { uid: 'req-x', examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }] })]);
    const { rowIndexByItemUid } = buildIndexes(flattenSidebarTree([loaded(c)]));
    const rows = flattenSidebarTree([loaded(c)]);
    expect(rows[rowIndexByItemUid.get('req-x')].kind).toBe('request');
  });
  it('indexes example rows by exampleUid', () => {
    const c = collection('C', [request('r1', { uid: 'req-x', examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }] })]);
    const rows = flattenSidebarTree([loaded(c)]);
    const { rowIndexByItemUid } = buildIndexes(rows);
    expect(rows[rowIndexByItemUid.get('ex1')].kind).toBe('example');
  });
});
