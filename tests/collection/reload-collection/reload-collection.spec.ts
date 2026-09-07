import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'ReloadTest';

const openCollectionActionsMenu = async (page: Page, collectionName: string) => {
  const { sidebar } = buildCommonLocators(page);
  const menu = sidebar.rowMenu(collectionName, 'collection');
  await sidebar.collectionRow(collectionName).hover();
  const trigger = menu.trigger();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
};

test.describe('Reload Collection', () => {
  test('picks up a new request added on disk after reload', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const collectionPath = collectionFixturePath!;

    await test.step('Verify collection is loaded with initial items', async () => {
      await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
      await locators.sidebar.collectionChevron(COLLECTION_NAME).click();
      await expect(locators.sidebar.request('ping')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('hello')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Write a new request file on disk', async () => {
      const newRequestYml = [
        'info:',
        '  name: added-externally',
        '  type: http',
        '  seq: 3',
        '',
        'http:',
        '  method: POST',
        '  url: https://echo.usebruno.com/post',
        ''
      ].join('\n');
      fs.writeFileSync(path.join(collectionPath, 'added-externally.yml'), newRequestYml);
    });

    await test.step('Reload collection from the context menu', async () => {
      await openCollectionActionsMenu(page, COLLECTION_NAME);
      await page.getByTestId('collection-actions-reload').click();
    });

    await test.step('Verify the new request appears after reload', async () => {
      await expect(page.getByText('Collection reloaded')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('ping')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('hello')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('added-externally')).toBeVisible({ timeout: 10000 });
    });
  });
});
