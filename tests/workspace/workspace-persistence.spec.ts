import { test as baseTest, expect } from '../../playwright';
import { Page, ElectronApplication } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper function to create a workspace via UI
 */
async function createWorkspace(
  page: Page,
  electronApp: ElectronApplication,
  workspaceName: string,
  workspaceLocation: string
) {
  await baseTest.step(`Create workspace "${workspaceName}"`, async () => {
    // Ensure the directory exists
    await fs.promises.mkdir(workspaceLocation, { recursive: true });

    // Mock the dialog.showOpenDialog in the main process
    // We'll set up a global mock that the browseDirectory function will use
    await electronApp.evaluate(({ dialog }, location: string) => {
      // Replace the dialog.showOpenDialog function
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [location] };
      };
    }, workspaceLocation);

    // Click on workspace name to open dropdown
    await page.locator('.workspace-name-container').click();

    // Click "Create workspace" option
    await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

    // Wait for modal to appear
    const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Workspace' });
    await expect(modal).toBeVisible();

    // Fill in workspace name
    await modal.locator('#workspace-name').fill(workspaceName);

    // Click Browse button - the mocked dialog will return our location
    await modal.getByRole('button', { name: 'Browse' }).click();

    // Wait for the location to be set (the IPC call should complete)
    // The location input should update after the IPC call completes
    await page.waitForFunction(
      (expectedLocation) => {
        const input = document.querySelector('#workspace-location') as HTMLInputElement;
        return input && input.value.includes(expectedLocation.split(/[/\\]/).pop() || '');
      },
      workspaceLocation,
      { timeout: 5000 }
    );

    // Click "Create Workspace" button
    await modal.getByRole('button', { name: 'Create Workspace' }).click();

    // Wait for modal to close
    await modal.waitFor({ state: 'detached', timeout: 15000 });

    // Wait a bit for workspace to be created and switched to
    await page.waitForTimeout(500);

    // Verify workspace name appears in title bar
    await expect(page.locator('.workspace-name')).toContainText(workspaceName);
  });
}

// Shared state for workspace fixtures (singleton pattern)
let workspaceSetupPromise: Promise<{
  userDataPath: string;
  workspaceNames: string[];
  allWorkspaceNames: string[];
}> | null = null;

// Create a custom test with workspace fixture
const test = baseTest.extend<{
  userDataPath: string;
  workspaceNames: string[];
  allWorkspaceNames: string[];
  restartApp: () => Promise<ElectronApplication>;
}>({
  userDataPath: async ({ launchElectronApp, createTmpDir }, use) => {
    // Use singleton pattern to ensure setup only happens once
    if (!workspaceSetupPromise) {
      workspaceSetupPromise = (async () => {
        const userDataPath = await createTmpDir('workspace-persistence');
        const workspaceBaseDir = await createTmpDir('workspace-persistence-workspaces');

        // Launch app to create workspaces
        const app = await launchElectronApp({ userDataPath });
        const page = await app.firstWindow();

        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

        // Verify default workspace exists
        const workspaceNameElement = page.locator('.workspace-name');
        await expect(workspaceNameElement).toBeVisible();
        const defaultWorkspaceName = await workspaceNameElement.textContent() || '';
        expect(defaultWorkspaceName).toContain('My Workspace');

        // Create 5 additional workspaces
        const workspaceNames: string[] = [];
        for (let i = 1; i <= 5; i++) {
          const workspaceName = `Workspace${i}`;
          workspaceNames.push(workspaceName);
          const workspaceLocation = path.join(workspaceBaseDir, `workspace-${i}`);
          await createWorkspace(page, app, workspaceName, workspaceLocation);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Close the app after creating workspaces
        await app.context().close();
        await app.close();

        return {
          userDataPath,
          workspaceNames,
          allWorkspaceNames: ['My Workspace', ...workspaceNames]
        };
      })();
    }

    const setup = await workspaceSetupPromise;
    await use(setup.userDataPath);
  },

  workspaceNames: async ({ userDataPath }, use) => {
    const setup = await workspaceSetupPromise!;
    await use(setup.workspaceNames);
  },

  allWorkspaceNames: async ({ userDataPath }, use) => {
    const setup = await workspaceSetupPromise!;
    await use(setup.allWorkspaceNames);
  },

  restartApp: async ({ launchElectronApp, userDataPath }, use) => {
    const appInstances: ElectronApplication[] = [];
    await use(async () => {
      const app = await launchElectronApp({ userDataPath });
      appInstances.push(app);
      return app;
    });

    // Clean up all app instances
    for (const app of appInstances) {
      await app.context().close();
      await app.close();
    }
  }
});

/**
 * Helper function to select a workspace from the dropdown
 */
async function selectWorkspace(page: Page, workspaceName: string) {
  await baseTest.step(`Select workspace "${workspaceName}"`, async () => {
    // Click on workspace name to open dropdown
    await page.locator('.workspace-name-container').click();

    // Wait for dropdown to appear
    await page.locator('.tippy-box').waitFor({ state: 'visible' });

    // Click on the workspace item
    const workspaceItem = page.locator('.workspace-item').filter({ hasText: workspaceName });
    await expect(workspaceItem).toBeVisible();
    await workspaceItem.click();

    // Wait for dropdown to close
    await page.locator('.tippy-box').waitFor({ state: 'hidden' });

    // Verify workspace name appears in title bar
    await expect(page.locator('.workspace-name')).toContainText(workspaceName);
  });
}

/**
 * Helper function to get the current active workspace name
 */
async function getActiveWorkspaceName(page: Page): Promise<string> {
  const workspaceNameElement = page.locator('.workspace-name');
  await expect(workspaceNameElement).toBeVisible();
  return await workspaceNameElement.textContent() || '';
}

test.describe('Workspace Persistence', () => {
  test.setTimeout(2 * 60 * 1000); // 2 minutes - test runs 5 iterations with app restarts

  test('should persist active workspace selection across app restarts', async ({ allWorkspaceNames, restartApp }) => {
    let previousWorkspaceName: string = 'Workspace5';

    // Repeat the test 5 times
    for (let iteration = 1; iteration <= 5; iteration++) {
      await test.step(`Iteration ${iteration}: Verify previous workspace persisted and select new one`, async () => {
        // Launch app with pre-created workspaces
        const app = await restartApp();
        const page = await app.firstWindow();

        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        const activeWorkspaceName = await getActiveWorkspaceName(page);
        await page.waitForTimeout(2000);
        expect(activeWorkspaceName.toLowerCase()).toContain(previousWorkspaceName!.toLowerCase());

        // Select a random workspace (different from the current one)
        let selectedWorkspaceName: string;
        do {
          const randomIndex = Math.floor(Math.random() * allWorkspaceNames.length);
          selectedWorkspaceName = allWorkspaceNames[randomIndex];
        } while (selectedWorkspaceName === previousWorkspaceName);

        await selectWorkspace(page, selectedWorkspaceName);

        // Verify it's selected
        const activeName = await getActiveWorkspaceName(page);
        expect(activeName.toLowerCase()).toContain(selectedWorkspaceName.toLowerCase());

        // Store for next iteration
        previousWorkspaceName = selectedWorkspaceName;

        // Wait before closing to ensure state is saved
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Close the app gracefully (following pattern from other tests)
        await app.context().close();
        await app.close();

        // Wait a bit for the app to fully close and cleanup
        if (iteration < 5) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      });
    }
  });
});
