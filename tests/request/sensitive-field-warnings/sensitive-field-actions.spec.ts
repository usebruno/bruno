import path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  addEnvironmentVariable,
  buildCommonLocators,
  clickSensitiveFieldAction,
  closeAllCollections,
  closeEnvironmentPanel,
  createCollection,
  createEnvironment,
  createFolder,
  createRequest,
  openEnvironmentConfigTab,
  openFolderRequest,
  openFolderSettings,
  openRequest,
  readField,
  saveEnvironment,
  saveRequest,
  saveSecretTo,
  selectfolderPaneTab,
  selectRequestPaneTab,
  setEnvironmentVariableValue
} from '../../utils/page';
import { setApiKeyValue } from '../../utils/request';
import { addVarsRow } from '../../utils/request/vars';
import { readFileIfExists } from '../../utils/helpers';

const API_KEY_FIELD = 'apikey-value';

const createDevEnvironment = async (page: Page, variables: { name: string; value: string }[] = []) => {
  const { environment } = buildCommonLocators(page);
  await createEnvironment(page, 'dev', 'collection');
  for (const variable of variables) {
    await addEnvironmentVariable(page, { ...variable, isSecret: false });
  }
  if (variables.length > 0) {
    await saveEnvironment(page);
    await expect(environment.savedToast()).toBeVisible();
  }
  await closeEnvironmentPanel(page);
};

test.describe('Sensitive field actions', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Save as secret replaces a plaintext value with the new secret', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-plaintext';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, secretVariableForm: form, toast } = buildCommonLocators(page);

    await test.step('Type a plaintext API key that contains an unknown {{variable}}', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page);
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await setApiKeyValue(page, 'raw{{x}}secret');
    });

    await test.step('The form opens with the field name and the value without braces', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await expect(form.nameInput()).toHaveValue('value');
      await expect(form.nameInput()).toBeFocused();
      await expect(form.valueInput()).toHaveValue('rawxsecret');
      await expect(form.source()).toHaveCount(0);
    });

    await test.step('Save it to the collection environment', async () => {
      await form.nameInput().fill('apiKeyValue');
      await saveSecretTo(page, 'environment');
      await expect(form.container()).toHaveCount(0);
      await expect(toast.byMessage('Secret "apiKeyValue" created')).toBeVisible();
    });

    await test.step('The field uses the secret and the plaintext is gone from disk', async () => {
      await expect.poll(() => readField(page, 'Value')).toBe('{{apiKeyValue}}');
      await expect(codeMirror.sensitiveWarning(API_KEY_FIELD)).toHaveCount(0);
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'login.yml'))).toContain('{{apiKeyValue}}');
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).toContain('apiKeyValue');
    });
  });

  test('closes the form without saving when no environment is selected', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-no-environment';
    const { codeMirror, secretVariableForm: form } = buildCommonLocators(page);

    await test.step('Type a plaintext API key in a collection without environments', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await setApiKeyValue(page, 'raw-secret');
    });

    await test.step('Esc closes the form', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await expect(form.container()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(form.container()).toHaveCount(0);
    });

    await test.step('An outside click with no environment selected closes the form and saves nothing', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await form.nameInput().fill('apiKeyValue');
      await expect(form.noEnvironmentNote('environment')).toBeVisible();
      await codeMirror.sensitiveWarning(API_KEY_FIELD).click();
      await expect(form.container()).toHaveCount(0);
      expect(await readField(page, 'Value')).toBe('raw-secret');
    });
  });

  test('Create One creates the environment and selects it', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-create-environment';
    const { codeMirror, secretVariableForm: form, toast } = buildCommonLocators(page);

    await test.step('Type a plaintext API key in a collection without environments', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await setApiKeyValue(page, 'raw-secret');
    });

    await test.step('Create One creates the environment and selects it', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await form.nameInput().fill('apiKeyValue');
      await form.createOneLink('environment').click();
      await form.createEnvironmentInput('environment').fill('dev');
      await form.createEnvironmentSubmit('environment').click();
      await expect(form.target('environment')).toHaveAttribute('aria-pressed', 'true');
      await expect(form.target('environment')).toContainText('dev');
    });

    await test.step('Enter saves the secret into the new environment', async () => {
      await form.valueInput().press('Enter');
      await expect(toast.byMessage('Secret "apiKeyValue" created')).toBeVisible();
      await expect.poll(() => readField(page, 'Value')).toBe('{{apiKeyValue}}');
    });
  });

  test('Mark as secret from an auth field marks the environment variable', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-mark-field';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, toast } = buildCommonLocators(page);

    await test.step('Use a plain environment variable as the API key', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page, [{ name: 'token', value: 'plain-env-token' }]);
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await setApiKeyValue(page, '{{token}}');
    });

    await test.step('Mark as secret runs without a form', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await expect(toast.byMessage('"token" is moved to Secrets')).toBeVisible();
      await expect(codeMirror.sensitiveWarning(API_KEY_FIELD)).toHaveCount(0);
    });

    await test.step('The environment file no longer holds the value', async () => {
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).not.toContain('plain-env-token');
      expect(readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).toContain('token');
    });
  });

  test('Mark as secret from the environment table saves unsaved edits with it', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-mark-table';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, environment, toast } = buildCommonLocators(page);

    await test.step('Use a plain environment variable in a saved API key', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page, [{ name: 'token', value: 'plain-env-token' }, { name: 'host', value: 'localhost' }]);
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await setApiKeyValue(page, '{{token}}');
      await saveRequest(page);
    });

    await test.step('Edit another row without saving, then mark the used row as secret', async () => {
      await openEnvironmentConfigTab(page);
      await setEnvironmentVariableValue(page, 'host', 'edited-host');
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarningIn(environment.varRow('token'), 'token'), 'token');
      await expect(toast.byMessage('"token" is moved to Secrets')).toBeVisible();
    });

    await test.step('The row moved to Secrets and the unsaved edit was saved too', async () => {
      await environment.secretsTab().click();
      await expect(environment.varRow('token')).toBeVisible();
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).toContain('edited-host');
      expect(readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).not.toContain('plain-env-token');
    });
  });

  test('Move to environment from an auth field moves the request variable', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-move-field';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, secretVariableForm: form, table, toast } = buildCommonLocators(page);

    await test.step('Use a request variable as the API key', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page);
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Vars');
      await addVarsRow(page, 'request-vars-req', 'token', 'from-request');
      await saveRequest(page);
      await setApiKeyValue(page, '{{token}}');
    });

    await test.step('The form shows the variable and where it comes from', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await expect(form.nameInput()).toHaveValue('token');
      await expect(form.valueInput()).toHaveValue('from-request');
      await expect(form.source()).toHaveText('from Request Vars');
    });

    await test.step('Move it with the same name', async () => {
      await saveSecretTo(page, 'environment');
      await expect(toast.byMessage('Secret "token" created')).toBeVisible();
      await expect(codeMirror.sensitiveWarning(API_KEY_FIELD)).toHaveCount(0);
      expect(await readField(page, 'Value')).toBe('{{token}}');
    });

    await test.step('The request variable is gone from the tab and from disk', async () => {
      await selectRequestPaneTab(page, 'Vars');
      await expect(table('request-vars-req').rowByName('token')).toHaveCount(0);
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'login.yml'))).not.toContain('from-request');
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).toContain('token');
    });
  });

  test('Move to environment blocks a name a folder variable would override, and renames the field', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-move-override';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, secretVariableForm: form, table, toast, varsPanel } = buildCommonLocators(page);

    await test.step('Give a folder and its request a variable with the same name', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page);
      await createFolder(page, 'auth', collectionName);
      await createRequest(page, 'login', 'auth', { inFolder: true });

      await openFolderSettings(page, collectionName, 'auth');
      await selectfolderPaneTab(page, 'vars');
      await addVarsRow(page, 'folder-vars-req', 'token', 'from-folder');
      await varsPanel('folder').saveButton().click();

      await openFolderRequest(page, collectionName, 'auth', 'login');
      await selectRequestPaneTab(page, 'Vars');
      await addVarsRow(page, 'request-vars-req', 'token', 'from-request');
      await saveRequest(page);
      await setApiKeyValue(page, '{{token}}');
    });

    await test.step('Saving with the same name shows the folder conflict and saves nothing', async () => {
      await clickSensitiveFieldAction(page, codeMirror.sensitiveWarning(API_KEY_FIELD), API_KEY_FIELD);
      await saveSecretTo(page, 'environment');
      await expect(form.error()).toHaveText('"token" already exists in Folder Vars. Use a different name.');
    });

    await test.step('Renaming moves the variable and points the field at the new name', async () => {
      await form.nameInput().fill('tokenValue');
      await form.nameInput().press('Enter');
      await expect(form.container()).toHaveCount(0);
      await expect(toast.byMessage('Secret "tokenValue" created')).toBeVisible();
      await expect.poll(() => readField(page, 'Value')).toBe('{{tokenValue}}');
      await expect(codeMirror.sensitiveWarning(API_KEY_FIELD)).toHaveCount(0);
    });

    await test.step('Only the request variable is removed', async () => {
      await selectRequestPaneTab(page, 'Vars');
      await expect(table('request-vars-req').rowByName('token')).toHaveCount(0);
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'auth', 'login.yml'))).toContain('{{tokenValue}}');
      expect(readFileIfExists(path.join(collectionDir, 'auth', 'login.yml'))).not.toContain('from-request');
      expect(readFileIfExists(path.join(collectionDir, 'auth', 'folder.yml'))).toContain('from-folder');
    });
  });

  test('Move to environment from the Vars row moves the variable', async ({ page, createTmpDir }) => {
    const collectionName = 'secret-action-move-row';
    const collectionDir = path.join(await createTmpDir(collectionName), collectionName);
    const { codeMirror, secretVariableForm: form, table, toast } = buildCommonLocators(page);

    await test.step('Use a request variable in the API key', async () => {
      await createCollection(page, collectionName, path.dirname(collectionDir));
      await createDevEnvironment(page);
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Vars');
      await addVarsRow(page, 'request-vars-req', 'token', 'from-request');
      await saveRequest(page);
      await setApiKeyValue(page, '{{token}}');
      await saveRequest(page);
    });

    await test.step('Move it from the Vars row', async () => {
      await selectRequestPaneTab(page, 'Vars');
      const rowWarning = codeMirror.sensitiveWarningIn(table('request-vars-req').rowByName('token'), 'token');
      await clickSensitiveFieldAction(page, rowWarning, 'token');
      await expect(form.source()).toHaveText('from Request Vars');
      await saveSecretTo(page, 'environment');
      await expect(toast.byMessage('Secret "token" created')).toBeVisible();
    });

    await test.step('The row is gone and the environment holds the secret', async () => {
      await expect(table('request-vars-req').rowByName('token')).toHaveCount(0);
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'login.yml'))).not.toContain('from-request');
      await expect.poll(() => readFileIfExists(path.join(collectionDir, 'environments', 'dev.yml'))).toContain('token');
    });
  });
});
