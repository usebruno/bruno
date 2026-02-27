import path from 'path';
import { ElectronApplication } from '@playwright/test';
import { test, expect, closeElectronApp } from '../../playwright';

const initUserDataPathFresh = path.join(__dirname, 'init-user-data-fresh');

test.describe('Welcome Modal', () => {
  test('should show welcome modal for new users on first launch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('welcome-modal-new-user');
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ userDataPath, initUserDataPath: initUserDataPathFresh });
      const page = await app.firstWindow();

      // Wait for the app to fully initialize before interacting
      await page.locator('[data-app-state="loaded"]').waitFor();

      // Welcome modal should be visible for new users
      const welcomeModal = page.getByTestId('welcome-modal');
      await expect(welcomeModal).toBeVisible();

      // Verify welcome content is displayed
      await expect(welcomeModal.getByText('Welcome to Bruno')).toBeVisible();
      await expect(welcomeModal.getByText('A fast, Git-friendly, and open-source API client.')).toBeVisible();
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should not show welcome modal for existing users', async ({ pageWithUserData: page }) => {
    // pageWithUserData uses init-user-data/preferences.json which has hasSeenWelcomeModal: true
    // Welcome modal should NOT be visible for existing users
    const welcomeModal = page.getByTestId('welcome-modal');
    await expect(welcomeModal).not.toBeVisible();
  });

  test('should dismiss welcome modal and not show again on restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('welcome-modal-dismiss');
    let app: ElectronApplication | undefined;

    try {
      // Launch app for a new user - welcome modal should appear
      app = await launchElectronApp({ userDataPath, initUserDataPath: initUserDataPathFresh });
      let page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor();

      // Welcome modal should be visible for new users
      const welcomeModal = page.getByTestId('welcome-modal');
      await expect(welcomeModal).toBeVisible();

      // Dismiss the modal by clicking Skip
      await page.getByRole('button', { name: 'Skip' }).click();
      await expect(welcomeModal).not.toBeVisible();

      // Close the app
      await closeElectronApp(app);
      app = undefined;

      // Restart the app with the same userDataPath
      app = await launchElectronApp({ userDataPath });
      page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor();

      // Welcome modal should NOT appear after restart (hasSeenWelcomeModal persisted)
      await expect(page.getByTestId('welcome-modal')).not.toBeVisible();
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should navigate through welcome modal steps', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('welcome-modal-steps');
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ userDataPath, initUserDataPath: initUserDataPathFresh });
      const page = await app.firstWindow();

      // Wait for the app to fully initialize before interacting
      await page.locator('[data-app-state="loaded"]').waitFor();

      const welcomeModal = page.getByTestId('welcome-modal');

      // Step 1: Welcome
      await expect(welcomeModal.getByText('Welcome to Bruno')).toBeVisible();
      await welcomeModal.getByRole('button', { name: 'Get Started' }).click();

      // Step 2: Theme selection
      await expect(welcomeModal.getByText('Choose your theme')).toBeVisible();
      await welcomeModal.getByRole('button', { name: 'Next' }).click();

      // Step 3: Collection location
      await expect(welcomeModal.getByText('Where should we store your collections?')).toBeVisible();
      await welcomeModal.getByRole('button', { name: 'Next' }).click();

      // Step 4: Actions
      await expect(welcomeModal.getByText('Ready to go!')).toBeVisible();
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });

  test('should open create collection modal from welcome modal', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('welcome-modal-create');
    let app: ElectronApplication | undefined;

    try {
      app = await launchElectronApp({ userDataPath, initUserDataPath: initUserDataPathFresh });
      const page = await app.firstWindow();

      // Wait for the app to fully initialize before interacting
      await page.locator('[data-app-state="loaded"]').waitFor();

      const welcomeModal = page.getByTestId('welcome-modal');

      // Navigate to last step
      await welcomeModal.getByRole('button', { name: 'Get Started' }).click();
      await welcomeModal.getByRole('button', { name: 'Next' }).click();
      await welcomeModal.getByRole('button', { name: 'Next' }).click();

      // Click Create Collection
      await welcomeModal.locator('.primary-action-card').filter({ hasText: 'Create Collection' }).click();

      // Welcome modal should be dismissed
      await expect(welcomeModal).not.toBeVisible();

      // Create Collection modal should appear
      await expect(page.locator('.bruno-modal').filter({ hasText: 'Create Collection' })).toBeVisible();
    } finally {
      if (app) {
        await closeElectronApp(app);
      }
    }
  });
});
