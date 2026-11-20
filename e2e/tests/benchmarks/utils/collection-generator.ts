import { stringifyRequest, stringifyCollection, stringifyFolder } from '@usebruno/filestore';
import type { BrunoItem } from '@usebruno/schema-types';
import * as path from 'path';
import * as fs from 'fs';

export type CollectionFormat = 'bru' | 'yml';

export function buildRequestItem(seq: number): BrunoItem {
  return {
    uid: `req-${seq}`,
    type: 'http-request',
    name: `request-${seq}`,
    seq,
    request: {
      method: 'GET',
      url: `https://example.com/api/v1/resource/${seq}`,
      headers: [
        { uid: `h1-${seq}`, name: 'Content-Type', value: 'application/json', enabled: true },
        { uid: `h2-${seq}`, name: 'Accept', value: 'application/json', enabled: true }
      ],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    }
  } as BrunoItem;
}

export interface GenerateCollectionOptions {
  dir: string;
  name: string;
  requestCount: number;
  format: CollectionFormat;
  requestsPerFolder?: number;
}

export function generateCollection({
  dir,
  name,
  requestCount,
  format,
  requestsPerFolder = 10
}: GenerateCollectionOptions) {
  if (format === 'bru') {
    fs.writeFileSync(path.join(dir, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }, null, 2));
    fs.writeFileSync(path.join(dir, 'collection.bru'), stringifyCollection({ name } as any, {}, { format: 'bru' }) || `meta {\n  name: ${name}\n}\n`);
  } else {
    const ymlContent = stringifyCollection({ name } as any, { name, type: 'collection', opencollection: '1.0.0' }, { format: 'yml' });
    fs.writeFileSync(path.join(dir, 'opencollection.yml'), ymlContent);
  }

  const ext = format === 'bru' ? 'bru' : 'yml';
  const folderFile = format === 'bru' ? 'folder.bru' : 'folder.yml';
  const folderCount = Math.ceil(requestCount / requestsPerFolder);

  Array.from({ length: folderCount }).forEach((_, f) => {
    const folderPath = path.join(dir, `folder-${f}`);
    fs.mkdirSync(folderPath, { recursive: true });

    const folderContent = stringifyFolder({ name: `folder-${f}` }, { format });
    fs.writeFileSync(path.join(folderPath, folderFile), folderContent || `meta {\n  name: folder-${f}\n}\n`);

    const count = Math.min(requestsPerFolder, requestCount - f * requestsPerFolder);
    Array.from({ length: count }).forEach((_, r) => {
      const seq = f * requestsPerFolder + r + 1;
      fs.writeFileSync(path.join(folderPath, `request-${seq}.${ext}`), stringifyRequest(buildRequestItem(seq), { format }));
    });
  });
}
