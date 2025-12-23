import { test, expect } from '../../../playwright';
import { closeAllCollections, createRequest } from '../../utils/page';

test.describe('Code Generation URL Encoding', () => {
  test.afterEach(async ({ page }) => {
    try {
      const modalCloseButton = page.getByTestId('modal-close-button');
      if (await modalCloseButton.isVisible()) {
        await modalCloseButton.click();
        await modalCloseButton.waitFor({ state: 'hidden' });
      }
    } catch (e) {}

    await closeAllCollections(page);
  });

  test('Should generate code with proper URL encoding for unencoded input', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'unencoded-test-collection';
    const requestName = 'curl-encoding-unencoded';

    // Use plus icon button in new workspace UI
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill(collectionName);
    const locationInput = page.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir(collectionName));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    // Create a new request using the dialog/modal flow
    await createRequest(page, requestName, collectionName, { url: 'http://base.source?name=John Doe' });

    // Click the request in the sidebar
    await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();

    await page.locator('#send-request .infotip').first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('.bruno-modal-header-title')).toContainText('Generate Code');

    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();

    const generatedCode = await codeEditor.textContent();

    expect(generatedCode).toContain('http://base.source/?name=John%20Doe');

    await page.getByTestId('modal-close-button').click();

    await page.getByTestId('modal-close-button').waitFor({ state: 'hidden' });
  });

  test('Should generate code with proper URL encoding for encoded input', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'encoded-test-collection';
    const requestName = 'curl-encoding-encoded';

    // Use plus icon button in new workspace UI
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill(collectionName);
    const locationInput = page.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir(collectionName));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    // Create a new request using the dialog/modal flow
    await createRequest(page, requestName, collectionName, { url: 'http://base.source?name=John%20Doe' });

    // Click the request in the sidebar
    await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();

    await page.locator('#send-request .infotip').first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('.bruno-modal-header-title')).toContainText('Generate Code');

    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();

    const generatedCode = await codeEditor.textContent();

    expect(generatedCode).toContain('http://base.source/?name=John%20Doe');

    await page.getByTestId('modal-close-button').click();

    await page.getByTestId('modal-close-button').waitFor({ state: 'hidden' });
  });
});
