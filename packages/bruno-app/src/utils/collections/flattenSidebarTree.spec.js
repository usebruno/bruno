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
// flattenSidebarTree returns { rows, itemsByUid, collectionsByUid }; most assertions only need rows.
const flatten = (entries, options) => flattenSidebarTree(entries, options).rows;
const kinds = (rows) => rows.map((r) => r.kind);
const names = (rows) => rows.map((r) => r.sortName);

beforeEach(() => { uid = 0; });

describe('flattenSidebarTree', () => {
  describe('ordering and depth', () => {
    it('emits collection header then folders -> apps -> requests', () => {
      const c = collection('C', [request('r1', { seq: 1 }), app('a1', { seq: 1 }), folder('f1', [], { seq: 1, collapsed: true })]);
      expect(kinds(flatten([loaded(c)]))).toEqual(['collection', 'folder', 'app', 'request']);
    });
    it('sorts requests/apps by seq, folders alphabetically', () => {
      const c = collection('C', [request('rB', { seq: 2 }), request('rA', { seq: 1 }), folder('zeta'), folder('alpha')]);
      const rows = flatten([loaded(c)]);
      expect(names(rows.filter((r) => r.kind === 'request'))).toEqual(['rA', 'rB']);
      expect(names(rows.filter((r) => r.kind === 'folder'))).toEqual(['alpha', 'zeta']);
    });
    it('stamps depth: header 0, top-level 1, nested 2', () => {
      const byName = Object.fromEntries(flatten([loaded(collection('C', [folder('f1', [request('r1')])]))]).map((r) => [r.sortName, r.depth]));
      expect(byName.C).toBe(0); expect(byName.f1).toBe(1); expect(byName.r1).toBe(2);
    });
  });

  it('drops transient items', () => {
    const c = collection('C', [request('real', { seq: 1 }), request('draft', { seq: 2, isTransient: true })]);
    expect(names(flatten([loaded(c)]).filter((r) => r.kind === 'request'))).toEqual(['real']);
  });

  describe('collapse', () => {
    it('collapsed collection = header only', () => {
      expect(kinds(flatten([loaded(collection('C', [request('r1')], { collapsed: true }))]))).toEqual(['collection']);
    });
    it('collapsed folder = row without subtree', () => {
      const rows = flatten([loaded(collection('C', [folder('f1', [request('hidden')], { collapsed: true })]))]);
      expect(kinds(rows)).toEqual(['collection', 'folder']);
      expect(names(rows)).not.toContain('hidden');
    });
  });

  describe('search', () => {
    it('includes only matching requests, force-expanded', () => {
      const c = collection('C', [folder('f1', [request('login'), request('logout')], { collapsed: true }), request('health')]);
      const r = names(flatten([loaded(c)], { searchText: 'log' }).filter((x) => x.kind === 'request'));
      expect(r).toEqual(expect.arrayContaining(['login', 'logout']));
      expect(r).not.toContain('health');
    });
    it('drops a collection with no matching request', () => {
      expect(flatten([loaded(collection('C', [request('health')]))], { searchText: 'zzz' })).toHaveLength(0);
    });
    it('includes a folder only if it has a matching descendant', () => {
      const c = collection('C', [folder('match', [request('login')]), folder('nomatch', [request('health')])]);
      expect(names(flatten([loaded(c)], { searchText: 'login' }).filter((x) => x.kind === 'folder'))).toEqual(['match']);
    });
    it('hides apps and empty-cta while searching', () => {
      const k = kinds(flatten([loaded(collection('C', [app('a'), request('login')]))], { searchText: 'login' }));
      expect(k).not.toContain('app');
      expect(k).not.toContain('empty-cta');
    });
  });

  describe('empty-cta', () => {
    it('collection cta when mounted, empty, expanded', () => {
      const rows = flatten([loaded(collection('C', []))]);
      expect(kinds(rows)).toEqual(['collection', 'empty-cta']);
      expect(rows[1].depth).toBe(1);
      expect(rows[1].itemUid).toBeNull();
    });
    it('suppressed while loading or unmounted', () => {
      expect(kinds(flatten([loaded(collection('C', [], { isLoading: true }))]))).toEqual(['collection']);
      expect(kinds(flatten([loaded(collection('D', [], { mountStatus: 'unmounted' }))]))).toEqual(['collection']);
    });
    it('folder cta at depth+1 for an empty expanded folder', () => {
      const rows = flatten([loaded(collection('C', [folder('empty', [])]))]);
      const cta = rows.find((r) => r.kind === 'empty-cta');
      expect(cta.depth).toBe(2);
      expect(cta.itemUid).toBe(rows.find((r) => r.kind === 'folder').itemUid);
    });
  });

  it('emits a ghost row', () => {
    const rows = flatten([{ kind: 'ghost', entry: { path: '/repo/x', name: 'X' } }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'ghost', collectionPathname: '/repo/x', sortName: 'X', depth: 0 });
  });

  describe('examples', () => {
    it('emits example rows when expanded at request depth + 1', () => {
      const c = collection('C', [request('r1', { examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }, { uid: 'ex2', name: 'err' }] })]);
      const rows = flatten([loaded(c)]);
      const ex = rows.filter((r) => r.kind === 'example');
      expect(names(ex)).toEqual(['ok', 'err']);
      const reqDepth = rows.find((r) => r.kind === 'request').depth;
      expect(ex.every((r) => r.depth === reqDepth + 1)).toBe(true);
    });
    it('omits example rows when not expanded', () => {
      const c = collection('C', [request('r1', { examples: [{ uid: 'ex1', name: 'ok' }] })]);
      expect(kinds(flatten([loaded(c)]))).not.toContain('example');
    });
  });
});

describe('ancestry attributes', () => {
  it('stamps collectionId (slug) on every row of the collection', () => {
    const rows = flatten([loaded(collection('My Coll', [folder('f1', [request('r1')])]))]);
    expect(rows.every((r) => r.collectionId === 'my-coll')).toBe(true);
  });
  it('stamps parentName: folder name for a folder child, null at collection root', () => {
    const rows = flatten([loaded(collection('C', [request('top'), folder('f1', [request('nested')])]))]);
    expect(rows.find((r) => r.sortName === 'top').parentName).toBeNull();
    expect(rows.find((r) => r.sortName === 'f1').parentName).toBeNull();
    expect(rows.find((r) => r.sortName === 'nested').parentName).toBe('f1');
  });
  it('stamps collectionId + parentName on empty-cta rows', () => {
    const rootCta = flatten([loaded(collection('Empty', []))]).find((r) => r.kind === 'empty-cta');
    expect(rootCta.collectionId).toBe('empty');
    expect(rootCta.parentName).toBeNull();
    const folderCta = flatten([loaded(collection('C', [folder('f1', [])]))]).find((r) => r.kind === 'empty-cta');
    expect(folderCta.parentName).toBe('f1');
  });
});

describe('object maps', () => {
  it('itemsByUid resolves folders, apps and requests to their live objects', () => {
    const r = request('r1', { uid: 'req-x' });
    const a = app('a1', { uid: 'app-x' });
    const f = folder('f1', [r], { uid: 'fol-x' });
    const { itemsByUid } = flattenSidebarTree([loaded(collection('C', [f, a]))]);
    expect(itemsByUid.get('fol-x')).toBe(f);
    expect(itemsByUid.get('app-x')).toBe(a);
    expect(itemsByUid.get('req-x')).toBe(r);
  });
  it('collectionsByUid resolves the collection to its live object', () => {
    const c = collection('C', [], { uid: 'col-x' });
    const { collectionsByUid } = flattenSidebarTree([loaded(c)]);
    expect(collectionsByUid.get('col-x')).toBe(c);
  });
  it('does not index items hidden by a collapsed parent (not walked)', () => {
    const { itemsByUid } = flattenSidebarTree([loaded(collection('C', [folder('f1', [request('hidden', { uid: 'req-h' })], { collapsed: true })]))]);
    expect(itemsByUid.has('req-h')).toBe(false);
  });
});

describe('buildIndexes', () => {
  it('maps item uid and collection uid to row index', () => {
    const c = collection('C', [request('r1', { uid: 'req-x' })], { uid: 'col-x' });
    const rows = flatten([loaded(c)]);
    const { rowIndexByItemUid, rowIndexByCollectionUid } = buildIndexes(rows);
    expect(rows[rowIndexByItemUid.get('req-x')].kind).toBe('request');
    expect(rowIndexByCollectionUid.get('col-x')).toBe(0);
  });
  it('item-uid map targets the item row, not its example rows', () => {
    const c = collection('C', [request('r1', { uid: 'req-x', examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }] })]);
    const { rowIndexByItemUid } = buildIndexes(flatten([loaded(c)]));
    const rows = flatten([loaded(c)]);
    expect(rows[rowIndexByItemUid.get('req-x')].kind).toBe('request');
  });
  it('indexes example rows by exampleUid', () => {
    const c = collection('C', [request('r1', { uid: 'req-x', examplesExpanded: true, examples: [{ uid: 'ex1', name: 'ok' }] })]);
    const rows = flatten([loaded(c)]);
    const { rowIndexByItemUid } = buildIndexes(rows);
    expect(rows[rowIndexByItemUid.get('ex1')].kind).toBe('example');
  });
});
