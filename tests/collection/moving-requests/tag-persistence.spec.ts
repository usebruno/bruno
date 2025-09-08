import { test, expect } from '../../../playwright';

test.describe('Tag persistence', () => {
  test('Verify tag persistence', async ({ pageWithUserData: page, createTmpDir }) => {
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
});
