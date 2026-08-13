import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, scrollVirtuosoRowIntoView, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  arrayMatrix,
  collectionMatrix,
  dottedKeyMatrix,
  nestedObjectMatrix,
  primitiveMatrix,
  sourceVariables,
  type MatrixCase
} from './cases';

const mismatchIcon = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(row, `${name} is missing from the environment table`).toBeVisible();
  return locators.dataTypeSelector.mismatchIcon(row);
};

const expectFlagged = async (page: Page, name: string) => {
  await expect(await mismatchIcon(page, name)).toBeVisible();
};

const expectNotFlagged = async (page: Page, name: string) => {
  await expect(await mismatchIcon(page, name)).not.toBeVisible();
};

const runMatrix = async (page: Page, cases: MatrixCase[]) => {
  for (const testCase of cases) {
    const expectation = testCase.flagged ? 'warning' : 'no warning';
    await test.step(`${testCase.referenced} → ${testCase.selected}: ${expectation}`, async () => {
      if (testCase.flagged) {
        await expectFlagged(page, testCase.variable);
      } else {
        await expectNotFlagged(page, testCase.variable);
      }
    });
  }
};

test.describe('DataType selector — referenced variable type', () => {
  test('validates a {{reference}} against the referenced variable type', async ({ pageWithUserData: page }) => {
    await test.step('Open the global environment', async () => {
      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('reference-types').click();
      await selectEnvironment(page, 'global-environment', 'global');
      await openEnvironmentConfigTab(page, 'global');
    });

    await test.step('Source variables with literal values', async () => {
      for (const name of sourceVariables) {
        await expectNotFlagged(page, name);
      }
    });

    await test.step('Primitive datatype references', async () => {
      await runMatrix(page, primitiveMatrix);
    });

    await test.step('Nested object references', async () => {
      await runMatrix(page, nestedObjectMatrix);
    });

    await test.step('Array element references', async () => {
      await runMatrix(page, arrayMatrix);
    });

    await test.step('Dotted-key references', async () => {
      await runMatrix(page, dottedKeyMatrix);
    });

    await test.step('Open the collection environment', async () => {
      await selectEnvironment(page, 'collection-environment', 'collection');
      await openEnvironmentConfigTab(page, 'collection');
    });

    await test.step('Collection environment → global references', async () => {
      await runMatrix(page, collectionMatrix);
    });
  });
});
