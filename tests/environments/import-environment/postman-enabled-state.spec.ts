import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  importEnvironment
} from '../../utils/page';

const envFile = path.join(__dirname, 'fixtures', 'postman-env-mixed-enabled.json');

test.describe('Postman env import preserves enabled/disabled state', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  for (const scope of ['collection', 'global'] as const) {
    test(`${scope} env import: honors enabled=false and defaults missing enabled to true`, async ({
      page,
      createTmpDir
    }) => {
      const locators = buildCommonLocators(page);
      const tmpDir = await createTmpDir(`${scope}-env-enabled-state`);

      await createCollection(page, `${scope}-env-enabled-state`, tmpDir);
      await importEnvironment(page, envFile, scope);

      await test.step('Imported env appears in the settings sidebar', async () => {
        await expect(locators.environment.sidebarListItem(scope, 'Mixed Enabled Env')).toBeVisible();
      });

      await test.step('Enabled, default-enabled, and null-enabled rows are checked; disabled row is unchecked', async () => {
        await expect(locators.environment.varRowEnabledCheckbox('enabledVar')).toBeChecked();
        await expect(locators.environment.varRowEnabledCheckbox('defaultEnabledVar')).toBeChecked();
        await expect(locators.environment.varRowEnabledCheckbox('nullEnabledVar')).toBeChecked();
        await expect(locators.environment.varRowEnabledCheckbox('disabledVar')).not.toBeChecked();
      });
    });
  }
});
