import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/node/index';

describe('search_index upsert stale write guard', () => {
  it('does not replace a newer row with an older mtime', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-si-'));
    const { db, statements } = createDatabase(path.join(dir, 'bruno.db'));
    const collectionPath = '/collections/demo';

    statements.execute('search_index_upsert_entry', {
      collection_path: collectionPath,
      collection_name: 'Demo',
      folder_path: null,
      folder_name: null,
      request_path: 'newer.bru',
      request_name: 'Newer',
      request_type: 'GET',
      request_url: '/new',
      request_protocol: 'http-request',
      request_seq: 1,
      request_error: null,
      workspace_path: null,
      mtime: 200n,
      hash: 'new-hash'
    });

    const stale = statements.execute('search_index_upsert_entry', {
      collection_path: collectionPath,
      collection_name: 'Demo',
      folder_path: null,
      folder_name: null,
      request_path: 'newer.bru',
      request_name: 'Stale',
      request_type: 'GET',
      request_url: '/old',
      request_protocol: 'http-request',
      request_seq: 1,
      request_error: null,
      workspace_path: null,
      mtime: 100n,
      hash: 'old-hash'
    }) as { changes: number };

    const row = statements.execute('search_index_rows_for_collection', { collection_path: collectionPath }) as Array<{ requestName: string }>;

    expect(stale.changes).toBe(0);
    expect(row[0].requestName).toBe('Newer');
    db.close();
  });
});
