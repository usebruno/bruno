import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  openCollection,
  openRequest,
  sendRequest,
  selectResponsePaneTab,
  closeAllCollections,
  waitForCollectionMount
} from '../../utils/page';

test.describe('Collection Default Environment', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('applies the configured default environment on first open', async ({ pageWithUserData: page }) => {
    const { environment } = buildCommonLocators(page);

    // Fresh userData, no saved selection for this collection path, so the default
    // environment configured in bruno.json (presets.defaultEnvironment: "prod")
    // is selected automatically when the collection is opened.
    await openCollection(page, 'collection-default-environment');
    // Wait for the collection (and its env files) to finish mounting before asserting,
    // so we don't race the async env load with a guessed timeout.
    await waitForCollectionMount(page, 'collection-default-environment');

    await expect(environment.currentEnvironment()).toContainText('prod');
  });

  test('selects no environment when the configured default does not match any environment', async ({ pageWithUserData: page }) => {
    const { environment } = buildCommonLocators(page);

    // This collection configures presets.defaultEnvironment: "staging", but only prod/dev exist.
    // On first open the default cannot be resolved, so nothing is selected (no crash).
    await openCollection(page, 'default-env-unresolved');
    await waitForCollectionMount(page, 'default-env-unresolved');

    await expect(environment.currentEnvironment()).toContainText('No Environment');
  });

  test('resolves request variables from the default environment (verified in Timeline)', async ({ pageWithUserData: page }) => {
    // The collection's default environment (prod) sets host=http://localhost:8081.
    // On first open it is auto-selected, so {{host}} must resolve to it at send time.
    const { environment } = buildCommonLocators(page);
    await openCollection(page, 'collection-default-environment');
    await waitForCollectionMount(page, 'collection-default-environment');

    // Wait for the default to be applied before sending, otherwise {{host}} won't resolve.
    await expect(environment.currentEnvironment()).toContainText('prod');

    await openRequest(page, 'collection-default-environment', 'ping');
    await sendRequest(page, 200);

    await selectResponsePaneTab(page, 'Timeline');

    const { timeline } = buildCommonLocators(page);
    const latestEntry = timeline.entries().first();
    await expect(latestEntry).toContainText('localhost:8081/ping');
    await expect(latestEntry).not.toContainText('{{host}}');
  });
});
