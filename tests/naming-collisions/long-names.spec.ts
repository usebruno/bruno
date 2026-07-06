import { test, expect, Page } from '../../playwright';
import { buildCommonLocators, createCollection, closeAllCollections } from '../utils/page';
import { listRequestFiles } from './utils';

const createRequestViaModal = async (page: Page, collectionName: string, name: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).hover();
  const action = locators.actions.collectionActions(collectionName);
  await expect(action).toBeVisible({ timeout: 5000 });
  await action.click();
  await locators.dropdown.item('New Request').click();
  await page.getByPlaceholder('Request Name').fill(name);
  await page.getByTestId('create-new-request-button').click();
  await expect(page.locator('.bruno-modal')).toHaveCount(0, { timeout: 5000 });
};

test.describe('Naming collisions - long names', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape');
    await closeAllCollections(page);
  });

  test('a ~255-char name collision is truncated and suffixed within the filesystem limit', async ({ page, createTmpDir }) => {
    const testDir = await createTmpDir('long-names');
    const longName = 'a'.repeat(255); // max allowed display name length

    await createCollection(page, 'Long Names', testDir, 'bru');

    await test.step('Create two requests with the same 255-char name', async () => {
      // createRequest asserts visibility by name (would strict-violate on a dupe),
      // so drive the modal directly here.
      await createRequestViaModal(page, 'Long Names', longName);
      await createRequestViaModal(page, 'Long Names', longName);
    });

    await test.step('Both display names appear in the sidebar', async () => {
      await expect(page.locator(`.item-name[title="${longName}"]`)).toHaveCount(2);
    });

    await test.step('On disk: two distinct .bru files, each within the 255-char limit', async () => {
      const files = listRequestFiles(testDir);
      expect(files).toHaveLength(2);
      expect(new Set(files).size).toBe(2); // distinct (truncated base + numeric suffix)
      for (const f of files) {
        expect(f.endsWith('.bru')).toBe(true);
        expect(f.length).toBeLessThanOrEqual(255);
      }
    });
  });
});
