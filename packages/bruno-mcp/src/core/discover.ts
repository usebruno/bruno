import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';

import type { DiscoveredCollection, DiscoveryConfig } from '../types.js';

interface PersistedSources {
  workspaces: string[];
  collections: string[];
  prefsPath: string;
  prefsExists: boolean;
  parseError?: boolean;
}

const brunoPreferencesPath = (): string => {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'bruno', 'preferences.json');
    case 'win32':
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'bruno', 'preferences.json');
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'bruno', 'preferences.json');
  }
};

export const isCollectionDir = (dir: string): boolean => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.existsSync(path.join(dir, 'bruno.json')) || fs.existsSync(path.join(dir, 'opencollection.yml'));
};

export const isWorkspaceDir = (dir: string): boolean => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.existsSync(path.join(dir, 'workspace.yml'));
};

const collectionsFromWorkspace = (workspacePath: string): DiscoveredCollection[] => {
  const workspaceYml = path.join(workspacePath, 'workspace.yml');
  if (!fs.existsSync(workspaceYml)) return [];

  let contents: any;
  try {
    contents = yaml.load(fs.readFileSync(workspaceYml, 'utf8'));
  } catch (_) {
    return [];
  }

  const entries = Array.isArray(contents && contents.collections) ? contents.collections : [];
  const results: DiscoveredCollection[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') continue;
    const resolved = path.resolve(workspacePath, entry.path);
    if (isCollectionDir(resolved)) {
      results.push({
        path: resolved,
        workspacePath,
        workspaceName: contents && contents.info && contents.info.name ? contents.info.name : path.basename(workspacePath),
        nameInWorkspace: entry.name || null
      });
    }
  }
  return results;
};

// Max index for numbered default workspace dirs 
// matches MAX_WORKSPACE_CREATION_ATTEMPTS in app.
const MAX_DEFAULT_WORKSPACE_INDEX = 20;

const resolveDefaultWorkspacePath = (prefs: any, userDataDir: string): string | null => {
  const stored = prefs && prefs.general && prefs.general.defaultWorkspacePath;
  if (typeof stored === 'string' && isWorkspaceDir(stored)) return stored;

  const base = path.join(userDataDir, 'default-workspace');
  const candidates: { path: string; index: number }[] = [];
  if (isWorkspaceDir(base)) candidates.push({ path: base, index: 0 });
  for (let i = 1; i < MAX_DEFAULT_WORKSPACE_INDEX; i++) {
    const numbered = `${base}-${i}`;
    if (isWorkspaceDir(numbered)) candidates.push({ path: numbered, index: i });
  }
  if (candidates.length === 0) return null;
  // Latest workspace is considered the default workspace.
  candidates.sort((a, b) => b.index - a.index);
  return candidates[0].path;
};

const readPersistedSources = (): PersistedSources => {
  const prefsPath = brunoPreferencesPath();
  if (!fs.existsSync(prefsPath)) {
    return { workspaces: [], collections: [], prefsPath, prefsExists: false };
  }

  let prefs: any;
  try {
    prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  } catch (_) {
    return { workspaces: [], collections: [], prefsPath, prefsExists: true, parseError: true };
  }

  const workspaces = ((prefs && prefs.workspaces && prefs.workspaces.lastOpenedWorkspaces) || []).filter(
    (p: unknown) => typeof p === 'string'
  );
  const collections = ((prefs && prefs.lastOpenedCollections) || []).filter(
    (p: unknown) => typeof p === 'string'
  );

  // Default workspace needs to be added explicitly so its member collections show up.
  const defaultWorkspace = resolveDefaultWorkspacePath(prefs, path.dirname(prefsPath));
  if (defaultWorkspace && !workspaces.includes(defaultWorkspace)) {
    workspaces.unshift(defaultWorkspace);
  }

  return { workspaces, collections, prefsPath, prefsExists: true };
};

const CWD_MARKERS = ['workspace.yml', 'bruno.json', 'opencollection.yml'];

const findUp = (startDir: string, markers: string[] = CWD_MARKERS): { dir: string; marker: string } | null => {
  let dir = path.resolve(startDir);
  while (true) {
    for (const marker of markers) {
      const candidate = path.join(dir, marker);
      if (fs.existsSync(candidate)) {
        return { dir, marker };
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

const discoverFromCwd = (
  cwd: string
): { entries: DiscoveredCollection[]; found: { dir: string; marker: string } | null } => {
  const found = findUp(cwd);
  if (!found) return { entries: [], found: null };

  if (found.marker === 'workspace.yml') {
    return { entries: collectionsFromWorkspace(found.dir), found };
  }
  // single collection found
  return {
    entries: [{
      path: found.dir,
      workspacePath: null,
      workspaceName: null,
      nameInWorkspace: null
    }],
    found
  };
};

const dedupeByPath = (entries: DiscoveredCollection[]): DiscoveredCollection[] => {
  const seen = new Set<string>();
  const out: DiscoveredCollection[] = [];
  for (const entry of entries) {
    const key = path.resolve(entry.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...entry, path: key });
  }
  return out;
};

const expandSources = ({
  collections = [],
  workspaces = []
}: {
  collections?: string[];
  workspaces?: string[];
}): DiscoveredCollection[] => {
  const out: DiscoveredCollection[] = [];

  for (const c of collections) {
    if (isCollectionDir(c)) {
      out.push({ path: c, workspacePath: null, workspaceName: null, nameInWorkspace: null });
    }
  }

  for (const w of workspaces) {
    if (!isWorkspaceDir(w)) continue;
    for (const member of collectionsFromWorkspace(w)) {
      out.push(member);
    }
  }

  return dedupeByPath(out);
};

const autoDiscoverFromBruno = (): {
  entries: DiscoveredCollection[];
  prefsStatus: {
    path: string;
    exists: boolean;
    parseError: boolean;
    persistedWorkspaceCount: number;
    persistedCollectionCount: number;
  };
} => {
  const persisted = readPersistedSources();
  return {
    entries: expandSources({ collections: persisted.collections, workspaces: persisted.workspaces }),
    prefsStatus: {
      path: persisted.prefsPath,
      exists: persisted.prefsExists,
      parseError: !!persisted.parseError,
      persistedWorkspaceCount: persisted.workspaces.length,
      persistedCollectionCount: persisted.collections.length
    }
  };
};

// Explicit --collection/--workspace scopes the server to exactly what is passed in
// --cwd-discovery is on try CWD walk-up.
// --auto-discovery is on (default) fall back on collections opened in the Bruno app
export const discoverCollections = (
  config: DiscoveryConfig
): { collections: DiscoveredCollection[]; source: string | null; diagnostics: string[] } => {
  const diagnostics: string[] = [];
  const explicitCollections = config.explicitCollections || [];
  const explicitWorkspaces = config.explicitWorkspaces || [];
  let entries: DiscoveredCollection[] = [];
  let source: string | null = null;

  if (explicitCollections.length > 0 || explicitWorkspaces.length > 0) {
    const fromExplicit: DiscoveredCollection[] = [];
    for (const c of explicitCollections) {
      fromExplicit.push({ path: c, workspacePath: null, workspaceName: null, nameInWorkspace: null });
    }
    for (const w of explicitWorkspaces) {
      const collections = collectionsFromWorkspace(w);
      for (const collection of collections) fromExplicit.push(collection);
      diagnostics.push(`workspace ${w}: ${collections.length} collections`);
    }
    entries = dedupeByPath(fromExplicit);
    source = 'explicit';
  } else if (config.cwdDiscovery) {
    const cwd = config.cwdPath ? path.resolve(config.cwdPath) : process.cwd();
    const { entries: cwdEntries, found } = discoverFromCwd(cwd);
    if (cwdEntries.length > 0) {
      entries = dedupeByPath(cwdEntries);
      source = `cwd (${found!.marker} at ${found!.dir})`;
    } else {
      diagnostics.push(
        `cwd discovery: no Bruno marker (workspace.yml/bruno.json/opencollection.yml) found walking up from ${cwd}`
      );
    }
  }

  if (entries.length === 0 && config.autoDiscovery) {
    const { entries: discovered, prefsStatus } = autoDiscoverFromBruno();
    if (discovered.length > 0) {
      entries = discovered;
      source = `bruno-prefs (${prefsStatus.path})`;
    } else {
      diagnostics.push(
        prefsStatus.exists
          ? `auto-discovery: preferences.json had no resolvable collections (workspaces=${prefsStatus.persistedWorkspaceCount}, collections=${prefsStatus.persistedCollectionCount})`
          : `auto-discovery: preferences.json not found at ${prefsStatus.path}`
      );
    }
  }

  return { collections: entries, source, diagnostics };
};
