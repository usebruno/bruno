import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequestFromEmptyStateCta,
  deleteRequest,
  setRequestUrlPreset
} from '../utils/page';

const COLLECTION_NAME = 'presets-base-url';
const BASE_URL = 'https://api.example.com';
const REQUEST_NAME = 'Untitled';

test.describe('New requests inherit the collection presets Base URL', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('the "+ Add request" CTA follows the Base URL preset as it is set and cleared', async ({
    page,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);

    await test.step('Create a fresh collection', async () => {
      await createCollection(page, COLLECTION_NAME, await createTmpDir(COLLECTION_NAME));
      await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Save a Base URL in the collection presets', async () => {
      await setRequestUrlPreset(page, COLLECTION_NAME, BASE_URL);
      await expect(locators.presets.requestUrl()).toHaveValue(BASE_URL);
    });

    await createRequestFromEmptyStateCta(page, COLLECTION_NAME);

    await test.step('Verify the new request opens with the preset Base URL', async () => {
      await expect(locators.sidebar.itemRowIn(COLLECTION_NAME, REQUEST_NAME)).toBeVisible();
      await expect(locators.request.urlLine().first()).toContainText(BASE_URL);
    });

    await test.step('Clear the Base URL preset', async () => {
      await setRequestUrlPreset(page, COLLECTION_NAME, '');
      await expect(locators.presets.requestUrl()).toHaveValue('');
    });

    await test.step('Delete the request so the collection is empty again', async () => {
      await deleteRequest(page, REQUEST_NAME, COLLECTION_NAME);
    });

    await createRequestFromEmptyStateCta(page, COLLECTION_NAME);

    await test.step('Verify the new request opens with an empty URL', async () => {
      await expect(locators.sidebar.itemRowIn(COLLECTION_NAME, REQUEST_NAME)).toBeVisible();
      await expect(locators.request.urlLine().first()).toHaveText('');
    });
  });
});
