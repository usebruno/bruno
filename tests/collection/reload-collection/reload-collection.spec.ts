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
  test('reloads collection from context menu and preserves items', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await test.step('Verify collection is loaded with items', async () => {
      await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
      await locators.sidebar.collectionChevron(COLLECTION_NAME).click();
      await expect(locators.sidebar.request('ping')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('hello')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Click Reload from the collection context menu', async () => {
      await openCollectionActionsMenu(page, COLLECTION_NAME);
      await page.getByTestId('collection-actions-reload').click();
    });

    await test.step('Verify success toast and items reappear', async () => {
      await expect(page.getByText('Collection reloaded')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
      await expect(locators.sidebar.request('ping')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.request('hello')).toBeVisible({ timeout: 10000 });
    });
  });
});
