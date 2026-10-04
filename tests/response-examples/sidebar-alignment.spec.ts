import { test, expect, closeElectronApp, waitForReadyPage } from '../../playwright';
import { buildCommonLocators, openCollection, openCollectionFromDialog } from '../utils/page';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

for (const method of ['POST', 'PATCH', 'TRACE']) {
  test(`aligns ${method} request rows and indents their response examples`, async ({ launchElectronApp, collectionFixturePath }) => {
    const electronApp = await launchElectronApp();
    try {
      const page = await waitForReadyPage(electronApp);
      const { sidebar } = buildCommonLocators(page);

      await test.step('Open an isolated collection with both kinds of request', async () => {
        for (const file of ['multipart-example.bru', 'edit-example.bru']) {
          const requestPath = path.join(collectionFixturePath!, file);
          const content = await readFile(requestPath, 'utf8');
          await writeFile(requestPath, content.replace(/^post \{/m, `${method.toLowerCase()} {`));
        }
        await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
        await openCollection(page, 'collection');
        await expect(sidebar.requestMethod('multipart-example')).toHaveText(method);
        await expect(sidebar.requestMethod('edit-example')).toHaveText(method);
        await expect(sidebar.requestExamplesToggle('multipart-example')).toBeVisible();
        await expect(sidebar.requestExamplesToggle('edit-example')).toHaveCount(0);
      });

      for (const expanded of [false, true]) {
        await test.step(`Keep columns aligned with examples ${expanded ? 'expanded' : 'collapsed'}`, async () => {
          if (expanded) {
            await sidebar.requestExamplesToggle('multipart-example').click();
            const exampleRow = sidebar.example('Three Files Example');
            await expect(exampleRow).toBeVisible();

            for (const [column, parentCell, exampleCell] of [
              ['name', sidebar.itemByName('multipart-example'), sidebar.exampleName('Three Files Example')],
              ['icon', sidebar.requestMethod('multipart-example'), sidebar.exampleIcon('Three Files Example')]
            ] as const) {
              await expect.poll(async () => {
                const parent = await parentCell.boundingBox();
                const example = await exampleCell.boundingBox();
                return parent && example ? example.x - parent.x : null;
              }, { message: `The example ${column} should be indented one level from its parent` }).toBe(16);
            }

            await exampleRow.click({ modifiers: ['ControlOrMeta'] });
            await expect(exampleRow).toHaveAttribute('data-selected', 'true');
            const parentName = sidebar.itemByName('multipart-example');
            const exampleName = sidebar.exampleName('Three Files Example');
            await expect.poll(async () => {
              const parent = await parentName.boundingBox();
              const example = await exampleName.boundingBox();
              return parent && example ? example.x - parent.x : null;
            }, { message: 'Selecting an example should preserve its indentation' }).toBe(16);
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
}
