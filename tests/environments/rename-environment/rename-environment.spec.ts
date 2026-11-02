import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, renameEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// A rename must move the environment file *and* keep the name stored inside it in
// sync. Only the yml format persists a name; bru derives it from the filename.
const ORIGINAL_ENV_NAME = 'Local';
const NEW_ENV_NAME = 'Staging';
const HOST_VALUE = 'https://echo.usebruno.com';

const environmentFile = (collectionPath: string, format: string, envName: string) =>
  path.join(collectionPath, format, 'environments', `${envName}.${format}`);

const renameEnvironmentInCollection = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);

  await locators.sidebar.collection(collectionName).click();
  await openEnvironmentConfigTab(page);
  await expect(locators.environment.sidebarListItemExact('collection', ORIGINAL_ENV_NAME)).toBeVisible();

  await renameEnvironment(page, NEW_ENV_NAME);

  await expect(locators.environment.sidebarListItemExact('collection', NEW_ENV_NAME)).toBeVisible();
  await expect(locators.environment.sidebarListItemExact('collection', ORIGINAL_ENV_NAME)).toHaveCount(0);
};

test.describe('Rename environment', () => {
  test('renames the environment file and keeps the stored name in sync in both formats', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await test.step('Rename in a bru collection', async () => {
      await renameEnvironmentInCollection(page, 'Rename Env BRU');

      const renamedFile = environmentFile(collectionFixturePath, 'bru', NEW_ENV_NAME);
      await expect.poll(async () => fs.existsSync(renamedFile)).toBe(true);
      expect(fs.existsSync(environmentFile(collectionFixturePath, 'bru', ORIGINAL_ENV_NAME))).toBe(false);
      // bru stores no name, so the rename must leave the file byte-identical.
      expect(fs.readFileSync(renamedFile, 'utf8')).toBe(`vars {\n  host: ${HOST_VALUE}\n}\n`);
    });

    await test.step('Rename in a yml collection', async () => {
      await renameEnvironmentInCollection(page, 'Rename Env YML');

      const renamedFile = environmentFile(collectionFixturePath, 'yml', NEW_ENV_NAME);
      await expect.poll(async () => fs.existsSync(renamedFile)).toBe(true);
      expect(fs.existsSync(environmentFile(collectionFixturePath, 'yml', ORIGINAL_ENV_NAME))).toBe(false);

      await expect.poll(async () => fs.readFileSync(renamedFile, 'utf8')).toContain(`name: ${NEW_ENV_NAME}`);
      const content = fs.readFileSync(renamedFile, 'utf8');
      expect(content).not.toContain(`name: ${ORIGINAL_ENV_NAME}`);
      expect(content).toContain(HOST_VALUE);
    });
  });
});
