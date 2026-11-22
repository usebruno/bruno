const { describe, it, expect, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findWorkspacePath, getWorkspaceCollectionPaths, isCollectionInWorkspace } = require('../../src/utils/workspace');

const tmpDirs = [];
const makeTmpDir = () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-workspace-')));
  tmpDirs.push(dir);
  return dir;
};

afterAll(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
});

describe('findWorkspacePath', () => {
  it('returns the nearest directory above the start path that holds a workspace.yml', () => {
    const workspacePath = makeTmpDir();
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'collections: []\n');
    const collectionPath = path.join(workspacePath, 'collections', 'orders');
    fs.mkdirSync(collectionPath, { recursive: true });

    expect(findWorkspacePath(collectionPath)).toBe(workspacePath);
  });
});

describe('getWorkspaceCollectionPaths', () => {
  it('resolves relative and absolute collection paths, once each', () => {
    const workspacePath = makeTmpDir();
    const absoluteCollectionPath = path.join(makeTmpDir(), 'shared');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), [
      'collections:',
      '  - name: Orders',
      '    path: collections/orders',
      '  - name: Orders again',
      '    path: ./collections/orders',
      '  - name: Shared',
      `    path: ${JSON.stringify(absoluteCollectionPath)}`,
      '  - name: Remote only',
      ''
    ].join('\n'));

    expect(getWorkspaceCollectionPaths(workspacePath)).toEqual([
      path.join(workspacePath, 'collections', 'orders'),
      absoluteCollectionPath
    ]);
  });

  it('reads Windows-style separators in relative paths', () => {
    const workspacePath = makeTmpDir();
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'collections:\n  - name: Auth\n    path: "collections\\\\auth"\n');

    expect(getWorkspaceCollectionPaths(workspacePath)).toEqual([path.join(workspacePath, 'collections', 'auth')]);
  });
});

describe('isCollectionInWorkspace', () => {
  it('is true only for a collection the workspace.yml lists', () => {
    const workspacePath = makeTmpDir();
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'collections:\n  - name: Orders\n    path: collections/orders\n');
    const listedPath = path.join(workspacePath, 'collections', 'orders');
    const unlistedPath = path.join(workspacePath, 'collections', 'unlisted');
    fs.mkdirSync(listedPath, { recursive: true });
    fs.mkdirSync(unlistedPath, { recursive: true });

    expect(isCollectionInWorkspace(workspacePath, listedPath)).toBe(true);
    expect(isCollectionInWorkspace(workspacePath, `${listedPath}${path.sep}`)).toBe(true);
    expect(isCollectionInWorkspace(workspacePath, unlistedPath)).toBe(false);
  });
});
