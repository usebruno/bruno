import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, reloadCollection } from '../../utils/page';

const COLLECTION_NAME = 'ReloadTest';

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

    await reloadCollection(page, COLLECTION_NAME);

    await test.step('Verify the new request appears after reload', async () => {
      await expect(locators.sidebar.request('ping')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('hello')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('added-externally')).toBeVisible({ timeout: 10000 });
    });
  });
});
