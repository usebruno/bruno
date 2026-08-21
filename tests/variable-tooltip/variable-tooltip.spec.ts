import { test, expect } from '../../playwright';
import {
  createCollection,
  closeAllCollections,
  createRequest,
  createFolder,
  expandFolder,
  createEnvironment,
  addEnvironmentVariable,
  addEnvironmentVariables,
  saveEnvironment,
  selectRequestPaneTab,
  closeEnvironmentPanel,
  deleteAllGlobalEnvironments,
  setRequestUrlAndSave,
  openUrlVarTooltip,
  dismissVarTooltip,
  openEnvValueVarTooltip,
  openCollectionSettings,
  selectCollectionPaneTab,
  openEnvironmentConfigTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';
import { SECRET_DATATYPE_CASES } from '../utils/constants';

const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';

test.describe('Variable Tooltip', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('should test tooltip functionality with environment variables', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-test';
    const { sidebar, request, varInfoPopup } = buildCommonLocators(page);

    await test.step('Create collection and add environment variables', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-collection'));

      await createEnvironment(page, 'Test Env', 'collection');

      await addEnvironmentVariables(page, [
        { name: 'apiKey', value: 'test-key-123' },
        { name: 'secretToken', value: 'secret-xyz', isSecret: true }
      ]);

      await saveEnvironment(page);
      await closeEnvironmentPanel(page);
    });

    await test.step('Create request and test tooltip', async () => {
      await createRequest(page, 'Test Request', collectionName);
      await sidebar.request('Test Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?key={{apiKey}}');
    });

    await test.step('Test basic tooltip', async () => {
      const tooltip = await openUrlVarTooltip(page, 'apiKey');
      await expect(varInfoPopup.name(tooltip)).toContainText('apiKey');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('test-key-123');
      await expect(varInfoPopup.copyButton(tooltip)).toBeVisible();
    });

    await test.step('Test secret variable with toggle', async () => {
      await page.mouse.move(0, 0);

      await selectRequestPaneTab(page, 'Headers');

      const headerTable = page.locator('table').first();
      const headerRow = headerTable.locator('tbody tr').first();

      const headerNameEditor = headerRow.locator('.CodeMirror').first();
      await headerNameEditor.click();
      await page.keyboard.type('Authorization');

      const headerValueEditor = headerRow.locator('.CodeMirror').nth(1);
      await headerValueEditor.click();
      await page.keyboard.type('Bearer {{secretToken}}');
      await page.keyboard.press(saveShortcut);

      // Hover the secret token in the header value editor.
      await request.headerVariableToken(headerRow, 'secretToken').hover();

      const tooltip = varInfoPopup.all().first();
      await expect(tooltip).toBeVisible();

      // Verify masked (asterisks, not the actual value).
      const valueDisplay = varInfoPopup.editableValue(tooltip);
      const maskedText = await valueDisplay.textContent();
      expect(maskedText).not.toContain('secret-xyz');
      expect(maskedText?.length).toBeGreaterThan(0);

      // Reveal via the eye toggle.
      const toggleButton = varInfoPopup.secretToggle(tooltip);
      await expect(toggleButton).toBeVisible();
      await toggleButton.click();
      await expect(valueDisplay).toContainText('secret-xyz');

      // Toggle back to masked.
      await toggleButton.click();
      const remaskedText = await valueDisplay.textContent();
      expect(remaskedText).not.toContain('secret-xyz');
      expect(remaskedText?.length).toBeGreaterThan(0);
    });
  });

  test('should test tooltip with variable references', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-reference-test';
    const { sidebar, varInfoPopup } = buildCommonLocators(page);

    await test.step('Create collection with interdependent variables', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-ref-collection'));

      await createEnvironment(page, 'Ref Test Env', 'collection');

      await addEnvironmentVariables(page, [
        { name: 'host', value: 'api.example.com' },
        { name: 'endpoint', value: 'https://{{host}}/users' }
      ]);

      await saveEnvironment(page);
      await closeEnvironmentPanel(page);
    });

    await test.step('Create request with variable references', async () => {
      await createRequest(page, 'Ref Test Request', collectionName);
      await sidebar.request('Ref Test Request').click();
      await setRequestUrlAndSave(page, '{{endpoint}}');
    });

    await test.step('Test variable referencing other variables', async () => {
      const tooltip = await openUrlVarTooltip(page, 'endpoint');
      await expect(varInfoPopup.name(tooltip)).toContainText('endpoint');

      // Should show resolved value.
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('https://api.example.com/users');
      await expect(varInfoPopup.copyButton(tooltip)).toBeVisible();
    });

    await test.step('Test editing variable with references', async () => {
      const tooltip = await openUrlVarTooltip(page, 'endpoint');

      // Click on value to edit.
      const valueDisplay = varInfoPopup.editableValue(tooltip);
      await valueDisplay.click();

      // Should show editor with raw value (not resolved).
      const editor = varInfoPopup.editor(tooltip);
      await expect(editor).toBeVisible();
      const editorContent = await editor.locator('.CodeMirror-line').textContent();
      expect(editorContent).toContain('{{host}}');

      // Edit the value, click outside to save.
      await page.keyboard.press('End');
      await page.keyboard.type('/posts');
      await dismissVarTooltip(page);

      // Hover again to verify the change.
      const newTooltip = await openUrlVarTooltip(page, 'endpoint');
      await expect(varInfoPopup.editableValue(newTooltip)).toContainText('https://api.example.com/users/posts');
    });

    await test.step('Test copy button', async () => {
      const tooltip = await openUrlVarTooltip(page, 'endpoint');
      const copyButton = varInfoPopup.copyButton(tooltip);
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      await expect
        .poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 1000 })
        .toBe('https://api.example.com/users/posts');
    });
  });

  test('should handle runtime and process.env variables', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-readonly-test';
    const { sidebar, request, varInfoPopup } = buildCommonLocators(page);

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-readonly-collection'));

      await createEnvironment(page, 'Readonly Env', 'collection');
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Readonly Test', collectionName);
      await sidebar.request('Readonly Test').click();
      await setRequestUrlAndSave(page, 'https://example.com');
    });

    await test.step('Test process.env variable tooltip', async () => {
      await page.mouse.move(0, 0);

      // Append a process.env variable to the URL.
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?env={{process.env.HOME}}');
      await page.keyboard.press(saveShortcut);

      // process.env vars can render as valid or invalid depending on presence.
      const tooltip = await openUrlVarTooltip(page, 'process.env.HOME');
      await expect(varInfoPopup.name(tooltip)).toContainText('process.env.HOME');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Process Env');

      // Should show read-only note, a copy button, but no editable editor.
      await expect(varInfoPopup.readonlyNote(tooltip)).toContainText('read-only');
      await expect(varInfoPopup.copyButton(tooltip)).toBeVisible();
      await expect(varInfoPopup.editorContainer(tooltip)).not.toBeVisible();
    });
  });

  test('should auto-save request when creating variable via tooltip', async ({ page, createTmpDir }) => {
    const collectionName = 'draft-autosave-test';
    const { sidebar, request, varInfoPopup } = buildCommonLocators(page);
    const requestTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Autosave Test' }) });

    await test.step('Setup collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('draft-autosave'));

      await createRequest(page, 'Autosave Test', collectionName);
      await sidebar.request('Autosave Test').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Edit URL to create draft with undefined variable', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('/users/{{myApiKey}}');

      // Verify draft indicator appears (unsaved changes) in the request tab.
      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();
    });

    await test.step('Create variable via tooltip - should auto-save entire request', async () => {
      const tooltip = await openUrlVarTooltip(page, 'myApiKey', 'invalid');
      await expect(varInfoPopup.name(tooltip)).toContainText('myApiKey');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Request');

      // Click to edit the variable and type a value.
      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('secret-key-123');

      // Click outside to close editor - this auto-saves the entire request.
      await dismissVarTooltip(page);
    });

    await test.step('Verify request was auto-saved with URL changes and new variable', async () => {
      // Variable is now valid (green) in the URL.
      await expect(request.urlVariableToken('myApiKey', 'valid')).toBeVisible();

      // Hover to verify the value was saved.
      const tooltip = await openUrlVarTooltip(page, 'myApiKey', 'valid');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('secret-key-123');
      await page.mouse.move(0, 0);

      // Verify the URL changes were also saved.
      const urlContent = await request.urlLine().first().textContent();
      expect(urlContent).toContain('api.example.com/users');
      expect(urlContent).toContain('myApiKey');

      // Verify draft indicator is GONE (everything was auto-saved).
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
      await expect(requestTab.locator('.close-icon')).toBeVisible();
    });

    await test.step('Verify variable exists in Vars tab', async () => {
      await selectRequestPaneTab(page, 'Vars');

      const varsTable = page.locator('table').first();
      await expect(varsTable).toBeVisible();

      const varRow = varsTable.locator('tbody tr').first();
      await expect(varRow).toBeVisible();

      // Check variable name.
      const varNameInput = varRow.locator('td').nth(1).getByRole('textbox');
      await expect(varNameInput).toBeVisible();
      await expect(varNameInput).toHaveValue('myApiKey');

      // Check variable value.
      const varValue = varRow.locator('td').nth(2).locator('.CodeMirror');
      await expect(varValue).toBeVisible();
      const varValueContent = await varValue.locator('.CodeMirror-line').textContent();
      expect(varValueContent).toContain('secret-key-123');
    });
  });

  test('should pre-select the guessed scope in the Add-to switcher for an undefined variable', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-guessed-scope-test';
    const { sidebar, request, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-guessed-scope-collection'));

      await createRequest(page, 'Guessed Scope Request', collectionName);
      await sidebar.request('Guessed Scope Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Type an undefined variable into the URL', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{newApiKey}}');
    });

    await test.step('Hover the undefined variable and open the Add-to switcher', async () => {
      const tooltip = await openUrlVarTooltip(page, 'newApiKey', 'invalid');
      await expect(varInfoPopup.name(tooltip)).toContainText('newApiKey');
      // The header badge reflects the same guessed scope shown in the switcher below.
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Request');

      await expect(varInfoPopup.addToSwitcher(tooltip)).toBeVisible();
      await varInfoPopup.addToToggle(tooltip).click();
    });

    await test.step('Request is shown as the pre-selected (guessed) scope', async () => {
      const tooltip = varInfoPopup.all().first();

      // Request is the guessed scope and is pre-selected in the Add-to switcher.
      await expect(varInfoPopup.addToActiveOption(tooltip)).toHaveCount(1);
      await expect(varInfoPopup.addToActiveOption(tooltip, 'request')).toBeVisible();

      await expect(varInfoPopup.addToOption(tooltip, 'collection')).toBeVisible();
    });
  });

  test('should repoint the scope badge on switch without saving, then save into the newly picked scope', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-switch-scope-test';
    const { sidebar, request, varInfoPopup, table } = buildCommonLocators(page);

    await test.step('Setup collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-switch-scope-collection'));

      await createRequest(page, 'Switch Scope Request', collectionName);
      await sidebar.request('Switch Scope Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Type an undefined variable into the URL', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{scopeSwitchVar}}');
    });

    await test.step('Switch the guessed scope from Request to Collection without entering a value', async () => {
      const tooltip = await openUrlVarTooltip(page, 'scopeSwitchVar', 'invalid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Request');

      await varInfoPopup.addToToggle(tooltip).click();
      await varInfoPopup.addToOption(tooltip, 'collection').click();

      // The badge repoints immediately — this only decides where the next save writes to.
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Collection');

      await dismissVarTooltip(page);
    });

    await test.step('Re-hovering shows it is still undefined — the scope pick alone saved nothing', async () => {
      const tooltip = await openUrlVarTooltip(page, 'scopeSwitchVar', 'invalid');
      // Guessed back to Request — proof the earlier Collection pick never persisted.
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Request');
      await expect(varInfoPopup.addToSwitcher(tooltip)).toBeVisible();

      await page.mouse.move(0, 0);
    });

    await test.step('Switching scope again and entering a value saves into the newly picked scope', async () => {
      const tooltip = await openUrlVarTooltip(page, 'scopeSwitchVar', 'invalid');
      await varInfoPopup.addToToggle(tooltip).click();
      await varInfoPopup.addToOption(tooltip, 'collection').click();

      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('collection-value');
      await dismissVarTooltip(page);
    });

    await test.step('Variable now resolves as a Collection variable', async () => {
      const tooltip = await openUrlVarTooltip(page, 'scopeSwitchVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Collection');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('collection-value');

      await page.mouse.move(0, 0);
    });

    await test.step('Confirm it lives in Collection Variables, not Request Variables', async () => {
      await selectRequestPaneTab(page, 'Vars');
      await expect(table('request-vars-req').container()).toBeVisible();
      await expect(table('request-vars-req').rowByName('scopeSwitchVar')).toHaveCount(0);

      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');
      await expect(table('collection-vars-req').rowByName('scopeSwitchVar')).toBeVisible();
    });
  });

  test('should offer Folder scope only when there is an immediate parent folder, and save into it', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-folder-scope-test';
    const folderName = 'parentFolder';
    const { sidebar, request, paneTabs, varInfoPopup, table } = buildCommonLocators(page);

    await test.step('Setup collection with a root-level request and a folder request', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-folder-scope-collection'));
      await createFolder(page, folderName, collectionName);

      await createRequest(page, 'Root Request', collectionName);
      await sidebar.request('Root Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');

      await expandFolder(page, folderName);
      await createRequest(page, 'Folder Request', folderName, { inFolder: true });
      await sidebar.folderRequest(folderName, 'Folder Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Root-level request: Folder scope is not offered (no parent folder)', async () => {
      await sidebar.request('Root Request').click();
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{rootVar}}');

      const tooltip = await openUrlVarTooltip(page, 'rootVar', 'invalid');
      await varInfoPopup.addToToggle(tooltip).click();
      await expect(varInfoPopup.addToOption(tooltip, 'collection')).toBeVisible();
      await expect(varInfoPopup.addToOption(tooltip, 'folder')).toHaveCount(0);

      await page.mouse.move(0, 0);
    });

    await test.step('Request inside a folder: Folder scope is offered', async () => {
      await sidebar.folderRequest(folderName, 'Folder Request').click();
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{folderVar}}');

      const tooltip = await openUrlVarTooltip(page, 'folderVar', 'invalid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Request');

      await varInfoPopup.addToToggle(tooltip).click();
      const folderOption = varInfoPopup.addToOption(tooltip, 'folder');
      await expect(folderOption).toBeVisible();
      await folderOption.click();

      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Folder');

      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('folder-value');
      await dismissVarTooltip(page);
    });

    await test.step('Variable now resolves as a Folder variable', async () => {
      const tooltip = await openUrlVarTooltip(page, 'folderVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Folder');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('folder-value');

      await page.mouse.move(0, 0);
    });

    await test.step('Confirm it lives in the folder\'s Variables, not the request\'s', async () => {
      await selectRequestPaneTab(page, 'Vars');
      await expect(table('request-vars-req').container()).toBeVisible();
      await expect(table('request-vars-req').rowByName('folderVar')).toHaveCount(0);

      await sidebar.folder(folderName).dblclick();
      await paneTabs.folderSettingsTab('vars').click();
      await expect(table('folder-vars-req').rowByName('folderVar')).toBeVisible();
    });
  });

  test('should route to the Secrets tab when the Secret checkbox is checked, and to Variables when it is not', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-secret-checkbox-test';
    const { sidebar, request, varInfoPopup, environment } = buildCommonLocators(page);

    await test.step('Setup collection, environment, and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-secret-checkbox-collection'));

      await createEnvironment(page, 'Secret Checkbox Env', 'collection');
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Secret Checkbox Request', collectionName);
      await sidebar.request('Secret Checkbox Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Add-to Environment with the Secret checkbox left unchecked', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?a={{plainEnvVar}}');

      const tooltip = await openUrlVarTooltip(page, 'plainEnvVar', 'invalid');
      await varInfoPopup.addToToggle(tooltip).click();
      await varInfoPopup.addToOption(tooltip, 'environment').click();

      const secretCheckbox = varInfoPopup.addToSecretCheckbox(tooltip);
      await expect(secretCheckbox).toBeVisible();
      await expect(secretCheckbox).not.toBeChecked();

      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('plain-value');
      await dismissVarTooltip(page);
    });

    await test.step('Confirm the plain variable finished saving before continuing', async () => {
      // The save is async (dispatch -> file write -> watcher -> redux update); re-hovering
      // and waiting for the saved value is a real synchronization point, not a fixed sleep.
      const tooltip = await openUrlVarTooltip(page, 'plainEnvVar', 'valid');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('plain-value');
      await page.mouse.move(0, 0);
    });

    await test.step('Add-to Environment with the Secret checkbox checked', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('&b={{secretEnvVar}}');

      const tooltip = await openUrlVarTooltip(page, 'secretEnvVar', 'invalid');
      await varInfoPopup.addToToggle(tooltip).click();
      await varInfoPopup.addToOption(tooltip, 'environment').click();

      const secretCheckbox = varInfoPopup.addToSecretCheckbox(tooltip);
      await expect(secretCheckbox).toBeVisible();
      await secretCheckbox.check();

      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('secret-value');
      await dismissVarTooltip(page);
    });

    await test.step('Plain variable is under Variables; secret variable is under Secrets', async () => {
      await openEnvironmentConfigTab(page, 'collection');

      await environment.variablesTab().click();
      await expect(environment.varRow('plainEnvVar')).toBeVisible();
      await expect(environment.varRow('secretEnvVar')).toHaveCount(0);

      await environment.secretsTab().click();
      await expect(environment.varRow('secretEnvVar')).toBeVisible();
      await expect(environment.varRow('plainEnvVar')).toHaveCount(0);
    });
  });

  test('should create an environment inline via "Create One" and save the variable into it immediately', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-create-env-test';
    const envName = 'Freshly Created Env';
    const { sidebar, request, varInfoPopup, environment } = buildCommonLocators(page);

    await test.step('Setup collection and request (no environment exists yet)', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-create-env-collection'));

      await createRequest(page, 'Create Env Request', collectionName);
      await sidebar.request('Create Env Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Type an undefined variable and enter its value', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{freshEnvVar}}');

      const tooltip = await openUrlVarTooltip(page, 'freshEnvVar', 'invalid');
      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('fresh-value');
    });

    await test.step('Pick Environment scope, see "No Environment", and create one inline', async () => {
      const tooltip = varInfoPopup.all().first();

      await varInfoPopup.addToToggle(tooltip).click();
      // Not enabled yet (no environment exists) — shown as an inline note, not a pickable option.
      await expect(varInfoPopup.addToOption(tooltip, 'environment')).toHaveCount(0);
      await expect(varInfoPopup.addToNoEnvNote(tooltip, 'environment')).toContainText('No Collection Environment selected.');

      await varInfoPopup.addToCreateEnvButton(tooltip, 'environment').click();
      await varInfoPopup.addToCreateEnvNameInput(tooltip).fill(envName);
      await varInfoPopup.addToCreateEnvSubmit(tooltip).click();
    });

    await test.step('The variable is saved into the newly created environment immediately', async () => {
      const tooltip = varInfoPopup.all().first();

      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('fresh-value');
      await expect(varInfoPopup.addToSwitcher(tooltip)).toHaveCount(0);

      await dismissVarTooltip(page);
    });

    await test.step('Environment now exists with this variable under Variables', async () => {
      const tooltip = await openUrlVarTooltip(page, 'freshEnvVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');
      await page.mouse.move(0, 0);

      await openEnvironmentConfigTab(page, 'collection');
      await expect(environment.currentEnvironment()).toContainText(envName);

      await environment.variablesTab().click();
      await expect(environment.varRow('freshEnvVar')).toBeVisible();
    });
  });

  test('should show an inline error when creating an environment inline fails, and allow retrying', async ({ page, createTmpDir }) => {
    const collectionName = 'add-to-create-env-error-test';
    const { sidebar, request, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection and request (no environment exists yet)', async () => {
      await createCollection(page, collectionName, await createTmpDir('add-to-create-env-error-collection'));

      await createRequest(page, 'Create Env Error Request', collectionName);
      await sidebar.request('Create Env Error Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Type an undefined variable and enter its value', async () => {
      await request.urlInput().click();
      await page.keyboard.press('End');
      await page.keyboard.type('?key={{errEnvVar}}');

      const tooltip = await openUrlVarTooltip(page, 'errEnvVar', 'invalid');
      await varInfoPopup.editableValue(tooltip).click();
      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.type('err-value');
    });

    await test.step('Submitting with an empty name shows an inline error and keeps the create form open', async () => {
      const tooltip = varInfoPopup.all().first();

      await varInfoPopup.addToToggle(tooltip).click();
      await varInfoPopup.addToCreateEnvButton(tooltip, 'environment').click();
      await varInfoPopup.addToCreateEnvSubmit(tooltip).click();

      await expect(varInfoPopup.addToError(tooltip)).toContainText('Environment name is required');
      // Nothing was dispatched and the form is still open, ready to retry.
      await expect(varInfoPopup.addToCreateEnvNameInput(tooltip)).toBeVisible();
    });

    await test.step('Submitting a name with characters the renderer\'s name validation rejects shows the failure and keeps the form open', async () => {
      const tooltip = varInfoPopup.all().first();

      await varInfoPopup.addToCreateEnvNameInput(tooltip).fill('Bad:Name');
      await varInfoPopup.addToCreateEnvSubmit(tooltip).click();

      await expect(varInfoPopup.addToError(tooltip)).toContainText('Special characters aren\'t allowed');
      await expect(varInfoPopup.addToCreateEnvNameInput(tooltip)).toBeVisible();
    });

    await test.step('Fixing the name and resubmitting succeeds, saving the pending value', async () => {
      const tooltip = varInfoPopup.all().first();

      await varInfoPopup.addToCreateEnvNameInput(tooltip).fill('Recovered Env');
      await varInfoPopup.addToCreateEnvSubmit(tooltip).click();

      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('err-value');
      await expect(varInfoPopup.addToSwitcher(tooltip)).toHaveCount(0);
    });
  });

  test('should go to definition into Environment Settings, landing on Variables or Secrets depending on type(var or secret)', async ({ page, createTmpDir }) => {
    const collectionName = 'go-to-definition-env-test';
    const { sidebar, varInfoPopup, environment } = buildCommonLocators(page);

    await test.step('Setup collection, environment with a plain and a secret variable, and a request referencing both', async () => {
      await createCollection(page, collectionName, await createTmpDir('go-to-definition-env-collection'));

      await createEnvironment(page, 'GoToDef Env', 'collection');
      await addEnvironmentVariables(page, [
        { name: 'goToPlainVar', value: 'plain-val' },
        { name: 'goToSecretVar', value: 'secret-val', isSecret: true }
      ]);
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'GoToDef Request', collectionName);
      await sidebar.request('GoToDef Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?a={{goToPlainVar}}&b={{goToSecretVar}}');
    });

    await test.step('Go to definition on the plain variable lands on the Variables sub-tab', async () => {
      const tooltip = await openUrlVarTooltip(page, 'goToPlainVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');

      await varInfoPopup.name(tooltip).click();

      // The tooltip closes immediately once navigation happens.
      await expect(varInfoPopup.all()).toHaveCount(0);

      await expect(environment.collectionEnvTab()).toBeVisible();
      await expect(environment.variablesTab()).toHaveClass(/active/);
      await expect(environment.varRow('goToPlainVar')).toBeVisible();
    });

    await test.step('Go to definition on the secret variable lands on the Secrets sub-tab', async () => {
      await sidebar.request('GoToDef Request').click();

      const tooltip = await openUrlVarTooltip(page, 'goToSecretVar', 'valid');
      await varInfoPopup.name(tooltip).click();

      await expect(varInfoPopup.all()).toHaveCount(0);

      await expect(environment.collectionEnvTab()).toBeVisible();
      await expect(environment.secretsTab()).toHaveClass(/active/);
      await expect(environment.varRow('goToSecretVar')).toBeVisible();
    });
  });

  test('should handle invalid variable names with warning', async ({ page, createTmpDir }) => {
    const collectionName = 'invalid-var-test';
    const { sidebar, request, varInfoPopup, dropdown } = buildCommonLocators(page);

    await test.step('Setup collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('invalid-var-collection'));

      await createRequest(page, 'Invalid Var Test', collectionName);
      await sidebar.request('Invalid Var Test').click();
      await setRequestUrlAndSave(page, 'https://api.example.com');
    });

    await test.step('Test invalid variable name with space', async () => {
      await selectRequestPaneTab(page, 'Body');

      // Select JSON body mode.
      await request.bodyModeSelector().click();
      await dropdown.item('JSON').click();

      const bodyEditor = page.locator('.CodeMirror').last();
      await bodyEditor.click();
      await bodyEditor.evaluate((el: any) => {
        const cm = el.CodeMirror;
        cm.setValue('{\n  "userId": "{{user id}}"\n}');
      });
      await page.keyboard.press(saveShortcut);

      // Hover over the invalid variable.
      await page.mouse.move(0, 0);
      await request.bodyVariableToken('user id', 'invalid').hover();

      // Verify tooltip shows a warning and hides the editable input.
      const tooltip = varInfoPopup.all().first();
      await expect(tooltip).toBeVisible();
      await expect(varInfoPopup.name(tooltip)).toContainText('user id');
      await expect(varInfoPopup.warningNote(tooltip)).toBeVisible();
      await expect(varInfoPopup.editableValue(tooltip)).not.toBeVisible();
    });
  });

  test('should keep tooltip open while editing when mouse leaves popup area', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-pin-test';
    const { sidebar, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection, environment variable, and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-pin-collection'));

      await createEnvironment(page, 'Pin Env', 'collection');
      await addEnvironmentVariables(page, [{ name: 'pinVar', value: 'pin-value' }]);
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Pin Test Request', collectionName);
      await sidebar.request('Pin Test Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?key={{pinVar}}');
    });

    await test.step('Tooltip stays open and accepts input while mouse is outside popup', async () => {
      const tooltip = await openUrlVarTooltip(page, 'pinVar');

      // Click value display to enter edit mode (this also pins the popup).
      await varInfoPopup.editableValue(tooltip).click();
      const editor = varInfoPopup.editor(tooltip);
      await expect(editor).toBeVisible();

      // Move mouse far outside the popup.
      await page.mouse.move(0, 0);

      // Type with a per-keystroke delay so the typing window spans past the internal
      // 500ms hide timer. If the popup were not pinned, it would hide mid-typing and
      // the keystrokes would never reach the editor — the assertion below would fail.
      // This validates pinning via real editor activity instead of a fixed sleep.
      await page.keyboard.press('End');
      await page.keyboard.type('-still-editable-after-mouse-left', { delay: 25 });

      await expect(editor.locator('.CodeMirror-line')).toContainText('pin-value-still-editable-after-mouse-left');
      await expect(tooltip).toBeVisible();
    });
  });

  test('should persist subsequent edits while popup stays open', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-subsequent-edit-test';
    const { sidebar, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection, environment variable, and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-subsequent-collection'));

      await createEnvironment(page, 'Edit Env', 'collection');
      await addEnvironmentVariables(page, [{ name: 'editVar', value: 'initial' }]);
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Edit Test Request', collectionName);
      await sidebar.request('Edit Test Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?key={{editVar}}');
    });

    await test.step('First edit saves via Enter and keeps popup open', async () => {
      const tooltip = await openUrlVarTooltip(page, 'editVar');

      const valueDisplay = varInfoPopup.editableValue(tooltip);
      await expect(valueDisplay).toContainText('initial');
      await valueDisplay.click();

      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.press('End');
      await page.keyboard.type('-one');

      // Pressing Enter saves and keeps the popup open (does not click outside).
      await page.keyboard.press('Enter');

      await expect(valueDisplay).toContainText('initial-one');
      await expect(tooltip).toBeVisible();
    });

    await test.step('Second edit on the same popup also saves', async () => {
      const tooltip = varInfoPopup.all().first();
      await expect(tooltip).toBeVisible();

      const valueDisplay = varInfoPopup.editableValue(tooltip);
      await valueDisplay.click();

      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.press('End');
      await page.keyboard.type('-two');
      await page.keyboard.press('Enter');

      await expect(valueDisplay).toContainText('initial-one-two');
    });

    await test.step('Reopen tooltip and verify the second edit persisted', async () => {
      // Close the existing tooltip with an outside click, then re-hover for a fresh one.
      await dismissVarTooltip(page);
      await expect(varInfoPopup.all().first()).not.toBeVisible();

      const tooltip = await openUrlVarTooltip(page, 'editVar');
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('initial-one-two');
    });
  });

  test('should copy latest value after editing within the same tooltip', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-copy-latest-test';
    const { sidebar, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection, environment variable, and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-copy-latest-collection'));

      await createEnvironment(page, 'Copy Env', 'collection');
      await addEnvironmentVariables(page, [{ name: 'copyVar', value: 'original-copy' }]);
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Copy Test Request', collectionName);
      await sidebar.request('Copy Test Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?key={{copyVar}}');
    });

    await test.step('Copy button copies the initial value', async () => {
      const tooltip = await openUrlVarTooltip(page, 'copyVar');

      const copyButton = varInfoPopup.copyButton(tooltip);
      await copyButton.click();

      // Success state confirms writeText resolved before we read the clipboard.
      await expect(copyButton.locator('svg polyline')).toBeVisible({ timeout: 1000 });

      const initialClipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(initialClipboard).toBe('original-copy');

      // Wait for the icon to revert so the next click is allowed.
      await expect(copyButton.locator('svg rect')).toBeVisible();
    });

    await test.step('Edit value, save with Enter, then copy without re-hovering', async () => {
      const tooltip = varInfoPopup.all().first();
      await expect(tooltip).toBeVisible();

      const valueDisplay = varInfoPopup.editableValue(tooltip);
      await valueDisplay.click();

      await expect(varInfoPopup.editor(tooltip)).toBeVisible();
      await page.keyboard.press('End');
      await page.keyboard.type('-edited');
      await page.keyboard.press('Enter');

      // Wait for the display to reflect the saved value before clicking copy.
      await expect(valueDisplay).toContainText('original-copy-edited');

      const copyButton = varInfoPopup.copyButton(tooltip);
      await copyButton.click();
      await expect(copyButton.locator('svg polyline')).toBeVisible({ timeout: 1000 });

      const updatedClipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(updatedClipboard).toBe('original-copy-edited');
    });
  });

  for (const testCase of SECRET_DATATYPE_CASES) {
    test(`should mask a secret ${testCase.dataType}-typed variable in the tooltip`, async ({ page, createTmpDir }) => {
      const collectionName = `tooltip-secret-${testCase.dataType}-test`;
      const envName = `Secret ${testCase.dataType} Env`;
      const { environment, sidebar, varInfoPopup } = buildCommonLocators(page);

      await test.step(`Create collection with a secret ${testCase.dataType}-typed env variable`, async () => {
        await createCollection(page, collectionName, await createTmpDir(`tooltip-secret-${testCase.dataType}-collection`));

        // Create a collection environment.
        await environment.selector().click();
        await environment.collectionTab().click();
        await environment.createEnvButton().click();
        await environment.envNameInput().fill(envName);
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(environment.collectionEnvTab()).toBeVisible();

        // `isSecret` routes the row to the Secrets tab; `dataType` sets its type.
        await addEnvironmentVariable(page, {
          name: testCase.varName,
          value: testCase.value,
          isSecret: true,
          dataType: testCase.dataType
        });

        await environment.saveAll().click();
        await closeEnvironmentPanel(page);
      });

      await test.step('Reference the secret in a request URL', async () => {
        await createRequest(page, `Secret ${testCase.dataType} Request`, collectionName);
        await sidebar.request(`Secret ${testCase.dataType} Request`).click();
        await setRequestUrlAndSave(page, `https://api.example.com?v={{${testCase.varName}}}`);
      });

      await test.step('Tooltip masks the value (non-empty) and reveals the real value', async () => {
        const tooltip = await openUrlVarTooltip(page, testCase.varName);
        await expect(varInfoPopup.name(tooltip)).toContainText(testCase.varName);

        const valueDisplay = varInfoPopup.editableValue(tooltip);

        // Core regression assertion: the masked display is NON-EMPTY. Before the
        // fix this was '' for any non-string secret value.
        await expect
          .poll(async () => ((await valueDisplay.textContent()) ?? '').length)
          .toBeGreaterThan(0);
        // Masking must never leak the raw value.
        expect(await valueDisplay.textContent()).not.toContain(testCase.revealContains);

        // Revealing shows the actual value.
        const toggleButton = varInfoPopup.secretToggle(tooltip);
        await expect(toggleButton).toBeVisible();
        await toggleButton.click();
        await expect(valueDisplay).toContainText(testCase.revealContains);
      });
    });
  }

  test('should copy pretty-printed JSON for an object-typed folder variable', async ({ page, createTmpDir }) => {
    const collectionName = 'tooltip-object-copy-test';
    const folderName = 'objFolder';
    const objectValue = { city: 'NYC', zip: 10001 };
    const expectedJson = JSON.stringify(objectValue, null, 2);

    const { sidebar, paneTabs, dataTypeSelector, varInfoPopup } = buildCommonLocators(page);

    await test.step('Create a folder with an object-typed folder variable', async () => {
      await createCollection(page, collectionName, await createTmpDir('tooltip-object-collection'));
      await createFolder(page, folderName, collectionName);

      // Open Folder Settings > Vars tab.
      await sidebar.folder(folderName).dblclick();
      await paneTabs.folderSettingsTab('vars').click();

      // Add the variable row and type its value.
      const tableContainer = page.getByTestId('folder-vars-req').first();
      const lastRow = tableContainer.locator('tbody tr').last();
      await lastRow.locator('input[type="text"]').first().click();
      await page.keyboard.type('objVar');

      const namedRow = tableContainer.locator('tbody tr[data-row-name="objVar"]');
      await expect(namedRow).toBeVisible();

      const valueEditor = namedRow.locator('[data-testid="column-value"] .CodeMirror').first();
      await valueEditor.click({ force: true });
      await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
      await page.keyboard.insertText(JSON.stringify(objectValue));

      // Switch the variable's dataType from the default `string` to `object`.
      const typeTrigger = dataTypeSelector.typeLabel(namedRow);
      await typeTrigger.click();
      await dataTypeSelector.menuItem('object').click();
      await expect(typeTrigger).toHaveAttribute('data-selected-type', 'object');

      await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    });

    await test.step('Create request inside the folder referencing the object variable', async () => {
      await expandFolder(page, folderName);
      await createRequest(page, 'Object Copy Request', folderName, { inFolder: true });
      await sidebar.folderRequest(folderName, 'Object Copy Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?data={{objVar}}');
    });

    await test.step('Tooltip shows pretty-printed JSON and copy button copies it verbatim', async () => {
      const tooltip = await openUrlVarTooltip(page, 'objVar');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Folder');

      // Parse back and deep-compare so the assertion isn't coupled to whitespace.
      const valueDisplay = varInfoPopup.editableValue(tooltip);
      await expect.poll(async () => JSON.parse((await valueDisplay.textContent()) ?? 'null')).toEqual(objectValue);

      const copyButton = varInfoPopup.copyButton(tooltip);
      await copyButton.click();

      // Success state confirms writeText resolved before we read the clipboard.
      await expect(copyButton.locator('svg polyline')).toBeVisible({ timeout: 1000 });

      // The app copies JSON.stringify(..., null, 2) (LF line endings); some platforms'
      // clipboards rewrite those to CRLF on read-back, so normalize before comparing.
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.replace(/\r\n/g, '\n')).toBe(expectedJson);
    });
  });

  test('should go to definition into Folder Settings for a folder variable, and Collection Settings for a collection variable', async ({ page, createTmpDir }) => {
    const collectionName = 'go-to-definition-folder-collection-test';
    const folderName = 'goToDefFolder';
    const { sidebar, paneTabs, varInfoPopup, table, varsPanel } = buildCommonLocators(page);

    await test.step('Add a folder variable', async () => {
      await createCollection(page, collectionName, await createTmpDir('go-to-definition-folder-collection'));
      await createFolder(page, folderName, collectionName);

      await sidebar.folder(folderName).dblclick();
      await paneTabs.folderSettingsTab('vars').click();

      const folderVarsTable = table('folder-vars-req');
      const lastRow = folderVarsTable.allRows().last();
      await folderVarsTable.rowNameInput(lastRow).click();
      await page.keyboard.type('goToFolderVar');

      const namedRow = folderVarsTable.rowByName('goToFolderVar');
      await expect(namedRow).toBeVisible();
      const valueEditor = folderVarsTable.rowValueEditor(namedRow);
      await valueEditor.click({ force: true });
      await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
      await page.keyboard.type('folder-def-value');

      await varsPanel('folder').saveButton().click();
    });

    await test.step('Add a collection variable', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');

      const collectionVarsTable = table('collection-vars-req');
      const lastRow = collectionVarsTable.allRows().last();
      await collectionVarsTable.rowNameInput(lastRow).click();
      await page.keyboard.type('goToCollectionVar');

      const namedRow = collectionVarsTable.rowByName('goToCollectionVar');
      await expect(namedRow).toBeVisible();
      const valueEditor = collectionVarsTable.rowValueEditor(namedRow);
      await valueEditor.click({ force: true });
      await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
      await page.keyboard.type('collection-def-value');

      await varsPanel('collection').saveButton().click();
    });

    await test.step('Create a request inside the folder referencing both variables', async () => {
      await expandFolder(page, folderName);
      await createRequest(page, 'GoToDef Folder Request', folderName, { inFolder: true });
      await sidebar.folderRequest(folderName, 'GoToDef Folder Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?a={{goToFolderVar}}&b={{goToCollectionVar}}');
    });

    await test.step('Go to definition on the folder variable opens Folder Settings > Vars', async () => {
      const tooltip = await openUrlVarTooltip(page, 'goToFolderVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Folder');

      await varInfoPopup.name(tooltip).click();

      await expect(varInfoPopup.all()).toHaveCount(0);
      await expect(paneTabs.folderSettingsTab('vars')).toHaveClass(/active/);
      await expect(table('folder-vars-req').rowByName('goToFolderVar')).toBeVisible();
    });

    await test.step('Go to definition on the collection variable opens Collection Settings > Vars', async () => {
      await sidebar.folderRequest(folderName, 'GoToDef Folder Request').click();

      const tooltip = await openUrlVarTooltip(page, 'goToCollectionVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Collection');

      await varInfoPopup.name(tooltip).click();

      await expect(varInfoPopup.all()).toHaveCount(0);
      await expect(paneTabs.collectionSettingsTab('vars')).toHaveClass(/active/);
      await expect(table('collection-vars-req').rowByName('goToCollectionVar')).toBeVisible();
    });
  });

  test('should go to definition into the environment the variable actually lives in, not a previously-browsed one, and reset the correct sub-tab', async ({ page, createTmpDir }) => {
    const collectionName = 'go-to-definition-stale-env-test';
    const { sidebar, varInfoPopup, environment } = buildCommonLocators(page);

    await test.step('Create two environments — Stage (inactive) and Prod (active, with a plain and a secret var)', async () => {
      await createCollection(page, collectionName, await createTmpDir('go-to-definition-stale-env-collection'));

      // Created first, so it's briefly active, then superseded by prod below.
      await createEnvironment(page, 'EnvStage', 'collection');
      await addEnvironmentVariable(page, { name: 'stageOnlyVar', value: 'stage-value' });
      await saveEnvironment(page);

      // createEnvironment always selects the environment it just created, so prod becomes the active one.
      await createEnvironment(page, 'EnvProd', 'collection');
      await addEnvironmentVariables(page, [
        { name: 'prodPlainVar', value: 'prod-plain-value' },
        { name: 'prodSecretVar', value: 'prod-secret-value', isSecret: true }
      ]);
      await saveEnvironment(page);
    });

    await test.step('Manually browse to Stage in the settings sidebar (view only — does not activate it), then leave', async () => {
      await environment.settingsListItem('EnvStage').click();

      await environment.variablesTab().click();
      await expect(environment.varRow('stageOnlyVar')).toBeVisible();
      // Prod is still the active environment. Stage was only selected for viewing.
      await expect(environment.activatedCheckmark('EnvProd')).toBeVisible();

      await closeEnvironmentPanel(page);
    });

    await test.step('Create a request referencing both Prod variables', async () => {
      await createRequest(page, 'Stale Env Request', collectionName);
      await sidebar.request('Stale Env Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?a={{prodPlainVar}}&b={{prodSecretVar}}');
    });

    await test.step('Go to definition on the secret variable lands on Prod (not the previously-browsed Stage) and the Secrets sub-tab', async () => {
      const tooltip = await openUrlVarTooltip(page, 'prodSecretVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Environment');

      await varInfoPopup.name(tooltip).click();
      await expect(varInfoPopup.all()).toHaveCount(0);

      await expect(environment.collectionEnvTab()).toBeVisible();
      await expect(environment.secretsTab()).toHaveClass(/active/);
      // Only visible if Prod (not the stale, previously-viewed Stage) is the environment on screen.
      await expect(environment.varRow('prodSecretVar')).toBeVisible();
    });

    await test.step('Browse back to Stage again, then go to definition on the plain variable still lands on Prod and resets to the Variables sub-tab', async () => {
      await environment.settingsListItem('EnvStage').click();

      await environment.variablesTab().click();
      await expect(environment.varRow('stageOnlyVar')).toBeVisible();

      await closeEnvironmentPanel(page);
      await sidebar.request('Stale Env Request').click();

      const tooltip = await openUrlVarTooltip(page, 'prodPlainVar', 'valid');
      await varInfoPopup.name(tooltip).click();
      await expect(varInfoPopup.all()).toHaveCount(0);

      await expect(environment.collectionEnvTab()).toBeVisible();
      await expect(environment.variablesTab()).toHaveClass(/active/);
      await expect(environment.varRow('prodPlainVar')).toBeVisible();
    });
  });

  test('should not steal focus (and cancel an in-progress edit) when clicking the eye or copy icon', async ({ page, createTmpDir }) => {
    const collectionName = 'icon-mousedown-test';
    const { sidebar, varInfoPopup } = buildCommonLocators(page);

    await test.step('Setup collection, environment secret variable, and request', async () => {
      await createCollection(page, collectionName, await createTmpDir('icon-mousedown-collection'));

      await createEnvironment(page, 'Icon Mousedown Env', 'collection');
      await addEnvironmentVariable(page, { name: 'iconMousedownVar', value: 'original-secret', isSecret: true });
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Icon Mousedown Request', collectionName);
      await sidebar.request('Icon Mousedown Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?key={{iconMousedownVar}}');
    });

    await test.step('Clicking the eye icon mid-edit does not blur the editor', async () => {
      const tooltip = await openUrlVarTooltip(page, 'iconMousedownVar', 'valid');
      await varInfoPopup.editableValue(tooltip).click();
      const editor = varInfoPopup.editor(tooltip);
      await expect(editor).toBeVisible();
      await expect(editor).toHaveClass(/CodeMirror-focused/);

      await page.keyboard.press('End');
      await page.keyboard.type('-eye');

      await varInfoPopup.secretToggle(tooltip).click();

      await expect(editor).toBeVisible();
      await expect(editor).toHaveClass(/CodeMirror-focused/);

      // The click also revealed the real (unmasked) text
      await expect(editor.locator('.CodeMirror-line')).toContainText('original-secret-eye');

      await dismissVarTooltip(page);
    });

    await test.step('The eye-icon interaction did not lose or corrupt the edit', async () => {
      const tooltip = await openUrlVarTooltip(page, 'iconMousedownVar', 'valid');
      await varInfoPopup.secretToggle(tooltip).click();
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('original-secret-eye');
      await page.mouse.move(0, 0);
    });

    await test.step('Clicking the copy icon mid-edit does not blur the editor', async () => {
      const tooltip = await openUrlVarTooltip(page, 'iconMousedownVar', 'valid');
      await varInfoPopup.editableValue(tooltip).click();
      const editor = varInfoPopup.editor(tooltip);
      await expect(editor).toBeVisible();
      await expect(editor).toHaveClass(/CodeMirror-focused/);

      await page.keyboard.press('End');
      await page.keyboard.type('-copy');

      await varInfoPopup.copyButton(tooltip).click();

      await expect(editor).toBeVisible();
      await expect(editor).toHaveClass(/CodeMirror-focused/);

      await dismissVarTooltip(page);
    });

    await test.step('The copy-icon interaction did not lose or corrupt the edit', async () => {
      const tooltip = await openUrlVarTooltip(page, 'iconMousedownVar', 'valid');
      await varInfoPopup.secretToggle(tooltip).click();
      await expect(varInfoPopup.editableValue(tooltip)).toContainText('original-secret-eye-copy');
    });
  });
});

test.describe('Variable Tooltip - Global Secret Variables', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await deleteAllGlobalEnvironments(page);
      await closeAllCollections(page);
    }
  });

  // One test case per non-string dataType, mirroring the collection-scoped
  // tests but for a GLOBAL environment (which has its own Secrets tab).
  for (const testCase of SECRET_DATATYPE_CASES) {
    test(`should mask a secret GLOBAL ${testCase.dataType}-typed variable in the tooltip`, async ({ page, createTmpDir }) => {
      const collectionName = `tooltip-global-secret-${testCase.dataType}-test`;
      const envName = `Global Secret ${testCase.dataType} Env`;
      const { environment, sidebar, varInfoPopup } = buildCommonLocators(page);

      await test.step(`Create a global env with a secret ${testCase.dataType}-typed variable`, async () => {
        await createCollection(page, collectionName, await createTmpDir(`tooltip-global-secret-${testCase.dataType}-collection`));

        // Create + select the global environment via the shared helper.
        await createEnvironment(page, envName, 'global');

        // Focus the Global Environments editor tab; `isSecret` then routes the
        // row to its Secrets sub-tab and `dataType` sets the type.
        await addEnvironmentVariable(page, {
          name: testCase.varName,
          value: testCase.value,
          isSecret: true,
          dataType: testCase.dataType
        });

        await environment.saveAll().click();
        await closeEnvironmentPanel(page);
      });

      await test.step('Reference the global secret in a request URL', async () => {
        await createRequest(page, `Global Secret ${testCase.dataType} Request`, collectionName);
        await sidebar.request(`Global Secret ${testCase.dataType} Request`).click();
        await setRequestUrlAndSave(page, `https://api.example.com?v={{${testCase.varName}}}`);
      });

      await test.step('Tooltip masks the value (non-empty) and reveals the real value', async () => {
        const tooltip = await openUrlVarTooltip(page, testCase.varName);
        await expect(varInfoPopup.name(tooltip)).toContainText(testCase.varName);

        const valueDisplay = varInfoPopup.editableValue(tooltip);

        // Core regression assertion: the masked display is NON-EMPTY. Before the
        // fix this was '' for any non-string secret value.
        await expect
          .poll(async () => ((await valueDisplay.textContent()) ?? '').length)
          .toBeGreaterThan(0);
        // Masking must never leak the raw value.
        expect(await valueDisplay.textContent()).not.toContain(testCase.revealContains);

        // Revealing shows the actual value.
        const toggleButton = varInfoPopup.secretToggle(tooltip);
        await expect(toggleButton).toBeVisible();
        await toggleButton.click();
        await expect(valueDisplay).toContainText(testCase.revealContains);
      });
    });
  }

  test('should go to definition into Global Environment Settings, landing on the Secrets sub-tab', async ({ page, createTmpDir }) => {
    const collectionName = 'go-to-definition-global-secret-test';
    const envName = 'GoToDef Global Env';
    const { sidebar, varInfoPopup, environment } = buildCommonLocators(page);

    await test.step('Create a global env with a secret variable, and a request referencing it', async () => {
      await createCollection(page, collectionName, await createTmpDir('go-to-definition-global-secret-collection'));

      await createEnvironment(page, envName, 'global');
      await addEnvironmentVariable(page, { name: 'goToGlobalSecretVar', value: 'global-secret-value', isSecret: true });
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'GoToDef Global Request', collectionName);
      await sidebar.request('GoToDef Global Request').click();
      await setRequestUrlAndSave(page, 'https://api.example.com?v={{goToGlobalSecretVar}}');
    });

    await test.step('Go to definition lands on Global Environment Settings > Secrets', async () => {
      const tooltip = await openUrlVarTooltip(page, 'goToGlobalSecretVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Global');

      await varInfoPopup.name(tooltip).click();

      // The tooltip closes immediately once navigation happens.
      await expect(varInfoPopup.all()).toHaveCount(0);

      await expect(environment.globalEnvTab()).toBeVisible();
      await expect(environment.secretsTab()).toHaveClass(/active/);
      await expect(environment.varRow('goToGlobalSecretVar')).toBeVisible();
    });
  });

  test('should go to definition on a global secret referenced from inside the Global Environment table itself, without closing other tabs', async ({ page, createTmpDir }) => {
    const collectionName = 'go-to-definition-global-secret-self-test';
    const envName = 'GoToDef Global Self Env';
    const { sidebar, varInfoPopup, environment, tabs } = buildCommonLocators(page);

    await test.step('Create a global env with a secret variable, and a plain variable referencing it', async () => {
      await createCollection(page, collectionName, await createTmpDir('go-to-definition-global-secret-self-collection'));

      await createEnvironment(page, envName, 'global');
      await addEnvironmentVariable(page, { name: 'goToGlobalSecretVar', value: 'global-secret-value', isSecret: true });
      // Added last so the Variables tab (where this row lives) ends up active.
      await addEnvironmentVariable(page, { name: 'goToGlobalRefVar', value: '{{goToGlobalSecretVar}}' });
      await environment.saveAll().click();
    });

    await test.step('Open an unrelated request tab, then switch back to the Global Environment table', async () => {
      await createRequest(page, 'GoToDef Self Persist Request', collectionName);
      await sidebar.request('GoToDef Self Persist Request').click();

      await environment.globalEnvTab().click();
      await expect(environment.varRow('goToGlobalRefVar')).toBeVisible();
    });

    await test.step('Go to definition on the reference, from inside the table it targets', async () => {
      const tooltip = await openEnvValueVarTooltip(page, 'goToGlobalRefVar', 'goToGlobalSecretVar', 'valid');
      await expect(varInfoPopup.scopeBadge(tooltip)).toContainText('Global');

      await varInfoPopup.name(tooltip).click();

      // The tooltip closes immediately once navigation happens.
      await expect(varInfoPopup.all()).toHaveCount(0);
    });

    await test.step('The same Global Environments tab is reused, no other tab was closed, and it lands on Secrets', async () => {
      await expect(environment.globalEnvTab()).toHaveCount(1);
      await expect(tabs.requestTab('GoToDef Self Persist Request')).toHaveCount(1);

      await expect(environment.secretsTab()).toHaveClass(/active/);
      await expect(environment.varRow('goToGlobalSecretVar')).toBeVisible();
    });
  });
});
