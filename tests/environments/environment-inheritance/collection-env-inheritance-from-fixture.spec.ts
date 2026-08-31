import fs from 'fs';
import path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  addEnvironmentVariable,
  addEnvironmentVariables,
  closeEnvironmentPanel,
  copyEnvironment,
  createCollection,
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
  BASE_SECRETS,
  DEV_SECRETS,
  SECRET_REDECLARED_AS_NON_SECRET,
  seedEchoSecrets,
  seedWorkspaceVarsSecrets
} from './secrets';

const YML_COLLECTION = 'Inheritance YML';

const STAGING_SECRETS = { api_key: 'api-key-from-staging' };

const INHERITED_TYPE_LABELS: Array<[string, string]> = [
  ['base_only', 'string'],
  ['base_number', 'number'],
  ['base_boolean', 'boolean'],
  ['base_object', 'object']
];

const ECHO_TEST_COUNT = 1;
const COLLECTION_REQUEST_COUNT = 4;

type EnvironmentFormat = 'bru' | 'yml';
const FORMATS: EnvironmentFormat[] = ['yml', 'bru'];

const LEVEL_1 = {
  name: 'inherit-level-1',
  renamedName: 'inherit-level-1-renamed',
  variables: {
    url: { name: 'shared_url', value: 'https://level-1.example.com' },
    region: { name: 'level_1_region', value: 'region-from-level-1' },
    token: { name: 'level_1_token', value: 'token-from-level-1', isSecret: true }
  }
};

const LEVEL_2 = {
  name: 'inherit-level-2',
  copyName: 'inherit-level-2-copy',
  variables: {
    own: { name: 'level_2_only', value: 'value-from-level-2' }
  },
  // Typed in after the chain is built, redeclaring level 1's names to retire the inherited twins.
  overrides: {
    region: { name: LEVEL_1.variables.region.name, value: 'region-from-level-2' },
    token: { name: LEVEL_1.variables.token.name, value: 'token-from-level-2', isSecret: true }
  }
};

const environmentFile = (collectionsDir: string, collectionName: string, format: EnvironmentFormat, envName: string) =>
  path.join(collectionsDir, collectionName, 'environments', `${envName}.${format}`);

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

test.describe('Collection environment inheritance', () => {
  test('an environment shows its ancestor rows, with their values and data types', async ({
    pageWithUserData: page
  }) => {
    const { environment, dataTypeSelector } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await openEnvironmentConfigTab(page);
    await setEnvironmentSecrets(page, 'base', BASE_SECRETS);
    await openEnvironmentInSettings(page, 'dev');

    await expect(environment.inheritedSection()).toBeVisible();
    await expect(environment.inheritedVarValue('base_only')).toHaveText('base_only_value');
    await expect(environment.inheritedVarValue('host')).toHaveText('http://localhost:8081');

    // An own row of the same name replaces the ancestor's, rather than adding a second row.
    await expect(environment.inheritedVarRow('api_url')).toHaveCount(0);
    await expect(environment.varRowLine('api_url')).toHaveText('https://dev.example.com');

    await expect(environment.inheritedVarRow('disabled_in_base')).toHaveCount(0);

    await test.step('An inherited row cannot be edited', async () => {
      await expect(environment.inheritedVarEnabledCheckbox('base_only')).toBeChecked();
      await expect(environment.inheritedVarEnabledCheckbox('base_only')).toBeDisabled();
      await expect(environment.inheritedVarEditableFields('base_only')).toHaveCount(0);
    });

    await test.step('An inherited row carries the data type of the variable it came from', async () => {
      for (const [name, label] of INHERITED_TYPE_LABELS) {
        await expect(environment.inheritedVarDataType(name)).toHaveText(label);
      }

      await expect(environment.inheritedVarValue('base_number')).toHaveText('42');
      await expect(environment.inheritedVarValue('base_boolean')).toHaveText('true');
      // Object values are pretty-printed over several lines, so match the shape.
      await expect(environment.inheritedVarValue('base_object')).toHaveText(/"region":\s*"eu"/);
    });

    await test.step('An own row replaces the inherited data type, not just the value', async () => {
      await expect(environment.inheritedVarRow('typed_override')).toHaveCount(0);
      await expect(environment.varRowLine('typed_override')).toHaveText('overridden_in_dev');
      await expect(dataTypeSelector.typeLabel(environment.varRow('typed_override'))).toHaveAttribute(
        'data-selected-type',
        'string'
      );
    });

    await test.step('An inherited secret arrives masked and reveals its ancestor value', async () => {
      await environment.secretsTab().click();
      await expect(environment.inheritedVarValue('base_token')).toHaveText('*'.repeat(BASE_SECRETS.base_token.length));
      await expect(environment.inheritedVarDataType('base_secret_object')).toHaveText('object');
      await expect(environment.inheritedVarDataType('base_token')).toHaveText('string');
      await expect(environment.inheritedVarValue('base_secret_object')).not.toContainText('admin');

      await environment.inheritedVarEyeToggle('base_token').click();
      await environment.inheritedVarEyeToggle('base_secret_object').click();

      await expect(environment.inheritedVarValue('base_token')).toHaveText(BASE_SECRETS.base_token);
      await expect(environment.inheritedVarValue('base_secret_object')).toHaveText(/"scope":\s*"admin"/);
      await expect(environment.inheritedVarSource('base_token')).toHaveAttribute('title', 'Inherited from base');
    });

    await closeEnvironmentPanel(page);
  });

  test('the inherited section collapses, filters with the search, and links to its source', async ({
    pageWithUserData: page
  }) => {
    const { environment } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await openEnvironmentConfigTab(page);
    await openEnvironmentInSettings(page, 'dev');

    await test.step('Collapsing the section hides the inherited rows', async () => {
      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow('base_only')).toHaveCount(0);

      await environment.inheritedSectionToggle().click();
      await expect(environment.inheritedVarRow('base_only')).toBeVisible();
    });

    await test.step('The search filters inherited rows and own rows independently', async () => {
      await searchEnvironmentVariables(page, 'base_only');
      await expect(environment.inheritedVarRow('base_only')).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(1)');
      await expect(environment.sectionCount('own')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, 'dev_only');
      await expect(environment.varRow('dev_only')).toBeVisible();
      await expect(environment.sectionCount('inherited')).toHaveText('(0)');
      await expect(environment.varsNoResults()).toHaveCount(0);

      await searchEnvironmentVariables(page, 'matches_nothing_at_all');
      await expect(environment.varsNoResults()).toBeVisible();

      await searchEnvironmentVariables(page, '');
      await expect(environment.inheritedVarRow('base_only')).toBeVisible();
    });

    await test.step('The source arrow opens the environment the row came from', async () => {
      await environment.inheritedVarSource('base_only').click();

      await expect(environment.detailsTitle()).toHaveText('base');
      await expect(environment.varRowLine('base_only')).toHaveText('base_only_value');
    });

    await closeEnvironmentPanel(page);
  });

  test('the source arrow warns about unsaved changes instead of switching environments', async ({
    pageWithUserData: page
  }) => {
    const { environment, modal } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await openEnvironmentConfigTab(page);
    await openEnvironmentInSettings(page, 'dev');

    await setEnvironmentVariableValue(page, 'dev_only', 'edited_but_unsaved');
    await expect(environment.tabCount('variables')).toHaveClass(/unsaved/);

    await environment.inheritedVarSource('base_only').click();

    await expect(modal.byTitle('Unsaved changes')).toBeVisible();
    await expect(environment.detailsTitle()).toHaveText('dev');
    await expect(environment.varRowLine('dev_only')).toHaveText('edited_but_unsaved');

    await modal.closeButton().click();
    await environment.resetTab().click();
    await closeEnvironmentPanel(page);
  });

  test('a request interpolates the variables its environment inherits, as their own data type', async ({
    pageWithUserData: page
  }) => {
    // Two environments are edited and saved before the request goes out.
    test.setTimeout(90000);

    const { response } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await openRequest(page, YML_COLLECTION, 'echo', { persist: true });
    await seedEchoSecrets(page);
    await selectEnvironment(page, 'dev');

    // `host` carries the echo endpoint and is only defined in `base`, so the request
    // cannot reach the server at all unless inheritance resolved.
    await sendRequest(page, 200);

    await expectResponseContains(page, [
      'base_only_value',
      'https://dev.example.com',
      'dev_only_value',
      // `dev` declares this one too, but disabled, so the inherited row still applies.
      'from_base',
      // Disabled in `base`, so it is never inherited and stays uninterpolated.
      '{{disabled_in_base}}'
    ]);

    await test.step('The request asserts the whole environment it resolved', async () => {
      // `echo` deep-equals the body it sent against every row `dev` resolves, typed rows and
      // secrets included — the CLI suite runs the same request and reads that verdict from the
      // exit code.
      await selectResponsePaneTab(page, 'Tests');

      await expect(response.testSummary()).toContainText(
        `Tests (${ECHO_TEST_COUNT}), Passed: ${ECHO_TEST_COUNT}, Failed: 0`
      );
      await expect(response.testFailures()).toHaveCount(0);
    });
  });

  test('an inherited secret reaches the request and outranks a plain row of the same name', async ({
    pageWithUserData: page
  }) => {
    // Three environments are edited and saved before either request goes out.
    test.setTimeout(120000);

    await openCollection(page, YML_COLLECTION);
    await openEnvironmentConfigTab(page);

    await setEnvironmentSecrets(page, 'base', { ...BASE_SECRETS, ...SECRET_REDECLARED_AS_NON_SECRET });
    await setEnvironmentSecrets(page, 'dev', DEV_SECRETS);
    await setEnvironmentSecrets(page, 'staging', STAGING_SECRETS);

    await openRequest(page, YML_COLLECTION, 'echo');
    await closeEnvironmentPanel(page);

    await test.step('A three-level chain resolves the secrets it inherits from either ancestor', async () => {
      await selectEnvironment(page, 'qa');
      await sendRequest(page, 200);
      await selectResponsePaneTab(page, 'Response');

      await expectResponseContains(page, [BASE_SECRETS.base_token, STAGING_SECRETS.api_key]);
      // `base` declares `api_key` plain and `staging` redeclares it secret, so both are
      // inherited by `qa` — the secret is the one that must reach the request.
      expect(await getResponseBody(page)).not.toContain('plain_api_key');
    });

    await test.step('A name inherited as a secret and redeclared as a non-secret resolves to the secret', async () => {
      await selectEnvironment(page, 'dev');
      await sendRequest(page, 200);

      // `dev` redeclares the secret `overridden_secret` it inherits as a non-secret, and the
      // non-secret `overridden_plain` as a secret. Both ancestor rows survive the redeclaration,
      // and in each pair the secret is the one that reaches the request.
      await expectResponseContains(page, [
        SECRET_REDECLARED_AS_NON_SECRET.overridden_secret,
        DEV_SECRETS.overridden_plain
      ]);
      const body = await getResponseBody(page);
      expect(body).not.toContain('plain_wins_in_dev');
      expect(body).not.toContain('plain_from_base');
    });
  });

  test('a script write only overrides an inherited variable when the value differs', async ({
    pageWithUserData: page
  }) => {
    const { environment } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await selectEnvironment(page, 'scripted');
    await openRequest(page, YML_COLLECTION, 'set-env-var');
    await sendRequest(page, 200);

    await openEnvironmentConfigTab(page);
    await openEnvironmentInSettings(page, 'scripted');

    // The script rewrote `base_only` with the value it already inherits, so the write is a
    // no-op and the row stays inherited.
    await expect(environment.inheritedVarValue('base_only')).toHaveText('base_only_value');
    await expect(environment.varRow('base_only')).toHaveCount(0);

    // `session_id` was written with a different value, so it becomes a row of its own.
    await expect(environment.varRowLine('session_id')).toHaveText('script_session');
    await expect(environment.inheritedVarRow('session_id')).toHaveCount(0);

    await closeEnvironmentPanel(page);
  });

  test('an inherited variable is read-only in the variable tooltip', async ({ pageWithUserData: page }) => {
    const { varInfoPopup } = buildCommonLocators(page);

    await openCollection(page, YML_COLLECTION);
    await selectEnvironment(page, 'dev');
    await openRequest(page, YML_COLLECTION, 'echo');

    const tooltip = await openUrlVarTooltip(page, 'host');

    await expect(varInfoPopup.readonlyNote(tooltip)).toHaveText('Inherited from base (read-only)');
    await expect(varInfoPopup.editableValue(tooltip)).toHaveCount(0);
  });

  test('a collection run interpolates the variables the environment inherits', async ({ pageWithUserData: page }) => {
    // Four environments are edited and saved before the run starts.
    test.setTimeout(120000);

    await openCollection(page, YML_COLLECTION);
    await openRequest(page, YML_COLLECTION, 'echo', { persist: true });
    await seedEchoSecrets(page);
    // The run covers the whole collection, so the workspace-scoped request alongside `echo`
    // needs its own environment — and its own secrets — as well.
    await seedWorkspaceVarsSecrets(page);
    await selectEnvironment(page, 'dev');
    await selectEnvironment(page, 'workspace_dev', 'global');

    await runCollection(page, YML_COLLECTION);

    await validateRunnerResults(page, {
      totalRequests: COLLECTION_REQUEST_COUNT,
      passed: COLLECTION_REQUEST_COUNT,
      failed: 0,
      skipped: 0
    });
  });

  for (const format of FORMATS) {
    test(`inheritance is written, cleared, copied, and follows a parent rename and delete in ${format}`, async ({
      pageWithUserData: page,
      createTmpDir
    }) => {
      const { environment } = buildCommonLocators(page);
      const collectionName = `Lifecycle ${format.toUpperCase()}`;
      const collectionsDir = await createTmpDir(`inheritance-lifecycle-${format}`);
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
        await expect(environment.inheritedVarValue(LEVEL_1.variables.token.name)).toHaveText(LEVEL_1.variables.token.value);

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

        await expect.poll(() =>
          fs.existsSync(environmentFile(collectionsDir, collectionName, format, LEVEL_2.copyName))
        ).toBe(true);
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

  test('an own row replaces its inherited twin as it is typed, and only own rows are saved', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    const { environment } = buildCommonLocators(page);
    const collectionName = 'Inherited Override';
    const collectionsDir = await createTmpDir('inheritance-override');
    const readLevel2File = () =>
      fs.readFileSync(environmentFile(collectionsDir, collectionName, 'yml', LEVEL_2.name), 'utf8');

    await createTwoLevelChain(page, collectionsDir, collectionName, 'yml');
    await setEnvironmentInheritance(page, LEVEL_1.name);

    await test.step('Typing an own row of the same name retires the inherited one before the save', async () => {
      await expect(environment.inheritedVarValue(LEVEL_1.variables.region.name)).toHaveText(LEVEL_1.variables.region.value);

      await addEnvironmentVariable(page, LEVEL_2.overrides.region);

      await expect(environment.inheritedVarRow(LEVEL_2.overrides.region.name)).toHaveCount(0);
      await expect(environment.varRowLine(LEVEL_2.overrides.region.name)).toHaveText(LEVEL_2.overrides.region.value);
    });

    await test.step('Saving the tab writes the own rows and leaves the inherited ones behind', async () => {
      await environment.saveTab().click();

      await expect.poll(() => readLevel2File()).toContain(LEVEL_2.overrides.region.name);
      const saved = readLevel2File();
      expect(saved).toContain(`extends: ${LEVEL_1.name}`);
      expect(saved).toContain(LEVEL_2.overrides.region.value);
      expect(saved).not.toContain(LEVEL_1.variables.url.name);
      expect(saved).not.toContain(LEVEL_1.variables.token.name);
    });

    await test.step('Save all writes the own secrets and leaves the inherited ones behind', async () => {
      await environment.secretsTab().click();
      await expect(environment.inheritedVarRow(LEVEL_1.variables.token.name)).toBeVisible();

      await addEnvironmentVariable(page, LEVEL_2.overrides.token);
      await expect(environment.inheritedVarRow(LEVEL_2.overrides.token.name)).toHaveCount(0);

      await environment.saveAll().click();

      await expect.poll(() => readLevel2File()).toContain(LEVEL_2.overrides.token.name);
      expect(readLevel2File()).not.toContain(LEVEL_1.variables.url.name);
    });
  });
});
