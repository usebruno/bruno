import { test, expect } from '../../../../playwright';
import path from 'path';
import fs from 'fs';
import { createCollection, createEnvironment } from '../../../utils/page/actions';

test('should export environment color when collection export is made', async ({
  electronApp,
  page,
  createTmpDir
}) => {
  const collLocation = await createTmpDir('collection-env-export-with-color-collection');
  const exportDir = await createTmpDir('collection-env-export-with-color-export');
  const selectedColor = '#CE4F3B';

  await createCollection(page, 'demo', collLocation);

  await test.step('create environment', async () => {
    // Open environment settings
    await createEnvironment(page, 'color-demo', 'collection');
  });

  await test.step('change color', async () => {
    await page.getByTitle('Change color').getByRole('img').click();
    await page.getByTitle(selectedColor).click();
    await page.getByTestId('save-env').click();
    await page.getByTestId('sidebar-collection-row').hover();
    await page.getByTestId('collection-actions').click();
    await page.getByText('Share').click();
    const ocExportLocator = await page.locator('.format-card').filter({ hasText: 'YAML' }).first();
    await expect(ocExportLocator).toBeVisible();
    await ocExportLocator.click();
  });

  await test.step('check exported content', async () => {
    const exportFullPath = path.join(exportDir, 'demo.yml');
    const exportPromise = electronApp.evaluate(({ session }, { exportPath }) => {
      return new Promise((resolve, reject) => {
        session.defaultSession.once('will-download', (event, item) => {
          item.setSavePath(exportPath);
          item.once('done', (_doneEvent, state) => {
            if (state === 'completed') {
              resolve(exportPath);
              return;
            }
            reject(new Error(`Download failed with state: ${state}`));
          });
        });
      });
    }, { exportPath: exportFullPath });

    await page.getByRole('button', { name: 'Proceed' }).click();

    const exportedPath = await (exportPromise as Promise<string>);

    // Verify the file exists and contains expected data
    expect(fs.existsSync(exportedPath)).toBe(true);

    const fileContent = fs.readFileSync(exportedPath, 'utf8');
    expect(fileContent).toContain('demo');
    expect(fileContent).toContain('name: color-demo');
    expect(fileContent).toContain(selectedColor);
  });
});
