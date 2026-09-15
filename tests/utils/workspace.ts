import fs from 'fs';
import path from 'path';

export const buildWorkspaceYml = (workspaceName: string): string => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${JSON.stringify(workspaceName)}`,
  '  type: workspace',
  'collections: []',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

/**
 * Create a workspace using yml file in a temporary directory
 * @param createTmpDir - Function to create a temporary directory
 * @param dirPrefix - directory-name prefix for the workspace directory
 * @param workspaceName - Name of the workspace
 * @returns Path to the workspace
 */
export async function createWorkspaceFromYml(
  createTmpDir: (tag?: string) => Promise<string>,
  dirPrefix: string,
  workspaceName: string
) {
  const workspacePath = await createTmpDir(dirPrefix);
  await fs.promises.writeFile(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml(workspaceName));
  return workspacePath;
}
