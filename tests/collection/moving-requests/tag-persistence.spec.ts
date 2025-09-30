import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Tag persistence', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tag persistence while moving requests within a collection', async ({ pageWithUserData: page, createTmpDir }) => {
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
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r1');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r2');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r3');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    await page.waitForTimeout(200);

    // Add a tag to the request
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByText('Tagse.g., smoke, regression').click();
    await page.getByRole('textbox').nth(2).fill('smoke');
    await page.getByRole('textbox').nth(2).press('Enter');

    // Verify the tag was added
    await expect(page.getByRole('button', { name: 'smoke' })).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Move the r2 request to just above r1 within the same collection
    const r3Request = page.locator('.collection-item-name').filter({ hasText: 'r3' });
    const r1Request = page.locator('.collection-item-name').filter({ hasText: 'r1' });
    
    await expect(r3Request).toBeVisible();
    await expect(r1Request).toBeVisible();

    // Perform drag and drop operation to move r3 below r1 using source position
    await r3Request.dragTo(r1Request, {
      targetPosition: { x: 0, y: 1 }
    });

    // Verify the requests are still in the collection and r3 is now above r1
    await expect(page.locator('.collection-item-name').filter({ hasText: 'r3' })).toBeVisible();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'r1' })).toBeVisible();

    // Click on r3 to verify the tag persisted after the move
    await page.locator('.collection-item-name').filter({ hasText: 'r3' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    
    // Verify the tag is still present after the move
    await expect(page.getByRole('button', { name: 'smoke' })).toBeVisible();
  });

  test('verify tag persistence while moving requests between folders', async ({ pageWithUserData: page, createTmpDir }) => {
    // Create first collection - click dropdown menu first
    await page.getByLabel('Create Collection').click();
    await page.getByLabel('Name').fill('test-collection');
    await page.getByLabel('Location').fill(await createTmpDir('test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('test-collection').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new folder
    await page.getByTitle('test-collection').click({
      button: 'right'
    });
    await page.waitForTimeout(200);
    await page.getByText('New Folder').click();
    await page.locator('#collection-name').fill('f1');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(200);

    // Create a new request within f1 folder
    await page.getByText('f1').click();
    await page.waitForTimeout(200);
    await page.getByTitle('f1', { exact: true }).click({
      button: 'right'
    });
    await page.locator('.dropdown-item').getByText('New Request').click()
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r1');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request within f1 folder
    await page.getByTitle('f1', { exact: true }).click({
      button: 'right'
    });
    await page.locator('.dropdown-item').getByText('New Request').click()
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r2');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(200);

    // Add a tag to the request
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByText('Tagse.g., smoke, regression').click();
    await page.getByRole('textbox').nth(2).fill('smoke');
    await page.getByRole('textbox').nth(2).press('Enter');
    await expect(page.getByRole('button', { name: 'smoke' })).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Create another folder
    await page.getByTitle('test-collection').click({
      button: 'right'
    });
    await page.locator('.dropdown-item').getByText('New Folder').click();
    await page.locator('#collection-name').fill('f2');
    await page.getByRole('button', { name: 'Create' }).click();

    // open f2 folder
    await page.getByText('f2').click();
    await page.getByTitle('f2', { exact: true }).click({
      button: 'right'
    });
    await page.locator('.dropdown-item').getByText('New Request').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('r3');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Drag and drop r2 request to f2 folder
    const r2Request = page.locator('.collection-item-name').filter({ hasText: 'r2' });
    const f2Folder = page.locator('.collection-item-name').filter({ hasText: 'f2' });
    await r2Request.dragTo(f2Folder);
    
    // Verify the requests are still in the collection and r2 is now in f2 folder
    await expect(page.locator('.collection-item-name').filter({ hasText: 'r2' })).toBeVisible();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'f2' })).toBeVisible();

    // Click on r2 to verify the tag persisted after the move
    await page.locator('.collection-item-name').filter({ hasText: 'r2' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(page.getByRole('button', { name: 'smoke' })).toBeVisible();
  });
});
