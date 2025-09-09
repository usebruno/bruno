import { test, expect } from '../../playwright';

test.describe('Onboarding', () => {
  test('should create sample collection on first launch', async ({ page }) => {
    // Verify sample collection appears in sidebar
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    
    // Click on the sample collection to open it
    await sampleCollection.click();
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Verify the sample request is visible and clickable
    const request = page.locator('.collection-item-name').getByText('Get Users');
    await expect(request).toBeVisible();
    await request.click();
    
    // Verify the URL is set correctly instead of running the request
    await expect(page.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');
  });

  test('should not create duplicate collections on subsequent launches', async ({ launchElectronApp, reuseOrLaunchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('first-launch');
    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    
    // First launch - verify sample collection is created
    const sampleCollection = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollection).toBeVisible();
    await sampleCollection.click();
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Verify the sample request works
    const request = page.locator('.collection-item-name').getByText('Get Users');
    await expect(request).toBeVisible();
    await request.click();
    
    // Verify the URL is set correctly instead of running the request
    await expect(page.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');

    // Restart app - should not create another collection
    const newApp = await reuseOrLaunchElectronApp({ userDataPath });
    const newPage = await newApp.firstWindow();

    // Verify only one sample collection exists
    const sampleCollections = newPage.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollections).toBeVisible();
    
    // Verify the collection still works after restart
    await sampleCollections.click();
    const request2 = newPage.locator('.collection-item-name').getByText('Get Users');
    await expect(request2).toBeVisible();
    await request2.click();
    
    // Verify the URL is still correct after restart
    await expect(newPage.locator('#request-url')).toContainText('https://jsonplaceholder.typicode.com/users');
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
    
    // Look for 'Close' option in context menu
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
    
    // Verify no sample collection was created since user already has collections
    const sampleCollections = page.locator('#sidebar-collection-name').getByText('Sample API Collection');
    await expect(sampleCollections).not.toBeVisible();
  });
});
