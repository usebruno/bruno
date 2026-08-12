import { test, expect, Page } from '../../../playwright';
import { openEnvironmentConfigTab, scrollVirtuosoRowIntoView, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { CASES, DECLARED, INTENDED_MATRIX, LITERAL_ROWS, type Declared, type Scope } from './cases';

const assertRow = async (page: Page, varName: string, expected: 'ok' | 'flagged') => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(varName);
  await scrollVirtuosoRowIntoView(page, row);
  const icon = locators.dataTypeSelector.mismatchIcon(row);
  if (expected === 'flagged') await expect(icon, `${varName} should be flagged`).toBeVisible();
  else await expect(icon, `${varName} should not be flagged`).not.toBeVisible();
};

const openScope = async (page: Page, scope: Scope) => {
  if (scope === 'global') {
    await selectEnvironment(page, 'global-environment', 'global');
    await openEnvironmentConfigTab(page, 'global');
  } else {
    await selectEnvironment(page, 'collection-environment', 'collection');
    await openEnvironmentConfigTab(page, 'collection');
  }
};

// Data-driven — every assertion below is a row in cases.ts. To add coverage,
// add a fixture entry and a CASES row; the matching describe block picks it up
// automatically. To find gaps, read the INTENDED_MATRIX or run the coverage
// test at the bottom.
test.describe('DataType selector — referenced variable type', () => {
  for (const scope of ['global', 'collection'] as const) {
    test.describe(`scope: ${scope}`, () => {
      test(`literal rows and every declared type`, async ({ pageWithUserData: page }) => {
        const locators = buildCommonLocators(page);
        await locators.sidebar.collection('reference-types').click();
        await openScope(page, scope);

        if (scope === 'global') {
          await test.step('literal values are not flagged', async () => {
            for (const name of LITERAL_ROWS) await assertRow(page, name, 'ok');
          });
        }

        for (const declared of DECLARED) {
          const cases = CASES.filter((c) => c.scope === scope && c.declared === declared);
          if (cases.length === 0) continue;
          await test.step(`declared: ${declared}`, async () => {
            for (const c of cases) await assertRow(page, c.varName, c.expected);
          });
        }
      });
    });
  }

  // Coverage check — no Playwright surface needed; fails locally if the matrix
  // has a hole. Prints the exact missing (declared × target) pair so the reader
  // knows what to add.
  test('every INTENDED_MATRIX cell has a case proving it', () => {
    const missing: string[] = [];
    for (const declared of Object.keys(INTENDED_MATRIX) as Declared[]) {
      const row = INTENDED_MATRIX[declared];
      for (const target of Object.keys(row) as (keyof typeof row)[]) {
        const expected = row[target];
        const proof = CASES.find(
          (c) => c.declared === declared && c.target === target && c.expected === expected
        );
        if (!proof) missing.push(`${declared} → ${target} (${expected})`);
      }
    }
    expect(missing, `add a CASE + fixture entry for: ${missing.join(', ')}`).toEqual([]);
  });
});
