import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../../utils/page';

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

    // Create collection and request
    await createCollection(page, collectionName, await createTmpDir(collectionName));
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

    // Create collection and request
    await createCollection(page, collectionName, await createTmpDir(collectionName));
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
