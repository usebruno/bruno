import { test, expect } from '../../../playwright';
import path from 'path';
import fs from 'fs';

// Env JSON export → import round-trip for both BRU and YML collections.
// The export writes typed datatypes (number/boolean/object) and strips the
// implicit-string default. A secret's value is cleared on export but its
// dataType is preserved. Re-importing into the same collection auto-renames to
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
      const exportDir = await createTmpDir(`env-datatype-export-${format}`);

      await test.step(`Open the ${format} collection and the env settings tab`, async () => {
        await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-collection').click();
        await page.getByText('Configure', { exact: true }).click();
        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();
      });

      await test.step('Export only the typed_env into a tmp dir', async () => {
        await page.locator('button[title="Export environment"]').click();
        const exportModal = page.locator('.bruno-modal').filter({ hasText: 'Export Environments' });
        await expect(exportModal).toBeVisible();

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

        // Secret: value cleared. A bare string secret has no dataType; a typed
        // secret keeps its dataType.
        expect(byName.env_secret_str).toMatchObject({ value: '', secret: true });
        expect(byName.env_secret_str.dataType).toBeUndefined();
        expect(byName.env_secret_num).toMatchObject({ value: '', secret: true, dataType: 'number' });
        expect(byName.env_secret_bool).toMatchObject({ value: '', secret: true, dataType: 'boolean' });
        expect(byName.env_secret_obj).toMatchObject({ value: '', secret: true, dataType: 'object' });

        // Mismatched rows: declared dataType + raw uncoerced value preserved.
        expect(byName.mismatched_num).toMatchObject({ value: 'not-a-number', dataType: 'number', secret: false });
        expect(byName.mismatched_bool).toMatchObject({ value: 'maybe', dataType: 'boolean', secret: false });
        expect(byName.mismatched_obj).toMatchObject({ value: 'not-json', dataType: 'object', secret: false });

        // Close the env settings tab so the import step starts clean.
        const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
        await envTab.hover();
        await envTab.getByTestId('request-tab-close-icon').click({ force: true });
      });
    });

    test(`(${format}) imports the exported JSON back into the same collection and renders the right type labels`, async ({
      pageWithUserData: page
    }) => {
      expect(exportedFile).toBeTruthy();
      expect(fs.existsSync(exportedFile)).toBe(true);

      await test.step(`Open the ${format} env editor and trigger import`, async () => {
        // The env selector's Import button only renders for empty collections,
        // so go through the env editor's toolbar import icon instead.
        await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-collection').click();
        await page.getByText('Configure', { exact: true }).click();
        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();

        await page.locator('button[title="Import environment"]').click();
        await expect(page.locator('[data-testid="import-environment-modal"]')).toBeVisible();
      });

      await test.step('Upload the exported JSON', async () => {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.getByTestId('import-environment').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(exportedFile);
      });

      await test.step('Verify the imported env editor shows datatypes correctly', async () => {
        const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
        await expect(envTab).toBeVisible();

        // Typed rows.
        await expect(
          page.locator('[data-testid="env-var-row-env_num"] .type-label').first()
        ).toHaveText('number', { timeout: 5000 });
        await expect(
          page.locator('[data-testid="env-var-row-env_bool"] .type-label').first()
        ).toHaveText('boolean');
        await expect(
          page.locator('[data-testid="env-var-row-env_obj"] .type-label').first()
        ).toHaveText('object');
        // Plain string falls back to the implicit 'string' label.
        await expect(
          page.locator('[data-testid="env-var-row-env_str"] .type-label').first()
        ).toHaveText('string');
        // Secret rows render the DataTypeSelector too: a bare string secret
        // shows the implicit 'string' label, a typed secret its dataType.
        await expect(
          page.locator('[data-testid="env-var-row-env_secret_str"] .type-label').first()
        ).toHaveText('string');
        await expect(
          page.locator('[data-testid="env-var-row-env_secret_num"] .type-label').first()
        ).toHaveText('number');
        await expect(
          page.locator('[data-testid="env-var-row-env_secret_bool"] .type-label').first()
        ).toHaveText('boolean');
        await expect(
          page.locator('[data-testid="env-var-row-env_secret_obj"] .type-label').first()
        ).toHaveText('object');

        // Mismatched rows: declared dataType label + warning icon.
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_num"] .type-label').first()
        ).toHaveText('number');
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_num"] svg.text-yellow-600')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_bool"] .type-label').first()
        ).toHaveText('boolean');
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_bool"] svg.text-yellow-600')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_obj"] .type-label').first()
        ).toHaveText('object');
        await expect(
          page.locator('[data-testid="env-var-row-mismatched_obj"] svg.text-yellow-600')
        ).toBeVisible();

        // No warning icon on well-typed rows.
        await expect(
          page.locator('[data-testid="env-var-row-env_num"] svg.text-yellow-600')
        ).toHaveCount(0);

        await envTab.hover();
        await envTab.getByTestId('request-tab-close-icon').click({ force: true });
      });
    });
  });
}
