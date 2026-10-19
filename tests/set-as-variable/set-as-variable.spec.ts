import fs from 'fs';
import path from 'path';
import { test, expect } from '../../playwright';
import {
  createCollection,
  closeAllCollections,
  createRequest,
  createEnvironment,
  addEnvironmentVariable,
  saveEnvironment,
  closeEnvironmentPanel,
  setRequestUrlAndSave,
  selectScriptSubTab,
  editCodeMirrorEditor,
  setCodeMirrorEditorValue,
  openSetAsVariableMenu,
  openSetAsVariablePopover,
  openSetAsVariablePopoverAtChar,
  openEnvironmentConfigTab,
  selectVariableScope
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe.configure({ timeout: 60_000 });

test.describe('Set as variable', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('saves a selection as a request variable and replaces it in the URL', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with a request', async () => {
      await createCollection(page, 'set-var', await createTmpDir('set-var'));
      await createRequest(page, 'Fetch Posts', 'set-var');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Open the form from a selection in the URL', async () => {
      const popover = await openSetAsVariablePopover(page, request.urlLine(), 10);

      await expect(setAsVariable.value()).toHaveText('https');
      await expect(setAsVariable.scopeBadge()).toContainText('Request');
      await expect(popover).toBeVisible();
    });

    await test.step('Name it and save to the request scope', async () => {
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
    });

    await test.step('The selection is replaced with a resolving variable reference', async () => {
      await expect(setAsVariable.popover()).toBeHidden();
      await expect(request.urlLine()).toContainText('{{scheme}}://example.com/posts');
      await expect(request.urlVariableToken('scheme', 'valid')).toBeVisible();
    });
  });

  test('does not open the hover tooltip while the menu is up', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable, varInfoPopup } = buildCommonLocators(page);

    await test.step('Create a request whose URL holds a variable reference', async () => {
      await createCollection(page, 'no-tooltip', await createTmpDir('no-tooltip'));
      await createRequest(page, 'Fetch Posts', 'no-tooltip');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/{{posts}}');
    });

    await test.step('Right-clicking a selection inside {{...}} keeps the tooltip closed', async () => {
      const menu = await openSetAsVariableMenu(page, request.urlLine(), 150);
      await expect(menu).toBeVisible();

      // Re-entering the token is what fires mouseover and re-arms the hover timer.
      await page.mouse.move(0, 0);
      await request.urlVariableToken('posts', 'invalid').hover();
      await page.waitForTimeout(400);

      await expect(varInfoPopup.all()).toHaveCount(0);
      await expect(menu).toBeVisible();
    });

    await test.step('The tooltip works again once the menu is dismissed', async () => {
      await page.keyboard.press('Escape');
      await expect(setAsVariable.menu()).toBeHidden();

      // The pointer still sits on the token, so move away to get a fresh mouseover.
      await page.mouse.move(0, 0);
      await request.urlVariableToken('posts', 'invalid').hover();
      await expect(varInfoPopup.all().first()).toBeVisible();
    });
  });

  test('opens with an empty name and blocks saving until one is typed', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await createCollection(page, 'empty-name', await createTmpDir('empty-name'));
    await createRequest(page, 'Fetch Posts', 'empty-name');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await openSetAsVariablePopover(page, request.urlLine(), 10);

    await test.step('The name starts empty even though a value is selected', async () => {
      await expect(setAsVariable.value()).toHaveText('https');
      await expect(setAsVariable.nameInput()).toHaveValue('');
      await expect(setAsVariable.saveButton()).toBeDisabled();
    });

    await test.step('Typing a name enables Save', async () => {
      await setAsVariable.nameInput().fill('scheme');
      await expect(setAsVariable.saveButton()).toBeEnabled();
    });

    await test.step('Clearing it disables Save again', async () => {
      await setAsVariable.nameInput().fill('');
      await expect(setAsVariable.saveButton()).toBeDisabled();
    });
  });

  test('does not open the menu without a selection', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await createCollection(page, 'no-selection', await createTmpDir('no-selection'));
    await createRequest(page, 'Fetch Posts', 'no-selection');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await test.step('Right-click with nothing selected', async () => {
      await request.urlLine().click({ button: 'right' });
      await expect(setAsVariable.menu()).toBeHidden();
    });
  });

  test('blocks saving a variable name with invalid characters', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await createCollection(page, 'invalid-name', await createTmpDir('invalid-name'));
    await createRequest(page, 'Fetch Posts', 'invalid-name');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await openSetAsVariablePopover(page, request.urlLine(), 10);

    await test.step('An invalid name surfaces an error and disables Save', async () => {
      await setAsVariable.nameInput().fill('not valid!');
      await expect(setAsVariable.nameError()).toBeVisible();
      await expect(setAsVariable.saveButton()).toBeDisabled();
    });

    await test.step('Correcting the name re-enables Save', async () => {
      await setAsVariable.nameInput().fill('valid_name');
      await expect(setAsVariable.nameError()).toBeHidden();
      await expect(setAsVariable.saveButton()).toBeEnabled();
    });
  });

  test('saves into the active collection environment', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with an active environment', async () => {
      await createCollection(page, 'env-scope', await createTmpDir('env-scope'));
      await createEnvironment(page, 'Dev', 'collection');
      await addEnvironmentVariable(page, { name: 'placeholder', value: 'x' });
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Fetch Posts', 'env-scope');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Save the selection to the collection environment', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'environment');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The new reference resolves against the environment', async () => {
      await expect(request.urlLine()).toContainText('{{scheme}}://example.com/posts');
      // A token renders `valid` only once the variable resolves, proving it reached the environment.
      await expect(request.urlVariableToken('scheme', 'valid')).toBeVisible();
    });
  });

  test('offers Create One when no environment exists', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await createCollection(page, 'create-env', await createTmpDir('create-env'));
    await createRequest(page, 'Fetch Posts', 'create-env');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await openSetAsVariablePopover(page, request.urlLine(), 10);

    await test.step('The environment scopes offer inline creation', async () => {
      await setAsVariable.addToToggle().click();
      await expect(setAsVariable.createEnvLink('environment')).toBeVisible();
      await expect(setAsVariable.createEnvLink('global')).toBeVisible();
    });

    await test.step('Creating an environment enables that scope', async () => {
      await setAsVariable.createEnvLink('environment').click();
      await setAsVariable.createEnvName().fill('Staging');
      await setAsVariable.createEnvSubmit().click();

      await expect(setAsVariable.scopeBadge()).toContainText('Environment');
    });
  });

  test('keeps a half-typed environment name when the scope list is collapsed', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with no environment', async () => {
      await createCollection(page, 'keep-draft', await createTmpDir('keep-draft'));
      await createRequest(page, 'Fetch Posts', 'keep-draft');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Start naming an environment inline', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.addToToggle().click();
      await setAsVariable.createEnvLink('environment').click();
      await setAsVariable.createEnvName().fill('stag');
    });

    await test.step('Collapsing and reopening Add to leaves the half-typed name intact', async () => {
      await setAsVariable.addToToggle().click();
      await expect(setAsVariable.scopeList()).toBeHidden();

      await setAsVariable.addToToggle().click();
      await expect(setAsVariable.createEnvName()).toHaveValue('stag');
    });
  });

  test('saves when Enter is pressed in the name field', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with a request', async () => {
      await createCollection(page, 'enter-save', await createTmpDir('enter-save'));
      await createRequest(page, 'Fetch Posts', 'enter-save');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Name the variable and pick the request scope', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'request');
    });

    await test.step('Enter in the name field saves without clicking Save', async () => {
      // The save handler only acts when Enter targets the input, and picking a scope moves focus.
      await setAsVariable.nameInput().press('Enter');

      await expect(setAsVariable.popover()).toBeHidden();
      await expect(request.urlLine()).toContainText('{{scheme}}://example.com/posts');
      await expect(request.urlVariableToken('scheme', 'valid')).toBeVisible();
    });
  });

  test('warns before overwriting an existing variable in the same scope', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);
    const warning = () => page.getByTestId('set-as-variable-overwrite-warning');

    await createCollection(page, 'overwrite-warn', await createTmpDir('overwrite-warn'));
    await createRequest(page, 'Fetch Posts', 'overwrite-warn');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');
    await createEnvironment(page, 'Dev', 'collection');
    await addEnvironmentVariable(page, { name: 'placeholder', value: 'x' });
    await saveEnvironment(page);
    await closeEnvironmentPanel(page);

    await test.step('Save a variable into the environment scope', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'environment');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('Reusing that name in the same scope warns before replacing it', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 30);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'environment');
      await expect(warning()).toBeVisible();
      await expect(setAsVariable.saveButton()).toHaveText('Overwrite');
    });
  });

  test('overwriting a request variable replaces it instead of adding a duplicate', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);
    const dir = await createTmpDir('no-dupe');

    await createCollection(page, 'no-dupe', dir);
    await createRequest(page, 'Fetch Posts', 'no-dupe');
    await sidebar.request('Fetch Posts').click();

    const saveSchemeVar = async () => {
      await setRequestUrlAndSave(page, 'https://example.com/posts');
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    };

    await test.step('Save the same variable name twice into the request scope', async () => {
      await saveSchemeVar();
      await saveSchemeVar();
    });

    await test.step('The request file holds one scheme variable, not two', async () => {
      const requestFile = path.join(dir, 'no-dupe', 'Fetch Posts.yml');
      await expect(() => expect(fs.existsSync(requestFile)).toBe(true)).toPass();

      const contents = fs.readFileSync(requestFile, 'utf8');
      const occurrences = contents.split('\n').filter((line) => /^\s*(-\s*)?name:\s*scheme\s*$/.test(line)).length;
      expect(occurrences, `expected one scheme var, file was:\n${contents}`).toBe(1);
    });
  });

  test('inserts a bru accessor instead of a template inside a script', async ({ page, createTmpDir }) => {
    const { sidebar, setAsVariable } = buildCommonLocators(page);
    const editorTestId = 'pre-request-script-editor';

    await test.step('Write a pre-request script holding a quoted literal', async () => {
      await createCollection(page, 'script-var', await createTmpDir('script-var'));
      await createRequest(page, 'Fetch Posts', 'script-var');
      await sidebar.request('Fetch Posts').click();
      await selectScriptSubTab(page, 'pre-request');
      await editCodeMirrorEditor(page, editorTestId, 'const t = "help example abc123 happy";');
    });

    await test.step('Save the quoted value as a request variable', async () => {
      // char 27 sits inside abc123 in `const t = "help example abc123 happy";`
      await openSetAsVariablePopoverAtChar(page, editorTestId, 27);
      await setAsVariable.nameInput().fill('tok');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The literal becomes a template with the accessor interpolated', async () => {
      const content = await page
        .getByTestId(editorTestId)
        .locator('.CodeMirror')
        .first()
        .evaluate((el: any) => el.CodeMirror.getValue());

      expect(content).toBe('const t = `help example ${bru.getRequestVar(\'tok\')} happy`;');
    });
  });

  test('stores the whole reference when the selection sits inside braces', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);
    const dir = await createTmpDir('brace-value');

    await test.step('Point the URL at an existing variable reference', async () => {
      await createCollection(page, 'brace-value', dir);
      await createRequest(page, 'Fetch Posts', 'brace-value');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, '{{baseUrl}}/posts');
    });

    await test.step('Save the referenced name as a new variable', async () => {
      // char 5 sits inside baseUrl in `{{baseUrl}}/posts`
      await openSetAsVariablePopoverAtChar(page, 'request-url', 5);
      await setAsVariable.nameInput().fill('host');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The URL swaps the reference and the value keeps its braces', async () => {
      await expect(request.urlLine()).toContainText('{{host}}/posts');

      const requestFile = path.join(dir, 'brace-value', 'Fetch Posts.yml');
      await expect(() => expect(fs.existsSync(requestFile)).toBe(true)).toPass();

      const contents = fs.readFileSync(requestFile, 'utf8');
      expect(contents, `host must resolve through baseUrl, file was:\n${contents}`).toMatch(
        /name: host\s*\n\s*value: ["']?\{\{baseUrl\}\}["']?/
      );
    });
  });

  test('persists the inferred data type to disk', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);
    const dir = await createTmpDir('typed-var');

    await test.step('Put a number in the URL', async () => {
      await createCollection(page, 'typed-var', dir);
      await createRequest(page, 'Fetch Posts', 'typed-var');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/5000');
    });

    await test.step('Save it as a request variable', async () => {
      await openSetAsVariablePopoverAtChar(page, 'request-url', 22);
      await setAsVariable.nameInput().fill('timeout');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The saved file records it as a number, not a string', async () => {
      const requestFile = path.join(dir, 'typed-var', 'Fetch Posts.yml');
      await expect(() => expect(fs.existsSync(requestFile)).toBe(true)).toPass();

      const contents = fs.readFileSync(requestFile, 'utf8');
      expect(contents, `expected a number data type, file was:\n${contents}`).toMatch(
        /name: timeout\s*\n\s*value:\s*\n\s*type: number\s*\n\s*data: ["']?5000["']?/
      );
    });
  });

  test('keeps an earlier variable intact when a second one is added to the same line', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, setAsVariable } = buildCommonLocators(page);
    const editorTestId = 'pre-request-script-editor';

    const readScript = () =>
      page
        .getByTestId(editorTestId)
        .locator('.CodeMirror')
        .first()
        .evaluate((el: any) => el.CodeMirror.getValue());

    const saveWordAt = async (ch: number, name: string) => {
      await openSetAsVariablePopoverAtChar(page, editorTestId, ch);
      await setAsVariable.nameInput().fill(name);
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    };

    await test.step('Write a script with two words worth extracting', async () => {
      await createCollection(page, 'two-vars', await createTmpDir('two-vars'));
      await createRequest(page, 'Fetch Posts', 'two-vars');
      await sidebar.request('Fetch Posts').click();
      await selectScriptSubTab(page, 'pre-request');
      await editCodeMirrorEditor(page, editorTestId, 'const hello = \'help world happy\';');
    });

    await test.step('Extract the first word', async () => {
      // char 22 sits inside world in `const hello = 'help world happy';`
      await saveWordAt(22, 'first');
      expect(await readScript()).toBe('const hello = `help ${bru.getRequestVar(\'first\')} happy`;');
    });

    await test.step('Extract the second word without escaping the first', async () => {
      const line = await readScript();
      await saveWordAt(line.indexOf('happy') + 2, 'second');

      expect(await readScript()).toBe(
        'const hello = `help ${bru.getRequestVar(\'first\')} ${bru.getRequestVar(\'second\')}`;'
      );
    });
  });

  test('does not clear an existing secret when overwriting it', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable, environment } = buildCommonLocators(page);

    await test.step('Create a collection with an environment and a request', async () => {
      await createCollection(page, 'secret-keep', await createTmpDir('secret-keep'));
      await createEnvironment(page, 'Dev', 'collection');
      await saveEnvironment(page);
      await closeEnvironmentPanel(page);

      await createRequest(page, 'Fetch Posts', 'secret-keep');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Save a secret environment variable', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('token');
      await selectVariableScope(page, 'environment');
      await setAsVariable.secretCheckbox().check();
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('Overwrite the same name with the Secret box unchecked', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 30);
      await setAsVariable.nameInput().fill('token');
      await selectVariableScope(page, 'environment');

      await expect(setAsVariable.secretCheckbox()).not.toBeChecked();
      await expect(setAsVariable.saveButton()).toHaveText('Overwrite');

      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The variable is still a secret, not rewritten in cleartext', async () => {
      await openEnvironmentConfigTab(page, 'collection');

      await environment.secretsTab().click();
      await expect(environment.varRow('token')).toBeVisible();

      await environment.variablesTab().click();
      await expect(environment.varRow('token')).toHaveCount(0);

      await closeEnvironmentPanel(page);
    });
  });

  test('interpolates inside a multi-line template instead of inserting dead text', async ({
    page,
    createTmpDir
  }) => {
    const { sidebar, setAsVariable } = buildCommonLocators(page);
    const editorTestId = 'pre-request-script-editor';

    const readScript = () =>
      page
        .getByTestId(editorTestId)
        .locator('.CodeMirror')
        .first()
        .evaluate((el: any) => el.CodeMirror.getValue());

    await test.step('Write a script holding a multi-line template literal', async () => {
      await createCollection(page, 'multiline-tpl', await createTmpDir('multiline-tpl'));
      await createRequest(page, 'Fetch Posts', 'multiline-tpl');
      await sidebar.request('Fetch Posts').click();
      await selectScriptSubTab(page, 'pre-request');
      await setCodeMirrorEditorValue(page, editorTestId, 'const q = `\n  SELECT world\n`;');
    });

    await test.step('A selection on an inner line becomes an interpolation', async () => {
      const line = 'const q = `\n  SELECT world\n`;'.split('\n')[1];
      await openSetAsVariablePopoverAtChar(page, editorTestId, line.indexOf('world') + 1, 1);
      await setAsVariable.nameInput().fill('tok');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();

      expect(await readScript()).toBe('const q = `\n  SELECT ${bru.getRequestVar(\'tok\')}\n`;');
    });
  });

  test('cancelling leaves the editor untouched', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await createCollection(page, 'cancel-var', await createTmpDir('cancel-var'));
    await createRequest(page, 'Fetch Posts', 'cancel-var');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await openSetAsVariablePopover(page, request.urlLine(), 10);
    await setAsVariable.nameInput().fill('scheme');
    await setAsVariable.cancelButton().click();

    await expect(setAsVariable.popover()).toBeHidden();
    await expect(request.urlLine()).toContainText('https://example.com/posts');
  });

  test('copies the typed variable name', async ({ page, createTmpDir, installFakeClipboard }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);
    const clipboard = await installFakeClipboard(page);

    await createCollection(page, 'copy-var', await createTmpDir('copy-var'));
    await createRequest(page, 'Fetch Posts', 'copy-var');
    await sidebar.request('Fetch Posts').click();
    await setRequestUrlAndSave(page, 'https://example.com/posts');

    await openSetAsVariablePopover(page, request.urlLine(), 10);

    await test.step('Copy is unavailable until a name is typed', async () => {
      await expect(setAsVariable.copyButton()).toBeDisabled();
    });

    await test.step('Copy puts the typed name on the clipboard', async () => {
      await setAsVariable.nameInput().fill('scheme');
      await setAsVariable.copyButton().click();
      expect(await clipboard.copiedText()).toBe('scheme');
    });
  });
});
