import fs from 'fs';
import path from 'path';
import { expect, test } from '../../../playwright';
import {
  addRequestTag,
  buildCommonLocators,
  buildRequestSettingsLocators,
  closeAllCollections,
  createCollection,
  createRequestViaModal,
  saveRequest,
  selectRequestPaneTab
} from '../../utils/page';

const COLLECTION_NAME = 'settings-yaml';
const REQUEST_NAME = 'Tag Request';
const TAG_NAME = 'smoke_test';

test.describe('Request tags', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-685: adds a single tag to a request and saves it', async ({ page, createTmpDir }) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    const settings = buildRequestSettingsLocators(page);
    const collectionPath = await createTmpDir('tag-collection');
    const requestFilePath = path.join(collectionPath, COLLECTION_NAME, `${REQUEST_NAME}.yml`);

    await test.step('Create a collection', async () => {
      await createCollection(page, COLLECTION_NAME, collectionPath, 'yml');
      await expect(sidebar.collection(COLLECTION_NAME)).toBeVisible();
    });

    await test.step('Add a new request to the collection', async () => {
      await createRequestViaModal(page, COLLECTION_NAME, REQUEST_NAME);
      await expect(sidebar.request(REQUEST_NAME)).toBeVisible();
    });

    await test.step('Select the request', async () => {
      await sidebar.request(REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(REQUEST_NAME);
    });

    await test.step('Open the Tags section', async () => {
      await selectRequestPaneTab(page, 'Settings');
      await expect(settings.tagsHeading()).toBeVisible();
      await expect(settings.tagsInput()).toBeVisible();
    });

    await addRequestTag(page, TAG_NAME);

    await test.step('Save the request', async () => {
      await saveRequest(page);
    });

    await test.step('Reopen the request and confirm the tag is still shown', async () => {
      await tabs.requestTab(REQUEST_NAME).hover();
      await tabs.closeTab(REQUEST_NAME).click({ force: true });
      await sidebar.request(REQUEST_NAME).click();
      await selectRequestPaneTab(page, 'Settings');
      await expect(settings.tagChip(TAG_NAME)).toBeVisible();
    });

    await test.step('Confirm the tag is saved in the request file', async () => {
      const savedContent = await fs.promises.readFile(requestFilePath, 'utf-8');
      expect(savedContent).toContain('tags:');
      expect(savedContent).toContain(`- ${TAG_NAME}`);
    });
  });
});
