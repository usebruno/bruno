import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, scrollVirtuosoRowIntoView, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const mismatchIcon = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  return locators.dataTypeSelector.mismatchIcon(row);
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
      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('reference-types').click();
      await selectEnvironment(page, 'global-environment', 'global');
      await openEnvironmentConfigTab(page, 'global');
    });

    await test.step('Valid literal values are not flagged', async () => {
      await expectNotFlagged(page, 'globalEnvString');
      await expectNotFlagged(page, 'globalEnvNumber');
      await expectNotFlagged(page, 'globalEnvBoolean');
      await expectNotFlagged(page, 'globalEnvObject');
      await expectNotFlagged(page, 'globalEnvNestedObject');
      await expectNotFlagged(page, 'globalEnvObject.port');
    });

    await test.step('Same-type references are not flagged', async () => {
      await expectNotFlagged(page, 'stringTypeRefersToString');
      await expectNotFlagged(page, 'numberTypeRefersToNumber');
      await expectNotFlagged(page, 'booleanTypeRefersToBoolean');
      await expectNotFlagged(page, 'objectTypeRefersToObject');
      await expectNotFlagged(page, 'stringTypeRefersToNestedString');
      await expectNotFlagged(page, 'numberTypeRefersToNestedNumber');
      await expectNotFlagged(page, 'booleanTypeRefersToNestedBoolean');
      await expectNotFlagged(page, 'booleanTypeRefersToDottedKey');
      await expectNotFlagged(page, 'stringTypeRefersToNumber');
    });

    await test.step('Different-type references are flagged', async () => {
      await expectFlagged(page, 'numberTypeRefersToString');
      await expectFlagged(page, 'booleanTypeRefersToObject');
      await expectFlagged(page, 'objectTypeRefersToBoolean');
      await expectFlagged(page, 'numberTypeRefersToNestedString');
      await expectFlagged(page, 'booleanTypeRefersToNestedNumber');
    });

    await test.step('Open the collection environment', async () => {
      await selectEnvironment(page, 'collection-environment', 'collection');
      await openEnvironmentConfigTab(page, 'collection');
    });

    await test.step('Same-type references from a collection environment are not flagged', async () => {
      await expectNotFlagged(page, 'stringTypeRefersToGlobalString');
      await expectNotFlagged(page, 'numberTypeRefersToGlobalNumber');
      await expectNotFlagged(page, 'booleanTypeRefersToGlobalBoolean');
      await expectNotFlagged(page, 'objectTypeRefersToGlobalObject');
      await expectNotFlagged(page, 'stringTypeRefersToGlobalNestedString');
      await expectNotFlagged(page, 'numberTypeRefersToGlobalNestedNumber');
      await expectNotFlagged(page, 'booleanTypeRefersToGlobalNestedBoolean');
      await expectNotFlagged(page, 'stringTypeRefersToGlobalNumber');
    });

    await test.step('Different-type references from a collection environment are flagged', async () => {
      await expectFlagged(page, 'numberTypeRefersToGlobalString');
      await expectFlagged(page, 'booleanTypeRefersToGlobalObject');
      await expectFlagged(page, 'objectTypeRefersToGlobalBoolean');
      await expectFlagged(page, 'numberTypeRefersToGlobalNestedString');
      await expectFlagged(page, 'booleanTypeRefersToGlobalNestedNumber');
    });
  });
});
