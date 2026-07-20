import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createEnvironment,
  openCollection,
  openCollectionSettings,
  closeAllCollections,
  waitForCollectionMount
} from '../../utils/page';

const findCollectionDir = (location: string) =>
  path.join(location, fs.readdirSync(location).find((entry) => fs.statSync(path.join(location, entry)).isDirectory())!);

const setDefaultViaPresets = async (page: Page, collectionName: string, environmentName: string) => {
  const locators = buildCommonLocators(page);
  await openCollectionSettings(page, collectionName);
  await locators.paneTabs.collectionSettingsTab('presets').click();
  await locators.presets.defaultEnvironment().click();
  await locators.presets.defaultEnvironmentOption(environmentName).click();
};

test.describe('Collection Default Environment - Presets & sharing', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('setting the default environment in Presets persists to bruno.json', async ({ page, createTmpDir }) => {
    const location = await createTmpDir('default-env-presets');

    await createCollection(page, 'default-env-presets', location, 'bru');
    await createEnvironment(page, 'prod', 'collection');
    await createEnvironment(page, 'dev', 'collection');

    await setDefaultViaPresets(page, 'default-env-presets', 'prod');

    const collectionDir = findCollectionDir(location);
    await expect
      .poll(() => {
        const cfg = JSON.parse(fs.readFileSync(path.join(collectionDir, 'bruno.json'), 'utf8'));
        return cfg?.presets?.defaultEnvironment;
      }, { timeout: 10000 })
      .toBe('prod');
  });

  test('setting the default environment in Presets persists to opencollection.yml', async ({ page, createTmpDir }) => {
    const location = await createTmpDir('default-env-presets-yml');

    await createCollection(page, 'default-env-presets-yml', location, 'yml');
    await createEnvironment(page, 'prod', 'collection');
    await createEnvironment(page, 'dev', 'collection');

    await setDefaultViaPresets(page, 'default-env-presets-yml', 'prod');

    const collectionDir = findCollectionDir(location);
    await expect
      .poll(() => {
        const content = fs.readFileSync(path.join(collectionDir, 'opencollection.yml'), 'utf8');
        return /defaultEnvironment:\s*prod/.test(content);
      }, { timeout: 10000 })
      .toBe(true);
  });

  test('selecting "None" clears the default environment from bruno.json', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const location = await createTmpDir('default-env-presets-clear');

    await createCollection(page, 'default-env-presets-clear', location, 'bru');
    await createEnvironment(page, 'prod', 'collection');
    await createEnvironment(page, 'dev', 'collection');

    const collectionDir = findCollectionDir(location);
    const readDefaultEnvironment = () => {
      const cfg = JSON.parse(fs.readFileSync(path.join(collectionDir, 'bruno.json'), 'utf8'));
      return cfg?.presets?.defaultEnvironment;
    };

    await setDefaultViaPresets(page, 'default-env-presets-clear', 'prod');
    await expect.poll(readDefaultEnvironment, { timeout: 10000 }).toBe('prod');

    // Selecting "None" removes the key entirely.
    await locators.presets.defaultEnvironment().click();
    await locators.presets.defaultEnvironmentOption('None').click();
    await expect.poll(readDefaultEnvironment, { timeout: 10000 }).toBeUndefined();
  });

  test('exported ZIP carries the configured default environment in bruno.json', async ({ page, electronApp, createTmpDir }) => {
    const location = await createTmpDir('default-env-zip');

    await createCollection(page, 'default-env-zip', location, 'bru');
    await createEnvironment(page, 'prod', 'collection');
    await createEnvironment(page, 'dev', 'collection');

    await setDefaultViaPresets(page, 'default-env-zip', 'prod');

    const collectionDir = findCollectionDir(location);
    await expect
      .poll(() => {
        const cfg = JSON.parse(fs.readFileSync(path.join(collectionDir, 'bruno.json'), 'utf8'));
        return cfg?.presets?.defaultEnvironment;
      }, { timeout: 10000 })
      .toBe('prod');

    // Mock the native save dialog so the export writes to a known path.
    const zipPath = path.join(await createTmpDir('default-env-zip-out'), 'export.zip');
    await electronApp.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ filePath, canceled: false });
    }, zipPath);

    await page.evaluate(
      ({ collectionPath, collectionName }) =>
        (window as any).ipcRenderer.invoke('renderer:export-collection-zip', collectionPath, collectionName),
      { collectionPath: collectionDir, collectionName: 'default-env-zip' }
    );

    await expect.poll(() => fs.existsSync(zipPath), { timeout: 10000 }).toBe(true);

    const zip = new AdmZip(zipPath);
    const entry = zip.getEntries().find((e) => /(^|\/)bruno\.json$/.test(e.entryName));
    expect(entry).toBeTruthy();
    const archivedConfig = JSON.parse(entry!.getData().toString('utf8'));
    expect(archivedConfig?.presets?.defaultEnvironment).toBe('prod');
  });

  test('importing a shared collection applies its default environment on first open', async ({ page, createTmpDir }) => {
    const { environment } = buildCommonLocators(page);

    // Build a shared-collection ZIP whose bruno.json carries presets.defaultEnvironment.
    const zipPath = path.join(await createTmpDir('imported-default-env-src'), 'shared.zip');
    const zip = new AdmZip();
    zip.addFile(
      'bruno.json',
      Buffer.from(
        JSON.stringify(
          { version: '1', name: 'imported-default-env', type: 'collection', presets: { defaultEnvironment: 'prod' } },
          null,
          2
        ) + '\n'
      )
    );
    zip.addFile('environments/prod.bru', Buffer.from('vars {\n  name: production\n}\n'));
    zip.addFile('environments/dev.bru', Buffer.from('vars {\n  name: development\n}\n'));
    zip.writeZip(zipPath);

    // Import into a fresh location, so there is no prior ui-snapshot for that path.
    const importLocation = await createTmpDir('imported-default-env-dest');
    await page.evaluate(
      ({ zipFilePath, collectionLocation }) =>
        (window as any).ipcRenderer.invoke('renderer:import-collection-zip', zipFilePath, collectionLocation),
      { zipFilePath: zipPath, collectionLocation: importLocation }
    );

    // Opening the freshly imported collection applies its configured default (prod).
    await openCollection(page, 'imported-default-env');
    await waitForCollectionMount(page, 'imported-default-env');
    await expect(environment.currentEnvironment()).toContainText('prod');
  });
});
