import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { readSnapshot } from '../utils/snapshot';

const buildWorkspaceYml = (workspaceName: string) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${workspaceName}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

const createWorkspaceDir = async (
  createTmpDir: (tag?: string) => Promise<string>,
  tag: string,
  workspaceName: string
) => {
  const workspacePath = await createTmpDir(tag);
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml(workspaceName));
  return workspacePath;
};

const seedPreferences = (userDataPath: string, lastOpenedWorkspaces: string[]) => {
  fs.writeFileSync(
    path.join(userDataPath, 'preferences.json'),
    JSON.stringify(
      {
        preferences: {
          onboarding: {
            hasLaunchedBefore: true,
            hasSeenWelcomeModal: true
          }
        },
        workspaces: {
          lastOpenedWorkspaces
        }
      },
      null,
      2
    )
  );
};

const seedSnapshot = (userDataPath: string, activeWorkspacePath: string) => {
  fs.writeFileSync(
    path.join(userDataPath, 'ui-state-snapshot.json'),
    JSON.stringify(
      {
        version: '0.0.1',
        activeWorkspacePath,
        extras: {
          devTools: {
            open: false
          }
        },
        workspaces: [],
        collections: []
      },
      null,
      2
    )
  );
};

const setupMultiWorkspaceRestoreFixture = async (
  createTmpDir: (tag?: string) => Promise<string>,
  activeWorkspaceIndex: number
) => {
  const userDataPath = await createTmpDir('snap-active-ws-restore');
  const workspacePaths = await Promise.all([
    createWorkspaceDir(createTmpDir, 'workspace-one', 'Workspace One'),
    createWorkspaceDir(createTmpDir, 'workspace-two', 'Workspace Two'),
    createWorkspaceDir(createTmpDir, 'workspace-three', 'Workspace Three'),
    createWorkspaceDir(createTmpDir, 'workspace-four', 'Workspace Four'),
    createWorkspaceDir(createTmpDir, 'workspace-five', 'Workspace Five')
  ]);

  const lastOpenedWorkspaces = [...workspacePaths].reverse();
  const activeWorkspacePath = workspacePaths[activeWorkspaceIndex];

  seedPreferences(userDataPath, lastOpenedWorkspaces);
  seedSnapshot(userDataPath, activeWorkspacePath);

  return {
    userDataPath,
    activeWorkspacePath,
    activeWorkspaceName: ['Workspace One', 'Workspace Two', 'Workspace Three', 'Workspace Four', 'Workspace Five'][activeWorkspaceIndex]
  };
};

test.describe('Snapshot: Active Workspace Restore', () => {
  test('restores a 4th-position active workspace after restart', async ({ launchElectronApp, createTmpDir }) => {
    const { userDataPath, activeWorkspacePath, activeWorkspaceName } = await setupMultiWorkspaceRestoreFixture(createTmpDir, 3);

    expect(readSnapshot(userDataPath)?.activeWorkspacePath).toBe(activeWorkspacePath);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const workspaceNameLocator = page.getByTestId('workspace-name');
    const workspaceMenuLocator = page.getByTestId('workspace-menu');

    await test.step('Assert restored workspace is visible', async () => {
      await expect(workspaceNameLocator).toHaveText(activeWorkspaceName, { timeout: 10000 });
    });

    await test.step('Assert restored workspace is active in the menu', async () => {
      await workspaceMenuLocator.click();
      await expect(page.locator('.workspace-item.active')).toContainText(activeWorkspaceName);
    });

    await closeElectronApp(app);
  });

  test('restores a 5th-position active workspace after restart', async ({ launchElectronApp, createTmpDir }) => {
    const { userDataPath, activeWorkspacePath, activeWorkspaceName } = await setupMultiWorkspaceRestoreFixture(createTmpDir, 4);

    expect(readSnapshot(userDataPath)?.activeWorkspacePath).toBe(activeWorkspacePath);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const workspaceNameLocator = page.getByTestId('workspace-name');
    const workspaceMenuLocator = page.getByTestId('workspace-menu');

    await test.step('Assert restored workspace is visible', async () => {
      await expect(workspaceNameLocator).toHaveText(activeWorkspaceName, { timeout: 10000 });
    });

    await test.step('Assert restored workspace is active in the menu', async () => {
      await workspaceMenuLocator.click();
      await expect(page.locator('.workspace-item.active')).toContainText(activeWorkspaceName);
    });

    await closeElectronApp(app);
  });
});
