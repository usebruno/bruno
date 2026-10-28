import { test, expect, closeElectronApp, waitForReadyPage } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import {
  closeAllCollections,
  expandFolder,
  ignoreFolder,
  openCollection,
  openCollectionFromDialog,
  removeCollection
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const ymlRequest = (name: string) => `info:
  name: ${name}
  type: http
  seq: 1

http:
  method: GET
  url: https://example.com/${name}
`;

const fileCacheOnInitUserDataPath = path.join(__dirname, 'init-user-data-file-cache-on');
const fileCacheOffInitUserDataPath = path.join(__dirname, 'init-user-data-file-cache-off');
const menuIgnoreCollectionFixturePath = path.join(__dirname, 'fixtures', 'menu-ignore-collection');

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
    createTmpDir,
    collectionFixturePath
  }) => {
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

    const electronApp = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(electronApp);
    const locators = buildCommonLocators(page);

    try {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 30000 });
      await openCollection(page, collectionName);

      await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
      await expect(locators.sidebar.folder('hidden')).not.toBeVisible();
      await expect(locators.sidebar.request('Hidden Request')).not.toBeVisible();
    } finally {
      await closeElectronApp(electronApp);
    }
  });

  test('Should hide folders ignored after they were already cached', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('config-ignore-sticky-cache-userdata');
    const collectionDir = await createTmpDir('config-ignore-sticky-cache-collection');
    const collectionName = 'Config Ignore Sticky Cache Test';
    const brunoConfigPath = path.join(collectionDir, 'bruno.json');

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
      brunoConfigPath,
      JSON.stringify(
        {
          version: '1',
          name: collectionName,
          type: 'collection'
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

    const electronApp = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(electronApp);
    const locators = buildCommonLocators(page);

    try {
      await test.step('Open once so the ignored folder is written into the file cache', async () => {
        await openCollectionFromDialog(page, electronApp, collectionDir);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 30000 });
        await openCollection(page, collectionName);
        await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
        await expect(locators.sidebar.folder('hidden')).toBeVisible();
        await expandFolder(page, 'hidden');
        await expect(locators.sidebar.request('Hidden Request')).toBeVisible();
      });

      await test.step('Add ignore and remount against the warm cache', async () => {
        await removeCollection(page, collectionName);
        fs.writeFileSync(
          brunoConfigPath,
          JSON.stringify(
            {
              version: '1',
              name: collectionName,
              type: 'collection',
              ignore: ['hidden']
            },
            null,
            2
          )
        );

        await openCollectionFromDialog(page, electronApp, collectionDir);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible({ timeout: 30000 });
        await openCollection(page, collectionName);

        await expect(locators.sidebar.request('Visible Request')).toBeVisible({ timeout: 10000 });
        await expect(locators.sidebar.folder('hidden')).not.toBeVisible();
        await expect(locators.sidebar.request('Hidden Request')).not.toBeVisible();
      });
    } finally {
      await closeElectronApp(electronApp);
    }
  });
});

test.describe('Ignore a folder from the sidebar menu', () => {
  test.describe.configure({ timeout: 60_000 });

  test('TC-7392: Verify Folder Can Be Ignored from the Menu with File cache on', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('menu-ignore-file-cache-on-userdata');
    const collectionDir = await createTmpDir('menu-ignore-file-cache-on-collection');
    const collectionName = 'Menu Ignore Test';
    const brunoConfigPath = path.join(collectionDir, 'bruno.json');

    let electronApp = await test.step('Precondition: Turn on the File cache.', async () => {
      return launchElectronApp({ initUserDataPath: fileCacheOnInitUserDataPath, userDataPath });
    });

    try {
      let page = await waitForReadyPage(electronApp);
      let locators = buildCommonLocators(page);

      await test.step('Precondition: workspace contains a collection with one or more folders.', async () => {
        await fs.promises.cp(menuIgnoreCollectionFixturePath, collectionDir, { recursive: true });
        await openCollectionFromDialog(page, electronApp, collectionDir);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await openCollection(page, collectionName);
        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
        await expandFolder(page, 'hidden');
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).toBeVisible();
      });

      await test.step('Step 01: Right click any folder in the collection and select Ignore Folder.', async () => {
        await ignoreFolder(page, collectionName, 'hidden');
        await expect.poll(() => JSON.parse(fs.readFileSync(brunoConfigPath, 'utf8')).ignore).toContain('hidden');
      });

      await test.step('Step 02: Observe the collection tree after ignoring the folder.', async () => {
        await expect(locators.sidebar.itemsIn(collectionName, 'hidden')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
      });

      await test.step('Step 03: Reopen Bruno and workspace/collection.', async () => {
        await closeElectronApp(electronApp);
        electronApp = await launchElectronApp({ userDataPath });
        page = await waitForReadyPage(electronApp);
        locators = buildCommonLocators(page);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await openCollection(page, collectionName);

        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'hidden')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).not.toBeVisible();
      });
    } finally {
      await closeElectronApp(electronApp);
    }
  });

  test('TC-4473: Verify Folder Can Be Ignored from the Menu with File cache off', { tag: '@sanity' }, async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('menu-ignore-file-cache-off-userdata');
    const collectionDir = await createTmpDir('menu-ignore-file-cache-off-collection');
    const collectionName = 'Menu Ignore Test';
    const brunoConfigPath = path.join(collectionDir, 'bruno.json');

    let electronApp = await test.step('Precondition: File cache should be off.', async () => {
      return launchElectronApp({ initUserDataPath: fileCacheOffInitUserDataPath, userDataPath });
    });

    try {
      let page = await waitForReadyPage(electronApp);
      let locators = buildCommonLocators(page);

      await test.step('Precondition: A workspace contains a collection with one or more folders.', async () => {
        await fs.promises.cp(menuIgnoreCollectionFixturePath, collectionDir, { recursive: true });
        await openCollectionFromDialog(page, electronApp, collectionDir);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await openCollection(page, collectionName);
        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
        await expandFolder(page, 'hidden');
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).toBeVisible();
      });

      await test.step('Step 01: Right click any folder in the collection and select Ignore Folder.', async () => {
        await ignoreFolder(page, collectionName, 'hidden');
        await expect.poll(() => JSON.parse(fs.readFileSync(brunoConfigPath, 'utf8')).ignore).toContain('hidden');
      });

      await test.step('Step 02: Observe the collection tree after ignoring the folder.', async () => {
        await expect(locators.sidebar.itemsIn(collectionName, 'hidden')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
      });

      await test.step('Step 03: Reopen Bruno and workspace/collection.', async () => {
        await closeElectronApp(electronApp);
        electronApp = await launchElectronApp({ userDataPath });
        page = await waitForReadyPage(electronApp);
        locators = buildCommonLocators(page);
        await expect(locators.sidebar.collection(collectionName)).toBeVisible();
        await openCollection(page, collectionName);

        await expect(locators.sidebar.itemsIn(collectionName, 'Visible Request')).toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'hidden')).not.toBeVisible();
        await expect(locators.sidebar.itemsIn(collectionName, 'Hidden Request')).not.toBeVisible();
      });
    } finally {
      await closeElectronApp(electronApp);
    }
  });
});
