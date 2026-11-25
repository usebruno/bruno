const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { readWorkspaceCollections, isWorkspaceZip } = require('./workspace-detection');

const WORKSPACE_YML = 'opencollection: 1.0.0\ninfo:\n  name: Petstore\n  type: workspace\ncollections:\n';

describe('workspace detection', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-detection-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  describe('readWorkspaceCollections', () => {
    const folderWithWorkspaceFile = (content) => {
      fs.writeFileSync(path.join(tempDir, 'workspace.yml'), content);
      return tempDir;
    };

    it('lists the collections of a folder with a Bruno workspace.yml', async () => {
      const ordersPath = path.join(tempDir, 'collections', 'orders');
      fs.mkdirSync(ordersPath, { recursive: true });
      fs.writeFileSync(path.join(ordersPath, 'opencollection.yml'), 'opencollection: 1.0.0\ninfo:\n  name: Orders\n');
      const folderPath = folderWithWorkspaceFile(`${WORKSPACE_YML}  - name: Orders\n    path: collections/orders\n  - name: Gone\n    path: collections/gone\n`);

      expect(await readWorkspaceCollections(folderPath)).toEqual({ collectionPaths: [ordersPath], missingCollectionCount: 1 });
    });

    it('treats a workspace whose collections cannot be listed as one without collections', async () => {
      const folderPath = folderWithWorkspaceFile('opencollection: 1.0.0\ninfo:\n  name: Petstore\n  type: workspace\ncollections:\n  orders: collections/orders\n');

      expect(await readWorkspaceCollections(folderPath)).toEqual({ collectionPaths: [], missingCollectionCount: 0 });
    });

    it.each([
      ['has no workspace.yml', null],
      ['has a workspace.yml of another tool', 'name: build\nsteps: []\n'],
      ['has a workspace.yml without a name', 'opencollection: 1.0.0\ninfo:\n  type: workspace\n'],
      ['has a workspace.yml that is not valid YAML', 'info: [Petstore\n'],
      ['has an empty workspace.yml', '']
    ])('does not treat a folder that %s as a workspace', async (_description, content) => {
      const folderPath = content === null ? tempDir : folderWithWorkspaceFile(content);

      expect(await readWorkspaceCollections(folderPath)).toBeNull();
    });
  });

  describe('isWorkspaceZip', () => {
    const writeZip = (entries) => {
      const zipPath = path.join(tempDir, 'export.zip');
      const zip = new AdmZip();
      Object.entries(entries).forEach(([entryName, content]) => zip.addFile(entryName, Buffer.from(content)));
      zip.writeZip(zipPath);
      return zipPath;
    };

    it.each([
      ['at its root', { 'workspace.yml': WORKSPACE_YML, 'collections/orders/opencollection.yml': '' }],
      ['in its only top folder', { 'Petstore/workspace.yml': WORKSPACE_YML, 'Petstore/collections/orders/opencollection.yml': '' }],
      ['in its only top folder next to git metadata', { '.git/HEAD': 'ref: refs/heads/main', 'Petstore/workspace.yml': WORKSPACE_YML }]
    ])('recognises a workspace export with workspace.yml %s', (_description, entries) => {
      expect(isWorkspaceZip(writeZip(entries))).toBe(true);
    });

    it.each([
      ['a collection export', { 'bruno.json': '{}', 'ping.bru': '' }],
      ['a workspace.yml deeper than its only top folder', { 'exports/Petstore/workspace.yml': WORKSPACE_YML }],
      ['a workspace.yml in one of several top folders', { 'Petstore/workspace.yml': WORKSPACE_YML, '__MACOSX/Petstore/._workspace.yml': '' }],
      ['a workspace.yml of another tool', { 'workspace.yml': 'name: build\nsteps: []\n' }]
    ])('does not treat %s as a workspace export', (_description, entries) => {
      expect(isWorkspaceZip(writeZip(entries))).toBe(false);
    });

    it('says no for a file that is not a zip or does not exist', () => {
      const notZip = path.join(tempDir, 'notes.zip');
      fs.writeFileSync(notZip, 'not a zip');

      expect(isWorkspaceZip(notZip)).toBe(false);
      expect(isWorkspaceZip(path.join(tempDir, 'missing.zip'))).toBe(false);
    });
  });
});
