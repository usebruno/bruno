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

type EnvironmentScope = 'global' | 'collection';

const openEnvironment = async (page: Page, scope: EnvironmentScope) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection('reference-types').click();
  await selectEnvironment(page, `${scope}-environment`, scope);
  await openEnvironmentConfigTab(page, scope);
  await expect(locators.environment.varRows().first()).toBeVisible();
};

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
  test('source variables with literal values', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'global');
    for (const name of sourceVariables) {
      await expectNotFlagged(page, name);
    }
  });

  test('primitive datatype references', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'global');
    await runMatrix(page, primitiveMatrix);
  });

  test('nested object references', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'global');
    await runMatrix(page, nestedObjectMatrix);
  });

  test('array element references', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'global');
    await runMatrix(page, arrayMatrix);
  });

  test('dotted-key references', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'global');
    await runMatrix(page, dottedKeyMatrix);
  });

  test('collection environment → global references', async ({ pageWithUserData: page }) => {
    await openEnvironment(page, 'collection');
    await runMatrix(page, collectionMatrix);
  });
});
