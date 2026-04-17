import { test, expect } from '../../../playwright';
import { createCollection, closeAllCollections } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('GraphQL Docs Explorer', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Can open and close the docs explorer', async ({ page, createTmpDir }) => {
    const collectionName = 'test-docs-explorer';
    const locators = buildCommonLocators(page);
    const docsContainer = page.locator('.graphql-docs-explorer-container');

    await test.step('Create collection and GraphQL request', async () => {
      await createCollection(page, collectionName, await createTmpDir());

      // Create a GraphQL request
      await locators.sidebar.collection(collectionName).hover();
      await locators.actions.collectionActions(collectionName).click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('graphql-request').click();
      await page.getByTestId('request-name').fill('test-graphql');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://graphql.anilist.co');
      await locators.modal.button('Create').click();
    });

    await test.step('Open docs explorer via menu', async () => {
      const dotsMenu = page.getByRole('tablist').locator('button[title="More actions"]');
      await dotsMenu.click();
      const docsItem = page.locator('[data-testid="menu-dropdown-docs"]');
      await docsItem.waitFor({ state: 'visible' });
      await docsItem.click();

      await expect(docsContainer).toBeVisible();
      await expect(docsContainer.locator('.doc-explorer-title')).toContainText('Documentation Explorer');
    });

    await test.step('Close docs explorer with the close button', async () => {
      const closeButton = docsContainer.getByTestId('graphql-docs-close-button');
      await expect(closeButton).toBeVisible();
      await closeButton.click();

      await expect(docsContainer).toBeHidden();
    });
  });
});
