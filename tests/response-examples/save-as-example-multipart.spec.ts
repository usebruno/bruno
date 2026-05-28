import { test, expect } from '../../playwright';
import fs from 'fs';
import path from 'path';

const fixturePath = path.join(__dirname, 'fixtures', 'collection', 'multipart-example.bru');

test.describe('Response Example - multipart files preserved when creating example from request', () => {
  // Snapshot the fixture so we restore the exact working-tree state (including
  // any uncommitted changes), not whatever HEAD has.
  let originalFixture: string;

  test.beforeAll(() => {
    originalFixture = fs.readFileSync(fixturePath, 'utf8');
  });

  test.afterAll(() => {
    fs.writeFileSync(fixturePath, originalFixture);
  });

  test('file chips render real names, not "[Circular]"', async ({ pageWithUserData: page }) => {
    await test.step('Open the multipart request', async () => {
      await page.locator('#sidebar-collection-name').getByText('collection').click();
      await page.locator('.collection-item-name').filter({ hasText: 'multipart-example' }).click();
    });

    await test.step('Open the 3-dot menu and pick "Create Example"', async () => {
      const requestRow = page.locator('.collection-item-name').filter({ hasText: 'multipart-example' });
      await requestRow.hover();
      await requestRow.locator('.menu-icon').click({ force: true });
      await page.locator('[role="menuitem"][data-item-id="create-example"]').click();
    });

    await test.step('Fill the modal and submit', async () => {
      await page.getByTestId('create-example-name-input').clear();
      await page.getByTestId('create-example-name-input').fill('Created From Request');
      await page.getByRole('button', { name: 'Create Example' }).click();
    });

    await test.step('Example tab opens with the right title', async () => {
      const title = page.getByTestId('response-example-title');
      await expect(title).toBeVisible();
      await expect(title).toContainText('Created From Request');
    });

    await test.step('File chips show real names', async () => {
      // Read whichever layout shows up: inline chips or the collapsed summary dropdown.
      const chips = page.getByTestId('multipart-file-chip');
      let names = await chips.allTextContents();

      if (names.length === 0) {
        await page.getByTestId('multipart-file-summary').click();
        names = await page.getByTestId('multipart-file-overflow-row').allTextContents();
      }

      expect(names).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt']);
      expect(names).not.toContain('[Circular]');
    });
  });
});
