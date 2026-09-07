import { SQLITE_QUERY_KEY } from '../../src/shared/ipc';

jest.doMock('../../src/generated/web/statements', () => ({
  statementTables: {
    getUsers: ['users'],
    getUserPosts: ['users', 'posts'],
    getComments: ['comments']
  }
}));

const { intersectsTablesPredicate } = require('../../src/web/tables');

const query = (...queryKey: unknown[]) => ({ queryKey });

describe('intersectsTablesPredicate', () => {
  it('matches a sqlite read whose statement reads a changed table', () => {
    const predicate = intersectsTablesPredicate(['users']);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUsers', {}))).toBe(true);
  });

  it('matches when only one of several changed tables overlaps', () => {
    const predicate = intersectsTablesPredicate(['posts']);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUserPosts', {}))).toBe(true);
  });

  it('does not match a sqlite read whose tables are disjoint from the change', () => {
    const predicate = intersectsTablesPredicate(['users']);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getComments', {}))).toBe(false);
  });

  it('ignores queries that are not sqlite reads, even if the name would match', () => {
    const predicate = intersectsTablesPredicate(['users']);
    expect(predicate(query('other-cache', 'getUsers', {}))).toBe(false);
  });

  it('does not match an unknown statement name', () => {
    const predicate = intersectsTablesPredicate(['users']);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUnknown', {}))).toBe(false);
  });

  it('never matches when nothing changed', () => {
    const predicate = intersectsTablesPredicate([]);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUsers', {}))).toBe(false);
  });

  it('matches regardless of the params carried in the query key', () => {
    const predicate = intersectsTablesPredicate(['users']);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUsers', { id: 1 }))).toBe(true);
    expect(predicate(query(SQLITE_QUERY_KEY, 'getUsers', { id: 2 }))).toBe(true);
  });
});
