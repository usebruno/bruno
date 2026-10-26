import path from 'path';
import fs from 'fs';
import jsyaml from 'js-yaml';
import { test, expect, closeElectronApp, ElectronApplication } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';
import { openConnectedOpenApiSyncTab, openConnectionSettings, openOpenApiSyncTab } from '../utils/page/openapi/sync';

const WORKSPACE_NAME = 'Spec Source Workspace';
const COLLECTION_NAME = 'Pets Collection';
const SPEC_FIXTURES = path.join(__dirname, 'fixtures', 'specs');

const PREFERENCES = JSON.stringify({
  preferences: {
    onboarding: {
      hasLaunchedBefore: true,
      hasSeenWelcomeModal: true
    }
  }
}, null, 2);

const WORKSPACE_SPECS = [
  { name: 'Pets API', file: 'pets.yaml' },
  { name: 'Zoo API', file: 'zoo.yaml' },
  { name: 'Legacy API', file: 'legacy.yaml' }
];

type LaunchElectronApp = (options: { userDataPath: string }) => Promise<ElectronApplication>;

type SeedPaths = {
  workspacePath: string;
  collectionPath: string;
  outsideSpecPath: string;
};

type SeedOptions = {
  specFiles?: string[];
  listedSpecFiles?: string[];
  format?: 'bru' | 'yml';
  connectedSource?: (paths: SeedPaths) => string;
};

const toPosixRelative = (from: string, to: string) => path.relative(from, to).split(path.sep).join('/');

const seedWorkspace = async (createTmpDir: (tag?: string) => Promise<string>, options: SeedOptions = {}) => {
  const {
    specFiles = WORKSPACE_SPECS.map((spec) => spec.file),
    listedSpecFiles = specFiles,
    format = 'bru',
    connectedSource
  } = options;

  const userDataPath = await createTmpDir('openapi-sync-user-data');
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), PREFERENCES);

  const workspacePath = await createTmpDir('openapi-sync-workspace');
  fs.mkdirSync(path.join(workspacePath, 'specs'), { recursive: true });
  for (const file of specFiles) {
    fs.copyFileSync(path.join(SPEC_FIXTURES, file), path.join(workspacePath, 'specs', file));
  }

  const outsideSpecPath = path.join(await createTmpDir('openapi-sync-outside'), 'outside-spec.yaml');
  fs.copyFileSync(path.join(SPEC_FIXTURES, 'outside-spec.yaml'), outsideSpecPath);

  const collectionPath = path.join(workspacePath, 'collections', 'pets-collection');
  fs.mkdirSync(collectionPath, { recursive: true });
  const openapi = connectedSource
    ? [{ sourceUrl: connectedSource({ workspacePath, collectionPath, outsideSpecPath }), groupBy: 'tags', autoCheck: false }]
    : undefined;

  if (format === 'yml') {
    fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), jsyaml.dump({
      opencollection: '1.0.0',
      info: { name: COLLECTION_NAME },
      ...(openapi ? { extensions: { bruno: { openapi } } } : {})
    }));
  } else {
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({
      version: '1',
      name: COLLECTION_NAME,
      type: 'collection',
      ...(openapi ? { openapi } : {})
    }, null, 2));
  }

  const listedSpecs = WORKSPACE_SPECS.filter((spec) => listedSpecFiles.includes(spec.file));
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), jsyaml.dump({
    opencollection: '1.0.0',
    info: { name: WORKSPACE_NAME, type: 'workspace' },
    collections: [{ name: COLLECTION_NAME, path: 'collections/pets-collection' }],
    specs: listedSpecs.map((spec) => ({ name: spec.name, path: `specs/${spec.file}` })),
    docs: ''
  }));

  return { userDataPath, workspacePath, collectionPath, outsideSpecPath };
};

const readSourceUrl = (collectionPath: string, format: 'bru' | 'yml' = 'bru') => {
  if (format === 'yml') {
    const collection = jsyaml.load(fs.readFileSync(path.join(collectionPath, 'opencollection.yml'), 'utf8')) as any;
    return collection?.extensions?.bruno?.openapi?.[0]?.sourceUrl;
  }
  const brunoJson = JSON.parse(fs.readFileSync(path.join(collectionPath, 'bruno.json'), 'utf8'));
  return brunoJson.openapi?.[0]?.sourceUrl;
};

const launchInWorkspace = async (launchElectronApp: LaunchElectronApp, userDataPath: string, workspacePath: string) => {
  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await openWorkspaceFromDialog(app, page, workspacePath);
  await expect(buildCommonLocators(page).titleBar.activeWorkspaceName()).toHaveText(WORKSPACE_NAME, { timeout: 10000 });
  return { app, page, sync: buildCommonLocators(page).openApi.sync };
};

test.describe('OpenAPI sync: connect a collection to a spec in the workspace', () => {
  for (const format of ['bru', 'yml'] as const) {
    test(`connects through the Workspace tab and stores a collection-relative path (${format} collection)`, async ({
      launchElectronApp,
      createTmpDir
    }) => {
      test.setTimeout(60000);
      const { userDataPath, workspacePath, collectionPath } = await seedWorkspace(createTmpDir, { format });
      const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

      try {
        await openOpenApiSyncTab(page, COLLECTION_NAME);

        await test.step('The Workspace tab is open, listing the workspace specs with nothing selected', async () => {
          await expect(sync.sourceTab('workspace')).toHaveAttribute('aria-selected', 'true');
          await expect(sync.workspaceOptions()).toHaveText(['Select an API spec', 'Legacy API', 'Pets API', 'Zoo API']);
          await expect(sync.workspaceSelect()).toHaveValue('');
          await expect(sync.connectButton()).toBeDisabled();
        });

        await test.step('Pick a workspace spec and connect', async () => {
          await sync.workspaceSelect().selectOption({ label: 'Pets API' });
          await expect(sync.connectButton()).toBeEnabled();
          await sync.connectButton().click();
          await expect(sync.connectedHeader()).toBeVisible({ timeout: 10000 });
        });

        await test.step('The collection config points at the spec through a relative path', async () => {
          await expect.poll(() => readSourceUrl(collectionPath, format)).toBe('../../specs/pets.yaml');
        });
      } finally {
        await closeElectronApp(app);
      }
    });
  }

  test('rejects a Swagger 2.0 workspace spec with the same error as browsing to one', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir);
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openOpenApiSyncTab(page, COLLECTION_NAME);

      await test.step('Pick the Swagger 2.0 spec', async () => {
        await sync.workspaceSelect().selectOption({ label: 'Legacy API' });
      });

      await test.step('The Swagger error shows and Connect stays disabled', async () => {
        await expect(sync.connectError()).toHaveText('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
        await expect(sync.workspaceSelect()).toHaveValue('');
        await expect(sync.connectButton()).toBeDisabled();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('says the workspace has no specs and keeps the URL and File tabs usable', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath, collectionPath, outsideSpecPath } = await seedWorkspace(createTmpDir, { specFiles: [] });
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openOpenApiSyncTab(page, COLLECTION_NAME);

      await test.step('The workspace list is disabled and says there are no specs', async () => {
        await expect(sync.workspaceSelect()).toBeDisabled();
        await expect(sync.workspaceSelectedOption()).toHaveText('No API specs in this workspace');
      });

      await test.step('The source tabs switch from the keyboard', async () => {
        await sync.sourceTab('url').focus();
        await page.keyboard.press('Enter');
        await expect(sync.sourceTab('url')).toHaveAttribute('aria-selected', 'true');
        await sync.sourceTab('file').focus();
        await page.keyboard.press('Space');
        await expect(sync.sourceTab('file')).toHaveAttribute('aria-selected', 'true');
      });

      await test.step('The URL tab accepts an http URL', async () => {
        await sync.sourceTab('url').click();
        await sync.urlInput().fill('not a url');
        await expect(sync.connectButton()).toBeDisabled();
        await sync.urlInput().fill('https://api.example.com/openapi.json');
        await expect(sync.connectButton()).toBeEnabled();
      });

      await test.step('The File tab browses to a spec outside the workspace and connects', async () => {
        await sync.sourceTab('file').click();
        await sync.fileInput().setInputFiles(outsideSpecPath);
        await expect(sync.fileButton()).toHaveText('outside-spec.yaml');
        await sync.connectButton().click();
        await expect(sync.connectedHeader()).toBeVisible({ timeout: 10000 });
      });

      await test.step('The browsed file is stored relative to the collection', async () => {
        await expect.poll(() => readSourceUrl(collectionPath)).toBe(toPosixRelative(collectionPath, outsideSpecPath));
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Connection Settings shows the connected workspace spec and saves a switch to another', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath, collectionPath } = await seedWorkspace(createTmpDir, {
      connectedSource: () => '../../specs/zoo.yaml'
    });
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
      await openConnectionSettings(page);

      await test.step('The Workspace tab is open with the connected spec selected', async () => {
        await expect(sync.settingsModal()).toBeVisible();
        await expect(sync.sourceTab('workspace')).toHaveAttribute('aria-selected', 'true');
        await expect(sync.workspaceSelectedOption()).toHaveText('Zoo API');
      });

      await test.step('Switch to another workspace spec and save', async () => {
        await sync.workspaceSelect().selectOption({ label: 'Pets API' });
        await sync.settingsSave().click();
        await expect(sync.settingsModal()).toBeHidden();
      });

      await test.step('The collection config now points at the new spec', async () => {
        await expect.poll(() => readSourceUrl(collectionPath)).toBe('../../specs/pets.yaml');
      });

      await openConnectionSettings(page);

      await test.step('Reopening Connection Settings shows the new spec selected', async () => {
        await expect(sync.sourceTab('workspace')).toHaveAttribute('aria-selected', 'true');
        await expect(sync.workspaceSelectedOption()).toHaveText('Pets API');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Connection Settings opens on the File tab for a spec outside the workspace', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, {
      connectedSource: ({ collectionPath, outsideSpecPath }) => toPosixRelative(collectionPath, outsideSpecPath)
    });
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
      await openConnectionSettings(page);

      await test.step('The File tab is open showing the file name', async () => {
        await expect(sync.sourceTab('file')).toHaveAttribute('aria-selected', 'true');
        await expect(sync.fileButton()).toHaveText('outside-spec.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('an older connection stored as an absolute path still opens on the Workspace tab', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, {
      connectedSource: ({ workspacePath: root }) => path.join(root, 'specs', 'zoo.yaml')
    });
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
      await openConnectionSettings(page);

      await test.step('The Workspace tab is open with the spec at that absolute path selected', async () => {
        await expect(sync.sourceTab('workspace')).toHaveAttribute('aria-selected', 'true');
        await expect(sync.workspaceSelectedOption()).toHaveText('Zoo API');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('a connected spec removed from the workspace keeps syncing from its file', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, {
      listedSpecFiles: ['pets.yaml', 'legacy.yaml'],
      connectedSource: () => '../../specs/zoo.yaml'
    });
    const { app, page, sync } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);

    try {
      await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);

      await test.step('The spec file is still found for sync', async () => {
        await expect(sync.connectedHeader()).toBeVisible({ timeout: 10000 });
        await sync.specUpdatesTab().click();
        await expect(sync.sourceFileNotFound()).toHaveCount(0);
      });

      await openConnectionSettings(page);

      await test.step('Connection Settings shows it on the File tab', async () => {
        await expect(sync.sourceTab('file')).toHaveAttribute('aria-selected', 'true');
        await expect(sync.fileButton()).toHaveText('zoo.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
