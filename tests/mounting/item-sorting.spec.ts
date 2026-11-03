import { test, expect, ElectronApplication, Page } from '../../playwright';
import { setupSortingTestFixture, TestFixture } from '../utils/fixtures';
import { getCollectionTreeStructure, closeAllCollections } from '../utils/page';

const formats = ['bru', 'yml'] as const;

for (const format of formats) {
  test.describe(`[${format}] Item Sorting`, () => {
    test.describe('sequence-based sorting', () => {
      let fixture: TestFixture;
      let app: ElectronApplication;
      let page: Page;

      test.beforeAll(async ({ launchElectronApp }) => {
        // Create items with non-alphabetical names but defined sequences
        // Sequence order should override alphabetical order
        fixture = await setupSortingTestFixture({
          name: 'Sequence Sort Collection',
          format,
          items: [
            { name: 'Zebra Request', seq: 1 },
            { name: 'Apple Request', seq: 2 },
            { name: 'Mango Request', seq: 3 },
            { name: 'Banana Request', seq: 4 }
          ]
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

      test('should sort items by sequence when defined', async () => {
        const tree = await getCollectionTreeStructure(page, 'Sequence Sort Collection');

        // Extract item names in their rendered order
        const itemNames = tree.items.map((item) => item.name);

        // Items should be in sequence order, not alphabetical
        // Zebra (seq: 1), Apple (seq: 2), Mango (seq: 3), Banana (seq: 4)
        expect(itemNames).toEqual([
          'Zebra Request',
          'Apple Request',
          'Mango Request',
          'Banana Request'
        ]);
      });
    });

    test.describe('alphabetical sorting', () => {
      let fixture: TestFixture;
      let app: ElectronApplication;
      let page: Page;

      test.beforeAll(async ({ launchElectronApp }) => {
        // Create items without sequence numbers - should sort alphabetically
        fixture = await setupSortingTestFixture({
          name: 'Alpha Sort Collection',
          format,
          items: [
            { name: 'Zebra Request' },
            { name: 'Apple Request' },
            { name: 'Mango Request' },
            { name: 'Banana Request' }
          ]
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

      test('should sort items alphabetically when no sequence defined', async () => {
        const tree = await getCollectionTreeStructure(page, 'Alpha Sort Collection');

        // Extract item names in their rendered order
        const itemNames = tree.items.map((item) => item.name);

        // Items should be in alphabetical order
        // Apple, Banana, Mango, Zebra
        expect(itemNames).toEqual([
          'Apple Request',
          'Banana Request',
          'Mango Request',
          'Zebra Request'
        ]);
      });
    });
  });
}
