import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollectionSettings, selectCollectionPaneTab } from '../../utils/page';

const COLLECTION_NAME = 'BruVersionTest';

test.describe('Change Collection Version (bru collection)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('a bru collection with no version shows "Not Set", and saving writes it to bruno.json', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionPath = collectionFixturePath!;
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');

    await test.step('the collection has no version yet (only the internal "1" marker)', async () => {
      const config = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf-8'));
      expect(config.collectionVersion).toBeUndefined();
      expect(config.version).toBe('1'); // the format marker is untouched
    });

    await test.step('the overview shows the version as "Not Set"', async () => {
      await openCollectionSettings(page, COLLECTION_NAME);
      await selectCollectionPaneTab(page, 'overview');
      await expect(page.getByTestId('info-version-value')).toHaveText('Not Set');
    });

    await test.step('a new version can be set in the popup', async () => {
      await page.getByTestId('info-version-change').click();
      await expect(page.getByTestId('change-version-current')).toHaveText('Not Set');
      await expect(page.getByTestId('change-version-input')).toHaveValue('');

      await page.getByTestId('change-version-input').fill('v2.3.4');
      await page.getByTestId('change-version-submit-btn').click();
      await expect(page.getByText('Collection version updated')).toBeVisible();
    });

    await test.step('the screen shows the new version and bruno.json now has it (the "1" marker stays)', async () => {
      await expect(page.getByTestId('info-version-value')).toHaveText('v2.3.4');

      await expect
        .poll(async () => JSON.parse(fs.readFileSync(brunoJsonPath, 'utf-8')), { timeout: 5000 })
        .toMatchObject({ version: '1', collectionVersion: 'v2.3.4' });
    });
  });

  test('limits the version input at 50 characters', async ({ pageWithUserData: page }) => {
    await openCollectionSettings(page, COLLECTION_NAME);
    await selectCollectionPaneTab(page, 'overview');
    await page.getByTestId('info-version-change').click();

    const input = page.getByTestId('change-version-input');
    await expect(input).toHaveAttribute('maxlength', '50');

    await input.fill('');
    await input.pressSequentially('9'.repeat(55));
    await expect(input).toHaveValue('9'.repeat(50));
  });
});
