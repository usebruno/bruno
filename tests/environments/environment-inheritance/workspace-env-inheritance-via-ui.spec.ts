import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import {
  addEnvironmentVariable,
  addEnvironmentVariables,
  addPostResponseScript,
  closeAllCollections,
  closeEnvironmentPanel,
  copyEnvironment,
  createCollection,
  createEnvironment,
  createRequest,
  createWorkspace,
  deleteAllGlobalEnvironments,
  deleteEnvironment,
  disableEnvironmentVariable,
  expectResponseContains,
  getResponseBody,
  openEnvironmentConfigTab,
  openEnvironmentInSettings,
  openRequest,
  openUrlVarTooltip,
  renameEnvironment,
  runCollection,
  saveEnvironment,
  saveRequest,
  searchEnvironmentVariables,
  selectEnvironment,
  selectRequestBodyMode,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest,
  setCodeMirrorEditorValue,
  setEnvironmentInheritance,
  setEnvironmentVariableValue,
  setRequestUrlAndSave,
  validateRunnerResults,
  waitForReadyPage,
  type EnvironmentVariable
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// The workspace ("global") environments this suite asserts on are authored through the app
// itself, so nothing here reads the committed inheritance workspace fixture — a secret gets its
// value as it is typed in, rather than being seeded into the secret store afterwards.

const SCOPE = 'global' as const;

type InheritanceVariable = EnvironmentVariable & { disabled?: boolean };

type EnvironmentDefinition = {
  name: string;
  extends?: string;
  variables: Record<string, InheritanceVariable>;
};

const BASE: EnvironmentDefinition = {
  name: 'workspace_base',
  variables: {
    host: { name: 'workspace_host', value: 'http://localhost:8081' },
    overridden: { name: 'workspace_overridden', value: 'from_workspace_base' },
    baseOnly: { name: 'workspace_base_only', value: 'from_workspace_base' },
    apiKey: { name: 'workspace_api_key', value: 'plain_workspace_api_key' },
    sessionId: { name: 'workspace_session_id', value: 'workspace_base_session' },
    shadowedByDisabled: { name: 'workspace_shadowed_by_disabled', value: 'shadowed_from_workspace_base' },
    overriddenPlain: { name: 'workspace_overridden_plain', value: 'plain_from_workspace_base' },
    number: { name: 'workspace_number', value: '7', dataType: 'number' },
    boolean: { name: 'workspace_boolean', value: 'true', dataType: 'boolean' },
    object: { name: 'workspace_object', value: '{"tier":"free"}', dataType: 'object' },
    typedOverride: { name: 'workspace_typed_override', value: '1', dataType: 'number' },
    disabledInBase: { name: 'workspace_disabled', value: 'should_not_resolve', disabled: true },
    token: { name: 'workspace_token', value: 'token-from-workspace-base', isSecret: true },
    secretObject: {
      name: 'workspace_secret_object',
      value: '{"scope":"admin"}',
      isSecret: true,
      dataType: 'object'
    },
    overriddenSecret: {
      name: 'workspace_overridden_secret',
      value: 'secret-from-workspace-base',
      isSecret: true
    }
  }
};

const DEV: EnvironmentDefinition = {
  name: 'workspace_dev',
  extends: BASE.name,
  variables: {
    overridden: { name: 'workspace_overridden', value: 'from_workspace_dev' },
    devOnly: { name: 'workspace_dev_only', value: 'workspace_dev_only_value' },
    typedOverride: { name: 'workspace_typed_override', value: 'overridden_in_workspace_dev' },
    overriddenSecret: { name: 'workspace_overridden_secret', value: 'plain_wins_in_workspace_dev' },
    shadowedByDisabled: { name: 'workspace_shadowed_by_disabled', value: 'never_applied', disabled: true },
    overriddenPlain: { name: 'workspace_overridden_plain', value: 'secret-from-workspace-dev', isSecret: true }
  }
};

const STAGING: EnvironmentDefinition = {
  name: 'workspace_staging',
  extends: BASE.name,
  variables: {
    apiKey: { name: 'workspace_api_key', value: 'api-key-from-workspace-staging', isSecret: true }
  }
};

const QA: EnvironmentDefinition = {
  name: 'workspace_qa',
  extends: STAGING.name,
  variables: {
    overridden: { name: 'workspace_overridden', value: 'from_workspace_qa' }
  }
};

const SCRIPTED: EnvironmentDefinition = {
  name: 'workspace_scripted',
  extends: BASE.name,
  variables: {
    own: { name: 'workspace_scripted_only', value: 'workspace_scripted_only_value' }
  }
};

const WORKSPACE_VARS_REQUEST = { name: 'workspace-vars', method: 'POST', url: '{{workspace_host}}/api/echo/everything' };
const SET_GLOBAL_ENV_VAR_REQUEST = { name: 'set-global-env-var', url: '{{workspace_host}}/ping' };
const PING_REQUEST = { name: 'ping', url: '{{workspace_host}}/ping' };

// The typed rows are interpolated unquoted, so they only parse back as a number, boolean and
// object if their data type survived the merge.
const WORKSPACE_VARS_BODY = `{
  "workspace_overridden": "{{workspace_overridden}}",
  "workspace_base_only": "{{workspace_base_only}}",
  "workspace_dev_only": "{{workspace_dev_only}}",
  "workspace_disabled": "{{workspace_disabled}}",
  "workspace_shadowed_by_disabled": "{{workspace_shadowed_by_disabled}}",
  "workspace_number": {{workspace_number}},
  "workspace_boolean": {{workspace_boolean}},
  "workspace_object": {{workspace_object}},
  "workspace_typed_override": "{{workspace_typed_override}}",
  "workspace_token": "{{workspace_token}}",
  "workspace_api_key": "{{workspace_api_key}}",
  "workspace_overridden_plain": "{{workspace_overridden_plain}}",
  "workspace_overridden_secret": "{{workspace_overridden_secret}}"
}`;

const WORKSPACE_VARS_TESTS = `// The echo endpoint hands the request body back as a raw string.
const sent = () => JSON.parse(res.getBody().body);

test("every kind of row the workspace environment inherits resolves under workspace_dev", function() {
  expect(sent()).to.eql({
    workspace_overridden: "from_workspace_dev",
    workspace_base_only: "from_workspace_base",
    workspace_dev_only: "workspace_dev_only_value",
    // Disabled in \`workspace_base\`, so it is never inherited and stays uninterpolated.
    workspace_disabled: "{{workspace_disabled}}",
    // \`workspace_dev\` declares this one too, but disabled, so the inherited row still applies.
    workspace_shadowed_by_disabled: "shadowed_from_workspace_base",
    workspace_api_key: "plain_workspace_api_key",
    workspace_number: 7,
    workspace_boolean: true,
    workspace_object: { tier: "free" },
    // An own row replaces the data type it inherited, not just the value.
    workspace_typed_override: "overridden_in_workspace_dev",
    workspace_token: "token-from-workspace-base",
    // In each redeclared pair the secret is the one that reaches the request.
    workspace_overridden_plain: "secret-from-workspace-dev",
    workspace_overridden_secret: "secret-from-workspace-base"
  });
});`;

const SET_GLOBAL_ENV_VAR_SCRIPT = [
  `bru.setGlobalEnvVar('${BASE.variables.baseOnly.name}', '${BASE.variables.baseOnly.value}');`,
  `bru.setGlobalEnvVar('${BASE.variables.sessionId.name}', 'script_session');`
].join('\n');

const INHERITED_TYPE_LABELS: Array<[string, string]> = [
  [BASE.variables.baseOnly.name, 'string'],
  [BASE.variables.number.name, 'number'],
  [BASE.variables.boolean.name, 'boolean'],
  [BASE.variables.object.name, 'object']
];

const WORKSPACE_VARS_TEST_COUNT = 1;

/**
 * Create a workspace environment, fill in its rows, disable the ones declared disabled, and
 * point it at the environment it inherits from.
 */
const createEnvironmentFromDefinition = async (page: Page, environment: EnvironmentDefinition) => {
  await test.step(`Create workspace environment "${environment.name}"`, async () => {
    const { environment: locators } = buildCommonLocators(page);
    const variables = Object.values(environment.variables);

    await createEnvironment(page, environment.name, SCOPE);
    await addEnvironmentVariables(page, variables);

    const disabledVariables = variables.filter((variable) => variable.disabled);
    if (disabledVariables.length) {
      // The last row added may have landed on the Secrets tab; every disabled row is a plain one.
      await locators.variablesTab().click();
      for (const variable of disabledVariables) {
        await disableEnvironmentVariable(page, variable.name);
      }
    }

    await saveEnvironment(page);

    if (environment.extends) {
      await setEnvironmentInheritance(page, environment.extends);
    }
  });
};

/**
 * Create the collection the workspace environments are exercised from — the environment
 * selector lives in the collection header — and then the environment chain, in the order the
 * definitions are listed: a parent has to exist before the environment extending it is created.
 */
const createCollectionWithEnvironments = async (
  page: Page,
  collectionName: string,
  collectionsDir: string,
  environments: EnvironmentDefinition[]
) => {
  await createCollection(page, collectionName, collectionsDir);
  for (const environment of environments) {
    await createEnvironmentFromDefinition(page, environment);
  }
};

/**
 * Create a request in the collection, open it as a permanent tab, and point it at its URL.
 */
const createRequestForUrl = async (
  page: Page,
  collectionName: string,
  request: { name: string; method?: string; url: string }
) => {
  await createRequest(page, request.name, collectionName, { method: request.method });
  await openRequest(page, collectionName, request.name, { persist: true });
  await setRequestUrlAndSave(page, request.url);
};

/**
 * Create the request that echoes every row its workspace environment resolves and asserts the
 * whole resolved environment in its tests.
 */
const createWorkspaceVarsRequest = async (page: Page, collectionName: string) => {
  await test.step(`Create request "${WORKSPACE_VARS_REQUEST.name}"`, async () => {
    await createRequestForUrl(page, collectionName, WORKSPACE_VARS_REQUEST);

    await selectRequestBodyMode(page, 'JSON');
    await setCodeMirrorEditorValue(page, 'request-body-editor', WORKSPACE_VARS_BODY);

    await selectRequestPaneTab(page, 'Tests');
    await setCodeMirrorEditorValue(page, 'test-script-editor', WORKSPACE_VARS_TESTS);

    await saveRequest(page);
  });
};

/**
 * Create the request whose post-response script writes to the selected workspace environment —
 * once with the value that environment already inherits, once with a different one.
 */
const createSetGlobalEnvVarRequest = async (page: Page, collectionName: string) => {
  await test.step(`Create request "${SET_GLOBAL_ENV_VAR_REQUEST.name}"`, async () => {
    await createRequestForUrl(page, collectionName, SET_GLOBAL_ENV_VAR_REQUEST);
    await addPostResponseScript(page, SET_GLOBAL_ENV_VAR_SCRIPT);
    await saveRequest(page);
  });
};

test.describe.configure({ timeout: 180_000 });

test.describe('Workspace environment inheritance, authored in the app', () => {
  // Workspace environments outlive a collection, so they have to be cleared before the next test
  // authors the same chain again. Tests leave a tab open on purpose: the selector this cleanup
  // goes through lives in the collection header, which is gone once nothing is open.
  test.afterEach(async ({ page }) => {
    if (page.isClosed()) {
      return;
    }
    await deleteAllGlobalEnvironments(page);
    await closeAllCollections(page);
  });

  test('a workspace environment shows its ancestor rows, with their values and data types', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Rows';
    const { environment, dataTypeSelector } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-rows'), [
      BASE,
      DEV
    ]);
    await openEnvironmentInSettings(page, DEV.name, SCOPE);

    await expect(environment.inheritedSection()).toBeVisible();
    await expect(environment.inheritedVarValue(BASE.variables.baseOnly.name)).toHaveText(
      BASE.variables.baseOnly.value
    );
    await expect(environment.inheritedVarValue(BASE.variables.host.name)).toHaveText(BASE.variables.host.value);

    // An own row of the same name replaces the ancestor's, rather than adding a second row.
    await expect(environment.inheritedVarRow(DEV.variables.overridden.name)).toHaveCount(0);
    await expect(environment.varRowLine(DEV.variables.overridden.name)).toHaveText(DEV.variables.overridden.value);

    await expect(environment.inheritedVarRow(BASE.variables.disabledInBase.name)).toHaveCount(0);

    await test.step('An inherited row cannot be edited', async () => {
      await expect(environment.inheritedVarEnabledCheckbox(BASE.variables.baseOnly.name)).toBeChecked();
      await expect(environment.inheritedVarEnabledCheckbox(BASE.variables.baseOnly.name)).toBeDisabled();
      await expect(environment.inheritedVarEditableFields(BASE.variables.baseOnly.name)).toHaveCount(0);
    });

    await test.step('An inherited row carries the data type of the variable it came from', async () => {
      for (const [name, label] of INHERITED_TYPE_LABELS) {
        await expect(environment.inheritedVarDataType(name)).toHaveText(label);
      }

      await expect(environment.inheritedVarValue(BASE.variables.number.name)).toHaveText(BASE.variables.number.value);
      await expect(environment.inheritedVarValue(BASE.variables.boolean.name)).toHaveText(BASE.variables.boolean.value);
      // Object values are pretty-printed over several lines, so match the shape.
      await expect(environment.inheritedVarValue(BASE.variables.object.name)).toHaveText(/"tier":\s*"free"/);
    });

    await test.step('An own row replaces the inherited data type, not just the value', async () => {
      await expect(environment.inheritedVarRow(DEV.variables.typedOverride.name)).toHaveCount(0);
      await expect(environment.varRowLine(DEV.variables.typedOverride.name)).toHaveText(
        DEV.variables.typedOverride.value
      );
      await expect(
        dataTypeSelector.typeLabel(environment.varRow(DEV.variables.typedOverride.name))
      ).toHaveAttribute('data-selected-type', 'string');
    });

    await test.step('An inherited secret arrives masked and reveals its ancestor value', async () => {
      await environment.secretsTab().click();
      await expect(environment.inheritedVarValue(BASE.variables.token.name)).toHaveText(
        '*'.repeat(BASE.variables.token.value.length)
      );
      await expect(environment.inheritedVarDataType(BASE.variables.secretObject.name)).toHaveText('object');
      await expect(environment.inheritedVarDataType(BASE.variables.token.name)).toHaveText('string');
      await expect(environment.inheritedVarValue(BASE.variables.secretObject.name)).not.toContainText('admin');

      await environment.inheritedVarEyeToggle(BASE.variables.token.name).click();
      await environment.inheritedVarEyeToggle(BASE.variables.secretObject.name).click();

      await expect(environment.inheritedVarValue(BASE.variables.token.name)).toHaveText(BASE.variables.token.value);
      await expect(environment.inheritedVarValue(BASE.variables.secretObject.name)).toHaveText(/"scope":\s*"admin"/);
      await expect(environment.inheritedVarSource(BASE.variables.token.name)).toHaveAttribute(
        'title',
        `Inherited from ${BASE.name}`
      );
    });
  });

  test('the inherited section collapses, filters with the search, and links to its source', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Section';
    const { environment } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-section'), [
      BASE,
      DEV
    ]);
    await openEnvironmentInSettings(page, DEV.name, SCOPE);

    await test.step('Collapsing the section hides the inherited rows', async () => {
      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow(BASE.variables.baseOnly.name)).toHaveCount(0);

      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow(BASE.variables.baseOnly.name)).toBeVisible();
    });

    await test.step('The search filters inherited rows and own rows independently', async () => {
      await searchEnvironmentVariables(page, BASE.variables.baseOnly.name);
      await expect(environment.inheritedVarRow(BASE.variables.baseOnly.name)).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(1)');
      await expect(environment.sectionCount('own')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, DEV.variables.devOnly.name);
      await expect(environment.varRow(DEV.variables.devOnly.name)).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, 'matches_nothing_at_all');
      await expect(environment.varsNoResults()).toBeVisible();

      await searchEnvironmentVariables(page, '');
      await expect(environment.inheritedVarRow(BASE.variables.baseOnly.name)).toBeVisible();
    });

    await test.step('The source arrow opens the environment the row came from', async () => {
      await environment.inheritedVarSource(BASE.variables.baseOnly.name).click();

      await expect(environment.detailsTitle()).toHaveText(BASE.name);
      await expect(environment.varRowLine(BASE.variables.baseOnly.name)).toHaveText(BASE.variables.baseOnly.value);
    });
  });

  test('the source arrow warns about unsaved changes instead of switching environments', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Source Guard';
    const { environment, modal } = buildCommonLocators(page);

    await createCollectionWithEnvironments(
      page,
      collectionName,
      await createTmpDir('workspace-inherited-source-guard'),
      [BASE, DEV]
    );
    await openEnvironmentInSettings(page, DEV.name, SCOPE);

    await setEnvironmentVariableValue(page, DEV.variables.overridden.name, 'edited_but_unsaved');
    await expect(environment.tabCount('variables')).toHaveClass(/unsaved/);

    await environment.inheritedVarSource(BASE.variables.baseOnly.name).click();

    await expect(modal.byTitle('Unsaved changes')).toBeVisible();
    await expect(environment.detailsTitle()).toHaveText(DEV.name);
    await expect(environment.varRowLine(DEV.variables.overridden.name)).toHaveText('edited_but_unsaved');

    await modal.closeButton().click();
    await environment.resetTab().click();
  });

  test('a request interpolates the workspace variables its environment inherits, as their own data type', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Request';
    const { response } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-request'), [
      BASE,
      DEV
    ]);
    await createWorkspaceVarsRequest(page, collectionName);
    await selectEnvironment(page, DEV.name, SCOPE);

    // `workspace_host` carries the echo endpoint and is only defined in `workspace_base`, so the
    // request cannot reach the server at all unless inheritance resolved.
    await sendRequest(page, 200);

    await expectResponseContains(page, [
      BASE.variables.baseOnly.value,
      DEV.variables.overridden.value,
      DEV.variables.devOnly.value,
      // `workspace_dev` declares this one too, but disabled, so the inherited row still applies.
      BASE.variables.shadowedByDisabled.value,
      // Disabled in `workspace_base`, so it is never inherited and stays uninterpolated.
      `{{${BASE.variables.disabledInBase.name}}}`
    ]);

    await test.step('The request asserts the whole workspace environment it resolved', async () => {
      await selectResponsePaneTab(page, 'Tests');

      await expect(response.testSummary()).toContainText(
        `Tests (${WORKSPACE_VARS_TEST_COUNT}), Passed: ${WORKSPACE_VARS_TEST_COUNT}, Failed: 0`
      );
      await expect(response.testFailures()).toHaveCount(0);
    });
  });

  test('an inherited workspace secret reaches the request and outranks a plain row of the same name', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Secrets';

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-secrets'), [
      BASE,
      DEV,
      STAGING,
      QA
    ]);
    await createWorkspaceVarsRequest(page, collectionName);

    await test.step('A three-level chain resolves the secrets it inherits from either ancestor', async () => {
      await selectEnvironment(page, QA.name, SCOPE);
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      await expectResponseContains(page, [BASE.variables.token.value, STAGING.variables.apiKey.value]);
      // `workspace_base` declares `workspace_api_key` plain and `workspace_staging` redeclares it
      // secret, so both are inherited by `workspace_qa` — the secret is the one that must reach the
      // request.
      expect(await getResponseBody(page)).not.toContain(BASE.variables.apiKey.value);
    });

    await test.step('A name inherited as a secret and redeclared as a non-secret resolves to the secret', async () => {
      await selectEnvironment(page, DEV.name, SCOPE);
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      // `workspace_dev` redeclares the secret `workspace_overridden_secret` it inherits as a
      // non-secret, and the non-secret `workspace_overridden_plain` as a secret. Both ancestor rows
      // survive the redeclaration, and in each pair the secret is the one that reaches the request.
      await expectResponseContains(page, [
        BASE.variables.overriddenSecret.value,
        DEV.variables.overriddenPlain.value
      ]);
      const body = await getResponseBody(page);
      expect(body).not.toContain(DEV.variables.overriddenSecret.value);
      expect(body).not.toContain(BASE.variables.overriddenPlain.value);
    });
  });

  test('a script write only overrides an inherited workspace variable when the value differs', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Script Write';
    const { environment } = buildCommonLocators(page);

    await createCollectionWithEnvironments(
      page,
      collectionName,
      await createTmpDir('workspace-inherited-script-write'),
      [BASE, SCRIPTED]
    );
    await createSetGlobalEnvVarRequest(page, collectionName);
    await selectEnvironment(page, SCRIPTED.name, SCOPE);
    // The request's own URL comes from `workspace_host`, which only the ancestor declares.
    await sendRequest(page, 200);

    await openEnvironmentConfigTab(page, SCOPE);
    await openEnvironmentInSettings(page, SCRIPTED.name, SCOPE);

    // The script rewrote `workspace_base_only` with the value it already inherits, so the write is
    // a no-op and the row stays inherited.
    await expect(environment.inheritedVarValue(BASE.variables.baseOnly.name)).toHaveText(
      BASE.variables.baseOnly.value
    );
    await expect(environment.varRow(BASE.variables.baseOnly.name)).toHaveCount(0);

    // `workspace_session_id` was written with a different value, so it becomes a row of its own.
    await expect(environment.varRowLine(BASE.variables.sessionId.name)).toHaveText('script_session');
    await expect(environment.inheritedVarRow(BASE.variables.sessionId.name)).toHaveCount(0);

    await closeEnvironmentPanel(page, SCOPE);
  });

  test('an inherited workspace variable is read-only in the variable tooltip', async ({ page, createTmpDir }) => {
    const collectionName = 'Workspace Inherited Tooltip';
    const { varInfoPopup } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-tooltip'), [
      BASE,
      DEV
    ]);
    await createRequestForUrl(page, collectionName, PING_REQUEST);
    await selectEnvironment(page, DEV.name, SCOPE);

    const tooltip = await openUrlVarTooltip(page, BASE.variables.host.name);

    await expect(varInfoPopup.name(tooltip)).toHaveText(BASE.variables.host.name);
    await expect(varInfoPopup.scopeBadge(tooltip)).toHaveText('Global');
    await expect(varInfoPopup.valueDisplay(tooltip)).toContainText(BASE.variables.host.value);
    await expect(varInfoPopup.readonlyNote(tooltip)).toHaveText(`Inherited from ${BASE.name} (read-only)`);
    await expect(varInfoPopup.editableValue(tooltip)).toHaveCount(0);
  });

  test('a collection run interpolates the workspace variables the environment inherits', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Workspace Inherited Runner';

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('workspace-inherited-runner'), [
      BASE,
      DEV
    ]);
    await createWorkspaceVarsRequest(page, collectionName);
    await selectEnvironment(page, DEV.name, SCOPE);

    await runCollection(page, collectionName);

    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });
});

const WORKSPACE = 'Inheritance UI Workspace';
const LIFECYCLE_COLLECTION = 'Inheritance UI Collection';
// The app's own workspace, which it creates in the same location.
const DEFAULT_WORKSPACE_DIRECTORY = 'default-workspace';

type SavedVariable = { name: string; value?: unknown; secret?: boolean; disabled?: boolean };
type SavedEnvironment = { name: string; extends?: string; variables?: SavedVariable[] };

const LEVEL_1 = {
  name: 'ui-workspace-level-1',
  renamedName: 'ui-workspace-level-1-renamed',
  variables: {
    url: { name: 'shared_workspace_url', value: 'https://workspace-level-1.example.com' },
    region: { name: 'workspace_level_1_region', value: 'region-from-workspace-level-1' },
    count: { name: 'workspace_level_1_count', value: '3', dataType: 'number' as const },
    token: { name: 'workspace_level_1_token', value: 'token-from-workspace-level-1', isSecret: true }
  }
};

const LEVEL_2 = {
  name: 'ui-workspace-level-2',
  copyName: 'ui-workspace-level-2-copy',
  variables: {
    own: { name: 'workspace_level_2_only', value: 'value-from-workspace-level-2' }
  },
  // Typed in after the chain is built, redeclaring level 1's names to retire the inherited twins.
  overrides: {
    region: { name: LEVEL_1.variables.region.name, value: 'region-from-workspace-level-2' },
    // Redeclared without a data type, so the number it inherits has to give way to a string.
    count: { name: LEVEL_1.variables.count.name, value: 'recounted-in-workspace-level-2' },
    token: { name: LEVEL_1.variables.token.name, value: 'token-from-workspace-level-2', isSecret: true }
  }
};

const savedVariableNames = (environment: SavedEnvironment) =>
  (environment.variables ?? []).map((variable) => variable.name).sort();

const savedVariable = (environment: SavedEnvironment, name: string) =>
  (environment.variables ?? []).find((variable) => variable.name === name);

/**
 * The directory the app created for the workspace, found by the workspace file it holds.
 */
const workspaceDirectory = (workspacesLocation: string) => {
  const directories = fs
    .readdirSync(workspacesLocation)
    .filter((entry) => entry !== DEFAULT_WORKSPACE_DIRECTORY)
    .filter((entry) => fs.existsSync(path.join(workspacesLocation, entry, 'workspace.yml')));

  expect(directories).toHaveLength(1);
  return path.join(workspacesLocation, directories[0]);
};

/**
 * Launch the app against a temp workspaces location, create a workspace in it, and open a
 * collection — the environment selector lives in the collection header, so workspace
 * environments can only be reached with one open.
 */
const launchWithWorkspace = async (
  launchElectronApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>,
  createTmpDir: (tag?: string) => Promise<string>,
  tag: string
) => {
  const workspacesLocation = await createTmpDir(`${tag}-workspaces`);
  const initUserDataPath = await createTmpDir(`${tag}-user-data`);
  fs.writeFileSync(
    path.join(initUserDataPath, 'preferences.json'),
    JSON.stringify({ preferences: { general: { defaultLocation: workspacesLocation } } }, null, 2)
  );

  const app = await launchElectronApp({ initUserDataPath });
  const page = await waitForReadyPage(app);

  await createWorkspace(page, WORKSPACE);
  await createCollection(page, LIFECYCLE_COLLECTION, await createTmpDir(`${tag}-collection`));

  return { app, page, workspacePath: workspaceDirectory(workspacesLocation) };
};

/**
 * Create a populated level 1 workspace environment and a level 2 that inherits nothing yet,
 * leaving the latter open in the environment settings tab.
 */
const createTwoLevelChain = async (page: Page) => {
  await createEnvironment(page, LEVEL_1.name, SCOPE);
  await addEnvironmentVariables(page, Object.values(LEVEL_1.variables));
  await saveEnvironment(page);

  await createEnvironment(page, LEVEL_2.name, SCOPE);
  await addEnvironmentVariables(page, Object.values(LEVEL_2.variables));
  await saveEnvironment(page);
};

test.describe('Workspace environment inheritance lifecycle, authored in the app', () => {
  test('a workspace environment records its parent, copies it, and follows the parent rename and delete', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const { app, page, workspacePath } = await launchWithWorkspace(
      launchElectronApp,
      createTmpDir,
      'workspace-lifecycle-ui'
    );
    const { environment } = buildCommonLocators(page);
    const environmentFile = (name: string) => path.join(workspacePath, 'environments', `${name}.yml`);
    const readEnvironment = (name: string) =>
      yaml.load(fs.readFileSync(environmentFile(name), 'utf8')) as SavedEnvironment;

    await test.step('Create a parent and a child workspace environment', async () => {
      await createTwoLevelChain(page);
    });

    await test.step('Picking a parent writes extends and merges its rows in', async () => {
      await setEnvironmentInheritance(page, LEVEL_1.name);

      await expect.poll(() => readEnvironment(LEVEL_2.name).extends).toBe(LEVEL_1.name);
      await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);

      // The rows arrived from the parent rather than from an edit, so the tab stays saved.
      await expect(environment.tabCount('variables')).not.toHaveClass(/unsaved/);
    });

    await test.step('Choosing no environment removes extends again', async () => {
      await setEnvironmentInheritance(page, null);

      await expect.poll(() => readEnvironment(LEVEL_2.name).extends).toBeUndefined();
      await expect(environment.inheritedSection()).toHaveCount(0);
    });

    await test.step('A copy of an inheriting environment keeps its parent', async () => {
      await setEnvironmentInheritance(page, LEVEL_1.name);
      await copyEnvironment(page, LEVEL_2.copyName);

      await expect(environment.detailsTitle()).toHaveText(LEVEL_2.copyName);

      await expect.poll(() => fs.existsSync(environmentFile(LEVEL_2.copyName))).toBe(true);
      expect(readEnvironment(LEVEL_2.copyName).extends).toBe(LEVEL_1.name);
    });

    await test.step('Renaming the parent rewrites the references to it', async () => {
      await openEnvironmentInSettings(page, LEVEL_1.name, SCOPE);
      await renameEnvironment(page, LEVEL_1.renamedName);

      await expect.poll(() => readEnvironment(LEVEL_2.name).extends).toBe(LEVEL_1.renamedName);

      await openEnvironmentInSettings(page, LEVEL_2.name, SCOPE);
      await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);
    });

    await test.step('Deleting the parent keeps the references to it and warns about them', async () => {
      await openEnvironmentInSettings(page, LEVEL_1.renamedName, SCOPE);
      await deleteEnvironment(page);

      await expect.poll(() => readEnvironment(LEVEL_2.name).extends).toBe(LEVEL_1.renamedName);

      await openEnvironmentInSettings(page, LEVEL_2.name, SCOPE);
      await expect(environment.missingInheritedEnvironment()).toContainText(LEVEL_1.renamedName);
      await expect(environment.inheritedSection()).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('an own row overwrites the workspace variable it inherits, and only own rows reach the file', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const { app, page, workspacePath } = await launchWithWorkspace(
      launchElectronApp,
      createTmpDir,
      'workspace-overwrite-ui'
    );
    const { environment } = buildCommonLocators(page);
    const readEnvironment = (name: string) =>
      yaml.load(fs.readFileSync(path.join(workspacePath, 'environments', `${name}.yml`), 'utf8')) as SavedEnvironment;

    await createTwoLevelChain(page);
    await setEnvironmentInheritance(page, LEVEL_1.name);

    await test.step('The inherited rows carry the parent values until an own row redeclares them', async () => {
      await expect(environment.inheritedVarValue(LEVEL_2.overrides.region.name)).toHaveText(
        LEVEL_1.variables.region.value
      );
      await expect(environment.inheritedVarDataType(LEVEL_2.overrides.count.name)).toHaveText('number');
    });

    await test.step('Typing an own row of the same name retires the inherited twin', async () => {
      await addEnvironmentVariable(page, LEVEL_2.overrides.region);
      await addEnvironmentVariable(page, LEVEL_2.overrides.count);

      for (const override of [LEVEL_2.overrides.region, LEVEL_2.overrides.count]) {
        await expect(environment.inheritedVarRow(override.name)).toHaveCount(0);
        await expect(environment.varRowLine(override.name)).toHaveText(override.value);
      }
    });

    await test.step('Saving the tab writes the own rows and leaves the inherited ones behind', async () => {
      await environment.saveTab().click();

      await expect
        .poll(() => savedVariableNames(readEnvironment(LEVEL_2.name)))
        .toContain(LEVEL_2.overrides.region.name);

      const saved = readEnvironment(LEVEL_2.name);
      expect(saved.extends).toBe(LEVEL_1.name);
      expect(savedVariableNames(saved)).toEqual(
        [LEVEL_2.variables.own.name, LEVEL_2.overrides.region.name, LEVEL_2.overrides.count.name].sort()
      );
      expect(savedVariable(saved, LEVEL_2.overrides.region.name)?.value).toBe(LEVEL_2.overrides.region.value);
      // Redeclared as a plain string, so the parent's number type is gone from the file too.
      expect(savedVariable(saved, LEVEL_2.overrides.count.name)?.value).toBe(LEVEL_2.overrides.count.value);
    });

    await test.step('Save all writes the own secret and still leaves the inherited ones behind', async () => {
      await environment.secretsTab().click();
      await expect(environment.inheritedVarRow(LEVEL_2.overrides.token.name)).toBeVisible();

      await addEnvironmentVariable(page, LEVEL_2.overrides.token);
      await expect(environment.inheritedVarRow(LEVEL_2.overrides.token.name)).toHaveCount(0);

      await environment.saveAll().click();

      await expect
        .poll(() => savedVariableNames(readEnvironment(LEVEL_2.name)))
        .toContain(LEVEL_2.overrides.token.name);

      const saved = readEnvironment(LEVEL_2.name);
      expect(savedVariableNames(saved)).toEqual(
        [
          LEVEL_2.variables.own.name,
          LEVEL_2.overrides.region.name,
          LEVEL_2.overrides.count.name,
          LEVEL_2.overrides.token.name
        ].sort()
      );
      // A secret's value never reaches the file, whether it is inherited or own.
      expect(savedVariable(saved, LEVEL_2.overrides.token.name)?.secret).toBe(true);
      expect(savedVariable(saved, LEVEL_2.overrides.token.name)?.value).toBeUndefined();
      // Rows only the parent declares stay in the parent file.
      expect(savedVariableNames(saved)).not.toContain(LEVEL_1.variables.url.name);
    });

    await test.step('The parent keeps the values its child overwrote', async () => {
      const parent = readEnvironment(LEVEL_1.name);

      expect(parent.extends).toBeUndefined();
      expect(savedVariable(parent, LEVEL_1.variables.region.name)?.value).toBe(LEVEL_1.variables.region.value);
      expect(savedVariable(parent, LEVEL_1.variables.url.name)?.value).toBe(LEVEL_1.variables.url.value);
    });

    await closeElectronApp(app);
  });
});
