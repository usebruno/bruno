import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, ElectronApplication } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import { buildMockServerLocators } from '../utils/page/mock-server';
import { expandApiSpecsSection, openApiSpecRowMenu, chooseApiSpecRowAction } from '../utils/page/openapi/spec-row-menu';

const FIXTURES = path.resolve(__dirname, 'fixtures');
const PETSTORE_TITLE = 'Comprehensive API Test Collection';
const EXAMPLES_TITLE = 'API with Examples';
const WORKSPACE_NAME = 'SpecMenuWorkspace';

const buildPreferences = ({ mockServer }: { mockServer: boolean }) => JSON.stringify({
  preferences: {
    onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true },
    beta: { 'mock-server': mockServer },
    _migrations: { mockServerBetaOnByDefault: true }
  }
}, null, 2);

const WORKSPACE_YML = [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${WORKSPACE_NAME}`,
  '  type: workspace',
  'collections: []',
  'specs:',
  `  - name: ${PETSTORE_TITLE}`,
  '    path: specs/petstore.yaml',
  `  - name: ${EXAMPLES_TITLE}`,
  '    path: specs/examples.yaml',
  '  - name: notes',
  '    path: specs/notes.yaml',
  'docs: \'\'',
  ''
].join('\n');

const readWorkspaceSpecs = (workspacePath: string): Array<{ name: string; path: string }> => {
  const config = yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')) as { specs?: Array<{ name: string; path: string }> };
  return config.specs ?? [];
};
const specNames = (workspacePath: string) => readWorkspaceSpecs(workspacePath).map((spec) => spec.name);
const specPaths = (workspacePath: string) => readWorkspaceSpecs(workspacePath).map((spec) => spec.path);

const seedWorkspace = async (
  createTmpDir: (tag?: string) => Promise<string>,
  { mockServer = true } = {}
) => {
  const userDataPath = await createTmpDir('spec-row-menu-userdata');
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), buildPreferences({ mockServer }));

  const workspacePath = await createTmpDir('spec-row-menu-workspace');
  fs.mkdirSync(path.join(workspacePath, 'specs'));
  fs.mkdirSync(path.join(workspacePath, 'collections'));
  fs.copyFileSync(path.join(FIXTURES, 'petstore.yaml'), path.join(workspacePath, 'specs', 'petstore.yaml'));
  fs.copyFileSync(path.join(FIXTURES, 'examples.yaml'), path.join(workspacePath, 'specs', 'examples.yaml'));
  fs.writeFileSync(path.join(workspacePath, 'specs', 'notes.yaml'), 'title: Not an API\nitems:\n  - one\n');
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), WORKSPACE_YML);

  return { userDataPath, workspacePath };
};

type LaunchElectronApp = (options: { userDataPath: string }) => Promise<ElectronApplication>;
type CreateTmpDir = (tag?: string) => Promise<string>;

const launchOnWorkspace = async (launchElectronApp: LaunchElectronApp, createTmpDir: CreateTmpDir, options = {}) => {
  const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, options);
  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  const titleBar = buildTitleBarLocators(page);
  const menu = buildCommonLocators(page).openApi.rowMenu;

  await test.step('Open the seeded workspace and wait for its specs', async () => {
    await openWorkspaceFromDialog(app, page, workspacePath);
    await expect(titleBar.activeWorkspaceName()).toHaveText(WORKSPACE_NAME, { timeout: 10000 });
    await expandApiSpecsSection(page);
    await expect(menu.row(PETSTORE_TITLE)).toBeVisible({ timeout: 10000 });
    await expect(menu.row(EXAMPLES_TITLE)).toBeVisible();
  });

  return { app, page, workspacePath, menu };
};

test.describe('API spec row context menu', () => {
  test('lists every action in design order and reaches the existing actions', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(90000);
    const { app, page, workspacePath, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const toast = buildCommonLocators(page).toast;

    try {
      await test.step('Menu items appear in the designed order with the divider before Remove', async () => {
        await openApiSpecRowMenu(page, PETSTORE_TITLE);
        await expect(menu.menuItems()).toHaveCount(7);
        const ids = await menu.menuItems().evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-item-id')));
        expect(ids).toEqual(['generate-collection', 'generate-mock-server', 'clone', 'rename', 'reveal', 'remove', 'delete']);
        await expect(menu.menuDivider()).toHaveCount(1);
        await expect(menu.menuItem('generate-mock-server')).toContainText('Beta');
        await expect(menu.menuItem('delete')).toHaveClass(/delete-item/);
        await page.keyboard.press('Escape');
        await expect(menu.menuItems()).toHaveCount(0);
      });

      await test.step('Right-click opens the same menu', async () => {
        await menu.row(EXAMPLES_TITLE).click({ button: 'right' });
        await expect(menu.menuItems()).toHaveCount(7);
        await menu.menuItems().first().focus();
        await page.keyboard.press('Escape');
        await expect(menu.menuItems()).toHaveCount(0);
      });

      await test.step('Reveal asks the OS to show the spec file', async () => {
        await app.evaluate(({ shell }) => {
          (globalThis as any).__revealed = [];
          shell.showItemInFolder = (target: string) => {
            (globalThis as any).__revealed.push(target);
          };
        });
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'reveal');
        await expect.poll(() => app.evaluate(() => (globalThis as any).__revealed)).toEqual([
          path.join(workspacePath, 'specs', 'petstore.yaml')
        ]);
      });

      await test.step('Generate Collection on a non-OpenAPI file reports instead of opening the import step', async () => {
        await chooseApiSpecRowAction(page, 'notes', 'generate-collection');
        await expect(toast.byMessage(/not a valid OpenAPI/)).toBeVisible();
        await expect(menu.importLocationModal()).toHaveCount(0);
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
        await openApiSpecRowMenu(page, PETSTORE_TITLE);
        await expect(menu.menuItems()).toHaveCount(6);
        await expect(menu.menuItem('generate-mock-server')).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('renames the workspace entry and leaves the file alone', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const specPath = path.join(workspacePath, 'specs', 'petstore.yaml');
    const fileBefore = fs.readFileSync(specPath, 'utf8');

    try {
      await test.step('Rename via the modal', async () => {
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'rename');
        await expect(menu.renameModal()).toBeVisible();
        await expect(menu.renameInput()).toHaveValue(PETSTORE_TITLE);
        await menu.renameInput().fill('Orders API');
        await menu.renameSubmit().click();
      });

      await test.step('Sidebar shows the new name, workspace.yml carries it, the file is untouched', async () => {
        await expect(menu.row('Orders API')).toBeVisible({ timeout: 10000 });
        await expect(menu.row(PETSTORE_TITLE)).toHaveCount(0);
        await expect.poll(() => specNames(workspacePath)).toContain('Orders API');
        expect(specNames(workspacePath)).not.toContain(PETSTORE_TITLE);
        expect(fs.readFileSync(specPath, 'utf8')).toBe(fileBefore);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('clones the file into the workspace apispec folder and rejects a clash', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const toast = buildCommonLocators(page).toast;
    const clonePath = path.join(workspacePath, 'apispec', 'Petstore Clone.yaml');

    try {
      await test.step('Clone with a prefilled name and location', async () => {
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'clone');
        await expect(menu.cloneModal()).toBeVisible();
        await expect(menu.cloneNameInput()).toHaveValue(`${PETSTORE_TITLE} copy`);
        await expect(menu.cloneLocationInput()).toHaveValue(path.join(workspacePath, 'apispec'));
        await menu.cloneNameInput().fill('Petstore Clone');
        await menu.cloneSubmit().click();
      });

      await test.step('The copy appears as its own row with the typed name', async () => {
        await expect(menu.row('Petstore Clone')).toBeVisible({ timeout: 10000 });
        await expect(menu.row(PETSTORE_TITLE)).toBeVisible();
        expect(fs.existsSync(clonePath)).toBe(true);
        expect(fs.readFileSync(clonePath, 'utf8')).toBe(fs.readFileSync(path.join(workspacePath, 'specs', 'petstore.yaml'), 'utf8'));
        await expect.poll(() => specNames(workspacePath)).toContain('Petstore Clone');
      });

      await test.step('Cloning to an existing filename is rejected', async () => {
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'clone');
        await menu.cloneNameInput().fill('Petstore Clone');
        await menu.cloneSubmit().click();
        await expect(toast.byMessage(/already exists/)).toBeVisible();
        await expect(menu.cloneModal()).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('removing from workspace keeps the file and closes the open view', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const specPath = path.join(workspacePath, 'specs', 'petstore.yaml');

    try {
      await test.step('Open the spec so its tab is showing', async () => {
        await menu.row(PETSTORE_TITLE).click();
        await expect(menu.specTab('petstore.yaml')).toBeVisible();
      });

      await test.step('Remove from Workspace', async () => {
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'remove');
        await expect(menu.removeModal()).toBeVisible();
        await expect(menu.removeModal()).toContainText(specPath);
        await menu.removeSubmit().click();
      });

      await test.step('Row and tab are gone, file and other specs stay', async () => {
        await expect(menu.row(PETSTORE_TITLE)).toHaveCount(0, { timeout: 10000 });
        await expect(menu.specTab('petstore.yaml')).toHaveCount(0);
        await expect(menu.row(EXAMPLES_TITLE)).toBeVisible();
        expect(fs.existsSync(specPath)).toBe(true);
        await expect.poll(() => specPaths(workspacePath)).not.toContain('specs/petstore.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('deleting removes the file and closes the open view', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page, workspacePath, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const specPath = path.join(workspacePath, 'specs', 'examples.yaml');

    try {
      await test.step('Open the spec so its tab is showing', async () => {
        await menu.row(EXAMPLES_TITLE).click();
        await expect(menu.specTab('examples.yaml')).toBeVisible();
      });

      await test.step('Delete', async () => {
        await chooseApiSpecRowAction(page, EXAMPLES_TITLE, 'delete');
        await expect(menu.deleteModal()).toBeVisible();
        await expect(menu.deleteModal()).toContainText(specPath);
        await menu.deleteSubmit().click();
      });

      await test.step('Row, tab and file are gone, other specs stay', async () => {
        await expect(menu.row(EXAMPLES_TITLE)).toHaveCount(0, { timeout: 10000 });
        await expect(menu.specTab('examples.yaml')).toHaveCount(0);
        await expect(menu.row(PETSTORE_TITLE)).toBeVisible();
        await expect.poll(() => fs.existsSync(specPath)).toBe(false);
        await expect.poll(() => specPaths(workspacePath)).not.toContain('specs/examples.yaml');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('generates a collection through the existing import location step', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(90000);
    const { app, page, menu } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const sidebar = buildCommonLocators(page).sidebar;

    try {
      await test.step('The import location step opens with the spec title prefilled', async () => {
        await chooseApiSpecRowAction(page, PETSTORE_TITLE, 'generate-collection');
        await expect(menu.importLocationModal()).toBeVisible();
        await expect(menu.importLocationName(PETSTORE_TITLE)).toBeVisible();
      });

      await test.step('Confirming creates the collection in the sidebar', async () => {
        await menu.importLocationSubmit().click();
        await expect(sidebar.collection(PETSTORE_TITLE)).toBeVisible({ timeout: 15000 });
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('opens the mock server modal on the spec source with the spec preselected', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const { app, page } = await launchOnWorkspace(launchElectronApp, createTmpDir);
    const ms = buildMockServerLocators(page);

    try {
      await test.step('The modal opens on the spec source with this spec selected', async () => {
        await chooseApiSpecRowAction(page, EXAMPLES_TITLE, 'generate-mock-server');
        await expect(ms.sourceSpecRadio()).toBeChecked();
        await expect(ms.specSelectedOption()).toHaveText(EXAMPLES_TITLE);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
