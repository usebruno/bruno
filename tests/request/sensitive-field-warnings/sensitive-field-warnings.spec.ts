import { test, expect, Page } from '../../../playwright';
import {
  addEnvironmentVariable,
  buildCommonLocators,
  closeAllCollections,
  closeEnvironmentPanel,
  createCollection,
  createEnvironment,
  createRequest,
  openCollectionSettings,
  openEnvironmentConfigTab,
  openRequest,
  saveEnvironment,
  saveRequest,
  selectAuthMode,
  selectCollectionPaneTab,
  selectRequestPaneTab,
  writeFieldValue
} from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';
import { addVarsRow } from '../../utils/request';

const PLAINTEXT_WARNING = 'Store sensitive info as a secret variable or in a .env file';
const ENVIRONMENT_FIELD_WARNING = 'Mark the environment variable as secret for better security.';
const ENVIRONMENT_ROW_WARNING = 'This variable is used in sensitive fields. Add it as a secret for security';

const requestVariableWarning = (name: string) => (
  `"${name}" is a request variable and is stored in plain text. Move it to an environment as a secret.`
);

const plainVariableRowWarning = (name: string) => (
  `"${name}" is used in a sensitive field and is stored in plain text. Move it to an environment as a secret.`
);

const expectSensitiveWarning = async (page: Page, fieldName: string, message: string) => {
  const { codeMirror } = buildCommonLocators(page);
  const warning = codeMirror.sensitiveWarning(fieldName);
  await expect(warning).toBeVisible();
  await warning.hover();
  await expect(codeMirror.sensitiveTooltip(message)).toBeVisible();
};

test.describe('Sensitive field warnings', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('a plaintext API key value warns and the key name does not', async ({ page, createTmpDir }) => {
    const collectionName = 'sensitive-plaintext-api-key';

    await test.step('Create a collection and a request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
    });

    await test.step('Type a plaintext API key value', async () => {
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await writeFieldValue(page, 'Value', 'raw-secret');
    });

    await test.step('The value warns and the key name does not', async () => {
      const { codeMirror } = buildCommonLocators(page);
      await expectSensitiveWarning(page, 'apikey-value', PLAINTEXT_WARNING);
      await expect(codeMirror.sensitiveWarning('apikey-key')).toHaveCount(0);
    });
  });

  test('an unknown variable name does not warn', async ({ page, createTmpDir }) => {
    const collectionName = 'sensitive-unknown-variable';

    await test.step('Create a collection and a request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
    });

    await test.step('Set the API key value to a name that is not saved', async () => {
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await writeFieldValue(page, 'Value', '{{process.env.TOKEN}}');
    });

    await test.step('No warning is shown', async () => {
      const { codeMirror } = buildCommonLocators(page);
      await expect(codeMirror.sensitiveWarning('apikey-value')).toHaveCount(0);
    });
  });

  test('a secret environment variable stays quiet unless the field also contains plaintext', async ({ page, createTmpDir }) => {
    const collectionName = 'sensitive-secret-environment';
    const { codeMirror, environment } = buildCommonLocators(page);

    await test.step('Create a collection with a secret token', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createEnvironment(page, 'dev', 'collection');
      await addEnvironmentVariable(page, { name: 'token', value: 'super-secret', isSecret: true });
      await saveEnvironment(page);
      await expect(environment.savedToast()).toBeVisible();
      await closeEnvironmentPanel(page);
      await createRequest(page, 'login', collectionName);
    });

    await test.step('A value that is only the secret variable does not warn', async () => {
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await writeFieldValue(page, 'Value', '{{token}}');
      await expect(codeMirror.sensitiveWarning('apikey-value')).toHaveCount(0);
    });

    await test.step('Text outside the braces warns', async () => {
      await writeFieldValue(page, 'Value', 'Bearer {{token}}');
      await expectSensitiveWarning(page, 'apikey-value', PLAINTEXT_WARNING);
    });
  });

  test('a request variable used by a sensitive field warns on the field and on its Vars row', async ({ page, createTmpDir }) => {
    const collectionName = 'sensitive-request-variable';
    const { codeMirror, table } = buildCommonLocators(page);

    await test.step('Create a request variable named token', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Vars');
      await addVarsRow(page, 'request-vars-req', 'token', 'from-request');
      await saveRequest(page);
    });

    await test.step('Use that variable as the API key value', async () => {
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await writeFieldValue(page, 'Value', '{{token}}');
      await expectSensitiveWarning(page, 'apikey-value', requestVariableWarning('token'));
    });

    await test.step('The Pre Request row shows the same warning', async () => {
      await selectRequestPaneTab(page, 'Vars');
      const rowWarning = codeMirror.sensitiveWarningIn(table('request-vars-req').rowByName('token'), 'token');
      await expect(rowWarning).toBeVisible();
      await rowWarning.hover();
      await expect(codeMirror.sensitiveTooltip(plainVariableRowWarning('token'))).toBeVisible();
    });
  });

  test('a non-secret environment variable wins over a collection variable', async ({ page, createTmpDir }) => {
    const collectionName = 'sensitive-environment-wins';
    const { codeMirror, environment, table, varsPanel } = buildCommonLocators(page);

    await test.step('Save a plaintext environment token and a collection token', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'login', collectionName);
      await createEnvironment(page, 'dev', 'collection');
      await addEnvironmentVariable(page, { name: 'token', value: 'from-env', isSecret: false });
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');
      await addVarsRow(page, 'collection-vars-req', 'token', 'from-collection');
      await varsPanel('collection').saveButton().click();
    });

    await test.step('The API key field warns about the environment variable', async () => {
      await openRequest(page, collectionName, 'login');
      await selectRequestPaneTab(page, 'Auth');
      await selectAuthMode(page, AUTH_MODE_LABELS.APIKEY);
      await writeFieldValue(page, 'Value', '{{token}}');
      await expectSensitiveWarning(page, 'apikey-value', ENVIRONMENT_FIELD_WARNING);
    });

    await test.step('The environment row is flagged and the collection row is not', async () => {
      await openEnvironmentConfigTab(page);
      const environmentWarning = codeMirror.sensitiveWarningIn(environment.varRow('token'), 'token');
      await expect(environmentWarning).toBeVisible();
      await environmentWarning.hover();
      await expect(codeMirror.sensitiveTooltip(ENVIRONMENT_ROW_WARNING)).toBeVisible();

      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');
      await expect(codeMirror.sensitiveWarningIn(table('collection-vars-req').container(), 'token')).toHaveCount(0);
    });
  });
});
