import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { Page } from '@playwright/test';
import {
  importCollection,
  createEnvironment,
  closeAllCollections,
  addRowToActiveTab,
  cycleVariableSort,
  getVisibleVariableNames,
  dragVariableRow,
  buildVariableSortLocators
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const variablesTab = (page: Page) => buildCommonLocators(page).environment.variablesTab();
const secretsTab = (page: Page) => buildCommonLocators(page).environment.secretsTab();
const varRow = (page: Page, name: string) => buildCommonLocators(page).environment.varRow(name);
const saveTab = (page: Page) => buildCommonLocators(page).environment.saveTab();
const dragHandle = (page: Page, name: string) => buildVariableSortLocators(page).dragHandle(name);

const renameRow = async (page: Page, oldName: string, newName: string) => {
  await varRow(page, oldName).locator('input[name$=".name"]').fill(newName);
};

const typeIntoTrailingRow = async (page: Page, name: string) => {
  // The trailing "add new" row always has an empty name — its input has no stable
  // per-name testid yet, so it's the last Name input on the page.
  await buildVariableSortLocators(page).visibleNameInputs().last().fill(name);
};

const searchEnv = async (page: Page, query: string) => {
  const input = page.locator('.search-input');
  if ((await input.count()) === 0) {
    await page.locator('.env-search-container button[title="Search"]').click();
    await input.waitFor({ state: 'visible' });
  }
  await input.fill(query);
};

const resetSearch = async (page: Page) => {
  const input = page.locator('.search-input');
  if ((await input.count()) === 0) return;
  await input.fill('');
  await input.blur();
  await input.waitFor({ state: 'detached' });
};

const collectionFile = path.join(__dirname, '..', 'create-environment', 'fixtures', 'bruno-collection.json');
const COLLECTION_NAME = 'test_collection';

// Finds the on-disk environment file for `envName` regardless of collection format (.bru/.yml).
// `tmpDir` is the directory passed to `createTmpDir`/`importCollection` — the imported
// collection itself lands in a `COLLECTION_NAME` subdirectory underneath it.
const readEnvironmentFile = (tmpDir: string, envName: string): string => {
  const envDir = path.join(tmpDir, COLLECTION_NAME, 'environments');
  const file = fs.readdirSync(envDir).find((f) => path.basename(f, path.extname(f)) === envName);
  if (!file) {
    throw new Error(`No environment file found for "${envName}" in ${envDir}`);
  }
  return fs.readFileSync(path.join(envDir, file), 'utf8');
};

test.describe('Variable sort + drag-and-drop (Environment vars)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('A-Z / Z-A are view-only — cycling back to Manual restores the real saved order', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('sort-view-only');
    await importCollection(page, collectionFile, tmpDir, { expectedCollectionName: COLLECTION_NAME });
    await createEnvironment(page, 'SortViewOnlyEnv', 'collection');

    // Insertion order is deliberately not alphabetical.
    await addRowToActiveTab(page, 'zebra', '1');
    await addRowToActiveTab(page, 'apple', '2');
    await addRowToActiveTab(page, 'mango', '3');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('A-Z sorts the view alphabetically', async () => {
      await cycleVariableSort(page);
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['apple', 'mango', 'zebra']);
    });

    await test.step('Z-A reverses the view', async () => {
      await cycleVariableSort(page);
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['zebra', 'mango', 'apple']);
    });

    await test.step('Cycling back to Manual reveals the untouched real order', async () => {
      await cycleVariableSort(page);
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['zebra', 'apple', 'mango']);
    });

    await test.step('The on-disk file was never rewritten by viewing A-Z/Z-A', async () => {
      const content = readEnvironmentFile(tmpDir, 'SortViewOnlyEnv');
      const indices = ['zebra', 'apple', 'mango'].map((name) => content.indexOf(name));
      expect(indices.every((i) => i !== -1)).toBe(true);
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    });
  });

  test('renaming a sorted row does not reshuffle it until Save', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('sort-rename-no-live-reshuffle');
    await importCollection(page, collectionFile, tmpDir, { expectedCollectionName: COLLECTION_NAME });
    await createEnvironment(page, 'SortRenameEnv', 'collection');

    await addRowToActiveTab(page, 'banana', '1');
    await addRowToActiveTab(page, 'cherry', '2');
    await addRowToActiveTab(page, 'apple', '3');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await cycleVariableSort(page); // A-Z
    await expect.poll(() => getVisibleVariableNames(page)).toEqual(['apple', 'banana', 'cherry']);

    await test.step('Renaming "apple" to sort last does not move its row before Save', async () => {
      await renameRow(page, 'apple', 'zzzz');
      // Still in its original (first) slot — only the label changed.
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['zzzz', 'banana', 'cherry']);
    });

    await test.step('Saving re-sorts using the new name', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['banana', 'cherry', 'zzzz']);
    });
  });

  test('a newly typed variable stays at the bottom until Save', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('sort-new-var-bottom');
    await importCollection(page, collectionFile, tmpDir, { expectedCollectionName: COLLECTION_NAME });
    await createEnvironment(page, 'SortNewVarEnv', 'collection');

    await addRowToActiveTab(page, 'banana', '1');
    await addRowToActiveTab(page, 'cherry', '2');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await cycleVariableSort(page); // A-Z
    await expect.poll(() => getVisibleVariableNames(page)).toEqual(['banana', 'cherry']);

    await test.step('Typing "apple" (alphabetically first) into the empty row keeps it last', async () => {
      await typeIntoTrailingRow(page, 'apple');
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['banana', 'cherry', 'apple']);
    });

    await test.step('Saving sorts the new variable into place', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['apple', 'banana', 'cherry']);
    });
  });

  test('drag-and-drop reordering only works in Manual mode and never while searching', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('sort-drag-availability'), {
      expectedCollectionName: COLLECTION_NAME
    });
    await createEnvironment(page, 'DragAvailabilityEnv', 'collection');

    await addRowToActiveTab(page, 'alpha', '1');
    await addRowToActiveTab(page, 'beta', '2');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('Drag handle is present in Manual mode', async () => {
      await expect(dragHandle(page, 'alpha')).toHaveCount(1);
    });

    await test.step('Drag handle disappears once sorted (A-Z)', async () => {
      await cycleVariableSort(page);
      await expect(dragHandle(page, 'alpha')).toHaveCount(0);
    });

    await test.step('Drag handle reappears back in Manual mode', async () => {
      await cycleVariableSort(page); // Z-A
      await cycleVariableSort(page); // Manual
      await expect(dragHandle(page, 'alpha')).toHaveCount(1);
    });

    await test.step('Drag handle disappears while a search is active', async () => {
      await searchEnv(page, 'alpha');
      await expect(dragHandle(page, 'alpha')).toHaveCount(0);
      await resetSearch(page);
      await expect(dragHandle(page, 'alpha')).toHaveCount(1);
    });
  });

  test('dragging a variable never crosses into the secrets group', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('sort-drag-secret-isolation');
    await importCollection(page, collectionFile, tmpDir, { expectedCollectionName: COLLECTION_NAME });
    await createEnvironment(page, 'DragSecretIsolationEnv', 'collection');

    await test.step('Add two variables and two secrets, saving each tab independently', async () => {
      await addRowToActiveTab(page, 'v1', 'one');
      await addRowToActiveTab(page, 'v2', 'two');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

      await secretsTab(page).click();
      await addRowToActiveTab(page, 's1', 'secret-one');
      await addRowToActiveTab(page, 's2', 'secret-two');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

      await variablesTab(page).click();
    });

    await test.step('Drag v2 before v1, then save', async () => {
      await dragVariableRow(page, 'v2', 'v1');
      await expect.poll(() => getVisibleVariableNames(page)).toEqual(['v2', 'v1']);
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('On disk, variables were reordered but secrets kept their original order', async () => {
      const content = readEnvironmentFile(tmpDir, 'DragSecretIsolationEnv');
      const varIndices = ['v2', 'v1'].map((name) => content.indexOf(name));
      expect(varIndices.every((i) => i !== -1)).toBe(true);
      expect(varIndices).toEqual([...varIndices].sort((a, b) => a - b));

      const secretIndices = ['s1', 's2'].map((name) => content.indexOf(name));
      expect(secretIndices.every((i) => i !== -1)).toBe(true);
      expect(secretIndices).toEqual([...secretIndices].sort((a, b) => a - b));
    });
  });
});
