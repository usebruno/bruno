import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as filestore from '@usebruno/filestore';

const store = filestore as any;

const sha256 = (buf: Buffer): string => crypto.createHash('sha256').update(buf).digest('hex');

const parseContent = (content: string, format: string, type: string): unknown => {
  if (type === 'dotenv') return store.parseDotEnv(content);
  if (type === 'config' || format === 'json') return JSON.parse(content);

  const options = { format };
  switch (type) {
    case 'request':
      return store.parseRequest(content, options);
    case 'collection':
      return store.parseCollection(content, options);
    case 'folder':
      return store.parseFolder(content, options);
    case 'environment':
      return store.parseEnvironment(content, options);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

export interface ParseFileArgs {
  collectionPath: string;
  relativePath: string;
  format: string;
  type: string;
}

export interface ParseFileResult {
  relativePath: string;
  mtime: bigint;
  hash: string;
  data: unknown;
  format: string;
  type: string;
}

export default function parseFile({ collectionPath, relativePath, format, type }: ParseFileArgs): ParseFileResult {
  const absolutePath = path.join(collectionPath, relativePath);
  const buf = fs.readFileSync(absolutePath);
  const stat = fs.statSync(absolutePath, { bigint: true });
  const content = buf.toString('utf8');
  const data = parseContent(content, format, type);
  return { relativePath, mtime: stat.mtimeNs, hash: sha256(buf), data, format, type };
}
