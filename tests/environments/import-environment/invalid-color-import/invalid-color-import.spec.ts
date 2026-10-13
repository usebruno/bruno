import path from 'path';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  importEnvironment,
  selectEnvironment
} from '../../../utils/page';

const envFile = path.join(__dirname, 'fixtures', 'unreadable-color-env.json');

test.describe('Import environment - a colour that cannot be read', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('imports the environment without its colour and keeps the app on its feet once it is active', async ({
    page,
    createTmpDir
  }) => {
    const { environment } = buildCommonLocators(page);
    await createCollection(page, 'invalid-color-import', await createTmpDir('invalid-color-import'));

    await importEnvironment(page, envFile, 'collection');

    await test.step('The environment lands despite the colour', async () => {
      await expect(environment.sidebarListItem('collection', 'Broken Colour Env')).toBeVisible();
    });

    await test.step('Making it active renders the badge instead of the error screen', async () => {
      await selectEnvironment(page, 'Broken Colour Env', 'collection');

      await expect(page.locator('.current-environment')).toContainText('Broken Colour Env');
      await expect(environment.selector()).toBeVisible();
    });

    await test.step('The app is still interactive, not a rendered-once error page', async () => {
      await environment.selector().click();
      await expect(environment.envOption('Broken Colour Env')).toBeVisible();
      await page.keyboard.press('Escape');
    });
  });
});
