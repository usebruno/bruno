import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, openCollection, openEnvironmentSelector } from '../../utils/page';

test.describe('Environment Selector Badge Click', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('clicking a badge opens the tab of that environment scope', async ({ pageWithUserData: page }) => {
    const { environment, sidebar } = buildCommonLocators(page);

    await test.step('Activate a collection and a global environment', async () => {
      const collectionName = await sidebar.collection().first().innerText();
      await openCollection(page, collectionName);

      await openEnvironmentSelector(page, 'collection');
      await environment.envOption('Development').click();
      await expect(environment.currentEnvironment()).toContainText('Development');

      await openEnvironmentSelector(page, 'global');
      await environment.envOption('Global Production').click();
      await expect(environment.currentEnvironment()).toContainText('Global Production');
    });

    // The global tab was used last, so each click below must override the remembered tab.
    await test.step('Collection badge opens the collection tab', async () => {
      await environment.collectionBadge().click();
      await expect(environment.collectionTab()).toHaveClass(/\bactive\b/);
      // Clicking the open trigger closes it; the same badge keeps the remembered tab on 'collection'.
      await environment.collectionBadge().click();
      await expect(environment.collectionTab()).toBeHidden();
    });

    await test.step('Global badge opens the global tab', async () => {
      await environment.globalBadge().click();
      await expect(environment.globalTab()).toBeVisible();
      await expect(environment.globalTab()).toHaveClass(/\bactive\b/);
    });
  });
});
