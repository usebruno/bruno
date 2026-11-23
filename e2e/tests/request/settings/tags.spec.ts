import { expect, test } from '../../../playwright';
import {
  addRequestTag,
  buildCommonLocators,
  buildRequestSettingsLocators,
  saveRequest,
  selectRequestPaneTab
} from '../../../pages';

test.describe('Request tags', () => {
  test('TC-685: adds a single tag to a request and saves it', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const COLLECTION_NAME = 'settings-yaml';
    const REQUEST_NAME = 'Tag Request';
    const TAG_NAME = 'smoke_test';
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
    await expect(settings.tagItem(TAG_NAME)).toBeVisible();

    await saveRequest(page);

    await test.step('Reopen the request', async () => {
      await tabs.requestTab(REQUEST_NAME).hover();
      await tabs.closeTab(REQUEST_NAME).click();
      await sidebar.request(REQUEST_NAME).click();
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('Verify the tag is still shown', async () => {
      await expect(settings.tagItem(TAG_NAME)).toBeVisible();
    });
  });
});
