import { test, expect, closeElectronApp, waitForReadyPage } from '../../playwright';
import { buildCommonLocators, openCollection, openCollectionFromDialog } from '../utils/page';

test('aligns request methods and names with and without examples', async ({ launchElectronApp, collectionFixturePath }) => {
  const electronApp = await launchElectronApp();
  try {
    const page = await waitForReadyPage(electronApp);
    const { sidebar } = buildCommonLocators(page);

    await test.step('Open an isolated collection with both kinds of request', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await openCollection(page, 'collection');
      await expect(sidebar.requestExamplesToggle('multipart-example')).toBeVisible();
      await expect(sidebar.requestExamplesToggle('edit-example')).toHaveCount(0);
    });

    for (const expanded of [false, true]) {
      await test.step(`Keep columns aligned with examples ${expanded ? 'expanded' : 'collapsed'}`, async () => {
        if (expanded) {
          await sidebar.requestExamplesToggle('multipart-example').click();
          await expect(sidebar.example('Three Files Example')).toBeVisible();
        }

        for (const [column, locator] of [
          ['method', sidebar.requestMethod],
          ['name', sidebar.itemByName]
        ] as const) {
          const withExampleCell = locator('multipart-example');
          const withoutExampleCell = locator('edit-example');
          await expect(withExampleCell).toBeVisible();
          await expect(withoutExampleCell).toBeVisible();
          await expect.poll(async () => {
            const withExample = await withExampleCell.boundingBox();
            const withoutExample = await withoutExampleCell.boundingBox();
            return withExample && withoutExample ? withExample.x - withoutExample.x : null;
          }, { message: `The ${column} column should start at the same position` }).toBe(0);
        }
      });
    }
  } finally {
    await closeElectronApp(electronApp);
  }
});
