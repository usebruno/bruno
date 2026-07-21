// import fs from 'fs';
// import path from 'path';
// import { test, expect } from '../../../playwright';
// import { closeAllCollections, openCollection, buildCommonLocators } from '../../utils/page';

// test.describe('Migrating one collection to yml preserves nested tabs & expanded folders and leaves other collections untouched', () => {
//   test.afterAll(async ({ page }) => {
//     await closeAllCollections(page);
//   });

//   test('nested tabs stay open, nested folders stay expanded, other collection is untouched', async ({ pageWithUserData: page, collectionFixturePath }) => {
//     const collectionPath = collectionFixturePath!;
//     const loc = buildCommonLocators(page);

//     const pageErrors: Error[] = [];
//     page.on('pageerror', (error) => pageErrors.push(error));

//     await test.step('Both collections are open', async () => {
//       await expect(loc.sidebar.collection('migrate-source')).toBeVisible({ timeout: 15000 });
//       await expect(loc.sidebar.collection('keep-open')).toBeVisible();
//     });

//     await test.step('Expand nested folders and open nested requests as permanent tabs in the source collection', async () => {
//       await openCollection(page, 'migrate-source');
//       await loc.folder.chevron('api').click();
//       await loc.folder.chevron('v2').click();

//       await loc.sidebar.request('root-req').dblclick();
//       await loc.sidebar.request('users').dblclick();
//       await loc.sidebar.request('deep').dblclick();

//       await expect(page.locator('#request-url').locator('.CodeMirror')).toContainText('/api/v2/deep');
//     });

//     await test.step('Open a request tab in the other collection', async () => {
//       await openCollection(page, 'keep-open');
//       await loc.sidebar.request('Keep Me').dblclick();
//       await expect(page.locator('#request-url').locator('.CodeMirror')).toContainText('/keep');
//     });

//     await test.step('Migrate the source collection to yml', async () => {
//       await loc.sidebar.collection('migrate-source').click();
//       await page.getByTestId('collection-settings-tab-overview').click();
//       await page.getByRole('button', { name: 'Convert to YML' }).click();

//       const modal = page.locator('.bruno-modal').filter({ hasText: 'Migrate to YML format' });
//       await modal.waitFor({ state: 'visible', timeout: 5000 });
//       await modal.getByRole('button', { name: 'Migrate' }).click();

//       await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
//     });

//     await test.step('Files migrated on disk, including the deeply nested request', async () => {
//       expect(fs.existsSync(path.join(collectionPath, 'source-collection', 'api', 'v2', 'deep.yml'))).toBe(true);
//       expect(fs.existsSync(path.join(collectionPath, 'source-collection', 'api', 'v2', 'deep.bru'))).toBe(false);
//       expect(fs.existsSync(path.join(collectionPath, 'source-collection', 'api', 'users.yml'))).toBe(true);
//     });

//     await test.step('All nested request tabs stay open (no "Request no longer exists")', async () => {
//       await expect(page.getByText('Request no longer exists')).not.toBeVisible();

//       for (const name of ['root-req', 'users', 'deep']) {
//         await expect(page.locator('.request-tab .tab-label').filter({ hasText: name })).toBeVisible({ timeout: 15000 });
//       }
//     });

//     await test.step('A migrated tab resolves to a real request (not a broken not-found tab)', async () => {
//       await page.locator('.request-tab').filter({ hasText: 'deep' }).click({ force: true });
//       await expect(page.getByText('Request no longer exists')).not.toBeVisible();
//       await expect(page.locator('#request-url').locator('.CodeMirror')).toContainText('/api/v2/deep');
//     });

//     await test.step('Nested folders remain expanded (nested request rows still visible in the tree)', async () => {
//       await expect(loc.sidebar.request('users')).toBeVisible();
//       await expect(loc.sidebar.request('deep')).toBeVisible();
//     });

//     await test.step('The other collection tab is untouched by the migration', async () => {
//       await loc.sidebar.collection('keep-open').click();
//       await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Keep Me' })).toBeVisible();
//     });

//     expect(pageErrors).toHaveLength(0);
//   });
// });
