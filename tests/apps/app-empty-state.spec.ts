import { test, expect } from '../../playwright';
import {
  createCollection,
  createRequest,
  createApp,
  selectAppView,
  activeAppPreviewSlot,
  appEmptyState,
  appEmptyStateAddCode,
  appEmptyStateLearnMore,
  setAppEnabled,
  previewApp
} from '../utils/page';

test.describe('App empty state', () => {
  test('A new collection app starts empty and its empty state opens the code editor', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('app-empty-collection');
    await createCollection(page, 'col-app-empty', collectionPath);

    await createApp(page, 'Empty App', { collectionName: 'col-app-empty' });

    await test.step('Preview shows the empty state, not a rendered app', async () => {
      await expect(appEmptyState(page)).toBeVisible({ timeout: 5000 });
      await expect(activeAppPreviewSlot(page).getByTestId('collection-app-preview').locator('webview')).toHaveCount(0);
    });

    await test.step('No placeholder code was seeded', async () => {
      await selectAppView(page, 'code');
      const editor = activeAppPreviewSlot(page).getByTestId('collection-app-code').locator('.CodeMirror').first();
      await editor.waitFor({ state: 'visible' });
      expect(await editor.evaluate((el) => (el as any).CodeMirror?.getValue())).toBe('');
    });

    await test.step('"Add app code" switches to the Code view', async () => {
      await selectAppView(page, 'preview');
      await appEmptyStateAddCode(page).click();
      await expect(activeAppPreviewSlot(page).getByTestId('collection-app-view-code')).toHaveClass(/active/);
    });
  });

  test('The same empty state renders for a request-level app', async ({ page, createTmpDir }) => {
    const collectionPath = await createTmpDir('app-empty-request');
    await createCollection(page, 'col-app-request', collectionPath);
    await createRequest(page, 'ping', 'col-app-request', { url: 'http://localhost:8081/ping' });

    await setAppEnabled(page, true);
    await previewApp(page);

    await expect(appEmptyState(page)).toBeVisible();
    await expect(appEmptyStateAddCode(page)).toBeVisible();
    await expect(appEmptyStateLearnMore(page)).toBeVisible();
  });
});
