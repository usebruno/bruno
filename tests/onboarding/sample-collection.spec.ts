import { test, expect, errors } from '../../playwright';

test.describe('Onboarding', () => {
  test('should create sample collection on first launch', async ({ launchElectronApp, createTmpDir }) => {
    // Use a fresh app instance to avoid contamination from previous tests
    const userDataPath = await createTmpDir('onboarding-fresh');
    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    
    // Verify sample collection appears in sidebar
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    
    // Click on the sample collection to open it
    await sampleCollection.click();
    const modeSaveButton = page.getByRole('button', { name: 'Save' });
    await expect(modeSaveButton).toBeVisible();
    await modeSaveButton.click();
    
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
    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    
    // First launch - verify sample collection is created
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    await sampleCollection.click();
    const modeSaveButton = page.getByRole('button', { name: 'Save' });
    await expect(modeSaveButton).toBeVisible();
    await modeSaveButton.click();
    
    // Verify the sample request
    const request = page.locator('.collection-item-name').getByText('Get Users');
    await expect(request).toBeVisible();
    await request.click();
    
    // Verify the URL is set correctly
    await expect(page.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');

    // Close the first app instance
    await app.close();

    // Restart app - should not create sample collection again
    const newApp = await launchElectronApp({ userDataPath });
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
    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    
    // First launch - sample collection should be created
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    
    // User closes the sample collection (right-click to open context menu)
    await sampleCollection.click({ button: 'right' });
    
    // Close the sample collection
    const closeOption = page.locator('.dropdown-item').getByText('Close');
    await expect(closeOption).toBeVisible();
    await closeOption.click();
    
    // Handle the confirmation dialog - click the 'Close' button to confirm
    const confirmCloseButton = page.getByRole('button', { name: 'Close' });
    await expect(confirmCloseButton).toBeVisible();
    await confirmCloseButton.click();
    
    // Verify collection is closed (no longer visible in sidebar)
    await expect(sampleCollection).not.toBeVisible();
  
    // Restart app - sample collection should NOT be recreated
    const newApp = await reuseOrLaunchElectronApp({ userDataPath });
    const newPage = await newApp.firstWindow();
  
    // Sample collection should not appear since it's no longer first launch
    const sampleCollections = newPage.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollections).not.toBeVisible();
  });

  test('should not create sample collection if user has already opened a collection', async ({ pageWithUserData: page }) => {
    // This test simulates old users who already have a collection opened
    const brunoTestbench = page.locator('#sidebar-collection-name').getByText('bruno-testbench');
    await expect(brunoTestbench).toBeVisible();

    try {
      await page.locator('#sidebar-collection-name').getByText('Sample API Collection').waitFor({ timeout: 2000 });
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof errors.TimeoutError).toBe(true);
    }
  });
});
