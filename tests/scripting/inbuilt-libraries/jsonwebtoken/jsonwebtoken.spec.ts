import { test, expect } from '../../../../playwright';

test.describe.serial('jwt collection success', () => {
  test('developer mode', async ({ pageWithUserData: page }) => {

    // init dev mode
    await page.getByTitle('jsonwebtoken').click();
    await page.getByLabel('Developer Mode(use only if').check();
    await page.getByRole('button', { name: 'Save' }).click();

    test.setTimeout(2 * 60 * 1000);

    // Run the collection
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.getByText('Run', { exact: true }).click();
    await page.getByRole('button', { name: 'Run Collection' }).click();
    await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });

    // Parse and validate test results
    const result = await page.getByText('Total Requests: ').innerText();
    const matches = result.match(/Total Requests: (\d+), Passed: (\d+), Failed: (\d+), Skipped: (\d+)/);
    if (!matches) {
      throw new Error('Could not parse test results');
    }
    const [totalRequests, passed, failed, skipped] = matches.slice(1);

    await expect(parseInt(totalRequests)).toBe(7);
    await expect(parseInt(passed)).toBe(7);
    await expect(parseInt(failed)).toBe(0);
    await expect(parseInt(skipped)).toBe(0);
    await expect(parseInt(passed)).toBe(parseInt(totalRequests) - parseInt(skipped) - parseInt(failed));
  });

  test('safe mode', async ({ pageWithUserData: page }) => {
    
    // init safe mode
    await page.getByTitle('jsonwebtoken').click();
    await page.getByText('Developer Mode').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    test.setTimeout(2 * 60 * 1000);

    // Run the collection
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.getByText('Run', { exact: true }).click();
    await page.getByRole('button', { name: 'Run Collection' }).click();
    await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });

    // Parse and validate test results
    const result = await page.getByText('Total Requests: ').innerText();
    const matches = result.match(/Total Requests: (\d+), Passed: (\d+), Failed: (\d+), Skipped: (\d+)/);
    if (!matches) {
      throw new Error('Could not parse test results');
    }
    const [totalRequests, passed, failed, skipped] = matches.slice(1);

    await expect(parseInt(totalRequests)).toBe(7);
    await expect(parseInt(passed)).toBe(7);
    await expect(parseInt(failed)).toBe(0);
    await expect(parseInt(skipped)).toBe(0);
    await expect(parseInt(passed)).toBe(parseInt(totalRequests) - parseInt(skipped) - parseInt(failed));
  });
});