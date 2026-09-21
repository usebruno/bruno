import { test, expect } from '../../playwright';
import * as path from 'path';
import { buildCommonLocators, createCollection, closeAllCollections } from '../utils/page';
import { buildApiSpecPanelLocators, openApiSpecFromDialog } from '../utils/page/openapi/render-spec';

const COLLECTION = 'Spec Highlight Test';
const SPEC = {
  file: path.resolve(__dirname, '..', 'import', 'openapi', 'fixtures', 'openapi-simple.json'),
  name: 'Simple Test API'
};

test.describe('Collection row highlight vs the API spec panel', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Opening an API spec clears the active-tab highlight on the collection row', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { sidebarRow } = buildApiSpecPanelLocators(page);
    const testDir = await createTmpDir('api-spec-tab-highlight');

    await createCollection(page, COLLECTION, testDir);

    await test.step('Clicking the collection opens its tab and highlights the row', async () => {
      await locators.sidebar.collection(COLLECTION).click();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await expect(locators.sidebar.collectionRow(COLLECTION)).toHaveClass(/collection-focused-in-tab/);
    });

    await test.step('Selecting an API spec moves the highlight off the collection row', async () => {
      await openApiSpecFromDialog(page, electronApp, SPEC.file);
      await expect(sidebarRow(SPEC.name)).toBeVisible();
      await sidebarRow(SPEC.name).click();
      await expect(sidebarRow(SPEC.name)).toHaveAttribute('data-selected', 'true');
      await expect(locators.sidebar.collectionRow(COLLECTION)).not.toHaveClass(/collection-focused-in-tab/);
    });
  });
});
