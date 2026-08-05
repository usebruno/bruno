import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, scrollVirtuosoRowIntoView, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const mismatchIcon = async (page: Page, name: string) => {
  const row = buildCommonLocators(page).environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  return buildCommonLocators(page).dataTypeSelector.mismatchIcon(row);
};

const expectFlagged = async (page: Page, name: string) => {
  await expect(await mismatchIcon(page, name)).toBeVisible();
};

const expectNotFlagged = async (page: Page, name: string) => {
  await expect(await mismatchIcon(page, name)).not.toBeVisible();
};

test.describe('DataType selector — referenced variable type', () => {
  test('validates a {{reference}} against the referenced variable type', async ({ pageWithUserData: page }) => {
    await test.step('Open the global environment', async () => {
      await buildCommonLocators(page).sidebar.collection('reference-types').click();
      await selectEnvironment(page, 'global-environment', 'global');
      await openEnvironmentConfigTab(page, 'global');
    });

    await test.step('Valid literal values are not flagged', async () => {
      await expectNotFlagged(page, 'globalEnvString');
      await expectNotFlagged(page, 'globalEnvNumber');
      await expectNotFlagged(page, 'globalEnvBoolean');
      await expectNotFlagged(page, 'globalEnvObject');
      await expectNotFlagged(page, 'globalEnvNestedObject');
    });

    await test.step('Same-type references are not flagged', async () => {
      await expectNotFlagged(page, 'matchingStringReference');
      await expectNotFlagged(page, 'matchingNumberReference');
      await expectNotFlagged(page, 'matchingBooleanReference');
      await expectNotFlagged(page, 'matchingObjectReference');
      await expectNotFlagged(page, 'matchingNestedStringReference');
      await expectNotFlagged(page, 'matchingNestedNumberReference');
      await expectNotFlagged(page, 'matchingNestedBooleanReference');
    });

    await test.step('Different-type references are flagged', async () => {
      await expectFlagged(page, 'mismatchedStringReference');
      await expectFlagged(page, 'mismatchedNumberReference');
      await expectFlagged(page, 'mismatchedBooleanReference');
      await expectFlagged(page, 'mismatchedObjectReference');
      await expectFlagged(page, 'mismatchedNestedNumberReference');
      await expectFlagged(page, 'mismatchedNestedBooleanReference');
    });

    await test.step('Open the collection environment', async () => {
      await selectEnvironment(page, 'collection-environment', 'collection');
      await openEnvironmentConfigTab(page, 'collection');
    });

    await test.step('Same-type references from a collection environment are not flagged', async () => {
      await expectNotFlagged(page, 'matchingGlobalStringReference');
      await expectNotFlagged(page, 'matchingGlobalNumberReference');
      await expectNotFlagged(page, 'matchingGlobalBooleanReference');
      await expectNotFlagged(page, 'matchingGlobalObjectReference');
      await expectNotFlagged(page, 'matchingGlobalNestedStringReference');
      await expectNotFlagged(page, 'matchingGlobalNestedNumberReference');
      await expectNotFlagged(page, 'matchingGlobalNestedBooleanReference');
    });

    await test.step('Different-type references from a collection environment are flagged', async () => {
      await expectFlagged(page, 'mismatchedGlobalStringReference');
      await expectFlagged(page, 'mismatchedGlobalNumberReference');
      await expectFlagged(page, 'mismatchedGlobalBooleanReference');
      await expectFlagged(page, 'mismatchedGlobalObjectReference');
      await expectFlagged(page, 'mismatchedGlobalNestedNumberReference');
      await expectFlagged(page, 'mismatchedGlobalNestedBooleanReference');
    });
  });
});
