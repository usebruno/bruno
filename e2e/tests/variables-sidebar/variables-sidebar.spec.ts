import fs from 'fs';
import path from 'path';
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeVariablesSidebar,
  defineVariable,
  editVariableValue,
  openCollectionFromDialog,
  openFolderRequest,
  openVariablesSidebar,
  readSectionOrder,
  readVariableValue,
  selectEnvironment,
  selectVariablesView,
  sendRequest
} from '../../pages';

const COLLECTION_NAME = 'variables-sidebar';
const FOLDER_NAME = 'users';

const readFixtureFile = (collectionPath: string, ...segments: string[]) =>
  fs.readFileSync(path.join(collectionPath, ...segments), 'utf-8');

test.describe('Variables sidebar', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
  });

  test.afterEach(async ({ page }) => {
    if (await buildCommonLocators(page).variablesSidebar.sidebar().isVisible()) {
      await closeVariablesSidebar(page);
    }
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
});
