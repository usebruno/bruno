import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/node/index';

const upsertRequest = (
  statements: ReturnType<typeof createDatabase>['statements'],
  {
    collectionPath,
    collectionName,
    requestPath,
    requestName
  }: { collectionPath: string; collectionName: string; requestPath: string; requestName: string }
) => {
  statements.execute('search_index_upsert_entry', {
    collection_path: collectionPath,
    collection_name: collectionName,
    folder_path: null,
    folder_name: null,
    request_path: requestPath,
    request_name: requestName,
    request_type: 'GET',
    request_url: '/x',
    request_protocol: 'http-request',
    request_seq: 1,
    request_error: null,
    workspace_path: null,
    mtime: 1n,
    hash: `${requestPath}-hash`
  });
};

describe('search_index request search by collection name', () => {
  it('matches requests when the term matches collection_name only', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-si-col-'));
    const { db, statements } = createDatabase(path.join(dir, 'bruno.db'));

    const matchPath = '/collections/unique-widget-api';
    const otherPath = '/collections/other-stuff';
    upsertRequest(statements, {
      collectionPath: matchPath,
      collectionName: 'UniqueWidgetAPI',
      requestPath: 'ping.bru',
      requestName: 'ping'
    });
    upsertRequest(statements, {
      collectionPath: otherPath,
      collectionName: 'OtherStuff',
      requestPath: 'health.bru',
      requestName: 'health'
    });

    const term = 'Widget';
    const like = `%${term}%`;

    const workspaceHits = statements.execute('search_index_search_requests', {
      like,
      workspace_path: null
    }) as Array<{ collectionPath: string; requestName: string }>;
    expect(workspaceHits).toHaveLength(1);
    expect(workspaceHits[0].collectionPath).toBe(matchPath);
    expect(workspaceHits[0].requestName).toBe('ping');

    const inCollection = statements.execute('search_index_search_requests_in_collection', {
      like,
      collection_path: matchPath,
      workspace_path: null,
      limit: 10
    }) as Array<{ requestName: string }>;
    expect(inCollection).toHaveLength(1);

    const countRow = statements.execute('search_index_count_requests_in_collection', {
      like,
      collection_path: matchPath,
      workspace_path: null
    }) as { total: bigint };
    expect(Number(countRow.total)).toBe(1);

    const otherCount = statements.execute('search_index_count_requests_in_collection', {
      like,
      collection_path: otherPath,
      workspace_path: null
    }) as { total: bigint };
    expect(Number(otherCount.total)).toBe(0);

    db.close();
  });
});
