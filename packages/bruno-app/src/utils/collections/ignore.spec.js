import { getCollectionRelativePath, addPathToIgnoreList } from './ignore';

describe('getCollectionRelativePath', () => {
  it('returns the folder path relative to the collection root', () => {
    expect(getCollectionRelativePath('/home/adi/my-collection', '/home/adi/my-collection/auth')).toBe('auth');
  });

  it('returns nested folder paths with forward slashes', () => {
    expect(getCollectionRelativePath('/home/adi/my-collection', '/home/adi/my-collection/v1/users')).toBe('v1/users');
  });

  it('normalizes windows-style separators to forward slashes', () => {
    expect(getCollectionRelativePath('C:\\Users\\adi\\coll', 'C:\\Users\\adi\\coll\\auth\\login')).toBe('auth/login');
  });

  it('tolerates a trailing slash on the collection path', () => {
    expect(getCollectionRelativePath('/home/adi/coll/', '/home/adi/coll/auth')).toBe('auth');
  });

  it('returns an empty string when the item is the collection root', () => {
    expect(getCollectionRelativePath('/home/adi/coll', '/home/adi/coll')).toBe('');
  });

  it('returns an empty string when inputs are missing', () => {
    expect(getCollectionRelativePath('', '/home/adi/coll/auth')).toBe('');
    expect(getCollectionRelativePath('/home/adi/coll', '')).toBe('');
  });

  it('returns an empty string when the item is not inside the collection root', () => {
    expect(getCollectionRelativePath('/home/adi/coll', '/home/adi/other/auth')).toBe('');
  });

  it('returns an empty string when a shared prefix is not a real path boundary', () => {
    expect(getCollectionRelativePath('/home/adi/coll', '/home/adi/collection/auth')).toBe('');
  });

  it('returns an empty string when the collection and item paths differ only by case', () => {
    expect(getCollectionRelativePath('/home/adi/coll', '/home/adi/COLL/auth')).toBe('');
  });
});

describe('addPathToIgnoreList', () => {
  it('appends the path to an existing ignore list', () => {
    const config = { name: 'coll', ignore: ['node_modules'] };
    expect(addPathToIgnoreList(config, 'auth').ignore).toEqual(['node_modules', 'auth']);
  });

  it('creates the ignore list when the config has none', () => {
    expect(addPathToIgnoreList({ name: 'coll' }, 'auth').ignore).toEqual(['auth']);
  });

  it('does not add duplicates', () => {
    const config = { ignore: ['auth'] };
    expect(addPathToIgnoreList(config, 'auth').ignore).toEqual(['auth']);
  });

  it('ignores empty paths', () => {
    const config = { ignore: ['auth'] };
    expect(addPathToIgnoreList(config, '').ignore).toEqual(['auth']);
  });

  it('does not mutate the original config or its ignore array', () => {
    const config = { ignore: ['node_modules'] };
    const next = addPathToIgnoreList(config, 'auth');
    expect(config.ignore).toEqual(['node_modules']);
    expect(next).not.toBe(config);
    expect(next.ignore).not.toBe(config.ignore);
  });
});
