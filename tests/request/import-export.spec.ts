import { test, expect } from '../../playwright';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  buildCommonLocators,
  openCollectionFromPath,
  closeAllCollections,
  sendRequestAndWaitForResponse
} from '../utils/page';

const requestContent = `meta {
  name: Shared request
  type: http
  seq: 1
}

post {
  url: http://localhost:8081/api/echo/everything
  body: json
  auth: none
}

headers {
  Content-Type: application/json
  X-Shared: yes
}

body:json {
  {"message": "hello"}
}

tests {
  test('status', () => expect(res.status).to.equal(200));
}
`;

test('exports a request and imports it into a folder without overwriting an existing file', async ({ page, electronApp, createTmpDir }, testInfo) => {
  const { sidebar, toast } = buildCommonLocators(page);
  const directory = await createTmpDir('request-transfer');
  const collectionPath = path.join(directory, 'collection');
  const folderPath = path.join(collectionPath, 'destination');
  const exportedPath = path.join(directory, 'shared.bru');
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'Request transfer', type: 'collection' }));
  await fs.writeFile(path.join(collectionPath, 'shared.bru'), requestContent);
  await fs.writeFile(path.join(folderPath, 'folder.bru'), 'meta {\n  name: Destination\n  seq: 2\n}\n');
  const existing = requestContent.replace('Shared request', 'Existing request');
  await fs.writeFile(path.join(folderPath, 'shared.bru'), existing);

  await electronApp.evaluate(({ dialog }) => {
    (global as any).__requestTransferDialogs = { open: dialog.showOpenDialog, save: dialog.showSaveDialog };
  });
  try {
    await openCollectionFromPath(page, electronApp, collectionPath);
    await expect(sidebar.collection('Request transfer')).toBeVisible();
    await sidebar.collectionChevron('Request transfer').click();
    await expect(sidebar.itemByName('Shared request')).toBeVisible();

    await electronApp.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    }, exportedPath);
    const requestMenu = sidebar.rowMenu('Shared request');
    await sidebar.itemRow('Shared request').hover();
    await requestMenu.trigger().click();
    await requestMenu.item('export-request').click();
    await expect(toast.byMessage('Request exported successfully')).toBeVisible();
    const exported = await fs.readFile(exportedPath, 'utf8');
    expect(exported).toContain('X-Shared: yes');
    expect(exported).toContain('"message": "hello"');
    expect(exported).toContain('test(\'status\', () => expect(res.status).to.equal(200));');

    await electronApp.evaluate(({ dialog }, sourcePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] });
    }, exportedPath);
    const folderMenu = sidebar.rowMenu('Destination');
    await sidebar.itemRow('Destination').hover();
    await folderMenu.trigger().click();
    await folderMenu.item('import-request').click();
    await expect(toast.byMessage('Request imported successfully')).toBeVisible();
    await expect(sidebar.folderRequest('Destination', 'Shared request')).toBeVisible();
    expect(await fs.readFile(path.join(folderPath, 'shared.bru'), 'utf8')).toBe(existing);
    const filenames = (await fs.readdir(folderPath)).filter((name) => name !== 'folder.bru' && name !== 'shared.bru');
    expect(filenames).toHaveLength(1);
    const imported = await fs.readFile(path.join(folderPath, filenames[0]), 'utf8');
    expect(imported.replace(/^  seq: \d+$/m, '')).toBe(exported.replace(/^  seq: \d+$/m, ''));

    await sendRequestAndWaitForResponse(page, 200);
    await page.screenshot({ path: testInfo.outputPath('request-transfer.png') });
  } finally {
    await closeAllCollections(page);
    await electronApp.evaluate(({ dialog }) => {
      const originals = (global as any).__requestTransferDialogs;
      dialog.showOpenDialog = originals.open;
      dialog.showSaveDialog = originals.save;
      delete (global as any).__requestTransferDialogs;
    });
  }
});

test('imports into a collection and leaves its files unchanged on invalid import or cancellation', async ({ page, electronApp, createTmpDir }) => {
  const { sidebar, toast } = buildCommonLocators(page);
  const directory = await createTmpDir('request-import-validation');
  const collectionPath = path.join(directory, 'collection');
  const sourcePath = path.join(directory, 'source.bru');
  await fs.mkdir(collectionPath);
  await fs.writeFile(path.join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name: 'Import validation', type: 'collection' }));
  await fs.writeFile(sourcePath, requestContent);

  await electronApp.evaluate(({ dialog }) => {
    (global as any).__requestTransferOpenDialog = dialog.showOpenDialog;
  });
  try {
    await openCollectionFromPath(page, electronApp, collectionPath);
    await expect(sidebar.collection('Import validation')).toBeVisible();
    await electronApp.evaluate(({ dialog }, sourcePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [sourcePath] });
    }, sourcePath);
    const menu = sidebar.rowMenu('Import validation', 'collection');
    await sidebar.collectionRow('Import validation').hover();
    await menu.trigger().click();
    await menu.item('import-request').click();
    await expect(sidebar.itemByName('Shared request')).toBeVisible();
    const filesBefore = await fs.readdir(collectionPath);

    await fs.writeFile(sourcePath, 'meta {\n  name: Not a request\n  seq: 1\n}');
    await sidebar.collectionRow('Import validation').hover();
    await menu.trigger().click();
    await menu.item('import-request').click();
    await expect(toast.byMessage(/Select a Bruno request file/)).toBeVisible();
    expect(await fs.readdir(collectionPath)).toEqual(filesBefore);

    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
    });
    await sidebar.collectionRow('Import validation').hover();
    await menu.trigger().click();
    await menu.item('import-request').click();
    expect(await fs.readdir(collectionPath)).toEqual(filesBefore);
  } finally {
    await closeAllCollections(page);
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (global as any).__requestTransferOpenDialog;
      delete (global as any).__requestTransferOpenDialog;
    });
  }
});
