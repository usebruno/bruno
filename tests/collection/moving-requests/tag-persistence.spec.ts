import { test, expect } from '../../../playwright';
import { closeAllCollections, createUntitledRequest, selectRequestPaneTab } from '../../utils/page';

test.describe('Tag persistence', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tag persistence while moving requests within a collection', async ({ page, createTmpDir }) => {
    // Create first collection - click plus icon button to open dropdown
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill('test-collection');
    const locationInput = page.locator('.bruno-modal').getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('test-collection'));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(1000);
    // Create three requests, each with URL and tag (auto-saved after each is completely created)
    // The createUntitledRequest function now waits for each request to be fully created
    // before returning, ensuring unique names are generated
    await createUntitledRequest(page, {
      requestType: 'HTTP',
      url: 'https://httpfaker.org/api/echo',
      tag: 'smoke'
    });
    await createUntitledRequest(page, {
      requestType: 'HTTP',
      url: 'https://httpfaker.org/api/echo',
      tag: 'smoke'
    });
    await createUntitledRequest(page, {
      requestType: 'HTTP',
      url: 'https://httpfaker.org/api/echo',
      tag: 'smoke'
    });

    // Wait for all 3 requests to be visible in the sidebar
    const untitledRequests = page.locator('.item-name').filter({ hasText: /^Untitled/ });
    await expect(untitledRequests).toHaveCount(3);

    // Move the last untitled request to just above the first untitled request within the same collection
    const r3Request = untitledRequests.nth(2); // Third request (0-indexed)
    const r1Request = untitledRequests.first(); // First request

    await expect(r3Request).toBeVisible();
    await expect(r1Request).toBeVisible();

    // Perform drag and drop operation to move the last request above the first using source position
    await r3Request.dragTo(r1Request, {
      targetPosition: { x: 0, y: 1 }
    });

    // Verify the requests are still in the collection
    await expect(untitledRequests).toHaveCount(3);

    // Click on the moved request (now first) to verify the tag persisted after the move
    await untitledRequests.first().click();
    await page.locator('.request-tab.active').waitFor({ state: 'visible' });
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    // Verify the tag is still present after the move
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
  });

  test('verify tag persistence while moving requests between folders', async ({ page, createTmpDir }) => {
    // Create first collection - click plus icon button to open dropdown
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill('test-collection');
    const locationInput = page.locator('.bruno-modal').getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('test-collection'));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'test-collection' }).click();
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
    await page.locator('.dropdown-item').getByText('New Request').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-1');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();

    // create another request within folder-1 folder
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-1' }).hover();
    await page.locator('.collection-item-name')
      .filter({ hasText: 'folder-1' }).locator('.menu-icon').click();
    await page.locator('.dropdown-item').getByText('New Request').click();
    await page.getByRole('textbox', { name: 'Request Name' }).fill('request-2');
    await page.locator('#new-request-url textarea').fill('https://httpfaker.org/api/echo');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(200);

    // Add a tag to the request
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    const tagInput2 = await page.getByTestId('tag-input').getByRole('textbox');
    await tagInput2.fill('smoke');
    await tagInput2.press('Enter');
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
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    await expect(page.locator('.tag-item', { hasText: 'smoke' })).toBeVisible();
  });
});
