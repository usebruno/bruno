import { test, expect, closeElectronApp } from '../../../playwright';
import {
  addMultipartFileToLastRow,
  buildCommonLocators,
  openRequest,
  removeFirstMultipartFile,
  saveRequest,
  selectRequestBodyMode,
  selectRequestPaneTab,
  sendRequestAndWaitForResponse
} from '../../utils/page';
import * as fs from 'fs';
import * as path from 'path';

const collectionName = 'RelativePathBug';
const requestName = 'upload-payload';
const relativePayloadPath = path.join('files', 'payload.json');

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
      '  url: http://localhost:8081/api/echo/everything',
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
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).toContain(` ${relativePayloadPath}\n`);
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).not.toContain(payloadPath);
};

const expectRequestFileNotToContainPayload = async (requestFilePath: string, payloadPath: string) => {
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).not.toContain(` ${relativePayloadPath}\n`);
  await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).not.toContain(payloadPath);
};

test.describe('OpenCollection multipart file paths', () => {
  // Regression coverage for https://github.com/usebruno/bruno/issues/8937
  test('keeps a multipart file relative and sends it as multipart after restart', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(120_000);

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
    const multipartTable = buildCommonLocators(page).table('multipart-form-table');
    await multipartTable.rowCell('name', 0).getByRole('textbox').fill('payload');
    await saveRequest(page);
    await expectRequestFileToContainRelativePayload(requestFilePath, payloadPath);
    await expect.poll(async () => fs.promises.readFile(requestFilePath, 'utf-8')).toContain('type: multipart-form');

    await closeElectronApp(electronApp);
    await fs.promises.appendFile(path.join(collectionDir, 'opencollection.yml'), '\n\n', 'utf-8');

    electronApp = await launchElectronApp({ userDataPath: userDataDir });
    page = await electronApp.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

    await openRequest(page, collectionName, requestName, { persist: true });
    await selectRequestPaneTab(page, 'Body');

    const locators = buildCommonLocators(page);
    await expect(locators.request.bodyModeSelector()).toContainText('Multipart Form');

    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    const responseBody = locators.response.previewContainer();
    await expect(responseBody).toContainText(/multipart\/form-data;\s*boundary=/i);
    await expect(responseBody).not.toContainText(/"content-type":\s*"application\/json"/i);
    await expect(responseBody).toContainText(
      /Content-Disposition:[\s\S]*form-data;[\s\S]*name=\\?"payload\\?"[\s\S]*filename=\\?"payload\.json\\?"/i
    );
    await expect(responseBody).toContainText(/\\?"ok\\?"\s*:\s*true/i);

    await removeFirstMultipartFile(page);
    await saveRequest(page);
    await expectRequestFileNotToContainPayload(requestFilePath, payloadPath);

    await addMultipartFileToLastRow(page, electronApp, payloadPath);
    await saveRequest(page);

    await expectRequestFileToContainRelativePayload(requestFilePath, payloadPath);
    await closeElectronApp(electronApp);
  });
});
