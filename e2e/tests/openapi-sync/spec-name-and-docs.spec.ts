import * as fs from 'fs';
import * as path from 'path';
import jsyaml from 'js-yaml';
import { test, expect, Page } from '../../playwright';
import { buildCommonLocators, closeAllCollections, expandCollection, importCollection } from '../../pages';
import { checkForUpdates, openConnectedOpenApiSyncTab } from '../../pages/openapi-sync';
import { expectSyncedWithSpec, readOpenApiSyncConfig } from '../../utils';

const COLLECTION_NAME = 'Name Sync API';
const PETS = 'GET:/pets';
const PETS_FILE = 'List pets.yml';

type PetsSpec = { summary?: string; description?: string; headers?: string[] };

const writeSpec = (specFile: string, { summary = 'List pets', description = 'Returns every pet.', headers = [] }: PetsSpec = {}) => {
  fs.writeFileSync(specFile, jsyaml.dump({
    openapi: '3.0.0',
    info: { title: COLLECTION_NAME, version: '1.0.0' },
    servers: [{ url: 'https://example.com' }],
    paths: {
      '/pets': {
        get: {
          summary,
          description,
          parameters: headers.map((name) => ({ name, in: 'header', schema: { type: 'string' } })),
          responses: { 200: { description: 'OK' } }
        }
      }
    }
  }));
};

const publishSpec = async (specFile: string, change: PetsSpec) => {
  await test.step(`Publish the spec with ${JSON.stringify(change)}`, async () => {
    writeSpec(specFile, change);
  });
};

const readPetsRequest = (collectionDir: string) => jsyaml.load(fs.readFileSync(path.join(collectionDir, PETS_FILE), 'utf8')) as any;

const importPetsCollection = async (page: Page, createTmpDir: (tag?: string) => Promise<string>, tag: string) => {
  const specFile = path.join(await createTmpDir(`${tag}-spec`), 'pets.yaml');
  writeSpec(specFile);
  const importDir = await createTmpDir(tag);
  await importCollection(page, specFile, importDir, { expectedCollectionName: COLLECTION_NAME, checkForSpecUpdates: true });
  return { specFile, collectionDir: path.join(importDir, COLLECTION_NAME) };
};

const renamePetsRequest = async (page: Page, collectionDir: string, name: string) => {
  await test.step(`Rename the request to "${name}" in the collection`, async () => {
    const request = readPetsRequest(collectionDir);
    request.info.name = name;
    fs.writeFileSync(path.join(collectionDir, PETS_FILE), jsyaml.dump(request));
    await expandCollection(page, COLLECTION_NAME);
    await expect(buildCommonLocators(page).sidebar.itemsIn(COLLECTION_NAME, name)).toBeVisible();
  });
};

const reviewSpecUpdates = async (page: Page) => {
  const { sync } = buildCommonLocators(page).openApi;
  await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
  await checkForUpdates(page);
  await test.step('Open the spec updates', async () => {
    await sync.specUpdatesTab().click();
    await expect(sync.endpointRow(PETS)).toBeVisible();
  });
};

const syncCollection = async (page: Page, collectionDir: string, specFile: string) => {
  const { sync } = buildCommonLocators(page).openApi;
  await test.step('Sync the collection', async () => {
    await sync.applyButton().click();
    await sync.confirmSyncButton().click();
    await expect(sync.endpointRow(PETS)).toHaveCount(0, { timeout: 15000 });
    expectSyncedWithSpec(collectionDir, readOpenApiSyncConfig(collectionDir), specFile);
  });
};

test.describe('OpenAPI sync: request name and docs from the spec', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('shows a new summary and description as a change and applies them', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const { sync } = locators.openApi;
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-docs-accept');
    await publishSpec(specFile, { summary: 'List all pets', description: 'Returns every pet in the store.' });

    await reviewSpecUpdates(page);

    await test.step('The diff shows the current and the incoming name and docs', async () => {
      await sync.endpointRowToggle(PETS).click();
      await expect(sync.nameDiff(PETS, 'old')).toHaveText('List pets');
      await expect(sync.nameDiff(PETS, 'new')).toHaveText('List all pets');
      await expect(sync.docsDiff(PETS, 'old')).toHaveText('Returns every pet.');
      await expect(sync.docsDiff(PETS, 'new')).toHaveText('Returns every pet in the store.');
    });

    await syncCollection(page, collectionDir, specFile);

    await test.step('The request takes the new name and docs in its existing file', async () => {
      await expandCollection(page, COLLECTION_NAME);
      await expect(locators.sidebar.itemsIn(COLLECTION_NAME, 'List all pets')).toBeVisible();
      const request = readPetsRequest(collectionDir);
      expect(request.info.name).toBe('List all pets');
      expect(request.docs).toBe('Returns every pet in the store.');
    });
  });

  test('keeps the current name and docs when the user keeps the current version', async ({ page, createTmpDir }) => {
    const { sync } = buildCommonLocators(page).openApi;
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-docs-keep');
    await publishSpec(specFile, { summary: 'List all pets', description: 'Returns every pet in the store.' });

    await reviewSpecUpdates(page);

    await test.step('Keep the current version', async () => {
      await sync.decisionButton(PETS, 'keep').click();
      await expect(sync.decisionButton(PETS, 'keep')).toHaveClass(/selected/);
    });

    await syncCollection(page, collectionDir, specFile);

    await test.step('The request keeps its name and docs', async () => {
      const request = readPetsRequest(collectionDir);
      expect(request.info.name).toBe('List pets');
      expect(request.docs).toBe('Returns every pet.');
    });
  });

  test('asks which name to keep when the collection and the spec both renamed the request', async ({ page, createTmpDir }) => {
    const { sync } = buildCommonLocators(page).openApi;
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-conflict');
    await renamePetsRequest(page, collectionDir, 'My pets');
    await publishSpec(specFile, { summary: 'List all pets' });

    await reviewSpecUpdates(page);

    await test.step('The rename is a conflict that blocks the sync', async () => {
      await expect(sync.endpointConflictBadge(PETS)).toBeVisible();
      await expect(sync.applyButton()).toBeDisabled();
      await expect(sync.applyButton()).toHaveText('Resolve 1 conflict and sync');
    });

    await test.step('Take the name from the spec', async () => {
      await sync.decisionButton(PETS, 'accept').click();
      await expect(sync.applyButton()).toBeEnabled();
    });

    await syncCollection(page, collectionDir, specFile);

    await test.step('The request takes the name from the spec', async () => {
      expect(readPetsRequest(collectionDir).info.name).toBe('List all pets');
    });
  });

  test('leaves a new conflict unresolved after checking again', async ({ page, createTmpDir }) => {
    const { sync } = buildCommonLocators(page).openApi;
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-recheck');
    await publishSpec(specFile, { summary: 'List all pets' });

    await reviewSpecUpdates(page);

    await test.step('The spec rename starts as a plain update', async () => {
      await expect(sync.endpointConflictBadge(PETS)).toHaveCount(0);
      await expect(sync.decisionButton(PETS, 'accept')).toHaveClass(/selected/);
    });

    await renamePetsRequest(page, collectionDir, 'My pets');

    await checkForUpdates(page);

    await test.step('The check shows the conflict with no choice made', async () => {
      await expect(sync.endpointConflictBadge(PETS)).toBeVisible();
      await expect(sync.applyButton()).toHaveText('Resolve 1 conflict and sync');
      await expect(sync.applyButton()).toBeDisabled();
      await expect(sync.decisionButton(PETS, 'accept')).not.toHaveClass(/selected/);
    });
  });

  test('applies the spec rename after a conflict is resolved by resetting the local changes', async ({ page, createTmpDir }) => {
    const { openApi: { sync }, modal } = buildCommonLocators(page);
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-reset-conflict');

    await test.step('Add a header to the request in the collection', async () => {
      const request = readPetsRequest(collectionDir);
      request.http.headers = [{ name: 'X-Debug', value: '1' }];
      fs.writeFileSync(path.join(collectionDir, PETS_FILE), jsyaml.dump(request));
    });
    await publishSpec(specFile, { summary: 'List all pets' });

    await reviewSpecUpdates(page);

    await test.step('The local header and the spec rename make a conflict', async () => {
      await expect(sync.endpointConflictBadge(PETS)).toBeVisible();
    });

    await test.step('Reset the local changes under Collection Changes', async () => {
      await sync.collectionChangesTab().click();
      await sync.changeSectionHeader('Modified in Collection').click();
      await sync.resetEndpointButton(PETS).click();
      await modal.button('Confirm').click();
      await expect(sync.endpointRow(PETS)).toHaveCount(0);
    });

    await test.step('The rename is now a plain update with Update chosen', async () => {
      await sync.specUpdatesTab().click();
      await expect(sync.endpointRow(PETS)).toBeVisible();
      await expect(sync.endpointConflictBadge(PETS)).toHaveCount(0);
      await expect(sync.decisionButton(PETS, 'accept')).toHaveClass(/selected/);
    });

    await syncCollection(page, collectionDir, specFile);

    await test.step('The request takes the spec name', async () => {
      expect(readPetsRequest(collectionDir).info.name).toBe('List all pets');
    });
  });

  test('keeps a local rename when the spec changes something else', async ({ page, createTmpDir }) => {
    const { sync } = buildCommonLocators(page).openApi;
    const { specFile, collectionDir } = await importPetsCollection(page, createTmpDir, 'openapi-sync-name-kept');
    await renamePetsRequest(page, collectionDir, 'My pets');
    await publishSpec(specFile, { headers: ['X-Trace'] });

    await reviewSpecUpdates(page);

    await test.step('Only the header shows as a change, with no conflict', async () => {
      await expect(sync.endpointConflictBadge(PETS)).toHaveCount(0);
      await sync.endpointRowToggle(PETS).click();
      await expect(sync.diffPane(PETS, 'Headers', 'new')).toContainText('X-Trace');
      await expect(sync.nameDiff(PETS, 'new')).toHaveCount(0);
    });

    await syncCollection(page, collectionDir, specFile);

    await test.step('The request gets the header and keeps its local name', async () => {
      const request = readPetsRequest(collectionDir);
      expect(request.info.name).toBe('My pets');
      expect(request.http.headers).toEqual([expect.objectContaining({ name: 'X-Trace' })]);
    });
  });
});
