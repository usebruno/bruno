import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, openCollection, openCollectionFromDialog } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const ymlRequest = (name: string) => `info:
  name: ${name}
  type: http
  seq: 1

http:
  method: GET
  url: https://example.com/${name}
`;

test.describe('User ignore entries in the collection config', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Should hide a folder listed in the opencollection.yml ignore list when the collection is opened', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('config-ignore-test');

    await test.step('Create a yml collection that ignores the "hidden" folder', async () => {
      fs.writeFileSync(
        path.join(collectionDir, 'opencollection.yml'),
        `opencollection: "1.0.0"
info:
  name: Config Ignore Test

bundled: false
extensions:
  bruno:
    ignore:
      - hidden
`
      );

      fs.mkdirSync(path.join(collectionDir, 'hidden'));
      fs.writeFileSync(path.join(collectionDir, 'hidden', 'folder.yml'), 'info:\n  name: hidden\n  type: folder\n  seq: 1\n');
      fs.writeFileSync(path.join(collectionDir, 'hidden', 'hidden-request.yml'), ymlRequest('Hidden Request'));
      fs.writeFileSync(path.join(collectionDir, 'visible-request.yml'), ymlRequest('Visible Request'));
    });

    await test.step('Open the collection', async () => {
      await openCollectionFromDialog(page, electronApp, collectionDir);
      await expect(locators.sidebar.collection('Config Ignore Test')).toBeVisible({ timeout: 30000 });
      await openCollection(page, 'Config Ignore Test');
    });

    await test.step('Ignored folder and its request stay hidden', async () => {
      await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.folder('hidden')).not.toBeVisible();
      await expect(locators.sidebar.request('Hidden Request')).not.toBeVisible();
    });
  });

  test('Should hide a folder listed in the bruno.json ignore list when the collection is opened', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('config-ignore-bru-test');

    await test.step('Create a bru collection that ignores the "hidden" folder', async () => {
      fs.writeFileSync(
        path.join(collectionDir, 'bruno.json'),
        JSON.stringify(
          {
            version: '1',
            name: 'Config Ignore Bru Test',
            type: 'collection',
            ignore: ['hidden']
          },
          null,
          2
        )
      );

      fs.mkdirSync(path.join(collectionDir, 'hidden'));
      fs.writeFileSync(
        path.join(collectionDir, 'hidden', 'folder.bru'),
        `meta {
  name: hidden
  seq: 1
}
`
      );
      fs.writeFileSync(
        path.join(collectionDir, 'hidden', 'hidden-request.bru'),
        `meta {
  name: Hidden Request
  type: http
  seq: 1
}

get {
  url: https://example.com/hidden
  body: none
  auth: none
}
`
      );
      fs.writeFileSync(
        path.join(collectionDir, 'visible-request.bru'),
        `meta {
  name: Visible Request
  type: http
  seq: 1
}

get {
  url: https://example.com/visible
  body: none
  auth: none
}
`
      );
    });

    await test.step('Open the collection', async () => {
      await openCollectionFromDialog(page, electronApp, collectionDir);
      await expect(locators.sidebar.collection('Config Ignore Bru Test')).toBeVisible({ timeout: 30000 });
      await openCollection(page, 'Config Ignore Bru Test');
    });

    await test.step('Ignored folder and its request stay hidden', async () => {
      await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.folder('hidden')).not.toBeVisible();
      await expect(locators.sidebar.request('Hidden Request')).not.toBeVisible();
    });
  });

  test('Should hide ignored folders when file cache is enabled', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const collectionDir = await createTmpDir('config-ignore-file-cache');
    const userDataPath = await createTmpDir('config-ignore-file-cache-userdata');
    const collectionName = 'Config Ignore File Cache Test';

    fs.writeFileSync(
      path.join(userDataPath, 'preferences.json'),
      JSON.stringify({
        preferences: {
          onboarding: {
            hasLaunchedBefore: true,
            hasSeenWelcomeModal: true
          },
          cache: {
            file: {
              enabled: true
            }
          }
        }
      })
    );
    fs.writeFileSync(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({
        version: '1',
        name: collectionName,
        type: 'collection',
        ignore: ['hidden']
      })
    );
    fs.mkdirSync(path.join(collectionDir, 'hidden'));
    fs.writeFileSync(path.join(collectionDir, 'hidden', 'folder.bru'), 'meta {\n  name: hidden\n  seq: 1\n}\n');
    fs.writeFileSync(
      path.join(collectionDir, 'hidden', 'hidden-request.bru'),
      'meta {\n  name: Hidden Request\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://example.com/hidden\n  body: none\n  auth: none\n}\n'
    );
    fs.writeFileSync(
      path.join(collectionDir, 'visible-request.bru'),
      'meta {\n  name: Visible Request\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://example.com/visible\n  body: none\n  auth: none\n}\n'
    );

    const electronApp = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(electronApp);
    const locators = buildCommonLocators(page);

    try {
      await openCollectionFromDialog(page, electronApp, collectionDir);
      await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 30000 });
      await openCollection(page, collectionName);

      await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.folder('hidden')).not.toBeVisible();
      await expect(locators.sidebar.request('Hidden Request')).not.toBeVisible();
    } finally {
      await closeElectronApp(electronApp);
    }
  });
});
