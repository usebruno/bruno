import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollectionSettings, selectCollectionPaneTab } from '../../utils/page';

const COLLECTION_NAME = 'VersionEditTest';

test.describe('Change Collection Version (yml collection)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('changing the version updates the yml file and the screen', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionPath = collectionFixturePath!;
    const ymlPath = path.join(collectionPath, 'opencollection.yml');

    await test.step('the collection starts at version 1.0.0 on disk', async () => {
      expect(fs.readFileSync(ymlPath, 'utf-8')).toMatch(/version:\s*["']?1\.0\.0["']?/);
    });

    await test.step('open the collection overview and read the current version', async () => {
      await openCollectionSettings(page, COLLECTION_NAME);
      await selectCollectionPaneTab(page, 'overview');
      await expect(page.getByTestId('info-version-value')).toHaveText('1.0.0');
    });

    await test.step('open the Change Collection Version modal', async () => {
      await page.getByTestId('info-version-change').click();
      await expect(page.getByTestId('change-version-current')).toHaveText('1.0.0');
      await expect(page.getByTestId('change-version-input')).toHaveValue('');
    });

    await test.step('the Update button stays off until the version is changed', async () => {
      const submit = page.getByTestId('change-version-submit-btn');
      await expect(submit).toBeDisabled();
      await page.getByTestId('change-version-input').fill('2.0.0');
      await expect(submit).toBeEnabled();
    });

    await test.step('the preview shows the old version changing to the new one', async () => {
      const preview = page.getByTestId('change-version-preview');
      await expect(preview).toContainText('info.version');
      await expect(preview.locator('.old')).toHaveText('1.0.0');
      await expect(preview.locator('.new')).toHaveText('2.0.0');
    });

    await test.step('saving updates both the file on disk and the screen', async () => {
      await page.getByTestId('change-version-submit-btn').click();
      await expect(page.getByText('Collection version updated')).toBeVisible();
      await expect(page.getByTestId('info-version-value')).toHaveText('2.0.0');

      await expect
        .poll(async () => fs.readFileSync(ymlPath, 'utf-8'), { timeout: 5000 })
        .toMatch(/version:\s*["']?2\.0\.0["']?/);
    });
  });
});
