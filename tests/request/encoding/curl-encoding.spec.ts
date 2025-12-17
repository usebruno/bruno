import { test, expect } from '../../../playwright';
import { closeAllCollections, createUntitledRequest } from '../../utils/page';

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
    // Use plus icon button in new workspace UI
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill('unencoded-test-collection');
    const locationInput = page.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('unencoded-test-collection'));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'unencoded-test-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'unencoded-test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new request using the new dropdown flow
    await createUntitledRequest(page, {
      requestType: 'HTTP',
      url: 'http://base.source?name=John Doe'
    });

    // Find the untitled request and click on it
    await page.locator('.item-name').filter({ hasText: /^Untitled/ }).first().click();

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
    // Use plus icon button in new workspace UI
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();
    await page.getByLabel('Name').fill('encoded-test-collection');
    const locationInput = page.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(await createTmpDir('encoded-test-collection'));
    }
    await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'encoded-test-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'encoded-test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a new request using the new dropdown flow
    await createUntitledRequest(page, {
      requestType: 'HTTP',
      url: 'http://base.source?name=John%20Doe'
    });

    // Find the untitled request and click on it
    await page.locator('.item-name').filter({ hasText: /^Untitled/ }).first().click();

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
