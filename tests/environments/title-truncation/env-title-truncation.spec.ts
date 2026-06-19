import { test, expect, Page } from '../../../playwright';
import path from 'path';
import {
  importCollection,
  createEnvironment,
  closeAllCollections,
  removeCollection,
  buildCommonLocators
} from '../../utils/page';

const LONG_NAME = 'Prodddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';

const collectionFile = path.join(__dirname, '..', 'create-environment', 'fixtures', 'bruno-collection.json');

const expectHeaderActionsAccessible = async (page: Page) => {
  const locators = buildCommonLocators(page);

  // The title is clipped, not laid out at full content width
  const titleClipped = await locators.environment.detailsTitle().evaluate(
    (el: HTMLElement) => el.scrollWidth > el.clientWidth
  );
  expect(titleClipped).toBe(true);

  const windowWidth = await page.evaluate(() => window.innerWidth);

  // Every action button is visible and fully inside the viewport
  for (const action of ['search', 'rename', 'copy', 'delete'] as const) {
    const button = locators.environment.detailsAction(action);
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(windowWidth);
  }

  // The delete button is actually clickable (not covered by the title).
  await locators.environment.detailsAction('delete').click();
  await expect(locators.modal.byTitle('Delete Environment')).toBeVisible();
  await locators.modal.button('Delete').click();
  await expect(locators.modal.byTitle('Delete Environment')).toBeHidden();
};

test.describe('Environment Title Truncation Tests', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('collection environment: long title is truncated and action icons stay accessible', async ({
    page,
    createTmpDir
  }) => {
    await test.step('Import collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('env-title-collection'), {
        expectedCollectionName: 'test_collection'
      });
    });

    await test.step('Create environment with a very long name', async () => {
      await createEnvironment(page, LONG_NAME, 'collection');
    });

    await test.step('Verify title is truncated and actions are accessible', async () => {
      await expectHeaderActionsAccessible(page);
    });
  });

  test('global environment: long title is truncated and action icons stay accessible', async ({
    page,
    createTmpDir
  }) => {
    await test.step('Import collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('env-title-global'), {
        expectedCollectionName: 'test_collection'
      });
    });

    await test.step('Create global environment with a very long name', async () => {
      await createEnvironment(page, LONG_NAME, 'global');
    });

    await test.step('Verify title is truncated and actions are accessible', async () => {
      await expectHeaderActionsAccessible(page);
    });
  });
});
