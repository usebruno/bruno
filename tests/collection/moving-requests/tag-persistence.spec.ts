import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Tag persistence', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tag persistence while moving requests within a collection', async ({ page, createTmpDir }) => {
    // Create first collection - click dropdown menu first
    await page.getByLabel('Create Collection').click();
    await page.getByLabel('Name').fill('test-collection');
    await page.getByLabel('Location').fill(await createTmpDir('test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('test-collection').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-1');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-2');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-3');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    await page.waitForTimeout(200);

    // Add a tag to the request
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.waitForTimeout(200);
    const tagInput = await page.getByTestId('tag-input').getByRole('textbox');
    await tagInput.fill('smoke');
    await tagInput.press('Enter');
    await page.waitForTimeout(200);
    // Verify the tag was added
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Move the request-3 request to just above request-1 within the same collection
    const r3Request = page.locator('.collection-item-name').filter({ hasText: 'request-3' });
    const r1Request = page.locator('.collection-item-name').filter({ hasText: 'request-1' });
    
    await expect(r3Request).toBeVisible();
    await expect(r1Request).toBeVisible();

    // Perform drag and drop operation to move request-3 below request-1 using source position
    await r3Request.dragTo(r1Request, {
      targetPosition: { x: 0, y: 1 }
    });

    // Verify the requests are still in the collection and request-3 is now above request-1
    await expect(page.locator('.collection-item-name').filter({ hasText: 'request-3' })).toBeVisible();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'request-1' })).toBeVisible();

    // Click on request-3 to verify the tag persisted after the move
    await page.locator('.collection-item-name').filter({ hasText: 'request-3' }).click();
    await page.locator('.request-tab.active').filter({ hasText: 'request-3' }).waitFor({ state: 'visible' });
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.waitForTimeout(200);
    // Verify the tag is still present after the move
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
  });

  test('verify tag persistence while moving requests between folders', async ({ page, createTmpDir }) => {
    // Create first collection - click dropdown menu first
    await page.getByLabel('Create Collection').click();
    await page.getByLabel('Name').fill('test-collection');
    await page.getByLabel('Location').fill(await createTmpDir('test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('test-collection').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new folder
    await page.locator('.collection-name')
      .filter({ hasText: 'test-collection' }).hover();
    await page.locator('.collection-name')
      .filter({ hasText: 'test-collection' }).locator('.collection-actions .icon').click();
    await page.waitForTimeout(1);
    await page.getByText('New Folder').click();
    await page.locator('#folder-name').fill('folder-1');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(100);

    // Create a new request within folder-1 folder
    await page.getByText('folder-1').click();
    await page.waitForTimeout(200);

    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).hover();
    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).locator('.menu-icon').click();
    await page.locator('.dropdown-item').getByText('New Request').click()
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-1');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request within folder-1 folder
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-1' }).hover();
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-1' }).locator('.menu-icon').click();
    await page.locator('.dropdown-item').getByText('New Request').click()
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-2');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(200);

    // Add a tag to the request
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.waitForTimeout(200);
    const tagInput = await page.getByTestId('tag-input').getByRole('textbox');
    await tagInput.fill('smoke');
    await tagInput.press('Enter');
    await page.waitForTimeout(200);
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Create another folder
    await page.locator('.collection-name')
      .filter({ hasText: 'test-collection' }).hover();
    await page.locator('.collection-name')
      .filter({ hasText: 'test-collection' }).locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').getByText('New Folder').click();
    await page.locator('#folder-name').fill('folder-2');
    await page.getByRole('button', { name: 'Create' }).click();

    // open folder-2 folder
    await page.getByText('folder-2').click();
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-2' }).hover();
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-2' }).locator('.menu-icon').click();
    await page.locator('.dropdown-item').getByText('New Request').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-3');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Drag and drop request-2 request to folder-2 folder
    const r2Request = page.locator('.collection-item-name').filter({ hasText: 'request-2' });
    const f2Folder = page.locator('.collection-item-name').filter({ hasText: 'folder-2' });
    await r2Request.dragTo(f2Folder);
    
    // Verify the requests are still in the collection and request-2 is now in folder-2 folder
    await expect(page.locator('.collection-item-name').filter({ hasText: 'request-2' })).toBeVisible();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-2' })).toBeVisible();

    // Click on request-2 to verify the tag persisted after the move
    await page.locator('.collection-item-name').filter({ hasText: 'request-2' }).click();
    await page.locator('.request-tab.active').filter({ hasText: 'request-2' }).waitFor({ state: 'visible' });
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
  });
});
