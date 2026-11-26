import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal } from '../../../pages/open-collection-modal/shell';

const IMPORT_SHORTCUT = process.platform === 'darwin' ? '⌘ O' : 'Ctrl+O';

test.describe('Collections header buttons', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
  });

  test('labels the new collection and open collection buttons', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Verify the accessible names of both buttons', async () => {
      await expect(sidebar.newCollectionButton()).toHaveAccessibleName('New collection');
      await expect(sidebar.openCollectionButton()).toHaveAccessibleName('Open or import collection');
    });
  });

  test('starts the inline collection creator from the new collection button', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Click the new collection button', async () => {
      await sidebar.newCollectionButton().click();
    });

    await test.step('Verify the inline creator shows with its name focused and no modal opens', async () => {
      await expect(sidebar.inlineCollectionCreator.root()).toBeVisible();
      await expect(sidebar.inlineCollectionCreator.nameInput()).toBeFocused();
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Cancel the inline creator', async () => {
      await sidebar.inlineCollectionCreator.cancelButton().click();
    });
  });

  test('removes the inline collection creator on Cancel without creating a collection', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Start the inline creator', async () => {
      await sidebar.newCollectionButton().click();
    });

    await test.step('Click Cancel', async () => {
      await sidebar.inlineCollectionCreator.cancelButton().click();
    });

    await test.step('Verify the creator is gone and the sidebar still has no collections', async () => {
      await expect(sidebar.inlineCollectionCreator.root()).toBeHidden();
      await expect(sidebar.noCollectionsMessage()).toBeVisible();
    });
  });

  test('removes the inline collection creator on Escape without creating a collection', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Start the inline creator', async () => {
      await sidebar.newCollectionButton().click();
    });

    await test.step('Press Escape in the name input', async () => {
      await sidebar.inlineCollectionCreator.nameInput().press('Escape');
    });

    await test.step('Verify the creator is gone and the sidebar still has no collections', async () => {
      await expect(sidebar.inlineCollectionCreator.root()).toBeHidden();
      await expect(sidebar.noCollectionsMessage()).toBeVisible();
    });
  });

  test('opens the Open collection modal from the open collection button', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Click the open collection button', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the Open collection modal shows with its menu', async () => {
      await expect(openCollectionModal.root()).toBeVisible();
      await expect(openCollectionModal.menu()).toBeVisible();
    });
  });

  test('shows a tooltip on the new collection button', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Hover the new collection button and verify the tooltip reads "New collection"', async () => {
      await expect(async () => {
        await page.mouse.move(0, 0);
        await sidebar.newCollectionButton().hover();
        await expect(sidebar.headerTooltip('New collection')).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
    });
  });

  test('shows the import shortcut in the tooltip of the open collection button', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Hover the open collection button and verify the tooltip names the action and the import shortcut', async () => {
      await expect(async () => {
        await page.mouse.move(0, 0);
        await sidebar.openCollectionButton().hover();
        await expect(sidebar.headerTooltip(`Open or import collection (${IMPORT_SHORTCUT})`)).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
    });
  });
});
