import fs from 'fs';
import path from 'path';
import { test, expect, ElectronApplication } from '../../../playwright';
import { buildCommonLocators, expandCopilotCard, openAiPreferences, waitForReadyPage } from '../../utils/page';

const FAKE_GH_SIGNED_OUT = `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "gh version 2.0.0"
  exit 0
fi
echo "You are not logged into any GitHub hosts. To log in, run: gh auth login" >&2
exit 1
`;

const FAKE_USER_CODE = 'ABCD-1234';

const FAKE_MODEL = {
  id: 'gpt-4.1',
  name: 'GPT-4.1',
  capabilities: { type: 'chat', supports: { streaming: true } },
  policy: { state: 'enabled' },
  billing: { multiplier: 0 }
};

type SignInDecision = 'pending' | 'approved' | 'denied';

const installFakeGitHub = (app: ElectronApplication, models: unknown[] = [FAKE_MODEL]) => app.evaluate((_electron, fakeModels) => {
  const realFetch = globalThis.fetch;
  const fake = { decision: 'pending' };
  (globalThis as any).__fakeGitHub = fake;
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (input: any, init?: any) => {
    const url = String(input?.url ?? input);
    if (url === 'https://github.com/login/device/code') {
      return json({ device_code: 'fake-device-code', user_code: 'ABCD-1234', expires_in: 900, interval: 1 });
    }
    if (url === 'https://github.com/login/oauth/access_token') {
      if (fake.decision === 'approved') return json({ access_token: 'fake-access-token' });
      if (fake.decision === 'denied') return json({ error: 'access_denied' });
      return json({ error: 'authorization_pending' });
    }
    if (url === 'https://api.github.com/user') {
      return json({ login: 'bruno-tester', name: 'Bruno Tester', avatar_url: '' });
    }
    if (url === 'https://api.github.com/graphql') {
      return json({ data: { viewer: { copilotEndpoints: { api: 'https://copilot.fake.test' } } } });
    }
    if (url === 'https://copilot.fake.test/models') {
      return json({ data: fakeModels });
    }
    if (url === 'https://copilot.fake.test/chat/completions') {
      return json({ choices: [] });
    }
    return realFetch(input, init);
  };
}, models);

const decideOnGitHub = (app: ElectronApplication, decision: SignInDecision) =>
  app.evaluate((_electron, next) => {
    (globalThis as any).__fakeGitHub.decision = next;
  }, decision);

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

  test.describe('Sign in with GitHub', () => {
    const startSignIn = async (launchElectronApp, installFakeClipboard, models?: unknown[]) => {
      const app = await launchElectronApp({ initUserDataPath: path.join(__dirname, 'init-user-data') });
      await installFakeGitHub(app, models);
      const page = await waitForReadyPage(app);
      const clipboard = await installFakeClipboard(page);
      const { copilot } = buildCommonLocators(page).ai;

      await openAiPreferences(page);
      await expandCopilotCard(page);

      await test.step('Click Sign in with GitHub', async () => {
        await copilot.signInButton().click();
      });

      await test.step('The card shows the code, copies it and waits for GitHub', async () => {
        await expect(copilot.userCode()).toHaveText(FAKE_USER_CODE);
        expect(await clipboard.copiedText()).toBe(FAKE_USER_CODE);
        await expect(copilot.header()).toContainText('Waiting for GitHub');
      });

      return { app, copilot };
    };

    test('signs in after approval on GitHub and turns Copilot on', async ({ launchElectronApp, installFakeClipboard }) => {
      const { app, copilot } = await startSignIn(launchElectronApp, installFakeClipboard);

      await test.step('Approve the code on GitHub', async () => {
        await decideOnGitHub(app, 'approved');
      });

      await test.step('The card shows the account and models, and Copilot is on', async () => {
        await expect(copilot.account()).toHaveText('@bruno-tester');
        await expect(copilot.header()).toContainText('1/1 models');
        await expect(copilot.userCode()).toHaveCount(0);
        await expect(copilot.providerSwitch()).toBeChecked();
        await expect(copilot.noModelsNotice()).toHaveCount(0);
      });
    });

    test('explains that no models are available when GitHub returns none', async ({ launchElectronApp, installFakeClipboard }) => {
      const { app, copilot } = await startSignIn(launchElectronApp, installFakeClipboard, []);

      await test.step('Approve the code on GitHub', async () => {
        await decideOnGitHub(app, 'approved');
      });

      await test.step('The card shows the account, no models and a notice explaining why', async () => {
        await expect(copilot.account()).toHaveText('@bruno-tester');
        await expect(copilot.header()).toContainText('No models available');
        await expect(copilot.noModelsNotice()).toContainText('GitHub didn\'t return any Copilot models for this account');
        await expect(copilot.error()).toHaveCount(0);
      });
    });

    test('shows an error and stays signed out when the code is denied on GitHub', async ({ launchElectronApp, installFakeClipboard }) => {
      const { app, copilot } = await startSignIn(launchElectronApp, installFakeClipboard);

      await test.step('Deny the code on GitHub', async () => {
        await decideOnGitHub(app, 'denied');
      });

      await test.step('The card says sign-in was cancelled and Copilot stays off', async () => {
        await expect(copilot.error()).toContainText('Sign-in was cancelled on GitHub.');
        await expect(copilot.header()).toContainText('Not signed in');
        await expect(copilot.account()).toHaveCount(0);
        await expect(copilot.providerSwitch()).not.toBeChecked();
      });
    });

    test('returns to signed out when sign-in is cancelled in Bruno', async ({ launchElectronApp, installFakeClipboard }) => {
      const { copilot } = await startSignIn(launchElectronApp, installFakeClipboard);

      await test.step('Click Cancel', async () => {
        await copilot.cancelSignInButton().click();
      });

      await test.step('The card is signed out again and offers both options', async () => {
        await expect(copilot.userCode()).toHaveCount(0);
        await expect(copilot.header()).toContainText('Not signed in');
        await expect(copilot.signInButton()).toBeEnabled();
        await expect(copilot.useGitHubCliButton()).toBeEnabled();
        await expect(copilot.providerSwitch()).not.toBeChecked();
      });
    });
  });
});
