import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, scrollVirtuosoRowIntoView, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

type MatrixCase = {
  referenced: string;
  selected: string;
  variable: string;
  flagged: boolean;
};

const primitiveMatrix: MatrixCase[] = [
  { referenced: 'string', selected: 'string', variable: 'refStringFromString', flagged: false },
  { referenced: 'string', selected: 'number', variable: 'refNumberFromString', flagged: true },
  { referenced: 'number', selected: 'string', variable: 'refStringFromNumber', flagged: false },
  { referenced: 'number', selected: 'number', variable: 'refNumberFromNumber', flagged: false },
  { referenced: 'number', selected: 'boolean', variable: 'refBooleanFromNumber', flagged: true },
  { referenced: 'boolean', selected: 'boolean', variable: 'refBooleanFromBoolean', flagged: false },
  { referenced: 'boolean', selected: 'object', variable: 'refObjectFromBoolean', flagged: true },
  { referenced: 'object', selected: 'object', variable: 'refObjectFromObject', flagged: false },
  { referenced: 'object', selected: 'boolean', variable: 'refBooleanFromObject', flagged: true },
  { referenced: 'null', selected: 'string', variable: 'refStringFromNull', flagged: false },
  { referenced: 'null', selected: 'number', variable: 'refNumberFromNull', flagged: true }
];

const nestedObjectMatrix: MatrixCase[] = [
  { referenced: 'nested string', selected: 'string', variable: 'refStringFromNestedString', flagged: false },
  { referenced: 'nested number', selected: 'number', variable: 'refNumberFromNestedNumber', flagged: false },
  { referenced: 'nested boolean', selected: 'boolean', variable: 'refBooleanFromNestedBoolean', flagged: false },
  { referenced: 'nested string', selected: 'number', variable: 'refNumberFromNestedString', flagged: true },
  { referenced: 'nested number', selected: 'boolean', variable: 'refBooleanFromNestedNumber', flagged: true }
];

const arrayMatrix: MatrixCase[] = [
  { referenced: 'array boolean', selected: 'string', variable: 'refStringFromArrayBoolean', flagged: false },
  { referenced: 'array boolean', selected: 'boolean', variable: 'refBooleanFromArrayBoolean', flagged: false },
  { referenced: 'array number', selected: 'number', variable: 'refNumberFromArrayNumber', flagged: false },
  { referenced: 'array', selected: 'object', variable: 'refObjectFromArray', flagged: false },
  { referenced: 'array boolean', selected: 'number', variable: 'refNumberFromArrayBoolean', flagged: true },
  { referenced: 'array boolean', selected: 'object', variable: 'refObjectFromArrayBoolean', flagged: true }
];

const dottedKeyMatrix: MatrixCase[] = [
  { referenced: 'dotted-key boolean', selected: 'boolean', variable: 'refBooleanFromDottedKey', flagged: false }
];

const collectionMatrix: MatrixCase[] = [
  { referenced: 'string', selected: 'string', variable: 'refStringFromGlobalString', flagged: false },
  { referenced: 'number', selected: 'number', variable: 'refNumberFromGlobalNumber', flagged: false },
  { referenced: 'boolean', selected: 'boolean', variable: 'refBooleanFromGlobalBoolean', flagged: false },
  { referenced: 'object', selected: 'object', variable: 'refObjectFromGlobalObject', flagged: false },
  { referenced: 'nested string', selected: 'string', variable: 'refStringFromGlobalNestedString', flagged: false },

  { referenced: 'string', selected: 'number', variable: 'refNumberFromGlobalString', flagged: true },
  { referenced: 'object', selected: 'boolean', variable: 'refBooleanFromGlobalObject', flagged: true },
  { referenced: 'null', selected: 'number', variable: 'refNumberFromGlobalNull', flagged: true },
  { referenced: 'nested number', selected: 'boolean', variable: 'refBooleanFromGlobalNestedNumber', flagged: true }
];

const sourceVariables = [
  'globalEnvString',
  'globalEnvNumber',
  'globalEnvBoolean',
  'globalEnvObject',
  'globalEnvNestedObject',
  'globalEnvObjectWithArray',
  'globalEnvNull',
  'globalEnvObject.port'
];

const mismatchIcon = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(row).toBeVisible();
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
