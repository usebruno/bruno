import { test, expect } from '../../../playwright';
import path from 'path';
import { Page } from '@playwright/test';
import { importCollection, createEnvironment, closeAllCollections, addRowToActiveTab, saveEnvironment, deleteAllGlobalEnvironments } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const variablesTab = (page: Page) => buildCommonLocators(page).environment.variablesTab();
const secretsTab = (page: Page) => buildCommonLocators(page).environment.secretsTab();
const varRow = (page: Page, name: string) => buildCommonLocators(page).environment.varRow(name);
const varRowValueEditor = (page: Page, name: string) => buildCommonLocators(page).environment.varRowValueEditor(name);
const varRowValueLine = (page: Page, name: string) => buildCommonLocators(page).environment.varRowValueLine(name);
const saveTab = (page: Page) => buildCommonLocators(page).environment.saveTab();
const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
const searchInputLocator = (page: Page) => buildCommonLocators(page).environment.searchInput();
const tabDraftIcon = (page: Page) => page.locator('.request-tab.active').getByTestId('tab-draft-icon');

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

const deleteRow = async (page: Page, name: string) => {
  await varRow(page, name).locator('button:has(.icon-tabler-trash)').click();
};

const collectionFile = path.join(__dirname, '..', 'create-environment', 'fixtures', 'bruno-collection.json');

test.describe('Environment Variables / Secrets tab separation', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('keeps variables and secrets on their own tabs', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-tabs'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Tab Separation Env', 'collection');

    await test.step('Add a variable on the Variables tab', async () => {
      await expect(variablesTab(page)).toHaveClass(/active/);
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    await test.step('Add a secret on the Secrets tab', async () => {
      await secretsTab(page).click();
      await expect(secretsTab(page)).toHaveClass(/active/);

      await expect(varRow(page, 'host')).toHaveCount(0);

      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await expect(varRow(page, 'apiToken')).toBeVisible();
    });

    await test.step('Variables tab shows only the variable, not the secret', async () => {
      await variablesTab(page).click();
      await expect(variablesTab(page)).toHaveClass(/active/);
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
    });
  });

  test('saves variables and secrets independently and persists both', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-save'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Independent Save Env', 'collection');

    await test.step('Add and save a variable on the Variables tab', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await saveTab(page).click();
      // newest toast: the two back-to-back saves can briefly show two identical toasts
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Add and save a secret on the Secrets tab', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Saving the Secrets tab did not wipe the saved variable', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);

      await secretsTab(page).click();
      await expect(varRow(page, 'apiToken')).toBeVisible();
      await expect(varRow(page, 'host')).toHaveCount(0);
    });
  });

  test('per-tab Save on the Secrets tab keeps unsaved Variables edits', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-unsaved-secret-save'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Unsaved Var Env', 'collection');

    await test.step('Add and save a variable on the Variables tab', async () => {
      await addRowToActiveTab(page, 'host', 'https://original.example.com');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Edit the variable value but do NOT save', async () => {
      await varRowValueEditor(page, 'host').click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('https://edited.example.com');
      await expect(varRowValueLine(page, 'host')).toHaveText('https://edited.example.com');
    });

    await test.step('Add a secret and save it with the per-tab Save button', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved Variables edit survived the Secrets save', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      // Regression: previously the post-save reinitialize snapped the value back to
      // the last-saved "https://original.example.com", silently dropping the edit.
      await expect(varRowValueLine(page, 'host')).toHaveText('https://edited.example.com');
      // The edit is still unsaved, so the draft indicator must remain.
      await expect(tabDraftIcon(page)).toBeVisible();
    });
  });

  test('common save icon persists both variables and secrets at once', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-save-all'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Save All Env', 'collection');

    await test.step('Add a variable on the Variables tab without saving', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    });

    await test.step('Add a secret on the Secrets tab without saving', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    });

    await test.step('The environment tab shows the unsaved-changes dot while drafts exist', async () => {
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('The common save icon saves both tabs in a single click', async () => {
      await saveEnvironment(page);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Both the variable and the secret are persisted on their tabs', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);

      await secretsTab(page).click();
      await expect(varRow(page, 'apiToken')).toBeVisible();
      await expect(varRow(page, 'host')).toHaveCount(0);
    });

    await test.step('The unsaved-changes dot is gone once both tabs are saved', async () => {
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });

    await test.step('A second save reports nothing to save, proving both were committed', async () => {
      await saveEnvironment(page);
      await expect(page.getByText('No changes to save')).toBeVisible();
    });
  });

  test('search is scoped to the active tab', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-search'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Search Scope Env', 'collection');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('Searching the Variables tab never surfaces the secret', async () => {
      await variablesTab(page).click();
      await searchEnv(page, 'host');
      await expect(varRow(page, 'host')).toBeVisible();

      await searchEnv(page, 'apiToken');
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
      await expect(page.getByText('No results found')).toBeVisible();
    });

    await test.step('Searching the Secrets tab never surfaces the variable', async () => {
      await secretsTab(page).click();
      await searchEnv(page, 'apiToken');
      await expect(varRow(page, 'apiToken')).toBeVisible();

      await searchEnv(page, 'host');
      await expect(varRow(page, 'host')).toHaveCount(0);
      await expect(page.getByText('No results found')).toBeVisible();
    });

    await resetSearch(page);
    await variablesTab(page).click();
    await resetSearch(page);
  });

  test('search input value persists per tab and does not leak across tabs', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-search-persist'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Search Persist Env', 'collection');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    const searchInput = searchInputLocator(page);

    await test.step('Type a search on the Variables tab', async () => {
      await variablesTab(page).click();
      await searchEnv(page, 'host');
      await expect(searchInput).toHaveValue('host');
    });

    await test.step('Switching to the Secrets tab does not carry the Variables search over', async () => {
      await secretsTab(page).click();
      // Secrets keeps its own (still-empty, collapsed) search state — the Variables
      // query must not appear on the Secrets tab.
      await expect(searchInput).toHaveCount(0);
    });

    await test.step('The Secrets tab keeps its own independent search', async () => {
      await searchEnv(page, 'apiToken');
      await expect(searchInput).toHaveValue('apiToken');
    });

    await test.step('Returning to the Variables tab restores its original search', async () => {
      await variablesTab(page).click();
      await expect(searchInput).toHaveValue('host');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    // Reset both tabs' search (clear text + collapse) so neither the query nor the
    // expanded flag persists in Redux into later tests.
    await resetSearch(page);
    await secretsTab(page).click();
    await resetSearch(page);
    await variablesTab(page).click();
  });

  test('deleting on one tab leaves the other tab untouched', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-delete'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Delete Scope Env', 'collection');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('Delete the secret on the Secrets tab', async () => {
      await deleteRow(page, 'apiToken');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
    });

    await test.step('The variable on the Variables tab is untouched', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
    });
  });
});

test.describe('Global Environment Variables / Secrets tab separation', () => {
  test.afterEach(async ({ page }) => {
    await deleteAllGlobalEnvironments(page);
    await closeAllCollections(page);
  });

  test('keeps variables and secrets on their own tabs', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-tabs'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Tab Separation Env', 'global');

    await test.step('Add a variable on the Variables tab', async () => {
      await expect(variablesTab(page)).toHaveClass(/active/);
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    await test.step('Add a secret on the Secrets tab', async () => {
      await secretsTab(page).click();
      await expect(secretsTab(page)).toHaveClass(/active/);

      await expect(varRow(page, 'host')).toHaveCount(0);

      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await expect(varRow(page, 'apiToken')).toBeVisible();
    });

    await test.step('Variables tab shows only the variable, not the secret', async () => {
      await variablesTab(page).click();
      await expect(variablesTab(page)).toHaveClass(/active/);
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
    });
  });

  test('saves variables and secrets independently and persists both', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-save'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Independent Save Env', 'global');

    await test.step('Add and save a variable on the Variables tab', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await saveTab(page).click();
      // newest toast: the two back-to-back saves can briefly show two identical toasts
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Add and save a secret on the Secrets tab', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Saving the Secrets tab did not wipe the saved variable', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);

      await secretsTab(page).click();
      await expect(varRow(page, 'apiToken')).toBeVisible();
      await expect(varRow(page, 'host')).toHaveCount(0);
    });
  });

  test('per-tab Save on the Secrets tab keeps unsaved Variables edits', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-unsaved-secret-save'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Unsaved Var Env', 'global');

    await test.step('Add and save a variable on the Variables tab', async () => {
      await addRowToActiveTab(page, 'host', 'https://original.example.com');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Edit the variable value but do NOT save', async () => {
      await varRowValueEditor(page, 'host').click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('https://edited.example.com');
      await expect(varRowValueLine(page, 'host')).toHaveText('https://edited.example.com');
    });

    await test.step('Add a secret and save it with the per-tab Save button', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved Variables edit survived the Secrets save', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      // Regression: previously the post-save reinitialize snapped the value back to
      // the last-saved "https://original.example.com", silently dropping the edit.
      await expect(varRowValueLine(page, 'host')).toHaveText('https://edited.example.com');
      // The edit is still unsaved, so the draft indicator must remain.
      await expect(tabDraftIcon(page)).toBeVisible();
    });
  });

  test('common save icon persists both variables and secrets at once', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-save-all'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Save All Env', 'global');

    await test.step('Add a variable on the Variables tab without saving', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    });

    await test.step('Add a secret on the Secrets tab without saving', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    });

    await test.step('The environment tab shows the unsaved-changes dot while drafts exist', async () => {
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('The common save icon saves both tabs in a single click', async () => {
      await saveEnvironment(page);
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('Both the variable and the secret are persisted on their tabs', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);

      await secretsTab(page).click();
      await expect(varRow(page, 'apiToken')).toBeVisible();
      await expect(varRow(page, 'host')).toHaveCount(0);
    });

    await test.step('The unsaved-changes dot is gone once both tabs are saved', async () => {
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });

    await test.step('A second save reports nothing to save, proving both were committed', async () => {
      await saveEnvironment(page);
      await expect(page.getByText('No changes to save')).toBeVisible();
    });
  });

  test('search is scoped to the active tab', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-search'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Search Scope Env', 'global');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('Searching the Variables tab never surfaces the secret', async () => {
      await variablesTab(page).click();
      await searchEnv(page, 'host');
      await expect(varRow(page, 'host')).toBeVisible();

      await searchEnv(page, 'apiToken');
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
      await expect(page.getByText('No results found')).toBeVisible();
    });

    await test.step('Searching the Secrets tab never surfaces the variable', async () => {
      await secretsTab(page).click();
      await searchEnv(page, 'apiToken');
      await expect(varRow(page, 'apiToken')).toBeVisible();

      await searchEnv(page, 'host');
      await expect(varRow(page, 'host')).toHaveCount(0);
      await expect(page.getByText('No results found')).toBeVisible();
    });

    await resetSearch(page);
    await variablesTab(page).click();
    await resetSearch(page);
  });

  test('search input value persists per tab and does not leak across tabs', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-search-persist'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Search Persist Env', 'global');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    const searchInput = searchInputLocator(page);

    await test.step('Type a search on the Variables tab', async () => {
      await variablesTab(page).click();
      await searchEnv(page, 'host');
      await expect(searchInput).toHaveValue('host');
    });

    await test.step('Switching to the Secrets tab does not carry the Variables search over', async () => {
      await secretsTab(page).click();
      // Secrets keeps its own (still-empty, collapsed) search state — the Variables
      // query must not appear on the Secrets tab.
      await expect(searchInput).toHaveCount(0);
    });

    await test.step('The Secrets tab keeps its own independent search', async () => {
      await searchEnv(page, 'apiToken');
      await expect(searchInput).toHaveValue('apiToken');
    });

    await test.step('Returning to the Variables tab restores its original search', async () => {
      await variablesTab(page).click();
      await expect(searchInput).toHaveValue('host');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    await resetSearch(page);
    await secretsTab(page).click();
    await resetSearch(page);
    await variablesTab(page).click();
  });

  test('deleting on one tab leaves the other tab untouched', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-delete'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Delete Scope Env', 'global');

    await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await secretsTab(page).click();
    await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
    await saveTab(page).click();
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible();

    await test.step('Delete the secret on the Secrets tab', async () => {
      await deleteRow(page, 'apiToken');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
    });

    await test.step('The variable on the Variables tab is untouched', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
    });
  });
});
