import { QueryClient } from '@tanstack/react-query';
import { SQLITE_QUERY_KEY } from '../../src/shared/ipc';

jest.doMock('../../src/generated/web/statements', () => ({
  statementTables: {
    getUsers: ['users'],
    getUserPosts: ['users', 'posts'],
    getComments: ['comments']
  }
}));

const { intersectsTablesPredicate } = require('../../src/web/tables');

const isInvalidated = (client: QueryClient, queryKey: unknown[]) =>
  client.getQueryState(queryKey)?.isInvalidated ?? false;

// Mirrors what SQLiteProvider does when it receives a mutation broadcast:
// invalidate every cached read whose tables intersect the changed tables.
const broadcast = (client: QueryClient, tables: string[]) =>
  client.invalidateQueries({ predicate: intersectsTablesPredicate(tables) });

describe('mutation broadcast invalidation', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient();
    client.setQueryData([SQLITE_QUERY_KEY, 'getUsers', {}], []);
    client.setQueryData([SQLITE_QUERY_KEY, 'getUserPosts', { userId: 1 }], []);
    client.setQueryData([SQLITE_QUERY_KEY, 'getComments', {}], []);
    client.setQueryData(['unrelated-cache', 'users'], []);
  });

  it('invalidates only the reads that depend on the changed table', async () => {
    await broadcast(client, ['users']);

    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUsers', {}])).toBe(true);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUserPosts', { userId: 1 }])).toBe(true);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getComments', {}])).toBe(false);
  });

  it('leaves non-sqlite queries untouched', async () => {
    await broadcast(client, ['users']);
    expect(isInvalidated(client, ['unrelated-cache', 'users'])).toBe(false);
  });

  it('invalidates every params variant of an affected read', async () => {
    client.setQueryData([SQLITE_QUERY_KEY, 'getUserPosts', { userId: 2 }], []);
    await broadcast(client, ['posts']);

    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUserPosts', { userId: 1 }])).toBe(true);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUserPosts', { userId: 2 }])).toBe(true);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUsers', {}])).toBe(false);
  });

  it('invalidates nothing when the change touches no read', async () => {
    await broadcast(client, ['sessions']);

    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUsers', {}])).toBe(false);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getUserPosts', { userId: 1 }])).toBe(false);
    expect(isInvalidated(client, [SQLITE_QUERY_KEY, 'getComments', {}])).toBe(false);
  });
});
