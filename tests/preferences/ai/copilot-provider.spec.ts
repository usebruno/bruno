import { test, expect } from '../../../playwright';
import { buildCommonLocators, expandCopilotCard, openAiPreferences, selectPreferencesTab } from '../../utils/page';

test.describe('GitHub Copilot provider card', () => {
  test('offers GitHub sign-in and a token field that stays open or closed across tab switches', async ({ pageWithUserData: page }) => {
    const { copilot } = buildCommonLocators(page).ai;

    await openAiPreferences(page);
    await expandCopilotCard(page);

    await test.step('Signed out, the card offers both sign-in options with the token field closed', async () => {
      await expect(copilot.signInButton()).toBeVisible();
      await expect(copilot.useTokenButton()).toBeVisible();
      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'false');
      await expect(copilot.tokenInput()).toHaveCount(0);
    });

    await test.step('The token option opens the token field and shows as selected', async () => {
      await copilot.useTokenButton().click();
      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'true');
      await expect(copilot.useTokenButton()).toHaveClass(/selected/);
      await expect(copilot.tokenInput()).toBeVisible();
      await expect(copilot.saveTokenButton()).toBeVisible();
    });

    await test.step('Clicking the token option again closes the field', async () => {
      await copilot.useTokenButton().click();
      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'false');
      await expect(copilot.useTokenButton()).not.toHaveClass(/selected/);
      await expect(copilot.tokenInput()).toHaveCount(0);
    });

    await test.step('Escape in the token field closes it', async () => {
      await copilot.useTokenButton().click();
      await copilot.tokenInput().press('Escape');
      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'false');
      await expect(copilot.tokenInput()).toHaveCount(0);
    });

    await test.step('An open token field is still open after leaving and returning to the AI tab', async () => {
      await copilot.useTokenButton().click();
      await expect(copilot.tokenInput()).toBeVisible();

      await selectPreferencesTab(page, 'General');
      await expect(copilot.card()).toHaveCount(0);
      await selectPreferencesTab(page, 'AI');
      await expandCopilotCard(page);

      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'true');
      await expect(copilot.tokenInput()).toBeVisible();
    });

    await test.step('A closed token field is still closed after leaving and returning to the AI tab', async () => {
      await copilot.useTokenButton().click();
      await expect(copilot.tokenInput()).toHaveCount(0);

      await selectPreferencesTab(page, 'General');
      await expect(copilot.card()).toHaveCount(0);
      await selectPreferencesTab(page, 'AI');
      await expandCopilotCard(page);

      await expect(copilot.useTokenButton()).toHaveAttribute('aria-expanded', 'false');
      await expect(copilot.tokenInput()).toHaveCount(0);
    });
  });
});
