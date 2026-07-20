import { Page } from '@playwright/test';
import path from 'path';
import { expect, test } from '../../../playwright';
import { addRowToActiveTab, closeAllCollections, createEnvironment, deleteAllGlobalEnvironments, importCollection, saveEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const envLocators = (page: Page) => buildCommonLocators(page).environment;

const variablesTab = (page: Page) => envLocators(page).variablesTab();
const secretsTab = (page: Page) => envLocators(page).secretsTab();
const varRow = (page: Page, name: string) => envLocators(page).varRow(name);
const varRowValueLine = (page: Page, name: string) => envLocators(page).varRowValueLine(name);
const saveTab = (page: Page) => envLocators(page).saveTab();
const searchInputLocator = (page: Page) => envLocators(page).searchInput();
const tabDraftIcon = (page: Page) => page.locator('.request-tab.active').getByTestId('tab-draft-icon');
const variablesTabDot = (page: Page) => envLocators(page).tabDot('variables');
const secretsTabDot = (page: Page) => envLocators(page).tabDot('secrets');

const searchEnv = async (page: Page, query: string) => {
  const input = searchInputLocator(page);
  if ((await input.count()) === 0) {
    await envLocators(page).searchAction().click();
    await input.waitFor({ state: 'visible' });
  }
  await input.fill(query);
};

const resetSearch = async (page: Page) => {
  const input = searchInputLocator(page);
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

  test('Secret value does not carry its reveal-eye toggle onto the Variables tab', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-eye-toggle'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Eye Toggle Env', 'collection');

    await test.step('Add a secret on the Secrets tab; its reveal-eye toggle is shown there', async () => {
      await secretsTab(page).click();
      await expect(secretsTab(page)).toHaveClass(/active/);
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await expect(envLocators(page).varRowEyeToggle('apiToken')).toBeVisible();
    });

    await test.step('Switching to the Variables tab hides the secret and its reveal-eye toggle', async () => {
      await variablesTab(page).click();
      await expect(variablesTab(page)).toHaveClass(/active/);
      await expect(varRow(page, 'apiToken')).toHaveCount(0);
      await expect(page.getByTestId('secret-reveal-toggle')).toHaveCount(0);
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
    const collectionDir = await createTmpDir('var-unsaved-secret-save');
    await importCollection(page, collectionFile, collectionDir, {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Unsaved Var Env', 'collection');

    await test.step('Add a variable on the Variables tab without saving', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    await test.step('Add a secret and save it with the per-tab Save button', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved variable survived the Secrets save', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRowValueLine(page, 'host')).toHaveText('https://echo.usebruno.com');
      // The variable is still unsaved, so the draft indicator must remain.
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('Saving the Variables tab now persists the variable', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(varRowValueLine(page, 'host')).toHaveText('https://echo.usebruno.com');
      // Everything is saved now, so the draft indicator must clear.
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });
  });

  test('the unsaved-changes dot appears only on the tab with unsaved edits', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('var-secret-per-tab-dot'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Per-Tab Dot Env', 'collection');

    await test.step('No dots before anything is edited', async () => {
      await expect(variablesTabDot(page)).toBeHidden();
      await expect(secretsTabDot(page)).toBeHidden();
    });

    await test.step('Editing the Variables tab lights up only the Variables dot', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(variablesTabDot(page)).toBeVisible();
      await expect(secretsTabDot(page)).toBeHidden();
    });

    await test.step('Editing the Secrets tab lights up its own dot without clearing Variables', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await expect(secretsTabDot(page)).toBeVisible();
      // The Variables tab still has its unsaved row, so its dot must remain.
      await expect(variablesTabDot(page)).toBeVisible();
    });

    await test.step('Saving the Secrets tab clears only the Secrets dot', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(secretsTabDot(page)).toBeHidden();
      await expect(variablesTabDot(page)).toBeVisible();
    });

    await test.step('Saving the Variables tab clears the last remaining dot', async () => {
      await variablesTab(page).click();
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(variablesTabDot(page)).toBeHidden();
      await expect(secretsTabDot(page)).toBeHidden();
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

    await test.step('Add a variable on the Variables tab without saving', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(varRow(page, 'host')).toBeVisible();
    });

    await test.step('Add a secret and save it with the per-tab Save button', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
    });

    await test.step('The unsaved variable survived the Secrets save', async () => {
      await variablesTab(page).click();
      await expect(varRow(page, 'host')).toBeVisible();
      await expect(varRowValueLine(page, 'host')).toHaveText('https://echo.usebruno.com');
      // The variable is still unsaved, so the draft indicator must remain.
      await expect(tabDraftIcon(page)).toBeVisible();
    });

    await test.step('Saving the Variables tab now persists the variable', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(varRowValueLine(page, 'host')).toHaveText('https://echo.usebruno.com');
      // Everything is saved now, so the draft indicator must clear.
      await expect(tabDraftIcon(page)).not.toBeVisible();
    });
  });

  test('the unsaved-changes dot appears only on the tab with unsaved edits', async ({ page, createTmpDir }) => {
    await importCollection(page, collectionFile, await createTmpDir('global-var-secret-per-tab-dot'), {
      expectedCollectionName: 'test_collection'
    });

    await createEnvironment(page, 'Global Per-Tab Dot Env', 'global');

    await test.step('No dots before anything is edited', async () => {
      await expect(variablesTabDot(page)).toBeHidden();
      await expect(secretsTabDot(page)).toBeHidden();
    });

    await test.step('Editing the Variables tab lights up only the Variables dot', async () => {
      await addRowToActiveTab(page, 'host', 'https://echo.usebruno.com');
      await expect(variablesTabDot(page)).toBeVisible();
      await expect(secretsTabDot(page)).toBeHidden();
    });

    await test.step('Editing the Secrets tab lights up its own dot without clearing Variables', async () => {
      await secretsTab(page).click();
      await addRowToActiveTab(page, 'apiToken', 'super-secret-token-12345');
      await expect(secretsTabDot(page)).toBeVisible();
      // The Variables tab still has its unsaved row, so its dot must remain.
      await expect(variablesTabDot(page)).toBeVisible();
    });

    await test.step('Saving the Secrets tab clears only the Secrets dot', async () => {
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(secretsTabDot(page)).toBeHidden();
      await expect(variablesTabDot(page)).toBeVisible();
    });

    await test.step('Saving the Variables tab clears the last remaining dot', async () => {
      await variablesTab(page).click();
      await saveTab(page).click();
      await expect(page.getByText('Changes saved successfully').last()).toBeVisible();
      await expect(variablesTabDot(page)).toBeHidden();
      await expect(secretsTabDot(page)).toBeHidden();
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
