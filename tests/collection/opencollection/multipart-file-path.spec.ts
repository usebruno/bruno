import { test, expect, closeElectronApp } from '../../../playwright';
import {
  addMultipartFileToLastRow,
  openRequest,
  removeFirstMultipartFile,
  saveRequest,
  selectRequestBodyMode,
  selectRequestPaneTab
} from '../../utils/page';
import * as fs from 'fs';
import * as path from 'path';

const collectionName = 'RelativePathBug';
const requestName = 'upload-payload';
const relativePayloadPath = 'files/payload.json';

const writeJson = async (filePath: string, value: unknown) => {
  await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
};

const setupOpenCollection = async (collectionDir: string, userDataDir: string) => {
  await fs.promises.mkdir(path.join(collectionDir, 'files'), { recursive: true });
  await fs.promises.mkdir(userDataDir, { recursive: true });

  await fs.promises.writeFile(
    path.join(collectionDir, 'opencollection.yml'),
    [
      'opencollection: "1.0.0"',
      'info:',
      `  name: ${collectionName}`,
      '  type: collection',
      ''
    ].join('\n'),
    'utf-8'
  );

  await fs.promises.writeFile(
    path.join(collectionDir, relativePayloadPath),
    '{"ok":true}\n',
    'utf-8'
  );

  await fs.promises.writeFile(
    path.join(collectionDir, `${requestName}.yml`),
    [
      'info:',
      `  name: ${requestName}`,
      '  type: http',
      '  seq: 1',
      '',
      'http:',
      '  method: POST',
      '  url: https://example.com/upload',
      '',
      'settings:',
      '  encodeUrl: true',
      '  timeout: 0',
      '  followRedirects: true',
      '  maxRedirects: 5',
      ''
    ].join('\n'),
    'utf-8'
  );

  await writeJson(path.join(userDataDir, 'preferences.json'), {
    lastOpenedCollections: [collectionDir],
    preferences: {
      onboarding: {
        hasLaunchedBefore: true,
        hasSeenWelcomeModal: true
      }
    }
  });

  await writeJson(path.join(userDataDir, 'collection-security.json'), {
    collections: [
      {
        path: collectionDir,
        securityConfig: {
          jsSandboxMode: 'safe'
        }
      }
    ]
  });
};

const expectRequestFileToContainRelativePayload = async (requestFilePath: string, payloadPath: string) => {
  await expect.poll(async () => fs.existsSync(requestFilePath)).toBe(true);
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).toContain(relativePayloadPath);
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).not.toContain(payloadPath);
};

test.describe('OpenCollection multipart file paths', () => {
  test('keeps an in-collection multipart file relative after restart, OpenCollection edit, remove, and re-add', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const collectionDir = path.join(await createTmpDir('opencollection-multipart'), collectionName);
    const userDataDir = await createTmpDir('opencollection-multipart-userdata');
    const payloadPath = path.join(collectionDir, relativePayloadPath);
    const requestFilePath = path.join(collectionDir, `${requestName}.yml`);

    await setupOpenCollection(collectionDir, userDataDir);

    let electronApp = await launchElectronApp({ userDataPath: userDataDir });
    let page = await electronApp.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
    await expect.poll(async () => fs.existsSync(requestFilePath), {
      timeout: 15000
    }).toBe(true);

    await openRequest(page, collectionName, requestName, { persist: true });
    await selectRequestBodyMode(page, 'Multipart Form');

    await addMultipartFileToLastRow(page, electronApp, payloadPath);
    await saveRequest(page);
    await expectRequestFileToContainRelativePayload(requestFilePath, payloadPath);

    await closeElectronApp(electronApp);
    await fs.promises.appendFile(path.join(collectionDir, 'opencollection.yml'), '\n\n', 'utf-8');

    electronApp = await launchElectronApp({ userDataPath: userDataDir });
    page = await electronApp.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

    await openRequest(page, collectionName, requestName, { persist: true });
    await selectRequestPaneTab(page, 'Body');
    await removeFirstMultipartFile(page);
    await saveRequest(page);

    await addMultipartFileToLastRow(page, electronApp, payloadPath);
    await saveRequest(page);

    await expectRequestFileToContainRelativePayload(requestFilePath, payloadPath);
  });
});
