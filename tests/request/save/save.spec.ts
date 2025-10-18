import { test, expect, Locator, Page } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { waitForPredicate } from '../../utils/wait';

const isRequestSaved = async (saveButton: Locator) => {
  const savedColor = '#9f9f9f';
  return (await saveButton.evaluate((d) => d.querySelector('svg')?.getAttribute('stroke') ?? '#invalid')) === savedColor;
};

const setup = async (page: Page, createTmpDir: (tag?: string | undefined) => Promise<string>) => {
  await page.locator('.dropdown-icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
  await page.getByLabel('Name').fill('source-collection');
  await page.getByLabel('Location').fill(await createTmpDir('source-collection'));
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
  await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
  await page.getByLabel('Safe Mode').check();
  await page.getByRole('button', { name: 'Save' }).click();
  const sourceCollection = page.locator('.collection-name').filter({ hasText: 'source-collection' });
  await sourceCollection.locator('.collection-actions').hover();
  await sourceCollection.locator('.collection-actions .icon').click();
  await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
  await page.getByPlaceholder('Request Name').fill('test-request');
  await page.locator('#new-request-url .CodeMirror').click();
  await page.locator('textarea').fill('https://httpbin.org/get');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();
};

test.describe.serial('save requests', () => {
  test.beforeAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('saves new http request', async ({ page, createTmpDir }) => {
    // prep the collection by creating a new collection and a new http request
    await setup(page, createTmpDir);

    const locators = buildCommonLocators(page);
    const originalUrl = 'https://httpbin.org/get';
    const replacementUrl = 'ws://localhost:8082';

    const clearText = async (text: string) => {
      for (let i = text.length; i > 0; i--) {
        await page.keyboard.press('Backspace');
      }
    };

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // remove the original url from the request
    await page.locator('.input-container').filter({ hasText: originalUrl }).first().click();
    await clearText(originalUrl);

    // replace it with an arbitrary url
    await page.keyboard.insertText(replacementUrl);

    // check if the request is now unsaved
    expect(await isRequestSaved(locators.saveButton())).toBe(false);

    // trigger a save
    locators.saveButton().click();

    // Wait for it to be saved
    const result = await waitForPredicate(() => isRequestSaved(locators.saveButton()));
    expect(result).toBe(true);
  });
});
