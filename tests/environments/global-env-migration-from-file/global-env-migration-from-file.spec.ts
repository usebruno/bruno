import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { openCollection, waitForReadyPage } from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const workspaceFixturePath = path.join(__dirname, 'fixtures', 'workspace');

/**
 * Replicate the uid generation from bruno-electron/src/utils/common.js
 * so we can compute environment uids at test time.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return new Uint32Array([hash])[0].toString(36);
}

function generateUidBasedOnHash(str: string): string {
  const hash = simpleHash(str);
  return `${hash}`.padEnd(21, '0');
}

/**
 * Copy the workspace fixture to a temp location and return the path.
 */
async function copyWorkspaceFixture(destDir: string): Promise<string> {
  const workspacePath = path.join(destDir, 'workspace');
  await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });
  return workspacePath;
}

test.describe('Global Environment Migration from workspace.yml', () => {
  test('should migrate activeEnvironmentUid from workspace.yml to electron store and remove from file', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('env-migrate-from-file');
    const fixtureDir = await createTmpDir('ws-fixture');

    // Copy workspace fixture to temp location
    const workspacePath = await copyWorkspaceFixture(fixtureDir);

    // Compute uid for the Alpha environment file at its actual path
    const alphaFilePath = path.join(workspacePath, 'environments', 'Alpha.yml');
    const alphaUid = generateUidBasedOnHash(alphaFilePath);

    // Inject activeEnvironmentUid into workspace.yml (simulating pre-migration state)
    const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
    let workspaceYml = fs.readFileSync(workspaceYmlPath, 'utf8');
    workspaceYml = workspaceYml.replace(
      'collections:',
      `activeEnvironmentUid: "${alphaUid}"\n\ncollections:`
    );
    fs.writeFileSync(workspaceYmlPath, workspaceYml);

    // Launch with init-user-data pointing to the workspace
    const app1 = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    const page1 = await waitForReadyPage(app1);

    // Open the collection so the env selector toolbar is visible
    await openCollection(page1, 'Test Collection');

    // Verify "Alpha" environment is selected (migrated from workspace.yml)
    await expect(page1.locator('.current-environment')).toContainText('Alpha');

    // Verify workspace.yml no longer contains activeEnvironmentUid
    const updatedYml = fs.readFileSync(workspaceYmlPath, 'utf8');
    expect(updatedYml).not.toContain('activeEnvironmentUid');

    await closeElectronApp(app1);

    // Restart — should still have Alpha selected (now from electron store)
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);

    await openCollection(page2, 'Test Collection');
    await expect(page2.locator('.current-environment')).toContainText('Alpha');

    await closeElectronApp(app2);
  });
});
