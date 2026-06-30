import { test, expect, Page } from '../../../playwright';
import path from 'path';
import fs from 'fs';
import { buildCommonLocators } from '../../utils/page/locators';
import { scrollVirtuosoRowIntoView } from '../../utils/page';

// Env JSON export → import round-trip for both BRU and YML collections.
// The export writes typed datatypes (number/boolean/object) and strips the
// implicit-string default. A secret's value is cleared on export but its
// dataType is preserved. Untyped vars whose values merely look typed stay
// plain strings. Re-importing into the same collection auto-renames to
// `typed_env copy`, and the env editor should render every dataType correctly.

type FormatConfig = {
  format: 'bru' | 'yml';
  collectionName: string;
};

const FORMATS: FormatConfig[] = [
  { format: 'bru', collectionName: 'DataType Env BRU' },
  { format: 'yml', collectionName: 'DataType Env YML' }
];

const ENV_NAME = 'typed_env';
// `generateUniqueName` suffixes `" copy"` on collision (filesystem.js:227).
const IMPORTED_ENV_NAME = 'typed_env copy';

// The env editor table is virtualized, so the slowest rows can take a moment.
const SLOW_RENDER_TIMEOUT_MS = 15_000;

// Typed rows render their dataType label; the typed secrets keep theirs even
// though the value is cleared.
const TYPED_LABEL_ROWS: Array<[string, string]> = [
  ['env_num', 'number'],
  ['env_bool', 'boolean'],
  ['env_obj', 'object'],
  ['env_secret_num', 'number'],
  ['env_secret_bool', 'boolean'],
  ['env_secret_obj', 'object']
];

// Plain string, untyped look-alikes, and the bare-string secret all fall back
// to the implicit 'string' label.
const STRING_LABEL_ROWS = [
  'env_str',
  'env_secret_str',
  'env_untyped_num',
  'env_untyped_bool',
  'env_untyped_obj',
  'env_secret_untyped'
];

// Declared dataType but an uncoercible value: keep the label, show a warning.
const MISMATCHED_LABEL_ROWS: Array<[string, string]> = [
  ['mismatched_num', 'number'],
  ['mismatched_bool', 'boolean'],
  ['mismatched_obj', 'object']
];

const expectTypeLabel = async (page: Page, name: string, label: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(locators.dataTypeSelector.typeLabel(row)).toHaveText(label, { timeout: SLOW_RENDER_TIMEOUT_MS });
};

const expectMismatchVisible = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(locators.dataTypeSelector.mismatchIcon(row)).toBeVisible();
};

const expectNoMismatch = async (page: Page, name: string) => {
  const locators = buildCommonLocators(page);
  const row = locators.environment.varRow(name);
  await scrollVirtuosoRowIntoView(page, row);
  await expect(locators.dataTypeSelector.mismatchIcon(row)).toHaveCount(0);
};

const openCollectionEnvEditor = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).click();
  await locators.environment.selector().click();
  await locators.environment.collectionTab().click();
  await locators.environment.configureButton().click();
  await expect(locators.tabs.activeRequestTab()).toContainText('Environments');
};

const closeEnvEditor = async (page: Page) => {
  const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
  await envTab.hover();
  await envTab.getByTestId('request-tab-close-icon').click({ force: true });
};

for (const { format, collectionName } of FORMATS) {
  test.describe.serial(`Environment export/import — dataType preservation (${format})`, () => {
    // Shared between the export and import steps within the same worker run.
    let exportedFile: string;

    test.afterAll(async () => {
      // Remove the env file the import step created so the fixture is reusable.
      const importedFile = path.join(
        __dirname,
        'fixtures',
        format,
        'environments',
        `${IMPORTED_ENV_NAME}.${format}`
      );
      if (fs.existsSync(importedFile)) {
        fs.rmSync(importedFile, { force: true });
      }
    });

    test(`(${format}) exports typed env vars with their datatypes (strips \`string\`; clears secret value but keeps its dataType)`, async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const locators = buildCommonLocators(page);
      const exportDir = await createTmpDir(`env-datatype-export-${format}`);

      await test.step(`Open the ${format} collection and the env settings tab`, async () => {
        await openCollectionEnvEditor(page, collectionName);
      });

      await test.step('Export only the typed_env into a tmp dir', async () => {
        await page.locator('button[title="Export environment"]').click();
        await expect(locators.modal.byTitle('Export Environments')).toBeVisible();

        await page.getByText('Deselect All').click();
        await page
          .locator('label')
          .filter({ hasText: ENV_NAME })
          .locator('input[type="checkbox"]')
          .check();
        await page.locator('input[id="export-location"]').fill(exportDir);
        await page.getByRole('button', { name: 'Export 1 Environment' }).click();
      });

      await test.step('Verify the exported JSON preserves datatypes', async () => {
        exportedFile = path.join(exportDir, `${ENV_NAME}.json`);
        // The export is asynchronous (IPC + file write); poll for the file.
        await expect.poll(() => fs.existsSync(exportedFile), { timeout: 5000 }).toBe(true);

        const content = JSON.parse(fs.readFileSync(exportedFile, 'utf8'));
        const byName = Object.fromEntries(content.variables.map((v: any) => [v.name, v]));

        // Typed datatypes survive the export.
        expect(byName.env_num).toMatchObject({ value: 300, dataType: 'number', secret: false });
        expect(byName.env_bool).toMatchObject({ value: true, dataType: 'boolean', secret: false });
        expect(byName.env_obj).toMatchObject({ value: { scope: 'env' }, dataType: 'object', secret: false });

        // Plain string has no dataType field.
        expect(byName.env_str).toMatchObject({ value: 'env_string', secret: false });
        expect(byName.env_str.dataType).toBeUndefined();

        // Untyped look-alikes: values that resemble a typed value but carry no
        // dataType stay raw strings with no dataType field.
        expect(byName.env_untyped_num).toMatchObject({ value: '42', secret: false });
        expect(byName.env_untyped_num.dataType).toBeUndefined();
        expect(byName.env_untyped_bool).toMatchObject({ value: 'true', secret: false });
        expect(byName.env_untyped_bool.dataType).toBeUndefined();
        expect(byName.env_untyped_obj).toMatchObject({ value: '{"a":1}', secret: false });
        expect(byName.env_untyped_obj.dataType).toBeUndefined();

        // Secret: value cleared. A bare string secret has no dataType; a typed
        // secret keeps its dataType.
        expect(byName.env_secret_str).toMatchObject({ value: '', secret: true });
        expect(byName.env_secret_str.dataType).toBeUndefined();
        expect(byName.env_secret_num).toMatchObject({ value: '', secret: true, dataType: 'number' });
        expect(byName.env_secret_bool).toMatchObject({ value: '', secret: true, dataType: 'boolean' });
        expect(byName.env_secret_obj).toMatchObject({ value: '', secret: true, dataType: 'object' });
        expect(byName.env_secret_untyped).toMatchObject({ value: '', secret: true });
        expect(byName.env_secret_untyped.dataType).toBeUndefined();

        // Mismatched rows: declared dataType + raw uncoerced value preserved.
        expect(byName.mismatched_num).toMatchObject({ value: 'not-a-number', dataType: 'number', secret: false });
        expect(byName.mismatched_bool).toMatchObject({ value: 'maybe', dataType: 'boolean', secret: false });
        expect(byName.mismatched_obj).toMatchObject({ value: 'not-json', dataType: 'object', secret: false });

        // Close the env settings tab so the import step starts clean.
        await closeEnvEditor(page);
      });
    });

    test(`(${format}) imports the exported JSON back into the same collection and renders the right type labels`, async ({
      pageWithUserData: page
    }) => {
      const locators = buildCommonLocators(page);
      expect(exportedFile).toBeTruthy();
      expect(fs.existsSync(exportedFile)).toBe(true);

      await test.step(`Open the ${format} env editor and trigger import`, async () => {
        await openCollectionEnvEditor(page, collectionName);

        await page.locator('button[title="Import environment"]').click();
        await expect(page.locator('[data-testid="import-environment-modal"]')).toBeVisible();
      });

      await test.step('Upload the exported JSON', async () => {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByTestId('import-environment').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(exportedFile);
      });

      await test.step(`Select the imported "${IMPORTED_ENV_NAME}" in the env editor sidebar`, async () => {
        // After import, the editor stays on whichever env was previously selected.
        // Explicitly switch to the imported env so the assertions exercise its rendering.
        const importedItem = page
          .locator('.environments-list .environment-item')
          .filter({ hasText: IMPORTED_ENV_NAME });
        await expect(importedItem).toBeVisible();
        await importedItem.click();
        await expect(importedItem).toHaveClass(/\bactive\b/);
      });

      await test.step('Verify the imported env editor shows datatypes correctly', async () => {
        await expect(locators.tabs.activeRequestTab()).toContainText('Environments');

        // Secrets live on their own tab, so assert per-tab. The fixture names every
        // secret var `env_secret_*`, so its name is a reliable tab discriminator.
        const isSecret = (name: string) => name.includes('secret');

        // Variables tab (default): the non-secret typed, mismatched, and string rows.
        for (const [name, label] of [...TYPED_LABEL_ROWS, ...MISMATCHED_LABEL_ROWS].filter(([n]) => !isSecret(n))) {
          await expectTypeLabel(page, name, label);
        }
        for (const name of STRING_LABEL_ROWS.filter((n) => !isSecret(n))) {
          await expectTypeLabel(page, name, 'string');
        }

        // Mismatched rows surface the warning icon; well-typed and untyped rows do not.
        for (const [name] of MISMATCHED_LABEL_ROWS) {
          await expectMismatchVisible(page, name);
        }
        await expectNoMismatch(page, 'env_num');
        await expectNoMismatch(page, 'env_untyped_obj');

        // Secrets tab: the secret typed rows keep their dataType label; the bare-string
        // secrets fall back to 'string'.
        await locators.environment.secretsTab().click();
        for (const [name, label] of TYPED_LABEL_ROWS.filter(([n]) => isSecret(n))) {
          await expectTypeLabel(page, name, label);
        }
        for (const name of STRING_LABEL_ROWS.filter((n) => isSecret(n))) {
          await expectTypeLabel(page, name, 'string');
        }

        await closeEnvEditor(page);
      });
    });
  });
}
