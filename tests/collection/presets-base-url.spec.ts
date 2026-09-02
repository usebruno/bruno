import { test, expect } from '../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection, setRequestUrlPreset } from '../utils/page';

const COLLECTION_NAME = 'presets-base-url';
const BASE_URL = 'https://api.example.com';

test.describe('New requests inherit the collection presets Base URL', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('the empty-collection "+ Add request" CTA pre-fills the preset Base URL', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);

    await test.step('Create a fresh collection', async () => {
      await createCollection(page, COLLECTION_NAME, await createTmpDir(COLLECTION_NAME));
      await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Save a Base URL in the collection presets', async () => {
      await setRequestUrlPreset(page, COLLECTION_NAME, BASE_URL);
      await expect(locators.presets.requestUrl()).toHaveValue(BASE_URL);
    });

    const cta = locators.sidebar.collectionScope(COLLECTION_NAME).getByTestId('add-request-cta');

    await test.step('Open the empty-collection CTA', async () => {
      if (!(await cta.isVisible())) {
        await locators.sidebar.collection(COLLECTION_NAME).click();
      }
      await expect(cta).toBeVisible();
      await cta.click();
    });

    await test.step('Create an HTTP request from the CTA', async () => {
      await page.getByTestId('add-request-cta-http').click();
    });

    await test.step('Verify the new request opens with the preset Base URL', async () => {
      await expect(locators.sidebar.itemRowIn(COLLECTION_NAME, 'Untitled')).toBeVisible();
      await expect(locators.requestUrl.editor()).toContainText(BASE_URL);
    });
  });
});
