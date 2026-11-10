import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, expandCopilotCard, openAiPreferences, waitForReadyPage } from '../../utils/page';

const FAKE_GH_SIGNED_OUT = `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "gh version 2.0.0"
  exit 0
fi
echo "You are not logged into any GitHub hosts. To log in, run: gh auth login" >&2
exit 1
`;

test.describe('GitHub Copilot provider card', () => {
  test('offers Sign in with GitHub and the GitHub CLI when signed out', async ({ pageWithUserData: page }) => {
    const { copilot } = buildCommonLocators(page).ai;

    await openAiPreferences(page);

    await test.step('The collapsed card shows that nobody is signed in', async () => {
      await expect(copilot.card()).toBeVisible();
      await expect(copilot.header()).toContainText('Not signed in');
    });

    await expandCopilotCard(page);

    await test.step('The expanded card offers Sign in with GitHub, the GitHub CLI and no account', async () => {
      await expect(copilot.signInButton()).toBeVisible();
      await expect(copilot.signInButton()).toBeEnabled();
      await expect(copilot.useGitHubCliButton()).toBeVisible();
      await expect(copilot.useGitHubCliButton()).toBeEnabled();
      await expect(copilot.account()).toHaveCount(0);
    });

    await test.step('Clicking the header again collapses the card', async () => {
      await copilot.header().click();
      await expect(copilot.header()).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test.describe('Use GitHub CLI', () => {
    test.skip(process.platform === 'win32', 'Bruno also looks for gh in its Windows install folders, so PATH alone cannot hide it');

    test('explains how to install gh when it is not on the PATH', async ({ launchElectronApp, createTmpDir }) => {
      const emptyBinDir = await createTmpDir('copilot-no-gh');
      const app = await launchElectronApp({
        initUserDataPath: path.join(__dirname, 'init-user-data'),
        dotEnv: { PATH: emptyBinDir }
      });
      const page = await waitForReadyPage(app);
      const { copilot } = buildCommonLocators(page).ai;

      await openAiPreferences(page);
      await expandCopilotCard(page);

      await test.step('Click Use GitHub CLI', async () => {
        await copilot.useGitHubCliButton().click();
      });

      await test.step('The card says gh is not installed and stays signed out', async () => {
        await expect(copilot.error()).toContainText('GitHub CLI (gh) is not installed');
        await expect(copilot.error()).toContainText('https://cli.github.com');
        await expect(copilot.header()).toContainText('Not signed in');
        await expect(copilot.account()).toHaveCount(0);
        await expect(copilot.useGitHubCliButton()).toBeEnabled();
      });
    });

    test('asks to run gh auth login when gh is installed but signed out', async ({ launchElectronApp, createTmpDir }) => {
      const binDir = await createTmpDir('copilot-gh-signed-out');
      const fakeGh = path.join(binDir, 'gh');
      await fs.promises.writeFile(fakeGh, FAKE_GH_SIGNED_OUT, { mode: 0o755 });
      const app = await launchElectronApp({
        initUserDataPath: path.join(__dirname, 'init-user-data'),
        dotEnv: { PATH: binDir }
      });
      const page = await waitForReadyPage(app);
      const { copilot } = buildCommonLocators(page).ai;

      await openAiPreferences(page);
      await expandCopilotCard(page);

      await test.step('Click Use GitHub CLI', async () => {
        await copilot.useGitHubCliButton().click();
      });

      await test.step('The card asks to run gh auth login and stays signed out', async () => {
        await expect(copilot.error()).toContainText('GitHub CLI is not signed in');
        await expect(copilot.error()).toContainText('gh auth login');
        await expect(copilot.header()).toContainText('Not signed in');
        await expect(copilot.account()).toHaveCount(0);
        await expect(copilot.signInButton()).toBeEnabled();
      });
    });
  });
});
