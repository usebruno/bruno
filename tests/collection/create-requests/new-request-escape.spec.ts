import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  openNewRequestModal
} from '../../utils/page';
import {
  buildAutocompleteLocators,
  expectAutocompleteStaysClosed,
  expectSingleBraceOpensAutocomplete
} from '../../utils/page/autocomplete';

test.describe('New Request modal - Escape key', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('first Escape closes the URL autocomplete, second Escape closes the modal', async ({ page, createTmpDir }) => {
    const collectionName = 'new-request-esc-autocomplete';
    const { modal, request } = buildCommonLocators(page);
    const newRequestModal = modal.byTitle('New Request');
    const urlEditor = request.newRequestUrl();
    const autocompleteWidget = buildAutocompleteLocators(page).widget();

    await test.step('Open the New Request modal and trigger autocomplete in the URL', async () => {
      await createCollection(page, collectionName, await createTmpDir());
      await openNewRequestModal(page, collectionName);
      await expectSingleBraceOpensAutocomplete(page, urlEditor);
    });

    await test.step('First Escape closes only the autocomplete', async () => {
      await page.keyboard.press('Escape');
      await expect(autocompleteWidget).toBeHidden();

      // the editor must still be focused and the modal must not be animating out
      await page.keyboard.type('x');
      await expect(urlEditor).toContainText('{x');
      await expect(newRequestModal).toBeVisible();
      await expect(newRequestModal).not.toHaveClass(/modal--animate-out/);
    });

    await test.step('Second Escape closes the modal', async () => {
      await page.keyboard.press('Escape');
      await expect(newRequestModal).toBeHidden();
    });
  });

  test('Shift+Escape closes the URL autocomplete without closing the modal', async ({ page, createTmpDir }) => {
    const collectionName = 'new-request-shift-esc-autocomplete';
    const { modal, request } = buildCommonLocators(page);
    const newRequestModal = modal.byTitle('New Request');
    const urlEditor = request.newRequestUrl();
    const autocompleteWidget = buildAutocompleteLocators(page).widget();

    await test.step('Open the New Request modal and trigger autocomplete in the URL', async () => {
      await createCollection(page, collectionName, await createTmpDir());
      await openNewRequestModal(page, collectionName);
      await expectSingleBraceOpensAutocomplete(page, urlEditor);
    });

    await test.step('Shift+Escape closes only the autocomplete', async () => {
      await page.keyboard.press('Shift+Escape');
      await expect(autocompleteWidget).toBeHidden();

      // the editor must still be focused and the modal must not be animating out
      await page.keyboard.type('x');
      await expect(urlEditor).toContainText('{x');
      await expect(newRequestModal).toBeVisible();
      await expect(newRequestModal).not.toHaveClass(/modal--animate-out/);
    });

    await test.step('Escape then closes the modal', async () => {
      await page.keyboard.press('Escape');
      await expect(newRequestModal).toBeHidden();
    });
  });

  test('Escape closes the modal when the URL autocomplete is not open', async ({ page, createTmpDir }) => {
    const collectionName = 'new-request-esc-no-autocomplete';
    const { modal, request } = buildCommonLocators(page);
    const newRequestModal = modal.byTitle('New Request');
    const urlEditor = request.newRequestUrl();

    await test.step('Open the New Request modal and type a URL without opening autocomplete', async () => {
      await createCollection(page, collectionName, await createTmpDir());
      await openNewRequestModal(page, collectionName);
      await urlEditor.click();
      await page.keyboard.type('https://example.com');
      await expect(urlEditor).toContainText('https://example.com');
      await expectAutocompleteStaysClosed(page);
    });

    await test.step('Escape closes the modal', async () => {
      await page.keyboard.press('Escape');
      await expect(newRequestModal).toBeHidden();
    });
  });
});
