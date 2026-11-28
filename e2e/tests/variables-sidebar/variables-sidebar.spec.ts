import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../playwright';
import {
  buildCommonLocators,
  clearVariablesSidebarPreferences,
  clickVariableRowAction,
  closeAllCollections,
  closeVariablesSidebar,
  defineVariable,
  editVariableValue,
  openCollectionFromDialog,
  openFolderRequest,
  openRequest,
  openVariablesSidebar,
  readSectionOrder,
  readVariableValue,
  selectEnvironment,
  selectVariablesView,
  sendRequest,
  toggleVariablesSection
} from '../../pages';

const COLLECTION_NAME = 'variables-sidebar';
const FOLDER_NAME = 'users';

const FEATURE_FLAGS_JSON = ['{', '  "beta": true,', '  "rollout": "partial"', '}'].join('\n');
const SECRET_PROFILE_JSON = ['{', '  "role": "admin"', '}'].join('\n');

const readFixtureFile = (collectionPath: string, ...segments: string[]) =>
  fs.readFileSync(path.join(collectionPath, ...segments), 'utf-8');

/**
 * Runtime variables and secret values only exist in memory, so the `seed` request's script sets them.
 */
const seedVariables = async (page: Page) => {
  await test.step('Seed runtime variables and secret values', async () => {
    await openRequest(page, COLLECTION_NAME, 'seed');
    await selectEnvironment(page, 'Local');
    await sendRequest(page, 200);
  });
};

test.describe('Variables sidebar', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
  });

  test.afterEach(async ({ page }) => {
    if (await buildCommonLocators(page).variablesSidebar.sidebar().isVisible()) {
      await closeVariablesSidebar(page);
    }
    await clearVariablesSidebarPreferences(page);
    await closeAllCollections(page);
  });

  test('groups the variables a request uses by scope, with undefined variables first', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open a request in the users folder with the Local environment', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await selectEnvironment(page, 'Local');
      await openVariablesSidebar(page);
      await selectVariablesView(page, 'used');
    });

    await test.step('Sections follow the scope order', async () => {
      await expect.poll(() => readSectionOrder(page)).toEqual(['undefined', 'request', 'folder', 'environment', 'collection']);
    });

    await test.step('Each variable sits in the scope it resolves from', async () => {
      await expect(variablesSidebar.sectionCount('undefined')).toHaveText('1');
      await expect(variablesSidebar.row('undefined', 'missing_var')).toBeVisible();
      await expect(variablesSidebar.row('request', 'page_size')).toBeVisible();
      await expect(variablesSidebar.folderRow(FOLDER_NAME, 'users_path')).toBeVisible();
      await expect(variablesSidebar.row('environment', 'host')).toBeVisible();
      await expect(variablesSidebar.row('collection', 'api_version')).toBeVisible();
    });
  });

  test('defines an undefined variable as a request variable', async ({ page, collectionFixturePath }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open the used variables of a request with an undefined variable', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await openVariablesSidebar(page);
      await selectVariablesView(page, 'used');
    });

    await defineVariable(page, 'missing_var', 'search-term');

    await test.step('The variable moves to the request section and is saved to the request file', async () => {
      await expect(variablesSidebar.row('undefined', 'missing_var')).toHaveCount(0);
      await expect(variablesSidebar.row('request', 'missing_var')).toBeVisible();
      await expect.poll(() => readVariableValue(page, 'request', 'missing_var')).toBe('"search-term"');
      await expect.poll(() => readFixtureFile(collectionFixturePath!, FOLDER_NAME, 'list-users.yml')).toContain('search-term');
    });
  });

  test('saves an edited folder variable on blur and cancels an edit with Escape', async ({ page, collectionFixturePath }) => {
    const { variablesSidebar } = buildCommonLocators(page);
    const folderValue = variablesSidebar.folderRowValue(FOLDER_NAME, 'users_path');

    await test.step('Open all variables of a request in the users folder', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await openVariablesSidebar(page);
    });

    await test.step('Clicking outside the editor saves the value to folder.yml', async () => {
      await folderValue.click();
      await expect(variablesSidebar.valueEditor()).toBeVisible();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type('/people');
      await variablesSidebar.title().click();
      await expect(variablesSidebar.valueEditor()).toHaveCount(0);
      await expect(folderValue).toContainText('/people');
      await expect.poll(() => readFixtureFile(collectionFixturePath!, FOLDER_NAME, 'folder.yml')).toContain('/people');
    });

    await test.step('Escape discards the edit', async () => {
      await folderValue.click();
      await expect(variablesSidebar.valueEditor()).toBeVisible();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type('/discarded');
      await page.keyboard.press('Escape');
      await expect(variablesSidebar.valueEditor()).toHaveCount(0);
      await expect(folderValue).toContainText('/people');
    });
  });

  test('copies a value, reveals a secret and clears a saved variable', async ({ page, installFakeClipboard }) => {
    const { variablesSidebar } = buildCommonLocators(page);
    const clipboard = await installFakeClipboard(page);

    await test.step('Open all variables with the Local environment', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await selectEnvironment(page, 'Local');
      await openVariablesSidebar(page);
    });

    await test.step('Copy puts the value on the clipboard', async () => {
      await variablesSidebar.row('environment', 'host').hover();
      await variablesSidebar.rowAction('environment', 'host', 'copy').click();
      expect(await clipboard.copiedText()).toBe('http://localhost:8081');
    });

    await test.step('A secret stays masked until it is revealed', async () => {
      await editVariableValue(page, 'environment', 'api_token', 'token-123');
      await expect(variablesSidebar.rowValue('environment', 'api_token')).toContainText('********');
      await variablesSidebar.row('environment', 'api_token').hover();
      await variablesSidebar.rowAction('environment', 'api_token', 'secret-toggle').click();
      await expect(variablesSidebar.rowValue('environment', 'api_token')).toContainText('token-123');
    });

    await test.step('Changing the environment masks revealed secrets again', async () => {
      await selectEnvironment(page, 'Prod');
      await expect(variablesSidebar.rowValue('environment', 'api_token')).toContainText('********');
      await selectEnvironment(page, 'Local');
      await expect(variablesSidebar.rowValue('environment', 'api_token')).toContainText('********');
    });

    await test.step('Clear empties a saved variable but keeps it', async () => {
      await variablesSidebar.row('collection', 'api_version').hover();
      await variablesSidebar.rowAction('collection', 'api_version', 'clear').click();
      await expect.poll(() => readVariableValue(page, 'collection', 'api_version')).toBe('""');
      await expect(variablesSidebar.row('collection', 'api_version')).toBeVisible();
    });
  });

  test('clearing a runtime variable removes it', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Send a request whose script sets a runtime variable', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'set-session');
      await selectEnvironment(page, 'Local');
      await sendRequest(page, 200);
      await openVariablesSidebar(page);
      await expect(variablesSidebar.row('runtime', 'session_id')).toBeVisible();
    });

    await test.step('Clear removes the runtime variable', async () => {
      await variablesSidebar.row('runtime', 'session_id').hover();
      await variablesSidebar.rowAction('runtime', 'session_id', 'clear').click();
      await expect(variablesSidebar.row('runtime', 'session_id')).toHaveCount(0);
    });
  });

  test('renders each value in the form that matches its data type', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('Scalars render as JSON', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'host')).toBe('"http://localhost:8081"');
      await expect.poll(() => readVariableValue(page, 'environment', 'page_size')).toBe('25');
      await expect.poll(() => readVariableValue(page, 'environment', 'feature_enabled')).toBe('true');
      await expect.poll(() => readVariableValue(page, 'runtime', 'retry_count')).toBe('3');
    });

    await test.step('Each scalar is highlighted by its type', async () => {
      await expect(variablesSidebar.valueToken('runtime', 'auth_token', 'string')).toHaveText('"runtime-token-1"');
      await expect(variablesSidebar.valueToken('environment', 'page_size', 'number')).toHaveText('25');
      await expect(variablesSidebar.valueToken('environment', 'feature_enabled', 'boolean')).toHaveText('true');
      await expect(variablesSidebar.valueToken('runtime', 'retry_count', 'number')).toHaveText('3');
    });

    await test.step('A template reference stays as written and reads as a variable', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'derived_url')).toBe('{{host}}/v1');
      await expect(variablesSidebar.valueToken('environment', 'derived_url', 'variable')).toHaveText('{{host}}');
    });

    await test.step('Objects render pretty-printed in a multi-line editor', async () => {
      await expect(variablesSidebar.rowMultiLineValue('environment', 'feature_flags')).toBeVisible();
      await expect.poll(() => readVariableValue(page, 'environment', 'feature_flags')).toBe(FEATURE_FLAGS_JSON);
      await expect(variablesSidebar.valueToken('environment', 'feature_flags', 'property')).toHaveText('"beta"');
      await expect(variablesSidebar.valueToken('environment', 'feature_flags', 'boolean')).toHaveText('true');
      await expect(variablesSidebar.valueToken('environment', 'feature_flags', 'string')).toHaveText('"partial"');
    });

    await test.step('A masked secret is plain text with nothing highlighted', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
      await expect(variablesSidebar.valueTokens('environment', 'api_token')).toHaveCount(0);
    });
  });

  test('names the active environment and leaves out its disabled variables', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open all variables with the Local environment', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await selectEnvironment(page, 'Local');
      await openVariablesSidebar(page);
    });

    await test.step('The environment section shows the environment name and skips the disabled variable', async () => {
      await expect(variablesSidebar.sectionPill('environment')).toHaveText('Local');
      await expect(variablesSidebar.row('environment', 'host')).toBeVisible();
      await expect(variablesSidebar.row('environment', 'legacy_url')).toHaveCount(0);
    });
  });

  test('copies object and runtime values', async ({ page, installFakeClipboard }) => {
    const clipboard = await installFakeClipboard(page);

    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('Copy an object value', async () => {
      await clickVariableRowAction(page, 'environment', 'feature_flags', 'copy');
      await expect.poll(() => clipboard.copiedText()).toBe(FEATURE_FLAGS_JSON);
    });

    await test.step('Copy a runtime value', async () => {
      await clickVariableRowAction(page, 'runtime', 'auth_token', 'copy');
      await expect.poll(() => clipboard.copiedText()).toBe('runtime-token-1');
    });
  });

  test('masks a secret until the eye is toggled on, and again when it is toggled off', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('A masked secret hides its value and its expand control', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
      await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe('********');
      await expect(variablesSidebar.rowAction('environment', 'secret_profile', 'object-expand')).toHaveCount(0);
    });

    await test.step('Revealing shows the real value', async () => {
      await clickVariableRowAction(page, 'environment', 'api_token', 'secret-toggle');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('"sk-live-9f3a"');
      await clickVariableRowAction(page, 'environment', 'secret_profile', 'secret-toggle');
      await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe(SECRET_PROFILE_JSON);
      await expect(variablesSidebar.rowAction('environment', 'secret_profile', 'object-expand')).toHaveCount(1);
    });

    await test.step('Toggling back masks it again', async () => {
      await clickVariableRowAction(page, 'environment', 'api_token', 'secret-toggle');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
    });

    await test.step('A variable that is not secret has no eye toggle', async () => {
      await expect(variablesSidebar.rowAction('environment', 'host', 'secret-toggle')).toHaveCount(0);
    });
  });

  test('masks a revealed secret again after closing and reopening the sidebar', async ({ page }) => {
    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('Reveal a secret', async () => {
      await clickVariableRowAction(page, 'environment', 'api_token', 'secret-toggle');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('"sk-live-9f3a"');
    });

    await test.step('The secret is masked after the sidebar is reopened', async () => {
      await closeVariablesSidebar(page);
      await openVariablesSidebar(page);
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
    });
  });

  test('remembers a collapsed section for each view after closing and reopening the sidebar', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await test.step('Open all variables of a request with the Local environment', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, 'list-users');
      await selectEnvironment(page, 'Local');
      await openVariablesSidebar(page);
      await expect(variablesSidebar.table('environment')).toBeVisible();
    });

    await test.step('Collapsing hides only that section\'s table', async () => {
      await toggleVariablesSection(page, 'environment');
      await expect(variablesSidebar.table('environment')).toHaveCount(0);
      await expect(variablesSidebar.table('collection')).toBeVisible();
    });

    await test.step('The section stays collapsed after the sidebar is reopened', async () => {
      await closeVariablesSidebar(page);
      await openVariablesSidebar(page);
      await expect(variablesSidebar.section('environment')).toBeVisible();
      await expect(variablesSidebar.table('environment')).toHaveCount(0);
    });

    await test.step('The other view keeps its own collapsed state', async () => {
      await selectVariablesView(page, 'used');
      await expect(variablesSidebar.table('environment')).toBeVisible();
      await selectVariablesView(page, 'all');
    });

    await test.step('Expanding brings the table back', async () => {
      await toggleVariablesSection(page, 'environment');
      await expect(variablesSidebar.table('environment')).toBeVisible();
    });
  });

  test('opens an object value in the full view and goes back to the list', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('An environment object opens in the full view', async () => {
      await clickVariableRowAction(page, 'environment', 'feature_flags', 'object-expand');
      await expect(variablesSidebar.objectView()).toBeVisible();
      await expect(variablesSidebar.objectViewName()).toHaveText('feature_flags');
    });

    await test.step('Back returns to the list', async () => {
      await variablesSidebar.objectViewBack().click();
      await expect(variablesSidebar.objectView()).toHaveCount(0);
      await expect(variablesSidebar.row('environment', 'feature_flags')).toBeVisible();
    });

    await test.step('A runtime object opens in the full view too', async () => {
      await clickVariableRowAction(page, 'runtime', 'service_config', 'object-expand');
      await expect(variablesSidebar.objectViewName()).toHaveText('service_config');
      await variablesSidebar.objectViewBack().click();
    });

    await test.step('A scalar value has no expand control', async () => {
      await expect(variablesSidebar.rowAction('environment', 'host', 'object-expand')).toHaveCount(0);
    });
  });

  test('leaves the full view of a secret object when changing the environment masks it again', async ({ page }) => {
    const { variablesSidebar } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesSidebar(page);

    await test.step('Reveal the secret object and open it in the full view', async () => {
      await clickVariableRowAction(page, 'environment', 'secret_profile', 'secret-toggle');
      await clickVariableRowAction(page, 'environment', 'secret_profile', 'object-expand');
      await expect(variablesSidebar.objectViewName()).toHaveText('secret_profile');
    });

    await test.step('Switching environment and back shows the list with the secret masked', async () => {
      await selectEnvironment(page, 'Prod');
      await expect(variablesSidebar.objectView()).toHaveCount(0);
      await selectEnvironment(page, 'Local');
      await expect(variablesSidebar.objectView()).toHaveCount(0);
      await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe('********');
    });
  });
});
