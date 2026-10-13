import { test, expect } from '../../../playwright';
import { openFolderSettingsByPath, selectFolderSettingsTab, addTag } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'folder-tags';

/**
 * Tags the editor refuses to add. Nothing here reaches a draft or disk — each case asserts the
 * tag is rejected and the reason is shown — so these share one app instance across the file.
 */
test.describe('Folder Tags — input validation', () => {
  test('rejects a folder tag containing spaces, which the bru format disallows', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['legacy']);
    await selectFolderSettingsTab(page, 'settings');

    await addTag(page, 'needs review');

    await expect(locators.tags.error()).toHaveText(
      'Tags in BRU format must only contain letters, numbers, "-", "_".'
    );
    await expect(locators.tags.ownItem('needs review')).toBeHidden();
  });

  test('rejects a tag the folder already inherits, naming the folder it came from', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['api', 'v2']);
    await selectFolderSettingsTab(page, 'settings');

    await addTag(page, 'api');

    await expect(locators.tags.error()).toHaveText('Tag "api" is already inherited from folder "api"');
    await expect(locators.tags.ownItem('api')).toBeHidden();
    await expect(locators.tags.ownItems()).toHaveCount(1);
  });
});
