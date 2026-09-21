import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  openFolderSettingsByPath,
  selectFolderSettingsTab,
  selectRequestPaneTab,
  addTag,
  saveFolderSettings
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'folder-tags';

test.describe('Folder Tags — write', () => {
  test('holds a new folder tag as a draft, then persists it to folder.bru and cascades it', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const folderBruPath = path.join(collectionFixturePath!, 'legacy', 'folder.bru');

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['legacy']);
    await selectFolderSettingsTab(page, 'settings');
    await expect(locators.tags.ownItem('wip')).toBeVisible();

    await addTag(page, 'regression');

    await test.step('The unsaved tag stays in the draft and never reaches disk', async () => {
      await expect(locators.tags.ownItem('regression')).toBeVisible();
      await expect(locators.tabs.draftIndicator()).toBeVisible();
      expect(fs.readFileSync(folderBruPath, 'utf8')).not.toContain('regression');
    });

    await saveFolderSettings(page);

    await test.step('Saving writes both tags to folder.bru and clears the draft', async () => {
      await expect(locators.tabs.draftIndicator()).toBeHidden();
      expect(fs.readFileSync(folderBruPath, 'utf8')).toContain('tags: [\n    wip\n    regression\n  ]');
    });

    await test.step('Requests in the folder pick the new tag up as inherited', async () => {
      await locators.sidebar.itemsIn(COLLECTION_NAME, 'inherits-wip').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('inherits-wip');
      await selectRequestPaneTab(page, 'Settings');

      await expect(locators.tags.inheritedToggle()).toContainText('2 Inherited from parent');
      await locators.tags.inheritedToggle().click();
      await expect(locators.tags.inheritedItem('wip')).toBeVisible();
      await expect(locators.tags.inheritedItem('regression')).toBeVisible();
    });
  });
});
