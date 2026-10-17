import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createFolder, createRequest } from '../../utils/page';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Move tabs', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tab move by drag and drop', async ({ page, createTmpDir }) => {
    await createCollection(page, 'source-collection-drag-drop', await createTmpDir('source-collection-drag-drop'));
    await createFolder(page, 'test-folder', 'source-collection-drag-drop');

    // Open the folder tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' })).toBeVisible();

    await createRequest(page, 'test-request', 'source-collection-drag-drop', { url: 'https://echo.usebruno.com' });

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // Verify order of tabs before move
    const tabs = page.locator('.request-tab .tab-label');
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');

    // Drag and drop the request tab before the folder tab
    let source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    let target = page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' });
    let sourceBox = await source.boundingBox();
    let targetBox = await target.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
      await page.mouse.up();
    }

    // Verify order of tabs after drag and drop
    await expect(tabs.nth(0)).toHaveText('GETtest-request');
    await expect(tabs.nth(1)).toHaveText('test-folder');

    // Drag and drop the request tab back to its original position
    source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    target = page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' });
    sourceBox = await source.boundingBox();
    targetBox = await target.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height + 10, { steps: 5 });
      await page.mouse.up();
    }
  });

  test('Verify tab move by keyboard shortcut', async ({ page, createTmpDir }) => {
    await createCollection(page, 'source-collection-keyboard-shortcut', await createTmpDir('source-collection-keyboard-shortcut'));
    await createFolder(page, 'test-folder', 'source-collection-keyboard-shortcut');

    // Open the folder tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-folder' })).toBeVisible();

    await createRequest(page, 'test-request', 'source-collection-keyboard-shortcut', { url: 'https://echo.usebruno.com' });

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // Verify order of tabs before move
    const tabs = page.locator('.request-tab .tab-label');
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');

    // Move the request tab before the folder tab using keyboard shortcut
    const source = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    await source.click();
    await page.keyboard.press(`${modifier}+BracketLeft`);

    // Verify order of tabs after move
    await expect(tabs.nth(0)).toHaveText('GETtest-request');
    await expect(tabs.nth(1)).toHaveText('test-folder');

    // Move the request tab back to its original position using keyboard shortcut
    await source.click();
    await page.keyboard.press(`${modifier}+BracketRight`);

    // Verify order of tabs after move
    await expect(tabs.nth(0)).toHaveText('test-folder');
    await expect(tabs.nth(1)).toHaveText('GETtest-request');
  });
});
