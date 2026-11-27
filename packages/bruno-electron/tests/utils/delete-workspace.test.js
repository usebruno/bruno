const fs = require('fs');
const os = require('os');
const path = require('path');
const { deleteWorkspaceFolder } = require('../../src/utils/delete-workspace');

const makeWorkspace = (parent, name) => {
  const dir = path.join(parent, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workspace.yml'), 'name: test\n');
  return dir;
};

describe('deleteWorkspaceFolder', () => {
  let root;
  let defaultWorkspace;
  let team;
  let beforeDelete;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-workspace-'));
    defaultWorkspace = makeWorkspace(root, 'default-workspace');
    team = makeWorkspace(root, 'team');
    beforeDelete = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const run = (workspacePath, openWorkspacePaths = [team]) =>
    deleteWorkspaceFolder({ workspacePath, openWorkspacePaths, defaultWorkspacePath: defaultWorkspace, beforeDelete });

  it('deletes an open workspace folder', async () => {
    beforeDelete.mockResolvedValue(['/team/collections/api']);
    await expect(run(team)).resolves.toEqual({ success: true, detachedPaths: ['/team/collections/api'] });
    expect(fs.existsSync(team)).toBe(false);
    expect(beforeDelete).toHaveBeenCalled();
  });

  it('refuses the default workspace even when spelled with a trailing separator', async () => {
    await expect(run(`${defaultWorkspace}${path.sep}`, [team, defaultWorkspace])).rejects.toThrow('Cannot delete the default workspace');
    expect(fs.existsSync(defaultWorkspace)).toBe(true);
  });

  it('refuses a workspace folder that is not open', async () => {
    const other = makeWorkspace(root, 'other');
    await expect(run(other)).rejects.toThrow('Only an open workspace can be deleted');
    expect(fs.existsSync(other)).toBe(true);
    expect(beforeDelete).not.toHaveBeenCalled();
  });

  it('refuses a symlink that points at a folder which is not open', async () => {
    const other = makeWorkspace(root, 'other');
    const link = path.join(root, 'link-to-other');
    fs.symlinkSync(other, link, process.platform === 'win32' ? 'junction' : 'dir');

    await expect(run(`${link}${path.sep}`)).rejects.toThrow('Only an open workspace can be deleted');
    expect(fs.existsSync(path.join(other, 'workspace.yml'))).toBe(true);
  });

  it('reports failure instead of throwing when the folder cannot be removed', async () => {
    jest.spyOn(fs.promises, 'rm').mockRejectedValue(new Error('EBUSY: resource busy'));
    beforeDelete.mockResolvedValue(['/team/collections/api']);
    await expect(run(team)).resolves.toEqual({ success: false, error: 'EBUSY: resource busy', detachedPaths: ['/team/collections/api'] });
  });
});
