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
  openUrlVarTooltip
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
      await page.locator('body').click();

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
      await page.locator('body').click();
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
      await page.locator('body').click();
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
        await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();

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
      await expect(typeTrigger).toHaveText('object');

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

      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(expectedJson);
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
});
