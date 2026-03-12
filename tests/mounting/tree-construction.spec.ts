import { test, expect, ElectronApplication, Page } from '../../playwright';
import { setupTestFixture, TestFixture } from '../utils/fixtures';
import { getCollectionTreeStructure, CollectionTreeItem, closeAllCollections } from '../utils/page';

const formats = ['bru', 'yml'] as const;

for (const format of formats) {
  test.describe(`[${format}] Collection Tree Construction`, () => {
    let fixture: TestFixture;
    let app: ElectronApplication;
    let page: Page;

    test.beforeAll(async ({ launchElectronApp }) => {
      fixture = await setupTestFixture({
        name: 'Tree Test Collection',
        requestCount: 10,
        depth: 2,
        foldersPerLevel: 2,
        format,
        environmentCount: 2,
        mixedMethods: true
      });

      app = await launchElectronApp({ userDataPath: fixture.userDataPath });
      page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    });

    test.afterAll(async () => {
      if (page) {
        await closeAllCollections(page);
      }
      if (app) {
        await app.context().close();
        await app.close();
      }
      if (fixture) {
        await fixture.cleanup();
      }
    });

    test('should render folders with correct hierarchy', async () => {
      const tree = await getCollectionTreeStructure(page, 'Tree Test Collection');

      // Verify collection name
      expect(tree.name).toBe('Tree Test Collection');

      // With depth=2 and foldersPerLevel=2, we expect:
      // - 2 top-level folders (F1, F2)
      // - Each top-level folder has 2 nested folders (F1-F1, F1-F2, etc.)
      const folders = tree.items.filter((item) => item.type === 'folder');
      expect(folders.length).toBeGreaterThanOrEqual(2);

      // Check that folders have the expected naming pattern (F1, F2)
      const folderNames = folders.map((f) => f.name);
      expect(folderNames.some((name) => /^F\d+$/.test(name))).toBe(true);
    });

    test('should render requests under correct parent folders', async () => {
      const tree = await getCollectionTreeStructure(page, 'Tree Test Collection');

      // Helper to count requests recursively
      const countRequests = (items: CollectionTreeItem[]): number => {
        return items.reduce((count, item) => {
          if (item.type === 'request') {
            return count + 1;
          }
          if (item.type === 'folder' && item.items) {
            return count + countRequests(item.items);
          }
          return count;
        }, 0);
      };

      // We generated 10 requests, they should all be present
      const totalRequests = countRequests(tree.items);
      expect(totalRequests).toBe(fixture.collection.requestCount);

      // Verify requests exist at various levels (root and in folders)
      const rootRequests = tree.items.filter((item) => item.type === 'request');
      const folders = tree.items.filter((item) => item.type === 'folder');

      // Requests should be distributed - some at root, some in folders
      const hasRequestsInFolders = folders.some(
        (folder) => folder.items && folder.items.some((item) => item.type === 'request')
      );

      // Either we have root requests or requests in folders (distribution depends on generator)
      expect(rootRequests.length > 0 || hasRequestsInFolders).toBe(true);
    });

    test('should display correct request method indicators', async () => {
      const tree = await getCollectionTreeStructure(page, 'Tree Test Collection');

      // Collect all requests recursively
      const collectRequests = (items: CollectionTreeItem[]): CollectionTreeItem[] => {
        const requests: CollectionTreeItem[] = [];
        for (const item of items) {
          if (item.type === 'request') {
            requests.push(item);
          }
          if (item.type === 'folder' && item.items) {
            requests.push(...collectRequests(item.items));
          }
        }
        return requests;
      };

      const requests = collectRequests(tree.items);

      // We generated with mixedMethods=true, so we should have various methods
      const methods = requests.map((r) => r.method).filter(Boolean);
      const uniqueMethods = [...new Set(methods)];

      // With 10 requests and mixed methods cycling through GET, POST, PUT, DELETE, PATCH
      // we should have at least 2 different methods
      expect(uniqueMethods.length).toBeGreaterThanOrEqual(2);

      // All methods should be valid HTTP methods (UI truncates methods > 5 chars to 3 chars)
      // DELETE -> DEL, OPTIONS -> OPT, etc.
      const validMethods = ['GET', 'POST', 'PUT', 'DEL', 'PATCH', 'HEAD', 'OPT'];
      for (const method of uniqueMethods) {
        expect(validMethods).toContain(method);
      }
    });

    test('should have correct parent-child relationships via naming convention', async () => {
      const tree = await getCollectionTreeStructure(page, 'Tree Test Collection');

      // Verify items are named with their parent prefix:
      // - Root requests: R1, R2, ...
      // - Folder F1 requests: F1-R1, F1-R2, ...
      // - Nested folder F1-F1 requests: F1-F1-R1, ...
      const verifyNaming = (items: CollectionTreeItem[], parentPrefix: string) => {
        for (const item of items) {
          if (item.type === 'request') {
            // Request should start with parent prefix (or be R1, R2 at root)
            if (parentPrefix) {
              expect(item.name.startsWith(parentPrefix + '-R')).toBe(true);
            } else {
              expect(item.name).toMatch(/^R\d+$/);
            }
          }
          if (item.type === 'folder') {
            // Folder should start with parent prefix (or be F1, F2 at root)
            if (parentPrefix) {
              expect(item.name.startsWith(parentPrefix + '-F')).toBe(true);
            } else {
              expect(item.name).toMatch(/^F\d+$/);
            }
            // Recursively verify children
            if (item.items) {
              verifyNaming(item.items, item.name);
            }
          }
        }
      };

      verifyNaming(tree.items, '');
    });
  });
}
