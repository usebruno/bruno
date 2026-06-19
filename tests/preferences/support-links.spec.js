import { test, expect } from '../../playwright';

test('Should verify all support links with correct URL in preference > Support tab', async ({ page }) => {
  // Open Preferences
  await page.getByLabel('Open Preferences').click();

  // Go to Support tab
  await page.locator('.tablist').getByRole('tab', { name: 'Support', exact: true }).click();

  // Verify all support links with correct URL
  const locator_twitter = page.locator('.tablist').locator('..').getByRole('link', { name: 'Twitter' });
  expect(await locator_twitter.getAttribute('href')).toEqual('https://twitter.com/use_bruno');

  const locator_github = page.locator('.tablist').locator('..').getByRole('link', { name: 'GitHub', exact: true });
  expect(await locator_github.getAttribute('href')).toEqual('https://github.com/usebruno/bruno');

  const locator_discord = page.locator('.tablist').locator('..').getByRole('link', { name: 'Discord', exact: true });
  expect(await locator_discord.getAttribute('href')).toEqual('https://discord.com/invite/KgcZUncpjq');

  const locator_reportissues = page.locator('.tablist').locator('..').getByRole('link', { name: 'Report Issues', exact: true });
  expect(await locator_reportissues.getAttribute('href')).toEqual('https://github.com/usebruno/bruno/issues');

  const locator_documentation = page.locator('.tablist').locator('..').getByRole('link', { name: 'Documentation', exact: true });
  expect(await locator_documentation.getAttribute('href')).toEqual('https://docs.usebruno.com');
});
