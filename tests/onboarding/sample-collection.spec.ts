import path from 'path';
import { test, expect, errors } from '../../playwright';

const env = {
  DISABLE_SAMPLE_COLLECTION_IMPORT: 'false'
};

test.describe('Onboarding', () => {
  test('should create sample collection on first launch', async ({ launchElectronApp, createTmpDir }) => {
    // Use a fresh app instance to avoid contamination from previous tests
    const userDataPath = await createTmpDir('onboarding-fresh');
    const app = await launchElectronApp({ userDataPath, dotEnv: env });
    const page = await app.firstWindow();

    // Verify sample collection appears in sidebar
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();

    // Click on the sample collection to open it
    await sampleCollection.click();

    // Verify the sample request is visible and clickable
    const request = page.locator('.collection-item-name').getByText('Get Users');
    await expect(request).toBeVisible();
    await request.click();

    // Verify the URL is set correctly
    await expect(page.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');

    // Clean up
    await app.close();
  });

  test('should not create duplicate collections on subsequent launches', async ({ launchElectronApp, createTmpDir }) => {
    // Use a fresh app instance to avoid contamination from previous tests
    const userDataPath = await createTmpDir('duplicate-collections');
    const app = await launchElectronApp({ userDataPath, dotEnv: env });
    const page = await app.firstWindow();

    // First launch - verify sample collection is created
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    await sampleCollection.click();

    // Verify the sample request
    const request = page.locator('.collection-item-name').getByText('Get Users');
    await expect(request).toBeVisible();
    await request.click();

    // Verify the URL is set correctly
    await expect(page.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');

    // Close the first app instance
    await app.close();

    // Restart app - should not create sample collection again
    const newApp = await launchElectronApp({ userDataPath, dotEnv: env });
    const newPage = await newApp.firstWindow();

    // Verify only one sample collection exists
    const sampleCollections = newPage.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollections).toHaveCount(1);

    // Verify the collection still works after restart
    await sampleCollections.click();
    const request2 = newPage.locator('.collection-item-name').getByText('Get Users');
    await expect(request2).toBeVisible();
    await request2.click();

    // Verify the URL is still correct after restart
    await expect(newPage.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');

    // Clean up
    await newApp.close();
  });

  test('should not recreate sample collection after user deletes it', async ({ launchElectronApp, reuseOrLaunchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('first-launch');
    const app = await launchElectronApp({ userDataPath, dotEnv: env });
    const page = await app.firstWindow();

    // First launch - sample collection should be created
    const sampleCollection = page.getByTestId('collections').locator('.collection-name').filter({ hasText: 'Sample API Collection' });
    await expect(sampleCollection).toBeVisible();

    // User removes the sample collection from workspace (hover on the collection and open context menu)
    await sampleCollection.hover();
    await sampleCollection.locator('.collection-actions .icon').click();

    // Remove the sample collection
    const removeOption = page.locator('.dropdown-item').getByText('Remove');
    await expect(removeOption).toBeVisible();
    await removeOption.click();

    // Wait for modal to appear - could be either regular remove or drafts confirmation
    const removeModal = page.locator('.bruno-modal').filter({ hasText: 'Remove Collection' });
    await removeModal.waitFor({ state: 'visible', timeout: 5000 });

    // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
    const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

    if (hasDiscardButton) {
      // Drafts modal - click "Discard All and Remove"
      await page.getByRole('button', { name: 'Discard All and Remove' }).click();
    } else {
      // Regular modal - click the submit button
      await page.locator('.bruno-modal-footer .submit').click();
    }

    // Verify collection is closed (no longer visible in sidebar)
    await expect(sampleCollection).not.toBeVisible();

    // Restart app - sample collection should NOT be recreated
    const newApp = await reuseOrLaunchElectronApp({ userDataPath, dotEnv: env });
    const newPage = await newApp.firstWindow();

    // Wait for the app to be loaded / onboarding to be completed
    await newPage.locator('[data-app-state="loaded"]').waitFor();

    // Sample collection should not appear since it's no longer first launch
    const sampleCollections = newPage.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollections).not.toBeVisible();
  });

  test('should not create sample collection if user has already opened a collection', async ({ pageWithUserData: page }) => {
    // Wait for the app to be loaded / onboarding to be completed
    await page.locator('[data-app-state="loaded"]').waitFor();

    // This test simulates old users who already have a collection opened
    const brunoTestbench = page.locator('#sidebar-collection-name').getByText('bruno-testbench');
    await expect(brunoTestbench).toBeVisible();

    // Verify no sample collection was created since user already has collections
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).not.toBeVisible();
  });
});
