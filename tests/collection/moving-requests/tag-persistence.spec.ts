import { test, expect } from '../../../playwright';
import { closeAllCollections, createUntitledRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Tag persistence', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tag persistence while moving requests within a collection', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    // Create first collection - click plus icon button to open dropdown
    await locators.plusMenu.button().click();
    await locators.plusMenu.createCollection().click();
    await page.getByLabel('Name').fill('test-collection');
    const locationInput = locators.modal.byTitle('Create Collection').getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('test-collection'));
    }
    await locators.modal.button('Create').click();
    await locators.sidebar.collection('test-collection').click();
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
    await locators.tabs.activeRequestTab().waitFor({ state: 'visible' });
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    // Verify the tag is still present after the move
    await expect(locators.tags.item('smoke')).toBeVisible();
  });

  test('verify tag persistence while moving requests between folders', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    // Create first collection - click plus icon button to open dropdown
    await locators.plusMenu.button().click();
    await locators.plusMenu.createCollection().click();
    await page.getByLabel('Name').fill('test-collection');
    const locationInput = locators.modal.byTitle('Create Collection').getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('test-collection'));
    }
    await locators.modal.button('Create').click();
    await locators.sidebar.collection('test-collection').click();

    // Create a new folder
    await locators.sidebar.collectionRow('test-collection').hover();
    await locators.actions.collectionActions('test-collection').click();
    await page.waitForTimeout(1);
    await locators.dropdown.item('New Folder').click();
    await page.locator('#folder-name').fill('folder-1');
    await locators.modal.button('Create').click();
    await page.waitForTimeout(100);

    // Create a new request within folder-1 folder
    await locators.sidebar.folder('folder-1').click();
    await page.waitForTimeout(200);

    await locators.sidebar.folder('folder-1').hover();
    await locators.actions.collectionItemActions('folder-1').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-1');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();

    // create another request within folder-1 folder
    await locators.sidebar.folder('folder-1').hover();
    await locators.actions.collectionItemActions('folder-1').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-2');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();
    await page.waitForTimeout(200);

    // Add a tag to the request
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    await locators.tags.input().fill('smoke');
    await locators.tags.input().press('Enter');
    await page.waitForTimeout(200);
    await expect(locators.tags.item('smoke')).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Create another folder
    await locators.sidebar.collectionRow('test-collection').hover();
    await locators.actions.collectionActions('test-collection').click();
    await locators.dropdown.item('New Folder').click();
    await page.locator('#folder-name').fill('folder-2');
    await locators.modal.button('Create').click();

    // open folder-2 folder
    await locators.sidebar.folder('folder-2').click();
    await locators.sidebar.folder('folder-2').hover();
    await locators.actions.collectionItemActions('folder-2').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-3');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();

    // Drag and drop request-2 request to folder-2 folder
    const r2Request = locators.sidebar.request('request-2');
    const f2Folder = locators.sidebar.folder('folder-2');
    await r2Request.dragTo(f2Folder);

    // Verify the requests are still in the collection and request-2 is now in folder-2 folder
    await expect(locators.sidebar.request('request-2')).toBeVisible();
    await expect(locators.sidebar.folder('folder-2')).toBeVisible();

    // Click on request-2 to verify the tag persisted after the move
    await locators.sidebar.request('request-2').click();
    await page.waitForTimeout(200);

    await locators.tabs.requestTab('request-2').waitFor({ state: 'visible' });
    await selectRequestPaneTab(page, 'Settings');
    await page.waitForTimeout(200);
    await expect(locators.tags.item('smoke')).toBeVisible();
  });
});
