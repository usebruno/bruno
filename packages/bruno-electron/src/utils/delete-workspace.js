const fs = require('fs');
const { promisify } = require('util');
const { validateWorkspacePath } = require('./workspace-config');

const realpath = promisify(fs.realpath.native);

const deleteWorkspaceFolder = async ({ workspacePath, openWorkspacePaths, defaultWorkspacePath, beforeDelete }) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }
  if (!fs.existsSync(workspacePath)) {
    return { success: true, detachedPaths: [] };
  }

  const realWorkspacePath = await realpath(workspacePath);
  if (defaultWorkspacePath && fs.existsSync(defaultWorkspacePath) && (await realpath(defaultWorkspacePath)) === realWorkspacePath) {
    throw new Error('Cannot delete the default workspace');
  }
  const realOpenWorkspacePaths = await Promise.all(openWorkspacePaths.filter((p) => fs.existsSync(p)).map((p) => realpath(p)));
  if (!realOpenWorkspacePaths.includes(realWorkspacePath)) {
    throw new Error('Only an open workspace can be deleted');
  }
  validateWorkspacePath(realWorkspacePath);

  const detachedPaths = await beforeDelete();

  try {
    await fs.promises.rm(realWorkspacePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    return { success: false, error: error.message, detachedPaths };
  }
  return { success: true, detachedPaths };
};

module.exports = { deleteWorkspaceFolder };
