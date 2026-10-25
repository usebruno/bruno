import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import {
  buildOpenApiSyncLocators,
  openConnectedOpenApiSyncTab,
  openConnectionSettings,
  openOpenApiSyncTab
} from '../utils/page/openapi/sync';

const WORKSPACE_NAME = 'Spec Source Workspace';
const COLLECTION_NAME = 'Pets Collection';

const PREFERENCES = JSON.stringify({
  preferences: {
    onboarding: {
      hasLaunchedBefore: true,
      hasSeenWelcomeModal: true
    }
  }
}, null, 2);

const openApiSpec = (title: string, resource: string) => [
  'openapi: 3.0.0',
  'info:',
  `  title: ${title}`,
  '  version: 1.0.0',
  'paths:',
  `  /${resource}:`,
  '    get:',
  '      responses:',
  '        \'200\':',
  '          description: OK',
  ''
].join('\n');

const SWAGGER_SPEC = [
  'swagger: \'2.0\'',
  'info:',
  '  title: Legacy API',
  '  version: 1.0.0',
  'paths:',
  '  /legacy:',
  '    get:',
  '      responses:',
  '        \'200\':',
  '          description: OK',
  ''
].join('\n');

const SPECS = [
  { name: 'Pets API', file: 'pets.yaml', content: openApiSpec('Pets API', 'pets') },
  { name: 'Zoo API', file: 'zoo.yaml', content: openApiSpec('Zoo API', 'animals') },
  { name: 'Legacy API', file: 'legacy.yaml', content: SWAGGER_SPEC }
];

type SeedOptions = {
  withSpecs?: boolean;
  connectedSource?: string;
};

const seedWorkspace = async (createTmpDir: (tag?: string) => Promise<string>, options: SeedOptions = {}) => {
  const { withSpecs = true, connectedSource } = options;
  const userDataPath = await createTmpDir('openapi-sync-user-data');
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), PREFERENCES);

  const workspacePath = await createTmpDir('openapi-sync-workspace');
  const specs = withSpecs ? SPECS : [];
  fs.mkdirSync(path.join(workspacePath, 'specs'), { recursive: true });
  for (const spec of specs) {
    fs.writeFileSync(path.join(workspacePath, 'specs', spec.file), spec.content);
  }

  const outsidePath = await createTmpDir('openapi-sync-outside');
  const outsideSpecPath = path.join(outsidePath, 'outside-spec.yaml');
  fs.writeFileSync(outsideSpecPath, openApiSpec('Outside API', 'things'));

  const collectionPath = path.join(workspacePath, 'collections', 'pets-collection');
  fs.mkdirSync(collectionPath, { recursive: true });
  const brunoJson: Record<string, unknown> = { version: '1', name: COLLECTION_NAME, type: 'collection' };
  if (connectedSource) {
    brunoJson.openapi = [{ sourceUrl: connectedSource, groupBy: 'tags', autoCheck: false }];
  }
  fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(brunoJson, null, 2));

  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), [
    'opencollection: 1.0.0',
    'info:',
    `  name: ${WORKSPACE_NAME}`,
    '  type: workspace',
    'collections:',
    `  - name: ${COLLECTION_NAME}`,
    '    path: collections/pets-collection',
    specs.length ? 'specs:' : 'specs: []',
    ...specs.flatMap((spec) => [`  - name: ${spec.name}`, `    path: specs/${spec.file}`]),
    'docs: \'\'',
    ''
  ].join('\n'));

  return { userDataPath, workspacePath, collectionPath, outsideSpecPath };
};

const readSourceUrl = (collectionPath: string) => {
  const brunoJson = JSON.parse(fs.readFileSync(path.join(collectionPath, 'bruno.json'), 'utf8'));
  return brunoJson.openapi?.[0]?.sourceUrl;
};

const launchInWorkspace = async (launchElectronApp, userDataPath: string, workspacePath: string) => {
  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await openWorkspaceFromDialog(app, page, workspacePath);
  await expect(buildTitleBarLocators(page).activeWorkspaceName()).toHaveText(WORKSPACE_NAME, { timeout: 10000 });
  return { app, page };
};

test.describe('OpenAPI sync: connect a collection to a spec in the workspace', () => {
  test('connects through the Workspace tab and stores the spec path relative to the collection', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath, collectionPath } = await seedWorkspace(createTmpDir);
    const { app, page } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);
    const sync = buildOpenApiSyncLocators(page);

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
        await expect.poll(() => readSourceUrl(collectionPath)).toBe('../../specs/pets.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('rejects a Swagger 2.0 workspace spec with the same error as browsing to one', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir);
    const { app, page } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);
    const sync = buildOpenApiSyncLocators(page);

    try {
      await openOpenApiSyncTab(page, COLLECTION_NAME);

      await test.step('Pick the Swagger 2.0 spec', async () => {
        await sync.workspaceSelect().selectOption({ label: 'Legacy API' });
      });

      await test.step('The Swagger error shows and Connect stays disabled', async () => {
        await expect(page.getByText('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.')).toBeVisible();
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
    const { userDataPath, workspacePath, collectionPath, outsideSpecPath } = await seedWorkspace(createTmpDir, { withSpecs: false });
    const { app, page } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);
    const sync = buildOpenApiSyncLocators(page);

    try {
      await openOpenApiSyncTab(page, COLLECTION_NAME);

      await test.step('The workspace list is disabled and says there are no specs', async () => {
        await expect(sync.workspaceSelect()).toBeDisabled();
        await expect(sync.workspaceSelectedOption()).toHaveText('No API specs in this workspace');
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
        await expect.poll(() => readSourceUrl(collectionPath)).toBe(
          path.relative(collectionPath, outsideSpecPath).split(path.sep).join('/')
        );
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
      connectedSource: '../../specs/zoo.yaml'
    });
    const { app, page } = await launchInWorkspace(launchElectronApp, userDataPath, workspacePath);
    const sync = buildOpenApiSyncLocators(page);

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
    } finally {
      await closeElectronApp(app);
    }
  });

  test('Connection Settings opens on the File tab for a spec outside the workspace', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);
    const seeded = await seedWorkspace(createTmpDir);
    const brunoJsonPath = path.join(seeded.collectionPath, 'bruno.json');
    const relativeOutside = path.relative(seeded.collectionPath, seeded.outsideSpecPath).split(path.sep).join('/');
    const brunoJson = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
    fs.writeFileSync(brunoJsonPath, JSON.stringify({
      ...brunoJson,
      openapi: [{ sourceUrl: relativeOutside, groupBy: 'tags', autoCheck: false }]
    }, null, 2));
    const { app, page } = await launchInWorkspace(launchElectronApp, seeded.userDataPath, seeded.workspacePath);
    const sync = buildOpenApiSyncLocators(page);

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
});
