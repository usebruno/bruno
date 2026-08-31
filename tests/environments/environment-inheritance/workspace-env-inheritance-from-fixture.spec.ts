import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  addEnvironmentVariables,
  closeEnvironmentPanel,
  copyEnvironment,
  createEnvironment,
  deleteEnvironment,
  expectResponseContains,
  getResponseBody,
  openCollection,
  openEnvironmentConfigTab,
  openEnvironmentInSettings,
  openRequest,
  openUrlVarTooltip,
  renameEnvironment,
  runCollection,
  saveEnvironment,
  searchEnvironmentVariables,
  selectEnvironment,
  selectResponsePaneTab,
  sendRequest,
  setEnvironmentInheritance,
  setEnvironmentSecrets,
  setEnvironmentVariableValue,
  validateRunnerResults
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  seedEchoSecrets,
  seedWorkspaceVarsSecrets,
  WORKSPACE_BASE_SECRETS,
  WORKSPACE_DEV_SECRETS,
  WORKSPACE_SECRET_REDECLARED_AS_NON_SECRET
} from './secrets';

const COLLECTION = 'Inheritance YML';

const WORKSPACE_STAGING_SECRETS = { workspace_api_key: 'api-key-from-workspace-staging' };

const INHERITED_TYPE_LABELS: Array<[string, string]> = [
  ['workspace_base_only', 'string'],
  ['workspace_number', 'number'],
  ['workspace_boolean', 'boolean'],
  ['workspace_object', 'object']
];

const WORKSPACE_VARS_TEST_COUNT = 1;
const COLLECTION_REQUEST_COUNT = 4;

const LEVEL_1 = {
  name: 'shared-inherit-level-1',
  renamedName: 'shared-inherit-level-1-renamed',
  variables: {
    url: { name: 'shared_url', value: 'https://shared.example.com' }
  }
};

const LEVEL_2 = {
  name: 'shared-inherit-level-2',
  copyName: 'shared-inherit-level-2-copy',
  variables: {
    own: { name: 'level_2_only', value: 'value-from-level-2' }
  }
};

test.describe('Workspace environment inheritance', () => {
  test('a workspace environment shows its ancestor rows, with their values and data types', async ({
    pageWithUserData: page
  }) => {
    const { environment, dataTypeSelector } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await openEnvironmentConfigTab(page, 'global');
    await setEnvironmentSecrets(page, 'workspace_base', WORKSPACE_BASE_SECRETS, 'global');
    await openEnvironmentInSettings(page, 'workspace_dev', 'global');

    await expect(environment.inheritedSection()).toBeVisible();
    await expect(environment.inheritedVarValue('workspace_base_only')).toHaveText('from_workspace_base');
    await expect(environment.inheritedVarValue('workspace_host')).toHaveText('http://localhost:8081');

    // An own row of the same name replaces the ancestor's, rather than adding a second row.
    await expect(environment.inheritedVarRow('workspace_overridden')).toHaveCount(0);
    await expect(environment.varRowLine('workspace_overridden')).toHaveText('from_workspace_dev');

    await expect(environment.inheritedVarRow('workspace_disabled')).toHaveCount(0);

    await test.step('An inherited row cannot be edited', async () => {
      await expect(environment.inheritedVarEnabledCheckbox('workspace_base_only')).toBeChecked();
      await expect(environment.inheritedVarEnabledCheckbox('workspace_base_only')).toBeDisabled();
      await expect(environment.inheritedVarEditableFields('workspace_base_only')).toHaveCount(0);
    });

    await test.step('An inherited row carries the data type of the variable it came from', async () => {
      for (const [name, label] of INHERITED_TYPE_LABELS) {
        await expect(environment.inheritedVarDataType(name)).toHaveText(label);
      }

      await expect(environment.inheritedVarValue('workspace_number')).toHaveText('7');
      await expect(environment.inheritedVarValue('workspace_boolean')).toHaveText('true');
      // Object values are pretty-printed over several lines, so match the shape.
      await expect(environment.inheritedVarValue('workspace_object')).toHaveText(/"tier":\s*"free"/);
    });

    await test.step('An own row replaces the inherited data type, not just the value', async () => {
      await expect(environment.inheritedVarRow('workspace_typed_override')).toHaveCount(0);
      await expect(environment.varRowLine('workspace_typed_override')).toHaveText('overridden_in_workspace_dev');
      await expect(
        dataTypeSelector.typeLabel(environment.varRow('workspace_typed_override'))
      ).toHaveAttribute('data-selected-type', 'string');
    });

    await test.step('An inherited secret arrives masked and reveals its ancestor value', async () => {
      await environment.secretsTab().click();
      await expect(environment.inheritedVarValue('workspace_token')).toHaveText(
        '*'.repeat(WORKSPACE_BASE_SECRETS.workspace_token.length)
      );
      await expect(environment.inheritedVarDataType('workspace_secret_object')).toHaveText('object');
      await expect(environment.inheritedVarDataType('workspace_token')).toHaveText('string');
      await expect(environment.inheritedVarValue('workspace_secret_object')).not.toContainText('admin');

      await environment.inheritedVarEyeToggle('workspace_token').click();
      await environment.inheritedVarEyeToggle('workspace_secret_object').click();

      await expect(environment.inheritedVarValue('workspace_token')).toHaveText(
        WORKSPACE_BASE_SECRETS.workspace_token
      );
      await expect(environment.inheritedVarValue('workspace_secret_object')).toHaveText(/"scope":\s*"admin"/);
      await expect(environment.inheritedVarSource('workspace_token')).toHaveAttribute(
        'title',
        'Inherited from workspace_base'
      );
    });

    await closeEnvironmentPanel(page, 'global');
  });

  test('the inherited section collapses, filters with the search, and links to its source', async ({
    pageWithUserData: page
  }) => {
    const { environment } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await openEnvironmentConfigTab(page, 'global');
    await openEnvironmentInSettings(page, 'workspace_dev', 'global');

    await test.step('Collapsing the section hides the inherited rows', async () => {
      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow('workspace_base_only')).toHaveCount(0);

      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow('workspace_base_only')).toBeVisible();
    });

    await test.step('The search filters inherited rows and own rows independently', async () => {
      await searchEnvironmentVariables(page, 'workspace_base_only');
      await expect(environment.inheritedVarRow('workspace_base_only')).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(1)');
      await expect(environment.sectionCount('own')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, 'workspace_dev_only');
      await expect(environment.varRow('workspace_dev_only')).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, 'matches_nothing_at_all');
      await expect(environment.varsNoResults()).toBeVisible();

      await searchEnvironmentVariables(page, '');
      await expect(environment.inheritedVarRow('workspace_base_only')).toBeVisible();
    });

    await test.step('The source arrow opens the environment the row came from', async () => {
      await environment.inheritedVarSource('workspace_base_only').click();

      await expect(environment.detailsTitle()).toHaveText('workspace_base');
      await expect(environment.varRowLine('workspace_base_only')).toHaveText('from_workspace_base');
    });

    await closeEnvironmentPanel(page, 'global');
  });

  test('the source arrow warns about unsaved changes instead of switching environments', async ({
    pageWithUserData: page
  }) => {
    const { environment, modal } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await openEnvironmentConfigTab(page, 'global');
    await openEnvironmentInSettings(page, 'workspace_dev', 'global');

    await setEnvironmentVariableValue(page, 'workspace_overridden', 'edited_but_unsaved');
    await expect(environment.tabCount('variables')).toHaveClass(/unsaved/);

    await environment.inheritedVarSource('workspace_base_only').click();

    await expect(modal.byTitle('Unsaved changes')).toBeVisible();
    await expect(environment.detailsTitle()).toHaveText('workspace_dev');
    await expect(environment.varRowLine('workspace_overridden')).toHaveText('edited_but_unsaved');

    await modal.closeButton().click();
    await environment.resetTab().click();
    await closeEnvironmentPanel(page, 'global');
  });

  test('a request interpolates the workspace variables its environment inherits, as their own data type', async ({
    pageWithUserData: page
  }) => {
    // Two environments are edited and saved before the request goes out.
    test.setTimeout(90000);

    const { response } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await openRequest(page, COLLECTION, 'workspace-vars', { persist: true });
    await seedWorkspaceVarsSecrets(page);
    await selectEnvironment(page, 'workspace_dev', 'global');

    // `workspace_host` carries the echo endpoint and is only defined in `workspace_base`, so the
    // request cannot reach the server at all unless inheritance resolved.
    await sendRequest(page, 200);

    await expectResponseContains(page, [
      'from_workspace_base',
      'from_workspace_dev',
      'workspace_dev_only_value',
      // `workspace_dev` declares this one too, but disabled, so the inherited row still applies.
      'shadowed_from_workspace_base',
      // Disabled in `workspace_base`, so it is never inherited and stays uninterpolated.
      '{{workspace_disabled}}'
    ]);

    await test.step('The request asserts the whole workspace environment it resolved', async () => {
      // `workspace-vars` deep-equals the body it sent against every row `workspace_dev` resolves,
      // typed rows and secrets included — the CLI suite runs the same request and reads that
      // verdict from the exit code.
      await selectResponsePaneTab(page, 'Tests');

      await expect(response.testSummary()).toContainText(
        `Tests (${WORKSPACE_VARS_TEST_COUNT}), Passed: ${WORKSPACE_VARS_TEST_COUNT}, Failed: 0`
      );
      await expect(response.testFailures()).toHaveCount(0);
    });
  });

  test('an inherited workspace secret reaches the request and outranks a plain row of the same name', async ({
    pageWithUserData: page
  }) => {
    // Three environments are edited and saved before either request goes out.
    test.setTimeout(120000);

    await openCollection(page, COLLECTION);
    await openEnvironmentConfigTab(page, 'global');

    await setEnvironmentSecrets(
      page,
      'workspace_base',
      { ...WORKSPACE_BASE_SECRETS, ...WORKSPACE_SECRET_REDECLARED_AS_NON_SECRET },
      'global'
    );
    await setEnvironmentSecrets(page, 'workspace_dev', WORKSPACE_DEV_SECRETS, 'global');
    await setEnvironmentSecrets(page, 'workspace_staging', WORKSPACE_STAGING_SECRETS, 'global');

    await openRequest(page, COLLECTION, 'workspace-vars');
    await closeEnvironmentPanel(page, 'global');

    await test.step('A three-level chain resolves the secrets it inherits from either ancestor', async () => {
      await selectEnvironment(page, 'workspace_qa', 'global');
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      await expectResponseContains(page, [
        WORKSPACE_BASE_SECRETS.workspace_token,
        WORKSPACE_STAGING_SECRETS.workspace_api_key
      ]);
      // `workspace_base` declares `workspace_api_key` plain and `workspace_staging` redeclares it
      // secret, so both are inherited by `workspace_qa` — the secret is the one that must reach the
      // request.
      expect(await getResponseBody(page)).not.toContain('plain_workspace_api_key');
    });

    await test.step('A name inherited as a secret and redeclared as a non-secret resolves to the secret', async () => {
      await selectEnvironment(page, 'workspace_dev', 'global');
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      // `workspace_dev` redeclares the secret `workspace_overridden_secret` it inherits as a
      // non-secret, and the non-secret `workspace_overridden_plain` as a secret. Both ancestor rows
      // survive the redeclaration, and in each pair the secret is the one that reaches the request.
      await expectResponseContains(page, [
        WORKSPACE_SECRET_REDECLARED_AS_NON_SECRET.workspace_overridden_secret,
        WORKSPACE_DEV_SECRETS.workspace_overridden_plain
      ]);
      const body = await getResponseBody(page);
      expect(body).not.toContain('plain_wins_in_workspace_dev');
      expect(body).not.toContain('plain_from_workspace_base');
    });
  });

  test('a script write only overrides an inherited workspace variable when the value differs', async ({
    pageWithUserData: page
  }) => {
    const { environment } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await selectEnvironment(page, 'workspace_scripted', 'global');
    await openRequest(page, COLLECTION, 'set-global-env-var');
    // The request's own URL comes from `workspace_host`, which only the ancestor declares.
    await sendRequest(page, 200);

    await openEnvironmentConfigTab(page, 'global');
    await openEnvironmentInSettings(page, 'workspace_scripted', 'global');

    // The script rewrote `workspace_base_only` with the value it already inherits, so the
    // write is a no-op and the row stays inherited.
    await expect(environment.inheritedVarValue('workspace_base_only')).toHaveText('from_workspace_base');
    await expect(environment.varRow('workspace_base_only')).toHaveCount(0);

    // `workspace_session_id` was written with a different value, so it becomes a row of its own.
    await expect(environment.varRowLine('workspace_session_id')).toHaveText('script_session');
    await expect(environment.inheritedVarRow('workspace_session_id')).toHaveCount(0);

    await closeEnvironmentPanel(page, 'global');
  });

  test('an inherited workspace variable is read-only in the variable tooltip', async ({
    pageWithUserData: page
  }) => {
    const { varInfoPopup } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await selectEnvironment(page, 'workspace_dev', 'global');
    await openRequest(page, COLLECTION, 'workspace-vars');

    const tooltip = await openUrlVarTooltip(page, 'workspace_host');

    await expect(varInfoPopup.name(tooltip)).toHaveText('workspace_host');
    await expect(varInfoPopup.scopeBadge(tooltip)).toHaveText('Global');
    await expect(varInfoPopup.valueDisplay(tooltip)).toContainText('http://localhost:8081');
    await expect(varInfoPopup.readonlyNote(tooltip)).toHaveText('Inherited from workspace_base (read-only)');
    await expect(varInfoPopup.editableValue(tooltip)).toHaveCount(0);
  });

  test('a collection run interpolates the workspace variables the environment inherits', async ({
    pageWithUserData: page
  }) => {
    // Four environments are edited and saved before the run starts.
    test.setTimeout(120000);

    await openCollection(page, COLLECTION);
    await openRequest(page, COLLECTION, 'workspace-vars', { persist: true });
    await seedWorkspaceVarsSecrets(page);
    // The run covers the whole collection, so the collection-scoped requests alongside
    // `workspace-vars` need their own environment — and their own secrets — as well.
    await seedEchoSecrets(page);
    await selectEnvironment(page, 'workspace_dev', 'global');
    await selectEnvironment(page, 'dev');

    await runCollection(page, COLLECTION);

    await validateRunnerResults(page, {
      totalRequests: COLLECTION_REQUEST_COUNT,
      passed: COLLECTION_REQUEST_COUNT,
      failed: 0,
      skipped: 0
    });
  });

  test('a workspace environment records its parent, copies it, and follows the parent rename and delete', async ({
    restartApp,
    workspaceFixturePath
  }) => {
    // Booting a fresh electron and then editing five environments through the UI takes a while.
    test.setTimeout(120000);

    // Workspace ("global") environments are written by their own store, so the collection-scoped
    // lifecycle says nothing about them. Asserting on the files the app writes needs an app bound
    // to *this* test's workspace copy — the shared `pageWithUserData` app binds to whichever test
    // in this file launched it first.
    expect(workspaceFixturePath).not.toBeNull();
    const environmentFile = (name: string) => path.join(workspaceFixturePath!, 'environments', `${name}.yml`);
    const readEnvironmentFile = (name: string) => fs.readFileSync(environmentFile(name), 'utf8');

    const app = await restartApp({});
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    const { environment } = buildCommonLocators(page);

    await openCollection(page, COLLECTION);
    await openEnvironmentConfigTab(page, 'global');

    await test.step('Create a parent and a child workspace environment', async () => {
      await createEnvironment(page, LEVEL_1.name, 'global');
      await addEnvironmentVariables(page, Object.values(LEVEL_1.variables));
      await saveEnvironment(page);

      await createEnvironment(page, LEVEL_2.name, 'global');
      await addEnvironmentVariables(page, Object.values(LEVEL_2.variables));
      await saveEnvironment(page);
    });

    await test.step('Picking a parent writes extends and merges its rows in', async () => {
      await setEnvironmentInheritance(page, LEVEL_1.name);

      await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.name}`);
      await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);
    });

    await test.step('Choosing no environment removes extends again', async () => {
      await setEnvironmentInheritance(page, null);

      await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).not.toContain('extends');
      await expect(environment.inheritedSection()).toHaveCount(0);
    });

    await test.step('A copy of an inheriting environment keeps its parent', async () => {
      await setEnvironmentInheritance(page, LEVEL_1.name);
      await copyEnvironment(page, LEVEL_2.copyName);

      await expect(environment.detailsTitle()).toHaveText(LEVEL_2.copyName);

      await expect.poll(() => fs.existsSync(environmentFile(LEVEL_2.copyName))).toBe(true);
      expect(readEnvironmentFile(LEVEL_2.copyName)).toContain(`extends: ${LEVEL_1.name}`);
    });

    await test.step('Renaming the parent rewrites the references to it', async () => {
      await openEnvironmentInSettings(page, LEVEL_1.name, 'global');
      await renameEnvironment(page, LEVEL_1.renamedName);

      await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.renamedName}`);

      await openEnvironmentInSettings(page, LEVEL_2.name, 'global');
      await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);
    });

    await test.step('Deleting the parent keeps the references to it and warns about them', async () => {
      await openEnvironmentInSettings(page, LEVEL_1.renamedName, 'global');
      await deleteEnvironment(page);

      await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.renamedName}`);

      await openEnvironmentInSettings(page, LEVEL_2.name, 'global');
      await expect(environment.missingInheritedEnvironment()).toContainText(LEVEL_1.renamedName);
      await expect(environment.inheritedSection()).toHaveCount(0);
    });
  });
});
