import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

test.describe.serial('Sidebar empty-state "+ Add request" CTA', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeAll(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  // Scope an assertion to a single collection — pageWithUserData reuses one app
  // across the describe block, and multiple expanded collections would otherwise
  // make `getByTestId('add-request-cta')` match more than one element.
  const collectionScope = (page: Page, name: string) => page.locator(`#collection-${name}`);

  const expandCollection = async (name: string) => {
    const collection = locators.sidebar.collection(name);
    await collection.waitFor({ state: 'visible' });
    await collection.click();
  };

  // Empty collection — CTA should appear

  test('should show CTA for an empty .bru collection', async ({ pageWithUserData: page }) => {
    await test.step('Expand empty-bru collection', async () => {
      await expandCollection('empty-bru');
    });

    await test.step('Verify CTA is visible at collection root', async () => {
      await expect(collectionScope(page, 'empty-bru').getByTestId('add-request-cta')).toBeVisible();
    });
  });

  test('should show CTA for an empty .yml collection', async ({ pageWithUserData: page }) => {
    await test.step('Expand empty-yml collection', async () => {
      await expandCollection('empty-yml');
    });

    await test.step('Verify CTA is visible at collection root', async () => {
      await expect(collectionScope(page, 'empty-yml').getByTestId('add-request-cta')).toBeVisible();
    });
  });

  // Collection containing only a .js script — CTA should still appear

  test('should show CTA for a .bru collection containing only a .js script', async ({ pageWithUserData: page }) => {
    await test.step('Expand bru-with-js collection', async () => {
      await expandCollection('bru-with-js');
    });

    await test.step('Verify CTA is visible at collection root', async () => {
      await expect(collectionScope(page, 'bru-with-js').getByTestId('add-request-cta')).toBeVisible();
    });
  });

  test('should show CTA for a .yml collection containing only a .js script', async ({ pageWithUserData: page }) => {
    await test.step('Expand yml-with-js collection', async () => {
      await expandCollection('yml-with-js');
    });

    await test.step('Verify CTA is visible at collection root', async () => {
      await expect(collectionScope(page, 'yml-with-js').getByTestId('add-request-cta')).toBeVisible();
    });
  });

  // Collection has user content — root CTA should be hidden

  test('should hide CTA when .yml collection contains a request', async ({ pageWithUserData: page }) => {
    await test.step('Expand yml-with-request collection', async () => {
      await expandCollection('yml-with-request');
      await expect(locators.sidebar.request('yml-echo')).toBeVisible();
    });

    await test.step('Verify CTA is not rendered at collection root', async () => {
      await expect(collectionScope(page, 'yml-with-request').getByTestId('add-request-cta')).toHaveCount(0);
    });
  });

  test('should hide root CTA when .yml collection contains a folder', async ({ pageWithUserData: page }) => {
    await test.step('Expand yml-with-folder collection', async () => {
      await expandCollection('yml-with-folder');
      await expect(locators.sidebar.folder('yml-scripts')).toBeVisible();
    });

    await test.step('Verify CTA is not rendered at collection root', async () => {
      await expect(collectionScope(page, 'yml-with-folder').getByTestId('add-request-cta')).toHaveCount(0);
    });
  });

  // Folder containing only a .js script — folder CTA should appear

  test('should show folder CTA when a .yml folder contains only a .js script', async ({ pageWithUserData: page }) => {
    await test.step('Expand yml-with-folder collection and the yml-scripts folder', async () => {
      await expandCollection('yml-with-folder');
      const folder = locators.sidebar.folder('yml-scripts');
      await folder.waitFor({ state: 'visible' });
      await folder.click();
    });

    await test.step('Verify folder-level CTA is visible', async () => {
      await expect(collectionScope(page, 'yml-with-folder').getByTestId('add-request-cta-folder')).toBeVisible();
    });
  });
});
