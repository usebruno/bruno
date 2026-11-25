import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  clearVariablesSidebarPreferences,
  closeAllCollections,
  closeVariablesSidebar,
  openCollectionFromDialog,
  openRequest,
  openVariablesSidebar,
  readSettledVariablesViewScroll,
  readVariableObjectValueScroll,
  readVariablesViewDistanceFromBottom,
  readVariablesViewScroll,
  scrollVariableObjectValue,
  scrollVariablesView,
  scrollVariablesViewToBottom,
  selectEnvironment,
  selectVariablesView
} from '../../../pages';

const COLLECTION_NAME = 'variables-sidebar-scroll';

test.describe('Variables sidebar scroll', () => {
  test.afterEach(async ({ page }) => {
    if (await buildCommonLocators(page).variablesSidebar.sidebar().isVisible()) {
      await closeVariablesSidebar(page);
    }
    await clearVariablesSidebarPreferences(page);
    await closeAllCollections(page);
  });

  test('remembers a separate scroll position for each view', async ({ page, electronApp, collectionFixturePath }) => {
    const { variablesSidebar } = buildCommonLocators(page);
    let usedScroll = 0;

    await test.step('Open the variables of a request that uses many of them', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await openRequest(page, COLLECTION_NAME, 'many-variables');
      await selectEnvironment(page, 'Local');
      await openVariablesSidebar(page);
      await expect(variablesSidebar.row('collection', 'var_000')).toBeVisible();
    });

    await test.step('Scroll All variables to the bottom and Used in request part of the way', async () => {
      await scrollVariablesViewToBottom(page, 'all');
      await selectVariablesView(page, 'used');
      await scrollVariablesView(page, 'used', 600);
      usedScroll = await readSettledVariablesViewScroll(page, 'used');
      expect(usedScroll).toBeGreaterThan(0);
    });

    await test.step('Each view comes back to its own position', async () => {
      await selectVariablesView(page, 'all');
      await expect.poll(() => readVariablesViewDistanceFromBottom(page, 'all')).toBeLessThanOrEqual(1);
      await selectVariablesView(page, 'used');
      await expect.poll(() => readVariablesViewScroll(page, 'used')).toBe(usedScroll);
    });

    await test.step('All variables is still at the bottom after closing and reopening the sidebar', async () => {
      await closeVariablesSidebar(page);
      await openVariablesSidebar(page);
      await expect.poll(() => readVariablesViewDistanceFromBottom(page, 'all')).toBeLessThanOrEqual(1);
    });
  });

  test('remembers the scroll inside a long object value', async ({ page, electronApp, collectionFixturePath }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open the variables of the collection', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await openRequest(page, COLLECTION_NAME, 'many-variables');
      await openVariablesSidebar(page);
      await expect(variablesSidebar.rowMultiLineValue('collection', 'long_object')).toBeVisible();
    });

    await test.step('Scroll inside the long object value', async () => {
      await scrollVariableObjectValue(page, 'collection', 'long_object', 200);
      await expect.poll(() => readVariableObjectValueScroll(page, 'collection', 'long_object')).toBe(200);
    });

    await test.step('The object value keeps its scroll after closing and reopening the sidebar', async () => {
      await closeVariablesSidebar(page);
      await openVariablesSidebar(page);
      await expect.poll(() => readVariableObjectValueScroll(page, 'collection', 'long_object')).toBe(200);
      expect(await readVariablesViewScroll(page, 'all')).toBe(0);
    });
  });
});
