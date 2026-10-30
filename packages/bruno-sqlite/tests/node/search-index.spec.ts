import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/node/index';

type Statements = ReturnType<typeof createDatabase>['statements'];

describe('search_index statements', () => {
  let db: ReturnType<typeof createDatabase>['db'];
  let statements: Statements;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-si-'));
    ({ db, statements } = createDatabase(path.join(dir, 'bruno.db')));
  });

  afterEach(() => {
    db.close();
  });

  const upsertRequest = (entry: { collection_path: string; collection_name: string; request_path: string; [key: string]: unknown }) =>
    statements.execute('search_index_upsert_entry', {
      folder_path: null,
      folder_name: null,
      request_name: entry.request_path,
      request_type: 'GET',
      request_url: '/x',
      request_protocol: 'http-request',
      request_seq: 1,
      request_error: null,
      mtime: 1n,
      hash: `${entry.request_path}-hash`,
      ...entry
    }) as { changes: number };

  const count = (like: string, collectionPath: string) =>
    Number((statements.execute('search_index_count_requests_in_collection', { like, collection_path: collectionPath }) as { total: bigint }).total);

  it('does not replace a newer row with an older mtime', () => {
    const collectionPath = '/collections/demo';
    upsertRequest({ collection_path: collectionPath, collection_name: 'Demo', request_path: 'newer.bru', request_name: 'Newer', mtime: 200n });
    const stale = upsertRequest({ collection_path: collectionPath, collection_name: 'Demo', request_path: 'newer.bru', request_name: 'Stale', mtime: 100n });

    const rows = statements.execute('search_index_rows_for_collection', { collection_path: collectionPath }) as Array<{ requestName: string }>;
    expect(stale.changes).toBe(0);
    expect(rows[0].requestName).toBe('Newer');
  });

  it('matches requests when the term matches collection_name only', () => {
    const matchPath = '/collections/unique-widget-api';
    const otherPath = '/collections/other-stuff';
    upsertRequest({ collection_path: matchPath, collection_name: 'UniqueWidgetAPI', request_path: 'ping.bru', request_name: 'ping' });
    upsertRequest({ collection_path: otherPath, collection_name: 'OtherStuff', request_path: 'health.bru', request_name: 'health' });

    expect(count('%Widget%', matchPath)).toBe(1);
    expect(count('%Widget%', otherPath)).toBe(0);
  });

  it('treats escaped % and _ as literal characters', () => {
    const matchPath = '/collections/metrics';
    upsertRequest({ collection_path: matchPath, collection_name: 'Metrics', request_path: 'score.bru', request_url: '/api/100%_done' });
    upsertRequest({ collection_path: '/collections/other', collection_name: 'Other', request_path: 'wildcard.bru', request_url: '/api/100X_done' });

    expect(count('%100\\%\\_done%', matchPath)).toBe(1);
    expect(count('%100\\%\\_done%', '/collections/other')).toBe(0);
  });
});
