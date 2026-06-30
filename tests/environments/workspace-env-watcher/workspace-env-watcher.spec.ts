import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';
import { openCollection, openEnvironmentSelector, closeEnvironmentPanel } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

/**
 * Regression test for the workspace-watcher IPC channel mismatch.
 *
 * `packages/bruno-electron/src/app/workspace-watcher.js` used to emit
 * `main:global-environment-{added,changed,deleted}`, but the renderer
 * (`packages/bruno-app/src/providers/App/useIpcEvents.js`) only listens
 * for `main:workspace-environment-{added,changed,deleted}`. As a result,
 * changes made to workspace global-environment files on disk never
 * reached Redux until the app was restarted.
 *
 * The test mutates the workspace's `environments/*.yml` files at runtime
 * and asserts the UI updates without a restart. It runs everything against
 * the Global Environments settings tab because that view is Redux-reactive
 * and avoids re-opening the tippy dropdown (which re-mounts when the
 * global-environments slice hydrates asynchronously on workspace open).
 */
test.describe('Workspace environment file watcher hot reload', () => {
  test('add / change / unlink of environment YAML files updates the UI without restart', async ({
    pageWithUserData: page,
    workspaceFixturePath
  }) => {
    expect(workspaceFixturePath, 'workspace fixture must be present').toBeTruthy();
    const environmentsDir = path.join(workspaceFixturePath!, 'environments');
    const alphaPath = path.join(environmentsDir, 'Alpha.yml');
    const betaPath = path.join(environmentsDir, 'Beta.yml');

    const locators = buildCommonLocators(page);
    const envItem = (name: string) =>
      page.locator('.environment-item').filter({ hasText: name });

    await openCollection(page, 'Test Collection');

    // No environment is selected on first launch, so the trigger renders in
    // its empty state and the global-environments slice hydrates async. Wait
    // for Alpha (the only seeded env) to land in the dropdown list before
    // doing anything else — that proves the workspace finished loading and
    // makes the subsequent tippy interaction stable.
    await openEnvironmentSelector(page, 'global');
    await expect(locators.environment.listOption('Alpha')).toBeVisible({ timeout: 10000 });

    // Open the Global Environments settings tab and use it for the rest of
    // the test. The tab is Redux-bound, so any IPC-driven store update from
    // the file watcher renders here without us having to re-open the tippy.
    await locators.environment.configureButton().click();

    const envTab = page.locator('.request-tab').filter({ hasText: 'Global Environments' });
    await expect(envTab).toBeVisible();
    await expect(envItem('Alpha')).toBeVisible();

    await test.step('Writing Beta.yml on disk surfaces it in the settings list without restart', async () => {
      await fs.promises.writeFile(
        betaPath,
        'name: Beta\nvariables:\n  - name: mode\n    value: beta\n',
        'utf8'
      );

      // `main:workspace-environment-added` triggers a re-fetch which updates
      // the globalEnvironments slice; the settings list re-renders.
      await expect(envItem('Beta')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Editing Alpha.yml on disk surfaces both value edits and new variables', async () => {
      // Activate Alpha in the settings list so its variables are the ones visible.
      await envItem('Alpha').click();

      // Initial state: Alpha has a single variable `mode` with value `alpha`.
      await expect(locators.environment.variableNameInput(0).first()).toHaveValue('mode');
      await expect(locators.environment.varRowLine('mode')).toHaveText('alpha');

      // Case A — edit the existing variable's value on disk.
      // This is the primary scenario the channel-mismatch bug regressed:
      // editing a workspace env variable in the file used to require an app
      // restart before the UI caught up.
      await fs.promises.writeFile(
        alphaPath,
        [
          'name: Alpha',
          'variables:',
          '  - name: mode',
          '    value: alpha-updated',
          ''
        ].join('\n'),
        'utf8'
      );

      await expect(locators.environment.varRowLine('mode')).toHaveText('alpha-updated', {
        timeout: 10000
      });

      // Case B — append a brand-new variable. Same `change` event, but
      // exercises newly added rows rendering in the table without restart.
      await fs.promises.writeFile(
        alphaPath,
        [
          'name: Alpha',
          'variables:',
          '  - name: mode',
          '    value: alpha-updated',
          '  - name: hotReloaded',
          '    value: yes',
          ''
        ].join('\n'),
        'utf8'
      );

      await expect(locators.environment.variableNameInput(1).first()).toHaveValue('hotReloaded', {
        timeout: 10000
      });
    });

    await test.step('Deleting Beta.yml removes it from the settings list without restart', async () => {
      await fs.promises.unlink(betaPath);

      await expect(envItem('Beta')).toHaveCount(0, { timeout: 10000 });
    });

    await closeEnvironmentPanel(page, 'global');
  });
});
