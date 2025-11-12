import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Code Generation URL Encoding', () => {
  test.afterEach(async ({ page }) => {
    try {
      const modalCloseButton = page.locator('[data-test-id="modal-close-button"]');
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
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('unencoded-test-collection');
    await page.getByLabel('Location').fill(await createTmpDir('unencoded-test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'unencoded-test-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'unencoded-test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByPlaceholder('Request Name').fill('unencoded-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('http://base.source?name=John Doe');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('.collection-item-name').filter({ hasText: 'unencoded-request' })).toBeVisible();

    await page.locator('.collection-item-name').filter({ hasText: 'unencoded-request' }).click();

    await page.locator('#send-request .infotip').first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('.bruno-modal-header-title')).toContainText('Generate Code');

    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();

    const generatedCode = await codeEditor.textContent();

    expect(generatedCode).toContain('http://base.source/?name=John%20Doe');

    await page.locator('[data-test-id="modal-close-button"]').click();

    await page.locator('[data-test-id="modal-close-button"]').waitFor({ state: 'hidden' });
  });

  test('Should generate code with proper URL encoding for encoded input', async ({
    page,
    createTmpDir
  }) => {
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('encoded-test-collection');
    await page.getByLabel('Location').fill(await createTmpDir('encoded-test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'encoded-test-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'encoded-test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByPlaceholder('Request Name').fill('encoded-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('http://base.source?name=John%20Doe');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('.collection-item-name').filter({ hasText: 'encoded-request' })).toBeVisible();

    await page.locator('.collection-item-name').filter({ hasText: 'encoded-request' }).click();

    await page.locator('#send-request .infotip').first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('.bruno-modal-header-title')).toContainText('Generate Code');

    const codeEditor = page.locator('.editor-content .CodeMirror').first();
    await expect(codeEditor).toBeVisible();

    const generatedCode = await codeEditor.textContent();

    expect(generatedCode).toContain('http://base.source/?name=John%20Doe');

    await page.locator('[data-test-id="modal-close-button"]').click();

    await page.locator('[data-test-id="modal-close-button"]').waitFor({ state: 'hidden' });
  });
});
