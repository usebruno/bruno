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
  expectNoSetAsVariableMenu,
  openSetAsVariableMenu,
  openSetAsVariablePopover,
  selectWordAndCtrlClick,
  openSetAsVariablePopoverAtChar,
  openEnvironmentConfigTab,
  selectVariableScope,
  selectRequestPaneTab,
  sendRequest
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
      await setAsVariable.createEnvName('environment').fill('Staging');
      await setAsVariable.createEnvSubmit('environment').click();

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
      await setAsVariable.createEnvName('environment').fill('stag');
    });

    await test.step('Collapsing and reopening Add to leaves the half-typed name intact', async () => {
      await setAsVariable.addToToggle().click();
      await expect(setAsVariable.scopeList()).toBeHidden();

      await setAsVariable.addToToggle().click();
      await expect(setAsVariable.createEnvName('environment')).toHaveValue('stag');
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
    const { sidebar, setAsVariable } = buildCommonLocators(page);
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

  test('keeps the selection highlighted until the popover closes', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with a request', async () => {
      await createCollection(page, 'keep-selection', await createTmpDir('keep-selection'));
      await createRequest(page, 'Fetch Posts', 'keep-selection');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('The highlight survives the right-click menu', async () => {
      await openSetAsVariableMenu(page, request.urlLine(), 10);
      await expect(setAsVariable.selectionHighlight(request.urlInput()).first()).toBeVisible();
    });

    await test.step('The highlight survives opening the popover', async () => {
      await setAsVariable.menuAction().click();
      await expect(setAsVariable.popover()).toBeVisible();
      await expect(setAsVariable.value()).toHaveText('https');
      await expect(setAsVariable.selectionHighlight(request.urlInput()).first()).toBeVisible();
    });

    await test.step('Closing the popover clears the highlight', async () => {
      await setAsVariable.cancelButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
      await expect(setAsVariable.selectionHighlight(request.urlInput())).toHaveCount(0);
    });
  });

  test('clears the highlight when the menu is dismissed without opening the popover', async ({ page, createTmpDir }) => {
    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with a request', async () => {
      await createCollection(page, 'dismiss-selection', await createTmpDir('dismiss-selection'));
      await createRequest(page, 'Fetch Posts', 'dismiss-selection');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('The highlight survives the right-click menu', async () => {
      await openSetAsVariableMenu(page, request.urlLine(), 10);
      await expect(setAsVariable.selectionHighlight(request.urlInput()).first()).toBeVisible();
    });

    await test.step('Dismissing the menu clears the highlight', async () => {
      await page.keyboard.press('Escape');
      await expect(setAsVariable.menu()).toBeHidden();
      await expect(setAsVariable.selectionHighlight(request.urlInput())).toHaveCount(0);
    });
  });

  test('keeps a multi-line editor selection highlighted until the popover closes', async ({ page, createTmpDir }) => {
    const { sidebar, request, table, setAsVariable } = buildCommonLocators(page);
    const valueCell = request.queryParams.valueByName('token');
    const valueEditor = () => table('query-params-table').rowValueEditor(table('query-params-table').rowByName('token'));

    await test.step('Create a request with a query param value', async () => {
      await createCollection(page, 'keep-selection-mle', await createTmpDir('keep-selection-mle'));
      await createRequest(page, 'Fetch Posts', 'keep-selection-mle');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts?token=greeting');
      await selectRequestPaneTab(page, 'Params');
      await expect(valueEditor()).toBeVisible();
    });

    await test.step('The highlight survives the right-click menu', async () => {
      await openSetAsVariableMenu(page, valueCell.locator('.CodeMirror-line'), 8);
      await expect(setAsVariable.selectionHighlight(valueCell).first()).toBeVisible();
    });

    await test.step('The highlight survives opening the popover', async () => {
      await setAsVariable.menuAction().click();
      await expect(setAsVariable.popover()).toBeVisible();
      await expect(setAsVariable.value()).toHaveText('greeting');
      await expect(setAsVariable.selectionHighlight(valueCell).first()).toBeVisible();
    });

    await test.step('Closing the popover clears the highlight', async () => {
      await setAsVariable.cancelButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
      await expect(setAsVariable.selectionHighlight(valueCell)).toHaveCount(0);
    });
  });

  test('opens the menu from a macOS ctrl+click and keeps that selection pinned', async ({ page, createTmpDir }) => {
    test.skip(process.platform !== 'darwin', 'ctrl+click only opens a context menu on macOS');

    const { sidebar, request, setAsVariable } = buildCommonLocators(page);

    await test.step('Create a collection with a request', async () => {
      await createCollection(page, 'ctrl-click', await createTmpDir('ctrl-click'));
      await createRequest(page, 'Fetch Posts', 'ctrl-click');
      await sidebar.request('Fetch Posts').click();
      await setRequestUrlAndSave(page, 'https://example.com/posts');
    });

    await test.step('Ctrl+click opens the menu with the selection still highlighted', async () => {
      await selectWordAndCtrlClick(page, request.urlLine(), 10);

      await expect(setAsVariable.menu()).toBeVisible();
      await expect(setAsVariable.selectionHighlight(request.urlInput()).first()).toBeVisible();
    });

    await test.step('The pinned range is the one the form offers', async () => {
      await setAsVariable.menuAction().click();

      await expect(setAsVariable.popover()).toBeVisible();
      await expect(setAsVariable.value()).toHaveText('https');
      await expect(setAsVariable.selectionHighlight(request.urlInput()).first()).toBeVisible();
    });

    await test.step('Saving replaces the pinned range in the URL', async () => {
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();

      await expect(setAsVariable.popover()).toBeHidden();
      await expect(request.urlLine()).toContainText('{{scheme}}://example.com/posts');
    });
  });

  test('writes both the variable and the replaced reference to disk', async ({ page, createTmpDir }) => {
    const { sidebar, setAsVariable, request, tabs } = buildCommonLocators(page);
    const dir = await createTmpDir('disk-http');

    await test.step('Create a request with a literal URL', async () => {
      await createCollection(page, 'disk-http', dir);
      await createRequest(page, 'Fetch Widgets', 'disk-http');
      await sidebar.request('Fetch Widgets').click();
      await setRequestUrlAndSave(page, 'https://example.com/widgets');
    });

    await test.step('Save the scheme as a request variable', async () => {
      await openSetAsVariablePopover(page, request.urlLine(), 10);
      await setAsVariable.nameInput().fill('scheme');
      await selectVariableScope(page, 'request');
      await setAsVariable.saveButton().click();
      await expect(setAsVariable.popover()).toBeHidden();
    });

    await test.step('The file holds the variable AND the rewritten URL', async () => {
      const requestFile = path.join(dir, 'disk-http', 'Fetch Widgets.yml');
      await expect(() => expect(fs.existsSync(requestFile)).toBe(true)).toPass();

      await expect(() => {
        const contents = fs.readFileSync(requestFile, 'utf8');
        expect(contents, `variable missing on disk:\n${contents}`).toContain('name: scheme');
        expect(contents, `URL was not rewritten on disk:\n${contents}`).toContain('{{scheme}}://example.com/widgets');
      }).toPass();
    });

    await test.step('And the request is left with nothing unsaved', async () => {
      await expect(tabs.activeTabDirty()).toHaveCount(0);
    });
  });

  test('does not offer the menu on a gRPC request URL', async ({ page, createTmpDir }) => {
    const { sidebar, setAsVariable, request } = buildCommonLocators(page);

    await test.step('Create a gRPC request', async () => {
      await createCollection(page, 'grpc-gate', await createTmpDir('grpc-gate'));
      await createRequest(page, 'Say Hello', 'grpc-gate', { requestType: 'grpc' });
      await sidebar.request('Say Hello').click();
      await request.protocolUrlEditor().click();
      await page.keyboard.type('grpc://example.com/helloworld');
    });

    await test.step('Right-clicking a selection offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, request.protocolUrlLine(), 12);
    });

    await test.step('And leaves no selection pinned behind it', async () => {
      await selectRequestPaneTab(page, 'Metadata');
      await expect(setAsVariable.selectionHighlight(request.protocolUrlEditor())).toHaveCount(0);
    });
  });

  test('does not offer the menu on a WebSocket request URL', async ({ page, createTmpDir }) => {
    const { sidebar, request } = buildCommonLocators(page);

    await test.step('Create a WebSocket request', async () => {
      await createCollection(page, 'ws-gate', await createTmpDir('ws-gate'));
      await createRequest(page, 'Echo Socket', 'ws-gate', { requestType: 'ws' });
      await sidebar.request('Echo Socket').click();
      await request.protocolUrlEditor().click();
      await page.keyboard.type('wss://example.com/socket');
    });

    await test.step('Right-clicking a selection offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, request.protocolUrlLine(), 12);
    });
  });

  test('does not offer the menu on a GraphQL response body', async ({ page, createTmpDir }) => {
    const { sidebar, response } = buildCommonLocators(page);

    await test.step('Create a GraphQL request against the test server', async () => {
      await createCollection(page, 'gql-gate', await createTmpDir('gql-gate'));
      await createRequest(page, 'Fetch Users', 'gql-gate', { requestType: 'graphql' });
      await sidebar.request('Fetch Users').click();
      await setRequestUrlAndSave(page, 'http://localhost:8081/api/graphql');
      await setCodeMirrorEditorValue(page, 'graphql-query-editor', '{ users { id name } }');
    });

    await test.step('Send it and get a body back', async () => {
      await sendRequest(page, 200);
      await expect(response.codeLine().first()).toBeVisible();
    });

    await test.step('Right-clicking the response body offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, response.codeLine().first(), 12);
    });
  });

  test('does not offer the menu in a gRPC bulk-edit box, which passes no request of its own', async ({ page, createTmpDir }) => {
    const { sidebar, request } = buildCommonLocators(page);

    await test.step('Open a gRPC request and switch Metadata to bulk edit', async () => {
      await createCollection(page, 'grpc-bulk', await createTmpDir('grpc-bulk'));
      await createRequest(page, 'Say Hello', 'grpc-bulk', { requestType: 'grpc' });
      await sidebar.request('Say Hello').click();
      await selectRequestPaneTab(page, 'Metadata');
      await request.bulkEditToggle().click();
    });

    await test.step('Type a header into the bulk-edit box', async () => {
      await request.bulkEditEditor().click();
      await page.keyboard.type('x-api-key: secretvalue');
    });

    await test.step('Right-clicking a selection offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, request.bulkEditLine(), 12);
    });
  });

  test('still offers the menu in an HTTP bulk-edit box', async ({ page, createTmpDir }) => {
    const { sidebar, setAsVariable, request } = buildCommonLocators(page);

    await test.step('Open an HTTP request and switch Headers to bulk edit', async () => {
      await createCollection(page, 'http-bulk', await createTmpDir('http-bulk'));
      await createRequest(page, 'Fetch Posts', 'http-bulk');
      await sidebar.request('Fetch Posts').click();
      await selectRequestPaneTab(page, 'Headers');
      await request.bulkEditToggle().click();
    });

    await test.step('Type a header into the bulk-edit box', async () => {
      await request.bulkEditEditor().click();
      await page.keyboard.type('x-api-key: secretvalue');
    });

    await test.step('Right-clicking a selection still offers the menu', async () => {
      await openSetAsVariableMenu(page, request.bulkEditLine(), 12);
      await expect(setAsVariable.menu()).toBeVisible();
    });
  });

  test('does not offer the menu in the GraphQL query editor', async ({ page, createTmpDir }) => {
    const { sidebar, codeMirror } = buildCommonLocators(page);

    await test.step('Create a GraphQL request with a query', async () => {
      await createCollection(page, 'gql-query', await createTmpDir('gql-query'));
      await createRequest(page, 'Fetch Users', 'gql-query', { requestType: 'graphql' });
      await sidebar.request('Fetch Users').click();
      await setCodeMirrorEditorValue(page, 'graphql-query-editor', 'query { users(role: "admin") { id } }');
    });

    await test.step('Right-clicking a selection offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, codeMirror.byTestId('graphql-query-editor').locator('.CodeMirror-line').first(), 60);
    });
  });

  test('does not offer the menu in the Settings tags input', async ({ page, createTmpDir }) => {
    const { sidebar, codeMirror } = buildCommonLocators(page);

    await test.step('Open an HTTP request on its Settings tab', async () => {
      await createCollection(page, 'tags-gate', await createTmpDir('tags-gate'));
      await createRequest(page, 'Fetch Posts', 'tags-gate');
      await sidebar.request('Fetch Posts').click();
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('Type a tag', async () => {
      await codeMirror.byTestId('tag-input').click();
      await page.keyboard.type('productionready');
    });

    await test.step('Right-clicking a selection offers nothing', async () => {
      await expectNoSetAsVariableMenu(page, codeMirror.byTestId('tag-input').locator('.CodeMirror-line').first(), 12);
    });
  });

  test('still offers the menu on an HTTP response body', async ({ page, createTmpDir }) => {
    const { sidebar, setAsVariable, response } = buildCommonLocators(page);

    await test.step('Create an HTTP request against the test server', async () => {
      await createCollection(page, 'resp-menu', await createTmpDir('resp-menu'));
      await createRequest(page, 'Echo Json', 'resp-menu');
      await sidebar.request('Echo Json').click();
      await setRequestUrlAndSave(page, 'http://localhost:8081/api/echo/headers');
    });

    await test.step('Send it and get a body back', async () => {
      await sendRequest(page, 200);
      await expect(response.codeLine().first()).toBeVisible();
    });

    await test.step('Right-clicking the response body still offers the menu', async () => {
      await openSetAsVariableMenu(page, response.codeLine().first(), 12);
      await expect(setAsVariable.menu()).toBeVisible();
    });
  });
});
