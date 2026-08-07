import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import yaml from 'js-yaml';

import type { DiscoveryConfig, RegisteredCollection, CollectionListItem, RequestInfo } from '../types.js';
import { discoverCollections } from './discover.js';

// Reuses @usebruno/cli's collection parser via createRequire since it has no exports map
const require = createRequire(import.meta.url);
const { createCollectionJsonFromPathname } = require('@usebruno/cli/src/utils/collection');

const collectionIdFromPath = (collectionPath: string): string =>
  crypto.hash('sha1', path.resolve(collectionPath)).slice(0, 12);

const collectionNameFromConfig = (collectionPath: string): string => {
  const brunoJsonPath = path.join(collectionPath, 'bruno.json');
  if (fs.existsSync(brunoJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
      if (config && config.name) return config.name;
    } catch (_) {}
  }

  const openCollPath = path.join(collectionPath, 'opencollection.yml');
  if (fs.existsSync(openCollPath)) {
    try {
      const doc: any = yaml.load(fs.readFileSync(openCollPath, 'utf8'));
      if (doc && doc.info && doc.info.name) return doc.info.name;
    } catch (_) {}
  }

  return path.basename(collectionPath);
};

const listEnvironments = (collectionPath: string): string[] => {
  const envDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(envDir)) return [];
  return fs
    .readdirSync(envDir)
    .filter((f) => f.endsWith('.bru') || f.endsWith('.yml'))
    .map((f) => f.replace(/\.(bru|yml)$/, ''));
};

export const filterRequests = (
  requests: RequestInfo[],
  { search, method }: { search?: string; method?: string } = {}
): RequestInfo[] => {
  let out = Array.isArray(requests) ? requests : [];
  if (method) {
    const m = String(method).toUpperCase();
    out = out.filter((r) => (r.method || '').toUpperCase() === m);
  }
  if (search) {
    const q = String(search).toLowerCase();
    out = out.filter((r) =>
      [r.name, r.relativePath, r.url].some((f) => typeof f === 'string' && f.toLowerCase().includes(q))
    );
  }
  return out;
};

const flattenRequests = (items: any[], basePath: string, acc: RequestInfo[] = []): RequestInfo[] => {
  for (const item of items || []) {
    if (item.type === 'folder') {
      flattenRequests(item.items, basePath, acc);
    } else {
      acc.push({
        name: item.name.replace(/\.(bru|yml)$/, ''),
        pathname: item.pathname,
        relativePath: path.relative(basePath, item.pathname),
        method: (item.request && item.request.method) || null,
        url: (item.request && item.request.url) || null
      });
    }
  }
  return acc;
};

export class CollectionRegistry {
  private config: DiscoveryConfig;
  private collections: RegisteredCollection[] = [];

  constructor(config: DiscoveryConfig) {
    this.config = config;
    this.refresh();
  }

  refresh(): void {
    const { collections } = discoverCollections(this.config);
    this.collections = collections.map((entry) => ({
      id: collectionIdFromPath(entry.path),
      name: entry.nameInWorkspace || collectionNameFromConfig(entry.path),
      path: entry.path,
      workspacePath: entry.workspacePath || null,
      workspaceName: entry.workspaceName || null
    }));
  }

  private find(collectionId: string): RegisteredCollection | null {
    return this.collections.find((c) => c.id === collectionId) || null;
  }

  list(): CollectionListItem[] {
    return this.collections.map((c) => ({
      id: c.id,
      name: c.name,
      path: c.path,
      workspaceName: c.workspaceName,
      workspacePath: c.workspacePath,
      environments: listEnvironments(c.path)
    }));
  }

  resolve(collectionId: string): RegisteredCollection | null {
    return this.find(collectionId);
  }

  environments(collectionId: string): string[] {
    const collection = this.find(collectionId);
    if (!collection) return [];
    return listEnvironments(collection.path);
  }

  listRequests(collectionId: string): RequestInfo[] | null {
    const collection = this.find(collectionId);
    if (!collection) return null;
    const { items } = createCollectionJsonFromPathname(collection.path);
    return flattenRequests(items, collection.path);
  }
}
