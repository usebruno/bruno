const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isCollectionInAnyWorkspace } = require('./workspace-config');

describe('isCollectionInAnyWorkspace', () => {
  let rootPath;

  const makeWorkspace = (name, workspaceYml) => {
    const workspacePath = path.join(rootPath, name);
    fs.mkdirSync(workspacePath, { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), workspaceYml);
    return workspacePath;
  };

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-config-'));
  });

  afterEach(() => {
    fs.rmSync(rootPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  test('finds a collection listed by a path relative to the workspace', () => {
    const workspacePath = makeWorkspace('one', 'collections:\n  - name: API\n    path: collections/api\n');

    expect(isCollectionInAnyWorkspace([workspacePath], path.join(workspacePath, 'collections', 'api'))).toBe(true);
  });

  test('finds a collection listed by an absolute path in any of the workspaces', () => {
    const collectionPath = path.join(rootPath, 'external', 'api');
    const empty = makeWorkspace('empty', 'collections: []\n');
    const listing = makeWorkspace('listing', `collections:\n  - name: API\n    path: ${JSON.stringify(collectionPath)}\n`);

    expect(isCollectionInAnyWorkspace([empty, listing], collectionPath)).toBe(true);
  });

  test('returns false when no workspace lists the collection', () => {
    const workspacePath = makeWorkspace('one', 'collections:\n  - name: Other\n    path: collections/other\n');

    expect(isCollectionInAnyWorkspace([workspacePath], path.join(workspacePath, 'collections', 'api'))).toBe(false);
  });

  test('skips empty entries and workspaces without a workspace.yml', () => {
    const missing = path.join(rootPath, 'missing');

    expect(isCollectionInAnyWorkspace([undefined, missing], path.join(rootPath, 'api'))).toBe(false);
  });

  test('assumes the collection is still listed when a workspace.yml cannot be read', () => {
    const workspacePath = makeWorkspace('broken', '');

    expect(isCollectionInAnyWorkspace([workspacePath], path.join(rootPath, 'api'))).toBe(true);
  });
});
