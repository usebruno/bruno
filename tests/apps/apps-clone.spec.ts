import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../playwright';
import { createCollection, createApp, buildCommonLocators } from '../utils/page';

const appSidebarItem = (page: Page, collectionName: string, appName: string) => {
  const { sidebar } = buildCommonLocators(page);
  return sidebar.collectionScope(collectionName).locator('.collection-item-name').filter({ hasText: appName });
};

const findFiles = (dir: string, predicate: (name: string) => boolean): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findFiles(full, predicate));
    else if (predicate(entry.name)) out.push(entry.name);
  }
  return out;
};

test.describe('Apps - clone', () => {
  test.afterEach(async ({ page }) => {
    await page.keyboard.press('Escape').catch(() => {});
  });

  test('cloning an app creates a "<name> copy" app (one-click)', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('apps-clone');
    const collectionName = 'apps-clone';
    await createCollection(page, collectionName, collectionPath);

    await createApp(page, 'my-app', { collectionName });

    await test.step('Clone the app via its row menu', async () => {
      const row = appSidebarItem(page, collectionName, 'my-app').first();
      await row.hover();
      await row.locator('.menu-icon').click();
      await page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'Clone' }).click();
    });

    await test.step('Sidebar: the clone appears as "my-app copy"; the original is kept', async () => {
      await expect(appSidebarItem(page, collectionName, 'my-app copy')).toBeVisible();
      await expect(appSidebarItem(page, collectionName, 'my-app')).toHaveCount(2);
    });

    await test.step('On disk: the cloned app file is written (electron resolves the name)', async () => {
      await expect
        .poll(() => findFiles(collectionPath, (name) => name.includes('my-app copy')), { timeout: 10000 })
        .toHaveLength(1);
    });
  });
});
