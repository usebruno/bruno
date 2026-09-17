import { test, expect, Page } from '../../playwright';
import {
  closeAllTabs,
  copyVariableValue,
  foldObjectLine,
  getVariableRowNames,
  getVariablesScrollRange,
  getVariablesScrollTop,
  getValueEditorScrollRange,
  getValueEditorScrollTop,
  openRequest,
  openVariableDrawer,
  openVariablesTab,
  readClipboard,
  readVariableValue,
  reopenVariablesTab,
  scrollValueEditorTo,
  scrollVariablesTo,
  selectEnvironment,
  sendRequestAndWaitForResponse,
  switchToOpenTab,
  toggleSecretReveal,
  unfoldObjectLine
} from '../utils/page';
import { selectNoEnvironment } from '../utils/page/environments';
import { buildCommonLocators } from '../utils/page/locators';

/**
 * The read-only Variables tab: collection header → "..." → Variables.
 *
 * An open tab is reused, so every test opens its own and `afterEach` closes it.
 * `variables-tab` seeds its values from the `seed` request; `no-variables` stays
 * empty for the "nothing to show" states.
 */

const COLLECTION = 'variables-tab';
const EMPTY_COLLECTION = 'no-variables';

const ENV_ROW_NAMES = [
  'api_token',
  'api_url',
  'derived_url',
  'feature_enabled',
  'feature_flags',
  'page_size',
  'secret_profile'
];
const RUNTIME_ROW_NAMES = ['auth_token', 'retry_count', 'service_config'];

// Rows in the `Long` environment, enough for the shared scroller to overflow.
const LONG_ENV_VAR_COUNT = 40;

const FEATURE_FLAGS_JSON = ['{', '  "beta": true,', '  "rollout": "partial"', '}'].join('\n');
const SECRET_PROFILE_JSON = ['{', '  "role": "admin"', '}'].join('\n');
// What the `rewrite-config` request writes over the `service_config` seeded by `seed`.
const REWRITTEN_SERVICE_CONFIG_JSON = [
  '{',
  '  "region": "eu-west-1",',
  '  "replicas": 5,',
  '  "tier": "gold"',
  '}'
].join('\n');

/**
 * Activate `Local` and run the `seed` request. Runtime variables and secret env
 * values only exist in memory, so every test that reads them has to seed them —
 * the script writes the same values each time, so repeating it is harmless.
 * Leaves the `seed` request tab open as the tab to switch away to.
 */
const seedVariables = async (page: Page) => {
  await test.step('Seed runtime variables and secret values', async () => {
    await openRequest(page, COLLECTION, 'seed', { persist: true });
    await selectEnvironment(page, 'Local', 'collection');
    await sendRequestAndWaitForResponse(page, 200);
  });
};

// `pageWithUserData` loads init-user-data: both collections open, and the JS
// sandbox pre-approved so the `seed` script can run.
test.describe('Variables tab', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllTabs(page);
  });

  test('lists runtime and environment variables under their own sections', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('Runtime section is titled and counted', async () => {
      await expect(variablesTab.sectionHeader('runtime')).toContainText('Runtime Variables');
      await expect(variablesTab.sectionCount('runtime')).toHaveText(String(RUNTIME_ROW_NAMES.length));
      await expect.poll(() => getVariableRowNames(page, 'runtime')).toEqual(RUNTIME_ROW_NAMES);
    });

    await test.step('Environment section names the active environment', async () => {
      await expect(variablesTab.sectionHeader('environment')).toContainText('Environment Variables');
      await expect(variablesTab.sectionCount('environment')).toHaveText(String(ENV_ROW_NAMES.length));
      await expect(variablesTab.sectionSubtitle('environment')).toHaveText('Local');
      await expect.poll(() => getVariableRowNames(page, 'environment')).toEqual(ENV_ROW_NAMES);
    });

    await test.step('A disabled environment variable is left out', async () => {
      await expect(variablesTab.row('environment', 'legacy_url')).toHaveCount(0);
    });
  });

  test('renders each value in the form that matches its data type', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('Scalars render as JSON', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'api_url')).toBe('"https://api.example.com"');
      await expect.poll(() => readVariableValue(page, 'environment', 'page_size')).toBe('25');
      await expect.poll(() => readVariableValue(page, 'environment', 'feature_enabled')).toBe('true');
      await expect.poll(() => readVariableValue(page, 'runtime', 'retry_count')).toBe('3');
    });

    await test.step('Each scalar is typed by the editor, not just spelled that way', async () => {
      await expect(variablesTab.valueToken('environment', 'api_url', 'string')).toHaveText('"https://api.example.com"');
      await expect(variablesTab.valueToken('environment', 'page_size', 'number')).toHaveText('25');
      await expect(variablesTab.valueToken('environment', 'feature_enabled', 'boolean')).toHaveText('true');
      await expect(variablesTab.valueToken('runtime', 'retry_count', 'number')).toHaveText('3');
    });

    await test.step('A template reference stays verbatim and reads as a variable', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'derived_url')).toBe('{{api_url}}/v1');
      await expect(variablesTab.valueToken('environment', 'derived_url', 'variable')).toHaveText('{{api_url}}');
    });

    await test.step('Objects render pretty-printed in a multi-line editor, keys and values typed', async () => {
      await expect(variablesTab.rowMultiLineEditor('environment', 'feature_flags')).toBeVisible();
      await expect.poll(() => readVariableValue(page, 'environment', 'feature_flags')).toBe(FEATURE_FLAGS_JSON);
      await expect(variablesTab.valueToken('environment', 'feature_flags', 'property')).toHaveText('"beta"');
      await expect(variablesTab.valueToken('environment', 'feature_flags', 'boolean')).toHaveText('true');
      await expect(variablesTab.valueToken('environment', 'feature_flags', 'string')).toHaveText('"partial"');
      await expect(variablesTab.rowSingleLineEditor('environment', 'api_url')).toBeVisible();
    });

    await test.step('A masked secret is plain text — nothing is typed behind the asterisks', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
      await expect(variablesTab.valueTokens('environment', 'api_token')).toHaveCount(0);
    });
  });

  test('copies a value to the clipboard', async ({ pageWithUserData: page }) => {
    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('Copy a string value', async () => {
      await copyVariableValue(page, 'environment', 'api_url');
      await expect.poll(() => readClipboard(page)).toBe('https://api.example.com');
    });

    await test.step('Copy an object value', async () => {
      await copyVariableValue(page, 'environment', 'feature_flags');
      await expect.poll(() => readClipboard(page)).toBe(FEATURE_FLAGS_JSON);
    });

    await test.step('Copy a runtime value', async () => {
      await copyVariableValue(page, 'runtime', 'auth_token');
      await expect.poll(() => readClipboard(page)).toBe('runtime-token-1');
    });
  });

  test('masks a secret until the eye is toggled on', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('A masked secret hides its value and its object controls', async () => {
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
      await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe('********');
      await expect(variablesTab.rowObjectPreview('environment', 'secret_profile')).toHaveCount(0);
    });

    await test.step('Revealing shows the real value', async () => {
      await toggleSecretReveal(page, 'environment', 'api_token');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('"sk-live-9f3a"');

      await toggleSecretReveal(page, 'environment', 'secret_profile');
      await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe(SECRET_PROFILE_JSON);
      await expect(variablesTab.rowObjectPreview('environment', 'secret_profile')).toBeVisible();
    });

    await test.step('Toggling back re-masks it', async () => {
      await toggleSecretReveal(page, 'environment', 'api_token');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
    });

    await test.step('A non-secret row has no eye toggle', async () => {
      await expect(variablesTab.rowSecretToggle('environment', 'api_url')).toHaveCount(0);
    });
  });

  test('masks a revealed secret again after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await toggleSecretReveal(page, 'environment', 'api_token');
    await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('"sk-live-9f3a"');

    await reopenVariablesTab(page, 'seed');

    await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
  });

  test('collapses a section and remembers it after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('Both sections start expanded', async () => {
      await expect(variablesTab.sectionHeader('runtime')).toHaveAttribute('aria-expanded', 'true');
      await expect(variablesTab.sectionHeader('environment')).toHaveAttribute('aria-expanded', 'true');
    });

    await test.step('Collapsing hides only that section\'s table', async () => {
      await variablesTab.sectionHeader('environment').click();
      await expect(variablesTab.sectionHeader('environment')).toHaveAttribute('aria-expanded', 'false');
      await expect(variablesTab.table('environment')).toHaveCount(0);
      await expect(variablesTab.table('runtime')).toBeVisible();
    });

    await test.step('The collapsed section survives the tab round trip', async () => {
      await reopenVariablesTab(page, 'seed');
      await expect(variablesTab.sectionHeader('environment')).toHaveAttribute('aria-expanded', 'false');
      await expect(variablesTab.table('environment')).toHaveCount(0);
    });

    await test.step('Expanding brings the table back', async () => {
      await variablesTab.sectionHeader('environment').click();
      await expect(variablesTab.sectionHeader('environment')).toHaveAttribute('aria-expanded', 'true');
      await expect(variablesTab.table('environment')).toBeVisible();
    });
  });

  test('opens an object value in the details drawer and closes it again', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('An environment object opens the drawer', async () => {
      await expect(variablesTab.drawer()).toHaveCount(0);
      await openVariableDrawer(page, 'environment', 'feature_flags');
      await expect(variablesTab.drawer()).toBeVisible();
      await expect(variablesTab.drawerName()).toHaveText('feature_flags');
      await expect(variablesTab.drawerSection()).toHaveText('(Environment)');
      await expect(variablesTab.drawerEditor()).toContainText('"rollout": "partial"');
    });

    await test.step('A runtime object replaces the drawer contents', async () => {
      await openVariableDrawer(page, 'runtime', 'service_config');
      await expect(variablesTab.drawerName()).toHaveText('service_config');
      await expect(variablesTab.drawerSection()).toHaveText('(Runtime)');
      await expect(variablesTab.drawerEditor()).toContainText('"region": "us-east-1"');
    });

    await test.step('Closing dismisses the drawer', async () => {
      await variablesTab.drawerClose().click();
      await expect(variablesTab.drawer()).toHaveCount(0);
    });

    await test.step('A scalar value has no drawer control', async () => {
      await expect(variablesTab.rowObjectPreview('environment', 'api_url')).toHaveCount(0);
    });
  });

  test('keeps the drawer open on the same variable after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await openVariableDrawer(page, 'environment', 'feature_flags');
    await expect(variablesTab.drawerName()).toHaveText('feature_flags');

    await reopenVariablesTab(page, 'seed');

    await expect(variablesTab.drawer()).toBeVisible();
    await expect(variablesTab.drawerName()).toHaveText('feature_flags');
    await expect(variablesTab.drawerEditor()).toContainText('"rollout": "partial"');
  });

  test('remembers a collapsed object cell after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    const cell = () => variablesTab.rowEditor('environment', 'feature_flags');

    await test.step('Collapsing the object leaves a two-key fold marker', async () => {
      await expect(variablesTab.foldMarkers(cell())).toHaveCount(0);
      await foldObjectLine(cell());
      await expect(variablesTab.foldMarkers(cell())).toHaveText('↤2↦');
    });

    await test.step('The fold survives the tab round trip', async () => {
      await reopenVariablesTab(page, 'seed');
      await expect(variablesTab.foldMarkers(cell())).toHaveText('↤2↦');
    });

    await test.step('Expanding again survives it too', async () => {
      await unfoldObjectLine(cell());
      await expect(variablesTab.foldMarkers(cell())).toHaveCount(0);

      await reopenVariablesTab(page, 'seed');

      await expect(variablesTab.foldMarkers(cell())).toHaveCount(0);
      await expect.poll(() => readVariableValue(page, 'environment', 'feature_flags')).toBe(FEATURE_FLAGS_JSON);
    });
  });

  test('keeps a collapsed object cell folded when the value itself changes', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    const cell = () => variablesTab.rowEditor('runtime', 'service_config');

    await test.step('Collapsing the object leaves a two-key fold marker', async () => {
      await foldObjectLine(cell());
      await expect(variablesTab.foldMarkers(cell())).toHaveText('↤2↦');
    });

    await test.step('Rewriting the variable keeps it collapsed, now over three keys', async () => {
      await openRequest(page, COLLECTION, 'rewrite-config', { persist: true });
      await sendRequestAndWaitForResponse(page, 200);

      await switchToOpenTab(page, 'Variables');

      await expect(variablesTab.foldMarkers(cell())).toHaveText('↤3↦');
    });

    await test.step('Expanding shows the rewritten value', async () => {
      await unfoldObjectLine(cell());
      await expect.poll(() => readVariableValue(page, 'runtime', 'service_config'))
        .toBe(REWRITTEN_SERVICE_CONFIG_JSON);
    });
  });

  test('remembers a collapsed object in the details drawer after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await openVariableDrawer(page, 'runtime', 'service_config');
    await expect(variablesTab.drawerName()).toHaveText('service_config');

    await test.step('Collapsing the drawer object leaves a two-key fold marker', async () => {
      await foldObjectLine(variablesTab.drawerEditor());
      await expect(variablesTab.foldMarkers(variablesTab.drawerEditor())).toHaveText('↤2↦');
    });

    await test.step('The fold survives the tab round trip', async () => {
      await reopenVariablesTab(page, 'seed');
      await expect(variablesTab.drawerName()).toHaveText('service_config');
      await expect(variablesTab.foldMarkers(variablesTab.drawerEditor())).toHaveText('↤2↦');
    });

    await test.step('Expanding again survives it too', async () => {
      await unfoldObjectLine(variablesTab.drawerEditor());
      await expect(variablesTab.foldMarkers(variablesTab.drawerEditor())).toHaveCount(0);

      await reopenVariablesTab(page, 'seed');

      await expect(variablesTab.foldMarkers(variablesTab.drawerEditor())).toHaveCount(0);
      await expect(variablesTab.drawerEditor()).toContainText('"region": "us-east-1"');
    });
  });

  test('closes the drawer when a revealed secret object is masked again', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await toggleSecretReveal(page, 'environment', 'secret_profile');
    await openVariableDrawer(page, 'environment', 'secret_profile');
    await expect(variablesTab.drawerName()).toHaveText('secret_profile');

    await toggleSecretReveal(page, 'environment', 'secret_profile');

    await expect(variablesTab.drawer()).toHaveCount(0);
    await expect.poll(() => readVariableValue(page, 'environment', 'secret_profile')).toBe('********');
  });

  test('resets revealed secrets and the drawer when the environment changes', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    await test.step('Reveal a secret and open the drawer on Local', async () => {
      await toggleSecretReveal(page, 'environment', 'api_token');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('"sk-live-9f3a"');
      await openVariableDrawer(page, 'environment', 'feature_flags');
      await expect(variablesTab.drawer()).toBeVisible();
    });

    await test.step('Switching to Staging swaps the rows and closes the drawer', async () => {
      await selectEnvironment(page, 'Staging', 'collection');
      await expect(variablesTab.sectionSubtitle('environment')).toHaveText('Staging');
      await expect.poll(() => getVariableRowNames(page, 'environment')).toEqual(['api_url', 'stage_only']);
      await expect(variablesTab.drawer()).toHaveCount(0);
      await expect.poll(() => readVariableValue(page, 'environment', 'api_url')).toBe('"https://staging.example.com"');
    });

    await test.step('Switching back to Local masks the secret again', async () => {
      await selectEnvironment(page, 'Local', 'collection');
      await expect(variablesTab.sectionSubtitle('environment')).toHaveText('Local');
      await expect.poll(() => readVariableValue(page, 'environment', 'api_token')).toBe('********');
    });
  });

  test('sorts the environment rows by name and returns to the default order', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await seedVariables(page);
    await openVariablesTab(page, COLLECTION);

    const sortToggle = variablesTab.sectionSortToggle('environment');

    await test.step('Ascending keeps the alphabetical default', async () => {
      await sortToggle.click();
      await expect.poll(() => getVariableRowNames(page, 'environment')).toEqual(ENV_ROW_NAMES);
    });

    await test.step('Descending reverses it', async () => {
      await sortToggle.click();
      await expect.poll(() => getVariableRowNames(page, 'environment')).toEqual([...ENV_ROW_NAMES].reverse());
    });

    await test.step('A third click returns to the default order', async () => {
      await sortToggle.click();
      await expect.poll(() => getVariableRowNames(page, 'environment')).toEqual(ENV_ROW_NAMES);
    });

    await test.step('Sorting one section leaves the other alone', async () => {
      await expect.poll(() => getVariableRowNames(page, 'runtime')).toEqual(RUNTIME_ROW_NAMES);
    });
  });

  test('restores the scroll position after leaving and reopening the tab', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);
    const SCROLL_TOP = 300;

    await test.step('Open the long environment so the list overflows', async () => {
      // Through the usual setup first: the run right after a tab close can drop the
      // very first click on the environment dropdown, which every other test hides
      // because it re-selects the environment that is already active.
      await seedVariables(page);
      await selectEnvironment(page, 'Long', 'collection');
      await openVariablesTab(page, COLLECTION);

      await expect(variablesTab.sectionCount('environment')).toHaveText(String(LONG_ENV_VAR_COUNT));
      await expect.poll(() => getVariablesScrollRange(page)).toBeGreaterThan(SCROLL_TOP);
    });

    await scrollVariablesTo(page, SCROLL_TOP);

    await reopenVariablesTab(page, 'seed');

    await expect.poll(() => getVariablesScrollTop(page)).toBe(SCROLL_TOP);
  });

  test('restores a long object value\'s own scroll position inside its cell', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);
    const CELL_SCROLL_TOP = 60;

    // `deep_config` lives in its own environment: a second height-capped object row
    // in `Local` would push the last row out of the virtualized window.
    await seedVariables(page);
    await selectEnvironment(page, 'Deep', 'collection');
    await openVariablesTab(page, COLLECTION);

    const cell = () => variablesTab.rowEditor('environment', 'deep_config');

    await test.step('The cell is height-capped, so its editor scrolls on its own', async () => {
      await expect(variablesTab.rowMultiLineEditor('environment', 'deep_config')).toBeVisible();
      await expect.poll(() => getValueEditorScrollRange(cell())).toBeGreaterThan(CELL_SCROLL_TOP);
    });

    await scrollValueEditorTo(cell(), CELL_SCROLL_TOP);
    await expect.poll(() => getValueEditorScrollTop(cell())).toBe(CELL_SCROLL_TOP);

    await reopenVariablesTab(page, 'seed');

    await expect.poll(() => getValueEditorScrollTop(cell())).toBe(CELL_SCROLL_TOP);
  });

  test('shows the empty states when there is nothing to list', async ({ pageWithUserData: page }) => {
    const { variablesTab } = buildCommonLocators(page);

    await test.step('No runtime variables and no active environment', async () => {
      await openRequest(page, EMPTY_COLLECTION, 'placeholder', { persist: true });
      await openVariablesTab(page, EMPTY_COLLECTION);
      await selectNoEnvironment(page);

      await expect(variablesTab.sectionCount('runtime')).toHaveText('0');
      await expect(variablesTab.emptyMessage('No runtime variables found')).toBeVisible();
      await expect(variablesTab.emptyMessage('No environment selected')).toBeVisible();
    });

    await test.step('An environment with no variables', async () => {
      await selectEnvironment(page, 'Blank', 'collection');

      await expect(variablesTab.sectionSubtitle('environment')).toHaveText('Blank');
      await expect(variablesTab.sectionCount('environment')).toHaveText('0');
      await expect(variablesTab.emptyMessage('No environment variables found')).toBeVisible();
    });
  });
});
