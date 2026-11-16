const os = require('node:os');
const path = require('node:path');
const { buildScanLocations } = require('./locations');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const root = path.parse(os.tmpdir()).root;
const at = (...segments) => path.join(root, 'data', ...segments);
const idOf = (folderPath) => (process.platform === 'win32' ? folderPath.toLowerCase() : folderPath);

const buildLocations = ({ defaultLocation = at('bruno'), searchFolders = [], searchWholeComputer = false, ...inputs } = {}) =>
  buildScanLocations({
    preferences: { general: { defaultLocation }, openCollection: { searchFolders, searchWholeComputer } },
    documentsPath: at('documents'),
    defaultWorkspacePath: at('workspaces', 'default'),
    lastOpenedWorkspacePaths: [],
    homePath: at('home'),
    isFolder: async () => true,
    ...inputs
  });

const pathsAndKinds = (locations) => locations.map((location) => [location.path, location.kind]);

describe('buildScanLocations', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
  });

  it('lists the default location, Documents, workspaces, search folders and home in that order', async () => {
    const locations = await buildLocations({
      lastOpenedWorkspacePaths: [at('workspaces', 'team')],
      searchFolders: [at('projects'), at('archive')],
      searchWholeComputer: true
    });

    expect(pathsAndKinds(locations)).toEqual([
      [at('bruno'), 'default-location'],
      [at('documents', 'bruno'), 'documents'],
      [at('workspaces', 'default'), 'workspace'],
      [at('workspaces', 'team'), 'workspace'],
      [at('projects'), 'user'],
      [at('archive'), 'user'],
      [at('home'), 'home']
    ]);
  });

  it('leaves out a default location, Documents or workspace that is not a folder, but keeps search folders and home unchecked', async () => {
    const isFolder = jest.fn(async (folderPath) => folderPath === at('workspaces', 'team'));

    const locations = await buildLocations({
      isFolder,
      lastOpenedWorkspacePaths: [at('workspaces', 'team')],
      searchFolders: [at('missing-folder')],
      searchWholeComputer: true
    });

    expect(pathsAndKinds(locations)).toEqual([
      [at('workspaces', 'team'), 'workspace'],
      [at('missing-folder'), 'user'],
      [at('home'), 'home']
    ]);
    expect(isFolder.mock.calls.map(([folderPath]) => folderPath)).toEqual([
      at('bruno'),
      at('documents', 'bruno'),
      at('workspaces', 'default'),
      at('workspaces', 'team')
    ]);
  });

  it('adds the home folder only when the whole computer search is on', async () => {
    const locations = await buildLocations({ searchWholeComputer: false });

    expect(locations.map((location) => location.kind)).not.toContain('home');
  });

  it('checks the folders at the same time', async () => {
    const answers = [];
    const isFolder = jest.fn(() => new Promise((resolve) => answers.push(resolve)));

    const building = buildLocations({ isFolder, lastOpenedWorkspacePaths: [at('workspaces', 'team')] });

    expect(isFolder).toHaveBeenCalledTimes(4);
    answers.forEach((answer) => answer(true));
    expect(await building).toHaveLength(4);
  });

  it('ignores entries that are not absolute paths', async () => {
    const locations = await buildLocations({
      defaultLocation: '',
      defaultWorkspacePath: '',
      lastOpenedWorkspacePaths: [null, 42, path.join('relative', 'workspace'), at('workspaces', 'team')]
    });

    expect(pathsAndKinds(locations)).toEqual([
      [at('documents', 'bruno'), 'documents'],
      [at('workspaces', 'team'), 'workspace']
    ]);
  });

  it('uses the resolved path as the id, so a trailing separator does not add a second row', async () => {
    const locations = await buildLocations({
      defaultLocation: [at('team'), '..', 'bruno'].join(path.sep),
      searchFolders: [`${at('projects')}${path.sep}`, at('projects')]
    });

    expect(locations.filter((location) => ['default-location', 'user'].includes(location.kind))).toEqual([
      { id: idOf(at('bruno')), path: at('bruno'), kind: 'default-location' },
      { id: idOf(at('projects')), path: at('projects'), kind: 'user' }
    ]);
  });

  it('folds Documents and a search folder that match the default location into the default row', async () => {
    const locations = await buildLocations({
      documentsPath: at(),
      searchFolders: [at('bruno')]
    });

    expect(pathsAndKinds(locations)).toEqual([
      [at('bruno'), 'default-location'],
      [at('workspaces', 'default'), 'workspace']
    ]);
  });

  it('keeps a search folder that matches a default location which is not a folder', async () => {
    const locations = await buildLocations({
      isFolder: async (folderPath) => folderPath !== at('bruno'),
      searchFolders: [at('bruno')]
    });

    expect(locations.find((location) => location.path === at('bruno'))).toEqual({
      id: idOf(at('bruno')),
      path: at('bruno'),
      kind: 'user'
    });
  });

  it('compares folders without case on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const locations = await buildLocations({ searchFolders: [at('Team', 'Projects'), at('team', 'projects')] });

    expect(locations.filter((location) => location.kind === 'user')).toEqual([
      { id: at('Team', 'Projects').toLowerCase(), path: at('Team', 'Projects'), kind: 'user' }
    ]);
  });
});
