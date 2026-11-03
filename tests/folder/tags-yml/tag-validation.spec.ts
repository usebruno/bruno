import { test, expect } from '../../../playwright';
import { openFolderSettingsByPath, selectFolderSettingsTab, addTag } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'folder-tags-yml';

/**
 * The yml mirror of `tests/folder/tags/tag-validation.spec.ts`. The collection format decides
 * which tag names are legal, so the spaces case is the inverse of the bru one: yml accepts
 * internal spaces. Nothing here is saved to disk, so these share one app instance across the file.
 */
test.describe('Folder Tags (YAML) — input validation', () => {
  test('accepts a folder tag containing spaces, which the yml format allows', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['legacy']);
    await selectFolderSettingsTab(page, 'settings');

    await addTag(page, 'needs review');

    await expect(locators.tags.ownItem('needs review')).toBeVisible();
    await expect(locators.tags.error()).toBeHidden();
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
