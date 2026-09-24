import { test, expect } from '../../playwright';
import { execSync } from 'child_process';
import path from 'path';
import type { Page } from '@playwright/test';

const fixturePath = path.join(__dirname, 'fixtures', 'collection', 'multipart-example.bru');

test.describe('Response Example - Multipart Form File Chips', () => {
  test.afterAll(async () => {
    // Restore the fixture .bru file in case any test mutated it. Skip silently
    // if the file isn't tracked in git yet (first commit of this fixture).
    try {
      execSync(`git ls-files --error-unmatch "${fixturePath}"`, { stdio: 'ignore' });
      execSync(`git checkout -- "${fixturePath}"`);
    } catch {
      // File isn't tracked; nothing to restore.
    }
  });

  const openMultipartExample = async (page: Page) => {
    await page.locator('#sidebar-collection-name').getByText('collection').click();

    const requestItem = page.locator('.collection-item-name', { hasText: 'multipart-example' });
    await expect(requestItem).toBeVisible();
    await requestItem.click();

    const exampleItem = page.locator('.collection-item-name').filter({ hasText: 'Three Files Example' });
    if (!(await exampleItem.isVisible().catch(() => false))) {
      await requestItem.getByTestId('request-item-chevron').click();
      await expect(exampleItem).toBeVisible();
    }
    await exampleItem.click();

    await expect(page.getByTestId('response-example-title')).toBeVisible();
  };

  test('renders multipart files as chips in read-only mode', async ({ pageWithUserData: page }) => {
    await test.step('Open the multipart example', async () => {
      await openMultipartExample(page);
    });

    await test.step('All three files are present', async () => {
      const summary = page.getByTestId('multipart-file-summary');
      const more = page.getByTestId('multipart-file-more');
      const inlineNames = await page.getByTestId('multipart-file-chip').allTextContents();
      const hasSummary = (await summary.count()) > 0;
      const overflowTrigger = hasSummary ? summary : (await more.count()) > 0 ? more : null;

      let names = inlineNames;
      if (overflowTrigger) {
        await overflowTrigger.click();
        const overflowRows = page.getByTestId('multipart-file-overflow-row');
        await expect(overflowRows.first()).toBeVisible();
        const overflowNames = await overflowRows.allTextContents();
        await overflowTrigger.click();
        await expect(overflowRows.first()).toBeHidden();
        names = hasSummary ? overflowNames : [...inlineNames, ...overflowNames];
      }

      expect(names).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt']);
    });

    await test.step('Destructive controls are hidden in read-only mode', async () => {
      await expect(page.getByTestId('multipart-file-upload')).toHaveCount(0);
      await expect(page.getByTestId('multipart-file-chip-remove')).toHaveCount(0);
    });
  });

  test('edit mode reveals the upload button', async ({ pageWithUserData: page }) => {
    await test.step('Open the multipart example', async () => {
      await openMultipartExample(page);
    });

    await test.step('All three files are present', async () => {
      const summary = page.getByTestId('multipart-file-summary');
      const more = page.getByTestId('multipart-file-more');
      const inlineNames = await page.getByTestId('multipart-file-chip').allTextContents();
      const hasSummary = (await summary.count()) > 0;
      const overflowTrigger = hasSummary ? summary : (await more.count()) > 0 ? more : null;

      let names = inlineNames;
      if (overflowTrigger) {
        await overflowTrigger.click();
        const overflowRows = page.getByTestId('multipart-file-overflow-row');
        await expect(overflowRows.first()).toBeVisible();
        const overflowNames = await overflowRows.allTextContents();
        await overflowTrigger.click();
        await expect(overflowRows.first()).toBeHidden();
        names = hasSummary ? overflowNames : [...inlineNames, ...overflowNames];
      }

      expect(names).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt']);
    });

    await test.step('Click edit on the example', async () => {
      await page.getByTestId('response-example-edit-btn').click();
    });

    await test.step('Upload button is now visible', async () => {
      await expect(page.getByTestId('multipart-file-upload').first()).toBeVisible();
    });

    await test.step('Cancel edit to leave the example untouched', async () => {
      await page.getByTestId('response-example-cancel-btn').click();
    });
  });
});
