import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeVariablesSidebar,
  openCollectionFromDialog,
  openRequest,
  openVariablesSidebar,
  selectEnvironment,
  selectVariablesView
} from '../../../pages';

test.describe('Variables sidebar empty states', () => {
  test.afterEach(async ({ page }) => {
    if (await buildCommonLocators(page).variablesSidebar.sidebar().isVisible()) {
      await closeVariablesSidebar(page);
    }
    await closeAllCollections(page);
  });

  test('shows an empty state when there is nothing to list', async ({ page, electronApp, collectionFixturePath }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open a request that uses no variables in a collection that defines none', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await openRequest(page, 'variables-sidebar-empty', 'no-variables');
      await openVariablesSidebar(page);
    });

    await test.step('No variables and no active environment', async () => {
      await expect(variablesSidebar.emptyState()).toHaveText('No variables available');
    });

    await test.step('The request uses no variables', async () => {
      await selectVariablesView(page, 'used');
      await expect(variablesSidebar.emptyState()).toHaveText('This request does not use any variables');
      await selectVariablesView(page, 'all');
    });

    await test.step('An environment with no variables', async () => {
      await selectEnvironment(page, 'Blank');
      await expect(variablesSidebar.emptyState()).toHaveText('No variables available');
    });
  });
});
