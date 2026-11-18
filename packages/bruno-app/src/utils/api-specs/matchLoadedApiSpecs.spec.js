import { matchLoadedApiSpecs } from './matchLoadedApiSpecs';

const loaded = (pathname, extra = {}) => ({ uid: pathname, pathname, ...extra });

describe('matchLoadedApiSpecs', () => {
  it('matches workspace specs to loaded specs by identical path (macOS/Linux)', () => {
    const ws = [{ name: 'a', path: '/Users/me/ws/a.yaml' }];
    const all = [loaded('/Users/me/ws/a.yaml'), loaded('/Users/me/ws/other.yaml')];
    expect(matchLoadedApiSpecs(ws, all)).toEqual([loaded('/Users/me/ws/a.yaml', { name: 'a' })]);
  });

  it('shows the workspace entry name over the name from the spec file', () => {
    const ws = [{ name: 'Orders (internal)', path: '/ws/a.yaml' }];
    const all = [loaded('/ws/a.yaml', { name: 'Orders API' })];
    expect(matchLoadedApiSpecs(ws, all)[0].name).toBe('Orders (internal)');
  });

  it('falls back to the name from the spec file when the entry has none', () => {
    const ws = [{ path: '/ws/a.yaml' }];
    const all = [loaded('/ws/a.yaml', { name: 'Orders API' })];
    expect(matchLoadedApiSpecs(ws, all)[0].name).toBe('Orders API');
  });

  it('gives a clone and its source their own names even though both files share a title', () => {
    const ws = [
      { name: 'Orders API', path: '/ws/orders.yaml' },
      { name: 'Orders API copy', path: '/ws/Orders API copy.yaml' }
    ];
    const all = [
      loaded('/ws/orders.yaml', { name: 'Orders API' }),
      loaded('/ws/Orders API copy.yaml', { name: 'Orders API' })
    ];
    expect(matchLoadedApiSpecs(ws, all).map((spec) => spec.name)).toEqual(['Orders API', 'Orders API copy']);
  });

  it('leaves the loaded spec in the store untouched', () => {
    const spec = loaded('/ws/a.yaml', { name: 'Orders API' });
    matchLoadedApiSpecs([{ name: 'Renamed', path: '/ws/a.yaml' }], [spec]);
    expect(spec.name).toBe('Orders API');
  });

  it('matches when paths differ only by separator (Windows: backslash vs forward-slash)', () => {
    // workspace.yml stores forward-slash; the file watcher reports native backslash.
    const ws = [{ name: 'a', path: 'C:/Users/qa/Downloads/test.yaml' }];
    const all = [loaded('C:\\Users\\qa\\Downloads\\test.yaml')];
    const result = matchLoadedApiSpecs(ws, all);
    expect(result).toHaveLength(1);
    expect(result[0].pathname).toBe('C:\\Users\\qa\\Downloads\\test.yaml');
  });

  it('matches mixed separators within a single path', () => {
    const ws = [{ name: 'a', path: 'C:/ws/sub/a.yaml' }];
    const all = [loaded('C:\\ws/sub\\a.yaml')];
    expect(matchLoadedApiSpecs(ws, all)).toHaveLength(1);
  });

  it('preserves workspace order and drops entries with no loaded counterpart', () => {
    const ws = [
      { name: 'a', path: 'C:/ws/a.yaml' },
      { name: 'missing', path: 'C:/ws/missing.yaml' },
      { name: 'b', path: 'C:/ws/b.yaml' }
    ];
    const all = [loaded('C:\\ws\\b.yaml'), loaded('C:\\ws\\a.yaml')];
    const result = matchLoadedApiSpecs(ws, all);
    expect(result.map((s) => s.pathname)).toEqual(['C:\\ws\\a.yaml', 'C:\\ws\\b.yaml']);
  });

  it('does not match entries with a missing/empty path (no empty-string false positive)', () => {
    const ws = [{ name: 'noPath' }, { name: 'emptyPath', path: '' }];
    const all = [loaded(undefined), loaded('')];
    expect(matchLoadedApiSpecs(ws, all)).toEqual([]);
  });

  it('returns [] when workspaceApiSpecs is not an array', () => {
    expect(matchLoadedApiSpecs(undefined, [])).toEqual([]);
    expect(matchLoadedApiSpecs({ broken: 'map' }, [])).toEqual([]);
    expect(matchLoadedApiSpecs('string', [])).toEqual([]);
  });

  it('returns [] when there are no loaded specs', () => {
    const ws = [{ name: 'a', path: 'C:/ws/a.yaml' }];
    expect(matchLoadedApiSpecs(ws, [])).toEqual([]);
    expect(matchLoadedApiSpecs(ws, undefined)).toEqual([]);
  });
});
