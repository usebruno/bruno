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
    requestName,
    requestUrl
  }: {
    collectionPath: string;
    collectionName: string;
    requestPath: string;
    requestName: string;
    requestUrl: string;
  }
) => {
  statements.execute('search_index_upsert_entry', {
    collection_path: collectionPath,
    collection_name: collectionName,
    folder_path: null,
    folder_name: null,
    request_path: requestPath,
    request_name: requestName,
    request_type: 'GET',
    request_url: requestUrl,
    request_protocol: 'http-request',
    request_seq: 1,
    request_error: null,
    workspace_path: null,
    mtime: 1n,
    hash: `${requestPath}-hash`
  });
};

const escapeLikePattern = (term: string) =>
  term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

const likePattern = (term: string) => `%${escapeLikePattern(term)}%`;

describe('search_index literal LIKE matching', () => {
  it('treats % and _ as literal characters when escaped', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-si-like-'));
    const { statements } = createDatabase(path.join(dir, 'bruno.db'));

    const matchPath = '/collections/metrics';
    upsertRequest(statements, {
      collectionPath: matchPath,
      collectionName: 'Metrics',
      requestPath: 'score.bru',
      requestName: 'score',
      requestUrl: '/api/100%_done'
    });
    upsertRequest(statements, {
      collectionPath: '/collections/other',
      collectionName: 'Other',
      requestPath: 'wildcard.bru',
      requestName: 'anything',
      requestUrl: '/api/100X_done'
    });

    const term = '100%_done';
    const hits = statements.execute('search_index_search_requests', {
      like: likePattern(term),
      workspace_path: null
    }) as Array<{ collectionPath: string; requestUrl: string }>;

    expect(hits).toHaveLength(1);
    expect(hits[0].collectionPath).toBe(matchPath);
    expect(hits[0].requestUrl).toBe('/api/100%_done');
  });
});
