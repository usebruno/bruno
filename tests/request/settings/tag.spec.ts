import fs from 'node:fs';
import path from 'node:path';
import { expect, test, waitForReadyPage } from '../../../playwright';
import {
  addRequestTag,
  buildCommonLocators,
  buildRequestSettingsLocators,
  saveRequest,
  selectRequestPaneTab
} from '../../utils/page';

test.describe('Request tags', () => {
  test('TC-685: adds a single tag to a request and saves it', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const COLLECTION_NAME = 'settings-yaml';
    const REQUEST_NAME = 'Tag Request';
    const TAG_NAME = 'smoke_test';
    const initUserDataPath = path.join(__dirname, 'init-user-data');
    const fixtureCollectionsPath = path.join(__dirname, 'fixtures', 'collections');
    const collectionPath = await createTmpDir('tag-collection');
    await fs.promises.cp(fixtureCollectionsPath, collectionPath, { recursive: true });
    const app = await launchElectronApp({ initUserDataPath, templateVars: { collectionPath } });
    const page = await waitForReadyPage(app);
    const { sidebar, tabs } = buildCommonLocators(page);
    const settings = buildRequestSettingsLocators(page);
    await test.step('Open the Tag Request from the yaml collection', async () => {
      await sidebar.collection(COLLECTION_NAME).click();
      await sidebar.request(REQUEST_NAME).click();
    });

    await test.step('Open the Tags section', async () => {
      await selectRequestPaneTab(page, 'Settings');
      await expect(settings.tagsInput()).toBeVisible();
    });

    await addRequestTag(page, TAG_NAME);
    await expect(settings.addedTagChip()).toContainText(TAG_NAME);

    await saveRequest(page);

    await test.step('Reopen the request and confirm the tag is still shown', async () => {
      await tabs.requestTab(REQUEST_NAME).hover();
      await tabs.closeTab(REQUEST_NAME).click();
      await sidebar.request(REQUEST_NAME).click();
      await selectRequestPaneTab(page, 'Settings');
      await expect(settings.addedTagChip()).toContainText(TAG_NAME);
    });
  });
});
