import { test, expect } from '../../playwright';

test.describe.parallel('Run Testbench Requests', () => {
  test('Run bruno-testbench in Developer Mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    await page.getByText('bruno-testbench').click();
    await page.getByLabel('Developer Mode(use only if').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('.environment-selector').nth(1).click();
    await page.locator('.dropdown-item').getByText('Prod').click();
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.getByText('Run', { exact: true }).click();
    await page.getByRole('button', { name: 'Run Collection' }).click();
    await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });

    const result = await page.getByText('Total Requests: ').innerText();
    const [totalRequests, passed, failed, skipped] = result
      .match(/Total Requests: (\d+), Passed: (\d+), Failed: (\d+), Skipped: (\d+)/)
      .slice(1);

    await expect(parseInt(failed)).toBe(0);
    await expect(parseInt(passed)).toBe(parseInt(totalRequests) - parseInt(skipped) - parseInt(failed));
  });

  test.fixme('Run bruno-testbench in Safe Mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    await page.getByText('bruno-testbench').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('.environment-selector').nth(1).click();
    await page.locator('.dropdown-item').getByText('Prod').click();
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.getByText('Run', { exact: true }).click();
    await page.getByRole('button', { name: 'Run Collection' }).click();
    await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });

    const result = await page.getByText('Total Requests: ').innerText();
    const [totalRequests, passed, failed, skipped] = result
      .match(/Total Requests: (\d+), Passed: (\d+), Failed: (\d+), Skipped: (\d+)/)
      .slice(1);

    await expect(parseInt(failed)).toBe(0);
    await expect(parseInt(passed)).toBe(parseInt(totalRequests) - parseInt(skipped) - parseInt(failed));
  });
});