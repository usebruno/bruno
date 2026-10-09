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
  openSetAsVariablePopover,
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
      // A token only renders as `valid` once the variable actually resolves, which proves it
      // was written to the environment rather than just substituted into the URL.
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
