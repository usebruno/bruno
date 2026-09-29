import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, ElectronApplication } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import { buildMockServerLocators } from '../utils/page/mock-server';
import { expandApiSpecsSection, openApiSpecRowMenu, chooseApiSpecRowAction } from '../utils/page/openapi/render-spec';

const OPENAPI_FIXTURES = path.resolve(__dirname, '..', 'import', 'openapi', 'fixtures');
const COMPREHENSIVE_TITLE = 'Comprehensive API Test Collection';
const EXAMPLES_TITLE = 'API with Examples';
const WORKSPACE_NAME = 'SpecMenuWorkspace';
const SYNCED_COLLECTION = 'Examples Sync';

const REVEAL_LABELS: Record<string, string> = {
  darwin: 'Reveal in Finder',
  win32: 'Reveal in File Explorer'
};
const revealLabel = REVEAL_LABELS[process.platform] ?? 'Reveal in File Manager';

const buildPreferences = ({ mockServer }: { mockServer: boolean }) => JSON.stringify({
  preferences: {
    onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true },
    beta: { 'mock-server': mockServer },
    _migrations: { mockServerBetaOnByDefault: true }
  }
}, null, 2);

const buildWorkspaceYml = ({ withSyncedCollection }: { withSyncedCollection: boolean }) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${WORKSPACE_NAME}`,
  '  type: workspace',
  ...(withSyncedCollection
    ? ['collections:', `  - name: ${SYNCED_COLLECTION}`, '    path: collections/examples-sync']
    : ['collections: []']),
  'specs:',
  '  - name: comprehensive',
  '    path: specs/comprehensive.yaml',
  '  - name: examples',
  '    path: specs/examples.yaml',
  '  - name: notes',
  '    path: specs/notes.yaml',
  'docs: \'\'',
  ''
].join('\n');

const readWorkspaceSpecPaths = (workspacePath: string): string[] => {
  const config = yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')) as { specs?: Array<{ path: string }> };
  return (config.specs ?? []).map((spec) => spec.path);
};

const findFileNamed = (dir: string, prefix: string): string | null => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileNamed(entryPath, prefix);
      if (found) return found;
    } else if (entry.name.startsWith(prefix)) {
      return entryPath;
    }
  }
  return null;
};

type CreateTmpDir = (tag?: string) => Promise<string>;
type LaunchElectronApp = (options: { userDataPath: string }) => Promise<ElectronApplication>;
type SeedOptions = { mockServer?: boolean; withSyncedCollection?: boolean };

const seedWorkspace = async (createTmpDir: CreateTmpDir, { mockServer = true, withSyncedCollection = false }: SeedOptions) => {
  const userDataPath = await createTmpDir('spec-row-menu-userdata');
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), buildPreferences({ mockServer }));

  const workspacePath = await createTmpDir('spec-row-menu-workspace');
  fs.mkdirSync(path.join(workspacePath, 'specs'));
  fs.mkdirSync(path.join(workspacePath, 'collections'));
  fs.copyFileSync(path.join(OPENAPI_FIXTURES, 'openapi-comprehensive.yaml'), path.join(workspacePath, 'specs', 'comprehensive.yaml'));
  fs.copyFileSync(path.join(OPENAPI_FIXTURES, 'openapi-with-examples.yaml'), path.join(workspacePath, 'specs', 'examples.yaml'));
  fs.writeFileSync(path.join(workspacePath, 'specs', 'notes.yaml'), 'title: Not an API\nitems:\n  - one\n');
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml({ withSyncedCollection }));

  if (withSyncedCollection) {
    const collectionPath = path.join(workspacePath, 'collections', 'examples-sync');
    fs.mkdirSync(collectionPath);
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({
      version: '1',
      name: SYNCED_COLLECTION,
      type: 'collection',
      openapi: [{ sourceUrl: '../../specs/examples.yaml', groupBy: 'tags', autoCheck: false }]
    }, null, 2));
  }

  return { userDataPath, workspacePath };
};

const launchOnWorkspace = async (launchElectronApp: LaunchElectronApp, createTmpDir: CreateTmpDir, options: SeedOptions = {}) => {
  const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, options);
  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  const titleBar = buildTitleBarLocators(page);
  const { render, rowMenu } = buildCommonLocators(page).openApi;

  await test.step('Open the seeded workspace and wait for its specs', async () => {
    await openWorkspaceFromDialog(app, page, workspacePath);
    await expect(titleBar.activeWorkspaceName()).toHaveText(WORKSPACE_NAME, { timeout: 10000 });
    await expandApiSpecsSection(page);
    await expect(render.sidebarRow(COMPREHENSIVE_TITLE)).toBeVisible({ timeout: 10000 });
    await expect(render.sidebarRow(EXAMPLES_TITLE)).toBeVisible();
  });

  return { app, page, workspacePath, render, menu: rowMenu };
};

test.describe('API spec row context menu', () => {
  test('lists every action in design order and reaches the existing actions', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(90000);
    const { app, page, workspacePath, render, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const { toast, import: importStep } = buildCommonLocators(page);

    try {
      await test.step('Menu items appear in the designed order with the divider before Remove', async () => {
        await openApiSpecRowMenu(page, COMPREHENSIVE_TITLE);
        await expect(menu.menuItems()).toHaveCount(5);
        expect(await menu.menuItemIds()).toEqual(['generate-collection', 'generate-mock-server', 'reveal', 'remove', 'delete']);
        await expect(menu.menuDivider()).toHaveCount(1);
        await expect(menu.menuItem('generate-mock-server')).toContainText('Beta');
        await expect(menu.menuItem('reveal')).toHaveText(revealLabel);
        await expect(menu.menuItem('delete')).toHaveClass(/delete-item/);
        await page.keyboard.press('Escape');
        await expect(menu.menuItems()).toHaveCount(0);
      });

      await test.step('Record what the OS is asked to reveal', async () => {
        await app.evaluate(({ shell }) => {
          (globalThis as any).__revealed = [];
          shell.showItemInFolder = (target: string) => {
            (globalThis as any).__revealed.push(target);
          };
        });
      });

      await test.step('Right-click opens the menu of the row that was clicked', async () => {
        await render.sidebarRow(EXAMPLES_TITLE).click({ button: 'right' });
        await expect(menu.menuItems()).toHaveCount(5);
        await menu.menuItem('reveal').click();
        await expect.poll(() => app.evaluate(() => (globalThis as any).__revealed)).toEqual([
          path.join(workspacePath, 'specs', 'examples.yaml')
        ]);
      });

      await test.step('Reveal from the actions icon asks the OS to show that spec file', async () => {
        await chooseApiSpecRowAction(page, COMPREHENSIVE_TITLE, 'reveal');
        await expect.poll(() => app.evaluate(() => (globalThis as any).__revealed)).toEqual([
          path.join(workspacePath, 'specs', 'examples.yaml'),
          path.join(workspacePath, 'specs', 'comprehensive.yaml')
        ]);
      });

      await test.step('Generate Collection on a non-OpenAPI file reports instead of opening the import step', async () => {
        await chooseApiSpecRowAction(page, 'notes', 'generate-collection');
        await expect(toast.byMessage(/not a valid OpenAPI/)).toBeVisible();
        await expect(importStep.locationModal()).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('hides Generate Mock Server when the beta flag is off', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir, { mockServer: false });

    try {
      await test.step('The menu has no mock server entry', async () => {
        await openApiSpecRowMenu(page, COMPREHENSIVE_TITLE);
        await expect(menu.menuItems()).toHaveCount(4);
        await expect(menu.menuItem('generate-mock-server')).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('removing from workspace keeps the file and closes the open view', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, render, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const specPath = path.join(workspacePath, 'specs', 'comprehensive.yaml');

    try {
      await test.step('Open the spec so its tab is showing', async () => {
        await render.sidebarRow(COMPREHENSIVE_TITLE).click();
        await expect(render.specTab('comprehensive.yaml')).toBeVisible();
      });

      await test.step('Cancel leaves the spec, its tab, the file and the workspace entry alone', async () => {
        await chooseApiSpecRowAction(page, COMPREHENSIVE_TITLE, 'remove');
        await expect(menu.removeModal()).toBeVisible();
        await menu.removeCancel().click();
        await expect(menu.removeModal()).toHaveCount(0);
        await expect(render.sidebarRow(COMPREHENSIVE_TITLE)).toBeVisible();
        await expect(render.specTab('comprehensive.yaml')).toBeVisible();
        expect(fs.existsSync(specPath)).toBe(true);
        expect(readWorkspaceSpecPaths(workspacePath)).toContain('specs/comprehensive.yaml');
      });

      await test.step('Remove from Workspace', async () => {
        await chooseApiSpecRowAction(page, COMPREHENSIVE_TITLE, 'remove');
        await expect(menu.removeModal()).toBeVisible();
        await expect(menu.removeModal()).toContainText('Remove from Workspace');
        await expect(menu.removeModal()).toContainText(specPath);
        await menu.removeSubmit().click();
      });

      await test.step('Row and tab are gone, file and other specs stay', async () => {
        await expect(render.sidebarRow(COMPREHENSIVE_TITLE)).toHaveCount(0, { timeout: 10000 });
        await expect(render.specTab('comprehensive.yaml')).toHaveCount(0);
        await expect(render.sidebarRow(EXAMPLES_TITLE)).toBeVisible();
        expect(fs.existsSync(specPath)).toBe(true);
        await expect.poll(() => readWorkspaceSpecPaths(workspacePath)).not.toContain('specs/comprehensive.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('deleting removes the file and closes the open view', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, render, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const specPath = path.join(workspacePath, 'specs', 'examples.yaml');

    try {
      await test.step('Open the spec so its tab is showing', async () => {
        await render.sidebarRow(EXAMPLES_TITLE).click();
        await expect(render.specTab('examples.yaml')).toBeVisible();
      });

      await test.step('Delete names the file and its path, with no sync warning', async () => {
        await chooseApiSpecRowAction(page, EXAMPLES_TITLE, 'delete');
        await expect(menu.deleteModal()).toBeVisible();
        await expect(menu.deleteModal()).toContainText(specPath);
        await expect(menu.connectedCollectionsWarning()).toHaveCount(0);
        await menu.deleteSubmit().click();
      });

      await test.step('Row, tab and file are gone, other specs stay', async () => {
        await expect(render.sidebarRow(EXAMPLES_TITLE)).toHaveCount(0, { timeout: 10000 });
        await expect(render.specTab('examples.yaml')).toHaveCount(0);
        await expect(render.sidebarRow(COMPREHENSIVE_TITLE)).toBeVisible();
        await expect.poll(() => fs.existsSync(specPath)).toBe(false);
        await expect.poll(() => readWorkspaceSpecPaths(workspacePath)).not.toContain('specs/examples.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('warns before deleting a spec that a collection syncs from', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, render, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir, { withSyncedCollection: true });

    try {
      await test.step('The spec a collection syncs from shows the warning', async () => {
        await chooseApiSpecRowAction(page, EXAMPLES_TITLE, 'delete');
        await expect(menu.connectedCollectionsWarning()).toHaveText(
          '1 collection syncs from this spec. Deleting it will stop that collection from getting updates.'
        );
        await page.keyboard.press('Escape');
        await expect(menu.deleteModal()).toHaveCount(0);
      });

      await test.step('A spec nothing syncs from shows no warning', async () => {
        await chooseApiSpecRowAction(page, COMPREHENSIVE_TITLE, 'delete');
        await expect(menu.deleteModal()).toBeVisible();
        await expect(menu.connectedCollectionsWarning()).toHaveCount(0);
        await menu.deleteCancel().click();
        await expect(menu.deleteModal()).toHaveCount(0);
      });

      await test.step('Closing the dialogs deleted nothing', async () => {
        await expect(render.sidebarRow(EXAMPLES_TITLE)).toBeVisible();
        await expect(render.sidebarRow(COMPREHENSIVE_TITLE)).toBeVisible();
        expect(fs.existsSync(path.join(workspacePath, 'specs', 'examples.yaml'))).toBe(true);
        expect(fs.existsSync(path.join(workspacePath, 'specs', 'comprehensive.yaml'))).toBe(true);
        expect(readWorkspaceSpecPaths(workspacePath)).toEqual(expect.arrayContaining(['specs/examples.yaml', 'specs/comprehensive.yaml']));
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('generates a collection through the existing import location step', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(90000);
    const { app, page, workspacePath } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const { sidebar, import: importStep } = buildCommonLocators(page);

    try {
      await test.step('The import location step opens with the spec title prefilled', async () => {
        await chooseApiSpecRowAction(page, COMPREHENSIVE_TITLE, 'generate-collection');
        await expect(importStep.locationModal()).toBeVisible();
        await expect(importStep.locationModal().getByText(COMPREHENSIVE_TITLE)).toBeVisible();
      });

      await test.step('Confirming creates the collection with the spec requests', async () => {
        await importStep.importButton(importStep.locationModal()).click();
        await expect(sidebar.collection(COMPREHENSIVE_TITLE)).toBeVisible({ timeout: 15000 });
        await expect.poll(() => findFileNamed(workspacePath, 'Get all users'), { timeout: 10000 }).not.toBeNull();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('opens the mock server modal on the spec source with the spec preselected', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const mockServer = buildMockServerLocators(page);

    try {
      await test.step('The modal opens on the spec source with this spec selected', async () => {
        await chooseApiSpecRowAction(page, EXAMPLES_TITLE, 'generate-mock-server');
        await expect(mockServer.sourceSpecRadio()).toBeChecked();
        await expect(mockServer.specSelectedOption()).toHaveText(EXAMPLES_TITLE);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
