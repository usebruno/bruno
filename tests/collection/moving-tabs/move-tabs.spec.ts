import { test, expect } from '../../../playwright';

test.describe('Move tabs', () => {
  test('Verify tab move by drag and drop', async ({ pageWithUserData: page, createTmpDir }) => {
    // Create a collection
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('source-collection');
    await page.getByLabel('Location').fill(await createTmpDir('source-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Wait for collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a folder in the collection
    const sourceCollection = page.locator('.collection-name').filter({ hasText: 'source-collection' });
    await sourceCollection.locator('.collection-actions').hover();
    await sourceCollection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();

    // Fill folder name in the modal
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the folder to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();

    // Open the folder tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();
    await page.waitForTimeout(500);
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' })).toBeVisible();

    // Add a request to the collection
    await sourceCollection.locator('.collection-actions').hover();
    await sourceCollection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://httpbin.org/get');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the request to be created
    await page.waitForTimeout(1000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await page.waitForTimeout(500);
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // Verify order of tabs before move
    const tabs = page.locator('.request-tab .tab-label');
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');

    // Drag and drop the request tab before the folder tab
    let source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    let target = page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' });
    let sourceBox = await source.boundingBox();
    let targetBox = await target.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
      await page.mouse.up();
    }

    // Verify order of tabs after drag and drop
    await expect(tabs.nth(0)).toHaveText('GETtest-request');
    await expect(tabs.nth(1)).toHaveText('test-folder');

    // Drag and drop the request tab back to its original position
    source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    target = page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' });
    sourceBox = await source.boundingBox();
    targetBox = await target.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height + 10, { steps: 5 });
      await page.mouse.up();
    }
  });

  test('Verify tab move by keyboard shortcut', async ({ pageWithUserData: page, createTmpDir }) => {
    // Create a collection
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('source-collection');
    await page.getByLabel('Location').fill(await createTmpDir('source-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Wait for collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a folder in the collection
    const sourceCollection = page.locator('.collection-name').filter({ hasText: 'source-collection' });
    await sourceCollection.locator('.collection-actions').hover();
    await sourceCollection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();

    // Fill folder name in the modal
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the folder to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();

    // Open the folder tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();
    await page.waitForTimeout(500);
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' })).toBeVisible();

    // Add a request to the collection
    await sourceCollection.locator('.collection-actions').hover();
    await sourceCollection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://httpbin.org/get');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the request to be created
    await page.waitForTimeout(1000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await page.waitForTimeout(500);
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // Verify order of tabs before move
    const tabs = page.locator('.request-tab .tab-label');
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');

    // Move the request tab before the folder tab using keyboard shortcut
    const source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    await source.click();
    await page.keyboard.press('ControlOrMeta+Shift+PageUp');
    await page.waitForTimeout(500);

    // Verify order of tabs after move
    await expect(tabs.nth(0)).toHaveText('GETtest-request');
    await expect(tabs.nth(1)).toHaveText('test-folder');

    // Move the request tab back to its original position using keyboard shortcut
    await source.click();
    await page.keyboard.press('ControlOrMeta+Shift+PageDown');
    await page.waitForTimeout(500);

    // Verify order of tabs after move
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');
  });
});
