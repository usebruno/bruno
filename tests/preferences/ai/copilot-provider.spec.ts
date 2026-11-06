import { test, expect } from '../../../playwright';
import { buildCommonLocators, expandCopilotCard, openAiPreferences } from '../../utils/page';

test.describe('GitHub Copilot provider card', () => {
  test('offers Sign in with GitHub when signed out', async ({ pageWithUserData: page }) => {
    const { copilot } = buildCommonLocators(page).ai;

    await openAiPreferences(page);

    await test.step('The collapsed card shows that nobody is signed in', async () => {
      await expect(copilot.card()).toBeVisible();
      await expect(copilot.header()).toContainText('Not signed in');
    });

    await expandCopilotCard(page);

    await test.step('The expanded card offers Sign in with GitHub and no account', async () => {
      await expect(copilot.signInButton()).toBeVisible();
      await expect(copilot.signInButton()).toBeEnabled();
      await expect(copilot.account()).toHaveCount(0);
    });

    await test.step('Clicking the header again collapses the card', async () => {
      await copilot.header().click();
      await expect(copilot.header()).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
