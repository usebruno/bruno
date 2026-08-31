import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { test, expect, Page } from '../../../playwright';
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
  type EnvironmentVariable
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// Every environment, variable and request this suite asserts on is authored through the app
// itself, so nothing here reads the committed inheritance workspace fixture — a secret gets
// its value as it is typed in, rather than being seeded into the secret store afterwards.

type InheritanceVariable = EnvironmentVariable & { disabled?: boolean };

type EnvironmentDefinition = {
  name: string;
  extends?: string;
  variables: Record<string, InheritanceVariable>;
};

const BASE: EnvironmentDefinition = {
  name: 'base',
  variables: {
    host: { name: 'host', value: 'http://localhost:8081' },
    apiUrl: { name: 'api_url', value: 'https://base.example.com' },
    baseOnly: { name: 'base_only', value: 'base_only_value' },
    apiKey: { name: 'api_key', value: 'plain_api_key' },
    sessionId: { name: 'session_id', value: 'base_session' },
    shadowedByDisabled: { name: 'shadowed_by_disabled', value: 'from_base' },
    overriddenPlain: { name: 'overridden_plain', value: 'plain_from_base' },
    number: { name: 'base_number', value: '42', dataType: 'number' },
    boolean: { name: 'base_boolean', value: 'true', dataType: 'boolean' },
    object: { name: 'base_object', value: '{"region":"eu"}', dataType: 'object' },
    typedOverride: { name: 'typed_override', value: '1', dataType: 'number' },
    disabledInBase: { name: 'disabled_in_base', value: 'should_not_resolve', disabled: true },
    token: { name: 'base_token', value: 'token-from-base', isSecret: true },
    secretObject: { name: 'base_secret_object', value: '{"scope":"admin"}', isSecret: true, dataType: 'object' },
    overriddenSecret: { name: 'overridden_secret', value: 'secret-from-base', isSecret: true }
  }
};

const DEV: EnvironmentDefinition = {
  name: 'dev',
  extends: BASE.name,
  variables: {
    apiUrl: { name: 'api_url', value: 'https://dev.example.com' },
    devOnly: { name: 'dev_only', value: 'dev_only_value' },
    typedOverride: { name: 'typed_override', value: 'overridden_in_dev' },
    overriddenSecret: { name: 'overridden_secret', value: 'plain_wins_in_dev' },
    shadowedByDisabled: { name: 'shadowed_by_disabled', value: 'never_applied', disabled: true },
    overriddenPlain: { name: 'overridden_plain', value: 'secret-from-dev', isSecret: true }
  }
};

const STAGING: EnvironmentDefinition = {
  name: 'staging',
  extends: BASE.name,
  variables: {
    apiKey: { name: 'api_key', value: 'api-key-from-staging', isSecret: true }
  }
};

const QA: EnvironmentDefinition = {
  name: 'qa',
  extends: STAGING.name,
  variables: {
    apiUrl: { name: 'api_url', value: 'https://qa.example.com' }
  }
};

const SCRIPTED: EnvironmentDefinition = {
  name: 'scripted',
  extends: BASE.name,
  variables: {
    own: { name: 'scripted_only', value: 'scripted_only_value' }
  }
};

const ECHO_REQUEST = { name: 'echo', method: 'POST', url: '{{host}}/api/echo/everything' };
const SET_ENV_VAR_REQUEST = { name: 'set-env-var', url: '{{host}}/ping' };
const PING_REQUEST = { name: 'ping', url: '{{host}}/ping' };

// The typed rows are interpolated unquoted, so they only parse back as a number, boolean and
// object if their data type survived the merge.
const ECHO_BODY = `{
  "api_url": "{{api_url}}",
  "base_only": "{{base_only}}",
  "dev_only": "{{dev_only}}",
  "disabled_in_base": "{{disabled_in_base}}",
  "shadowed_by_disabled": "{{shadowed_by_disabled}}",
  "base_number": {{base_number}},
  "base_boolean": {{base_boolean}},
  "base_object": {{base_object}},
  "typed_override": "{{typed_override}}",
  "base_token": "{{base_token}}",
  "api_key": "{{api_key}}",
  "overridden_plain": "{{overridden_plain}}",
  "overridden_secret": "{{overridden_secret}}"
}`;

const ECHO_TESTS = `// The echo endpoint hands the request body back as a raw string.
const sent = () => JSON.parse(res.getBody().body);

test("every kind of row the environment inherits resolves under dev", function() {
  expect(sent()).to.eql({
    api_url: "https://dev.example.com",
    base_only: "base_only_value",
    dev_only: "dev_only_value",
    // Disabled in \`base\`, so it is never inherited and stays uninterpolated.
    disabled_in_base: "{{disabled_in_base}}",
    // \`dev\` declares this one too, but disabled, so the inherited row still applies.
    shadowed_by_disabled: "from_base",
    api_key: "plain_api_key",
    base_number: 42,
    base_boolean: true,
    base_object: { region: "eu" },
    // An own row replaces the data type it inherited, not just the value.
    typed_override: "overridden_in_dev",
    base_token: "token-from-base",
    // In each redeclared pair the secret is the one that reaches the request.
    overridden_plain: "secret-from-dev",
    overridden_secret: "secret-from-base"
  });
});`;

const SET_ENV_VAR_SCRIPT = [
  `bru.setEnvVar('${BASE.variables.baseOnly.name}', '${BASE.variables.baseOnly.value}');`,
  `bru.setEnvVar('${BASE.variables.sessionId.name}', 'script_session');`
].join('\n');

const INHERITED_TYPE_LABELS: Array<[string, string]> = [
  [BASE.variables.baseOnly.name, 'string'],
  [BASE.variables.number.name, 'number'],
  [BASE.variables.boolean.name, 'boolean'],
  [BASE.variables.object.name, 'object']
];

const ECHO_TEST_COUNT = 1;

/**
 * Create an environment, fill in its rows, disable the ones declared disabled, and point it at
 * the environment it inherits from.
 */
const createEnvironmentFromDefinition = async (page: Page, environment: EnvironmentDefinition) => {
  await test.step(`Create environment "${environment.name}"`, async () => {
    const { environment: locators } = buildCommonLocators(page);
    const variables = Object.values(environment.variables);

    await createEnvironment(page, environment.name);
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
 * Create a collection holding the given environment chain, in the order the definitions are
 * listed — a parent has to exist before the environment extending it is created.
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
 * Create the request that echoes every row its environment resolves and asserts the whole
 * resolved environment in its tests.
 */
const createEchoRequest = async (page: Page, collectionName: string) => {
  await test.step(`Create request "${ECHO_REQUEST.name}"`, async () => {
    await createRequestForUrl(page, collectionName, ECHO_REQUEST);

    await selectRequestBodyMode(page, 'JSON');
    await setCodeMirrorEditorValue(page, 'request-body-editor', ECHO_BODY);

    await selectRequestPaneTab(page, 'Tests');
    await setCodeMirrorEditorValue(page, 'test-script-editor', ECHO_TESTS);

    await saveRequest(page);
  });
};

/**
 * Create the request whose post-response script writes to the selected environment — once with
 * the value that environment already inherits, once with a different one.
 */
const createSetEnvVarRequest = async (page: Page, collectionName: string) => {
  await test.step(`Create request "${SET_ENV_VAR_REQUEST.name}"`, async () => {
    await createRequestForUrl(page, collectionName, SET_ENV_VAR_REQUEST);
    await addPostResponseScript(page, SET_ENV_VAR_SCRIPT);
    await saveRequest(page);
  });
};

test.describe.configure({ timeout: 180_000 });

test.describe('Collection environment inheritance, authored in the app', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('an environment shows its ancestor rows, with their values and data types', async ({ page, createTmpDir }) => {
    const collectionName = 'Inherited Rows';
    const { environment, dataTypeSelector } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-rows'), [BASE, DEV]);
    await openEnvironmentInSettings(page, DEV.name);

    await expect(environment.inheritedSection()).toBeVisible();
    await expect(environment.inheritedVarValue(BASE.variables.baseOnly.name)).toHaveText(BASE.variables.baseOnly.value);
    await expect(environment.inheritedVarValue(BASE.variables.host.name)).toHaveText(BASE.variables.host.value);

    // An own row of the same name replaces the ancestor's, rather than adding a second row.
    await expect(environment.inheritedVarRow(DEV.variables.apiUrl.name)).toHaveCount(0);
    await expect(environment.varRowLine(DEV.variables.apiUrl.name)).toHaveText(DEV.variables.apiUrl.value);

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
      await expect(environment.inheritedVarValue(BASE.variables.object.name)).toHaveText(/"region":\s*"eu"/);
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

    await closeEnvironmentPanel(page);
  });

  test('the inherited section collapses, filters with the search, and links to its source', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Inherited Section';
    const { environment } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-section'), [BASE, DEV]);
    await openEnvironmentInSettings(page, DEV.name);

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

    await closeEnvironmentPanel(page);
  });

  test('the source arrow warns about unsaved changes instead of switching environments', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Inherited Source Guard';
    const { environment, modal } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-source-guard'), [
      BASE,
      DEV
    ]);
    await openEnvironmentInSettings(page, DEV.name);

    await setEnvironmentVariableValue(page, DEV.variables.devOnly.name, 'edited_but_unsaved');
    await expect(environment.tabCount('variables')).toHaveClass(/unsaved/);

    await environment.inheritedVarSource(BASE.variables.baseOnly.name).click();

    await expect(modal.byTitle('Unsaved changes')).toBeVisible();
    await expect(environment.detailsTitle()).toHaveText(DEV.name);
    await expect(environment.varRowLine(DEV.variables.devOnly.name)).toHaveText('edited_but_unsaved');

    await modal.closeButton().click();
    await environment.resetTab().click();
    await closeEnvironmentPanel(page);
  });

  test('a request interpolates the variables its environment inherits, as their own data type', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Inherited Request';
    const { response } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-request'), [BASE, DEV]);
    await createEchoRequest(page, collectionName);
    await selectEnvironment(page, DEV.name);

    // `host` carries the echo endpoint and is only defined in `base`, so the request cannot
    // reach the server at all unless inheritance resolved.
    await sendRequest(page, 200);

    await expectResponseContains(page, [
      BASE.variables.baseOnly.value,
      DEV.variables.apiUrl.value,
      DEV.variables.devOnly.value,
      // `dev` declares this one too, but disabled, so the inherited row still applies.
      BASE.variables.shadowedByDisabled.value,
      // Disabled in `base`, so it is never inherited and stays uninterpolated.
      `{{${BASE.variables.disabledInBase.name}}}`
    ]);

    await test.step('The request asserts the whole environment it resolved', async () => {
      await selectResponsePaneTab(page, 'Tests');

      await expect(response.testSummary()).toContainText(
        `Tests (${ECHO_TEST_COUNT}), Passed: ${ECHO_TEST_COUNT}, Failed: 0`
      );
      await expect(response.testFailures()).toHaveCount(0);
    });
  });

  test('an inherited secret reaches the request and outranks a plain row of the same name', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Inherited Secrets';

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-secrets'), [
      BASE,
      DEV,
      STAGING,
      QA
    ]);
    await createEchoRequest(page, collectionName);

    await test.step('A three-level chain resolves the secrets it inherits from either ancestor', async () => {
      await selectEnvironment(page, QA.name);
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      await expectResponseContains(page, [BASE.variables.token.value, STAGING.variables.apiKey.value]);
      // `base` declares `api_key` plain and `staging` redeclares it secret, so both are inherited
      // by `qa` — the secret is the one that must reach the request.
      expect(await getResponseBody(page)).not.toContain(BASE.variables.apiKey.value);
    });

    await test.step('A name inherited as a secret and redeclared as a non-secret resolves to the secret', async () => {
      await selectEnvironment(page, DEV.name);
      await sendRequest(page, 200);

      // `dev` redeclares the secret `overridden_secret` it inherits as a non-secret, and the
      // non-secret `overridden_plain` as a secret. Both ancestor rows survive the redeclaration,
      // and in each pair the secret is the one that reaches the request.
      await expectResponseContains(page, [
        BASE.variables.overriddenSecret.value,
        DEV.variables.overriddenPlain.value
      ]);
      const body = await getResponseBody(page);
      expect(body).not.toContain(DEV.variables.overriddenSecret.value);
      expect(body).not.toContain(BASE.variables.overriddenPlain.value);
    });
  });

  test('a script write only overrides an inherited variable when the value differs', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'Inherited Script Write';
    const { environment } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-script-write'), [
      BASE,
      SCRIPTED
    ]);
    await createSetEnvVarRequest(page, collectionName);
    await selectEnvironment(page, SCRIPTED.name);
    await sendRequest(page, 200);

    await openEnvironmentConfigTab(page);
    await openEnvironmentInSettings(page, SCRIPTED.name);

    // The script rewrote `base_only` with the value it already inherits, so the write is a no-op
    // and the row stays inherited.
    await expect(environment.inheritedVarValue(BASE.variables.baseOnly.name)).toHaveText(
      BASE.variables.baseOnly.value
    );
    await expect(environment.varRow(BASE.variables.baseOnly.name)).toHaveCount(0);

    // `session_id` was written with a different value, so it becomes a row of its own.
    await expect(environment.varRowLine(BASE.variables.sessionId.name)).toHaveText('script_session');
    await expect(environment.inheritedVarRow(BASE.variables.sessionId.name)).toHaveCount(0);

    await closeEnvironmentPanel(page);
  });

  test('an inherited variable is read-only in the variable tooltip', async ({ page, createTmpDir }) => {
    const collectionName = 'Inherited Tooltip';
    const { varInfoPopup } = buildCommonLocators(page);

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-tooltip'), [BASE, DEV]);
    await createRequestForUrl(page, collectionName, PING_REQUEST);
    await selectEnvironment(page, DEV.name);

    const tooltip = await openUrlVarTooltip(page, BASE.variables.host.name);

    await expect(varInfoPopup.readonlyNote(tooltip)).toHaveText(`Inherited from ${BASE.name} (read-only)`);
    await expect(varInfoPopup.editableValue(tooltip)).toHaveCount(0);
  });

  test('a collection run interpolates the variables the environment inherits', async ({ page, createTmpDir }) => {
    const collectionName = 'Inherited Runner';

    await createCollectionWithEnvironments(page, collectionName, await createTmpDir('inherited-runner'), [BASE, DEV]);
    await createEchoRequest(page, collectionName);
    await selectEnvironment(page, DEV.name);

    await runCollection(page, collectionName);

    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 1,
      failed: 0,
      skipped: 0
    });
  });
});

type EnvironmentFormat = 'bru' | 'yml';
const FORMATS: EnvironmentFormat[] = ['yml', 'bru'];

type SavedVariable = { name: string; value?: unknown; secret?: boolean; disabled?: boolean };
type SavedEnvironment = { name: string; extends?: string; variables?: SavedVariable[] };

const LEVEL_1 = {
  name: 'ui-inherit-level-1',
  renamedName: 'ui-inherit-level-1-renamed',
  variables: {
    url: { name: 'shared_url', value: 'https://level-1.example.com' },
    region: { name: 'level_1_region', value: 'region-from-level-1' },
    count: { name: 'level_1_count', value: '3', dataType: 'number' as const },
    token: { name: 'level_1_token', value: 'token-from-level-1', isSecret: true }
  }
};

const LEVEL_2 = {
  name: 'ui-inherit-level-2',
  copyName: 'ui-inherit-level-2-copy',
  variables: {
    own: { name: 'level_2_only', value: 'value-from-level-2' }
  },
  // Typed in after the chain is built, redeclaring level 1's names to retire the inherited twins.
  overrides: {
    region: { name: LEVEL_1.variables.region.name, value: 'region-from-level-2' },
    // Redeclared without a data type, so the number it inherits has to give way to a string.
    count: { name: LEVEL_1.variables.count.name, value: 'recounted-in-level-2' },
    token: { name: LEVEL_1.variables.token.name, value: 'token-from-level-2', isSecret: true }
  }
};

const environmentFile = (collectionsDir: string, collectionName: string, format: EnvironmentFormat, envName: string) =>
  path.join(collectionsDir, collectionName, 'environments', `${envName}.${format}`);

const savedVariableNames = (environment: SavedEnvironment) =>
  (environment.variables ?? []).map((variable) => variable.name).sort();

const savedVariable = (environment: SavedEnvironment, name: string) =>
  (environment.variables ?? []).find((variable) => variable.name === name);

/**
 * Build a collection holding a populated level 1 environment and a level 2 that inherits
 * nothing yet, and leave the latter open in the environment settings tab.
 */
const createTwoLevelChain = async (
  page: Page,
  collectionsDir: string,
  collectionName: string,
  format: EnvironmentFormat
) => {
  const { environment } = buildCommonLocators(page);

  await createCollection(page, collectionName, collectionsDir, format);

  await createEnvironment(page, LEVEL_1.name);
  await addEnvironmentVariables(page, Object.values(LEVEL_1.variables));
  await saveEnvironment(page);

  // The only environment in the collection has nothing to inherit from, so the picker is
  // not offered at all.
  await expect(environment.inheritsFromAction()).toHaveCount(0);

  await createEnvironment(page, LEVEL_2.name);
  await addEnvironmentVariables(page, Object.values(LEVEL_2.variables));
  await saveEnvironment(page);
};

test.describe('Collection environment inheritance lifecycle, authored in the app', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  for (const format of FORMATS) {
    test(`inheritance is written, cleared, copied, and follows a parent rename and delete in ${format}`, async ({
      page,
      createTmpDir
    }) => {
      const { environment } = buildCommonLocators(page);
      const collectionName = `Lifecycle UI ${format.toUpperCase()}`;
      const collectionsDir = await createTmpDir(`inheritance-lifecycle-ui-${format}`);
      const readEnvironmentFile = (name: string) =>
        fs.readFileSync(environmentFile(collectionsDir, collectionName, format, name), 'utf8');

      await test.step('Create a collection with two environments', async () => {
        await createTwoLevelChain(page, collectionsDir, collectionName, format);
      });

      await test.step('Picking a parent writes extends and merges its rows in', async () => {
        await setEnvironmentInheritance(page, LEVEL_1.name);

        await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.name}`);

        await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);

        // The rows arrived from the parent rather than from an edit, so the tab stays saved.
        await expect(environment.tabCount('variables')).not.toHaveClass(/unsaved/);

        await environment.secretsTab().click();
        await expect(environment.inheritedVarValue(LEVEL_1.variables.token.name)).toHaveText(
          '*'.repeat(LEVEL_1.variables.token.value.length)
        );
        await environment.inheritedVarEyeToggle(LEVEL_1.variables.token.name).click();
        await expect(environment.inheritedVarValue(LEVEL_1.variables.token.name)).toHaveText(
          LEVEL_1.variables.token.value
        );

        await environment.variablesTab().click();
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

        await expect
          .poll(() => fs.existsSync(environmentFile(collectionsDir, collectionName, format, LEVEL_2.copyName)))
          .toBe(true);
        expect(readEnvironmentFile(LEVEL_2.copyName)).toContain(`extends: ${LEVEL_1.name}`);
      });

      await test.step('Renaming the parent rewrites the references to it', async () => {
        await openEnvironmentInSettings(page, LEVEL_1.name);
        await renameEnvironment(page, LEVEL_1.renamedName);

        await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.renamedName}`);

        await openEnvironmentInSettings(page, LEVEL_2.name);
        await expect(environment.inheritedVarValue(LEVEL_1.variables.url.name)).toHaveText(LEVEL_1.variables.url.value);
      });

      await test.step('Deleting the parent keeps the references to it and warns about them', async () => {
        await openEnvironmentInSettings(page, LEVEL_1.renamedName);
        await deleteEnvironment(page);

        await expect.poll(() => readEnvironmentFile(LEVEL_2.name)).toContain(`extends: ${LEVEL_1.renamedName}`);

        await openEnvironmentInSettings(page, LEVEL_2.name);
        await expect(environment.missingInheritedEnvironment()).toContainText(LEVEL_1.renamedName);
        await expect(environment.inheritedSection()).toHaveCount(0);
      });
    });
  }

  test('an own row overwrites the variable it inherits, and only own rows reach the file', async ({
    page,
    createTmpDir
  }) => {
    const { environment } = buildCommonLocators(page);
    const collectionName = 'Inheritance Overwrite';
    const collectionsDir = await createTmpDir('inheritance-overwrite');
    const readEnvironment = (name: string) =>
      yaml.load(fs.readFileSync(environmentFile(collectionsDir, collectionName, 'yml', name), 'utf8')) as SavedEnvironment;

    await createTwoLevelChain(page, collectionsDir, collectionName, 'yml');
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
      expect(savedVariable(parent, LEVEL_1.variables.count.name)?.value).toEqual({
        type: 'number',
        data: LEVEL_1.variables.count.value
      });
      expect(savedVariable(parent, LEVEL_1.variables.url.name)?.value).toBe(LEVEL_1.variables.url.value);
    });
  });
});
