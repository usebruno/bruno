import * as fs from 'fs';
import * as path from 'path';
import { test, expect, ElectronApplication, Page } from '../../playwright';
import { generateCollection, setupTestFixture, GeneratedCollection, TestFixture } from '../utils/fixtures';
import { buildCollectionTreeLocators, openCollectionFromDialog, waitForCollectionMount } from '../utils/page';
import { buildSidebarLocators } from '../utils/page/sidebar';

const LARGE_REQUEST_COUNT = 7000;
const SMALL_REQUEST_COUNT = 3;
const NAME_A = 'Overlap Collection A';
const NAME_B = 'Overlap Collection B';
const SMALL_NAME_A = 'Small Overlap Collection A';
const SMALL_NAME_B = 'Small Overlap Collection B';

const disableFileCache = async (userDataPath: string) => {
  const preferencesPath = path.join(userDataPath, 'preferences.json');
  const preferences = JSON.parse(await fs.promises.readFile(preferencesPath, 'utf8'));
  preferences.lastOpenedCollections = [];
  preferences.preferences = {
    ...preferences.preferences,
    cache: { file: { enabled: false } }
  };
  await fs.promises.writeFile(preferencesPath, JSON.stringify(preferences, null, 2));
};

const clickCollectionNames = async (page: Page, names: string[]) => {
  await page.evaluate((collectionNames) => {
    for (const name of collectionNames) {
      const label = [...document.querySelectorAll('#sidebar-collection-name')]
        .find((node) => node.textContent?.trim() === name);
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    }
  }, names);
};

test.describe('Overlapping mount loading (v1)', () => {
  test.describe.configure({ timeout: 20 * 60 * 1000 });

  let collectionB: GeneratedCollection;
  let fixture: TestFixture;
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ launchElectronApp }) => {
    collectionB = await generateCollection({
      name: NAME_B,
      requestCount: LARGE_REQUEST_COUNT,
      depth: 0,
      format: 'bru',
      environmentCount: 0
    });

    fixture = await setupTestFixture({
      name: NAME_A,
      requestCount: LARGE_REQUEST_COUNT,
      depth: 0,
      format: 'bru',
      environmentCount: 0
    });

    await disableFileCache(fixture.userDataPath);

    app = await launchElectronApp({ userDataPath: fixture.userDataPath });
    page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 120000 });
  });

  test.afterAll(async () => {
    if (app) {
      await app.context().close();
      await app.close();
    }
    if (fixture) {
      await fixture.cleanup();
    }
    if (collectionB) {
      await collectionB.cleanup();
    }
  });

  test('second collection shows a loading spinner before the first collection finishes mounting', async () => {
    const tree = buildCollectionTreeLocators(page);
    const sidebar = buildSidebarLocators(page);

    await openCollectionFromDialog(page, app, fixture.collection.path);
    await expect(sidebar.collectionRow(NAME_A)).toBeVisible({ timeout: 120000 });
    await openCollectionFromDialog(page, app, collectionB.path);
    await expect(sidebar.collectionRow(NAME_B)).toBeVisible({ timeout: 120000 });

    await clickCollectionNames(page, [NAME_A, NAME_B]);

    await expect(tree.collection.loadingSpinner(NAME_B)).toBeVisible({ timeout: 120000 });
    await expect(tree.collection.loadingSpinner(NAME_A)).toBeVisible();
  });
});

test.describe('Overlapping mount loading (v1) — small collections', () => {
  test.describe.configure({ timeout: 2 * 60 * 1000 });

  let collectionB: GeneratedCollection;
  let fixture: TestFixture;
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ launchElectronApp }) => {
    collectionB = await generateCollection({
      name: SMALL_NAME_B,
      requestCount: SMALL_REQUEST_COUNT,
      depth: 0,
      format: 'bru',
      environmentCount: 0
    });

    fixture = await setupTestFixture({
      name: SMALL_NAME_A,
      requestCount: SMALL_REQUEST_COUNT,
      depth: 0,
      format: 'bru',
      environmentCount: 0
    });

    await disableFileCache(fixture.userDataPath);

    app = await launchElectronApp({ userDataPath: fixture.userDataPath });
    page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 120000 });
  });

  test.afterAll(async () => {
    if (app) {
      await app.context().close();
      await app.close();
    }
    if (fixture) {
      await fixture.cleanup();
    }
    if (collectionB) {
      await collectionB.cleanup();
    }
  });

  test('loading spinner is removed after both collections finish mounting', async () => {
    const sidebar = buildSidebarLocators(page);

    await test.step('Open both collections', async () => {
      await openCollectionFromDialog(page, app, fixture.collection.path);
      await expect(sidebar.collectionRow(SMALL_NAME_A)).toBeVisible({ timeout: 30000 });
      await openCollectionFromDialog(page, app, collectionB.path);
      await expect(sidebar.collectionRow(SMALL_NAME_B)).toBeVisible({ timeout: 30000 });
    });

    await test.step('Mount both collections', async () => {
      await clickCollectionNames(page, [SMALL_NAME_A, SMALL_NAME_B]);
    });

    await waitForCollectionMount(page, SMALL_NAME_A);
    await waitForCollectionMount(page, SMALL_NAME_B);
  });
});
