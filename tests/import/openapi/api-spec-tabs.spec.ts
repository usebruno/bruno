import { test, expect, closeElectronApp } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { waitForReadyPage, waitForSnapshotApiSpecTabs } from '../../utils/page';
import {
  openApiSpecFromDialog,
  openApiSpecSidebarItem,
  buildApiSpecPanelLocators,
  typeIntoApiSpecEditor,
  pressSaveShortcut,
  closeOtherTabsFrom,
  closeApiSpecTab,
  removeApiSpecFromWorkspace,
  removeAllApiSpecsFromWorkspace,
  expandApiSpecsSection
} from '../../utils/page/openapi/render-spec';
import { buildCommonLocators } from '../../utils/page/locators';
import { createTransientRequest } from '../../utils/page/actions';

const FIRST_SPEC = { file: 'openapi-comprehensive.yaml', name: 'Comprehensive API Test Collection' };
const SECOND_SPEC = { file: 'openapi-path-grouping.json', name: 'Path Grouping Test API' };
const EDITABLE_SPEC = { file: 'openapi-with-examples.yaml', name: 'API with Examples' };
const EDIT_MARKER = '# edited from the spec editor\n';

const fixture = (name: string) => path.resolve(__dirname, 'fixtures', name);

test.describe('API specs open as workspace tabs', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__savedShowOpenDialogForTabs = dialog.showOpenDialog;
    });
  });

  test.afterEach(async ({ page }) => {
    await removeAllApiSpecsFromWorkspace(page);
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (dialog as any).__savedShowOpenDialogForTabs;
      delete (dialog as any).__savedShowOpenDialogForTabs;
    });
  });

  test('opens two specs as two tabs the user can switch between, and closing one keeps the other and the sidebar entry', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { sidebarItem } = buildApiSpecPanelLocators(page);

    const specsDir = await createTmpDir('api-spec-two-tabs');
    const firstPath = path.join(specsDir, FIRST_SPEC.file);
    const secondPath = path.join(specsDir, SECOND_SPEC.file);
    fs.copyFileSync(fixture(FIRST_SPEC.file), firstPath);
    fs.copyFileSync(fixture(SECOND_SPEC.file), secondPath);

    await openApiSpecFromDialog(page, electronApp, firstPath);
    await expect(sidebarItem(FIRST_SPEC.name)).toBeVisible();

    await openApiSpecFromDialog(page, electronApp, secondPath);
    await expect(sidebarItem(SECOND_SPEC.name)).toBeVisible();

    await openApiSpecSidebarItem(page, FIRST_SPEC.name);
    const firstTab = locators.tabs.requestTab(FIRST_SPEC.file);
    await expect(firstTab).toBeVisible();

    await openApiSpecSidebarItem(page, SECOND_SPEC.name);
    const secondTab = locators.tabs.requestTab(SECOND_SPEC.file);
    await expect(secondTab).toBeVisible();
    await expect(firstTab).toBeVisible();

    await expect(sidebarItem(SECOND_SPEC.name)).toHaveAttribute('data-selected', 'true');
    await expect(sidebarItem(FIRST_SPEC.name)).not.toHaveAttribute('data-selected', 'true');

    await firstTab.click();
    await expect(sidebarItem(FIRST_SPEC.name)).toHaveAttribute('data-selected', 'true');
    await expect(sidebarItem(SECOND_SPEC.name)).not.toHaveAttribute('data-selected', 'true');

    await closeApiSpecTab(page, FIRST_SPEC.file);

    await expect(firstTab).toHaveCount(0);
    await expect(secondTab).toBeVisible();
    await expect(sidebarItem(FIRST_SPEC.name)).toBeVisible();
  });

  test('saves an edited spec with the keyboard shortcut while the cursor is still in the editor', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { sidebarItem, specEditor, tabUnsavedMarker } = buildApiSpecPanelLocators(page);

    const tmpDir = await createTmpDir('api-spec-keyboard-save');
    const specPath = path.join(tmpDir, EDITABLE_SPEC.file);
    fs.copyFileSync(fixture(EDITABLE_SPEC.file), specPath);

    await openApiSpecFromDialog(page, electronApp, specPath);
    await openApiSpecSidebarItem(page, EDITABLE_SPEC.name);
    await expect(locators.tabs.requestTab(EDITABLE_SPEC.file)).toBeVisible();
    await expect(specEditor()).toHaveCount(1);

    await typeIntoApiSpecEditor(page, EDIT_MARKER);
    await expect(tabUnsavedMarker(EDITABLE_SPEC.file)).toHaveClass(/has-changes/);

    await pressSaveShortcut(page);

    await expect(tabUnsavedMarker(EDITABLE_SPEC.file)).not.toHaveClass(/has-changes/);
    await expect
      .poll(() => fs.readFileSync(specPath, 'utf8').startsWith(EDIT_MARKER))
      .toBe(true);
    await expect(sidebarItem(EDITABLE_SPEC.name)).toBeVisible();
  });

  test('writes unsaved spec edits to disk before closing the tab as part of closing the others', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { tabUnsavedMarker } = buildApiSpecPanelLocators(page);

    const tmpDir = await createTmpDir('api-spec-bulk-close');
    const specPath = path.join(tmpDir, EDITABLE_SPEC.file);
    fs.copyFileSync(fixture(EDITABLE_SPEC.file), specPath);

    await openApiSpecFromDialog(page, electronApp, specPath);
    await openApiSpecSidebarItem(page, EDITABLE_SPEC.name);
    await typeIntoApiSpecEditor(page, EDIT_MARKER);
    await expect(tabUnsavedMarker(EDITABLE_SPEC.file)).toHaveClass(/has-changes/);

    await createTransientRequest(page);
    await closeOtherTabsFrom(page, 'Untitled');

    await expect(locators.tabs.requestTab(EDITABLE_SPEC.file)).toHaveCount(0);
    await expect
      .poll(() => fs.readFileSync(specPath, 'utf8').startsWith(EDIT_MARKER))
      .toBe(true);
  });

  test('asks before throwing away unsaved spec edits when the tab is closed with a middle click', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { unsavedChangesDialog, saveAndCloseButton } = buildApiSpecPanelLocators(page);

    const tmpDir = await createTmpDir('api-spec-middle-click');
    const specPath = path.join(tmpDir, EDITABLE_SPEC.file);
    fs.copyFileSync(fixture(EDITABLE_SPEC.file), specPath);

    await openApiSpecFromDialog(page, electronApp, specPath);
    await openApiSpecSidebarItem(page, EDITABLE_SPEC.name);
    await typeIntoApiSpecEditor(page, EDIT_MARKER);

    const specTab = locators.tabs.requestTab(EDITABLE_SPEC.file);
    await specTab.click({ button: 'middle' });

    await expect(unsavedChangesDialog()).toBeVisible();
    await expect(specTab).toBeVisible();

    await saveAndCloseButton().click();

    await expect(specTab).toHaveCount(0);
    await expect
      .poll(() => fs.readFileSync(specPath, 'utf8').startsWith(EDIT_MARKER))
      .toBe(true);
  });

  test('closes the tab when the spec is removed from the workspace', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const { sidebarItem } = buildApiSpecPanelLocators(page);

    const tmpDir = await createTmpDir('api-spec-remove');
    const specPath = path.join(tmpDir, EDITABLE_SPEC.file);
    fs.copyFileSync(fixture(EDITABLE_SPEC.file), specPath);

    await openApiSpecFromDialog(page, electronApp, specPath);
    await openApiSpecSidebarItem(page, EDITABLE_SPEC.name);
    await expect(locators.tabs.requestTab(EDITABLE_SPEC.file)).toBeVisible();

    await removeApiSpecFromWorkspace(page, EDITABLE_SPEC.name);

    await expect(sidebarItem(EDITABLE_SPEC.name)).toHaveCount(0);
    await expect(locators.tabs.requestTab(EDITABLE_SPEC.file)).toHaveCount(0);
    expect(fs.existsSync(specPath)).toBe(true);
  });
});

test.describe('API spec tabs come back after a restart', () => {
  test.setTimeout(90000);

  const openBothSpecs = async (page: any, app: any, first: string, second: string) => {
    const { sidebarItem } = buildApiSpecPanelLocators(page);

    await openApiSpecFromDialog(page, app, first);
    await expect(sidebarItem(FIRST_SPEC.name)).toBeVisible();
    await openApiSpecFromDialog(page, app, second);
    await expect(sidebarItem(SECOND_SPEC.name)).toBeVisible();

    await openApiSpecSidebarItem(page, FIRST_SPEC.name);
    await openApiSpecSidebarItem(page, SECOND_SPEC.name);
  };

  test('reopens both spec tabs with the one the user was reading still in front', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('api-spec-restart');
    const specsDir = await createTmpDir('api-spec-restart-files');
    const firstPath = path.join(specsDir, FIRST_SPEC.file);
    const secondPath = path.join(specsDir, SECOND_SPEC.file);
    fs.copyFileSync(fixture(FIRST_SPEC.file), firstPath);
    fs.copyFileSync(fixture(SECOND_SPEC.file), secondPath);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await openBothSpecs(page, app, firstPath, secondPath);
    await expect(buildCommonLocators(page).tabs.activeRequestTab()).toContainText(SECOND_SPEC.file);

    await waitForSnapshotApiSpecTabs(userDataPath, [firstPath, secondPath], { activePathname: secondPath });
    await closeElectronApp(app);

    const restarted = await launchElectronApp({ userDataPath });
    const restartedPage = await waitForReadyPage(restarted);
    const restartedLocators = buildCommonLocators(restartedPage);

    await expect(restartedLocators.tabs.requestTab(FIRST_SPEC.file)).toHaveCount(1, { timeout: 15000 });
    await expect(restartedLocators.tabs.requestTab(SECOND_SPEC.file)).toHaveCount(1);
    await expect(restartedLocators.tabs.activeRequestTab()).toContainText(SECOND_SPEC.file);

    const restartedPanel = buildApiSpecPanelLocators(restartedPage);
    await expect(restartedPanel.specEditor()).toHaveCount(1, { timeout: 15000 });
    await expandApiSpecsSection(restartedPage);
    await expect(restartedPanel.sidebarItems()).toHaveCount(2);
    await expect(restartedPanel.sidebarItem(FIRST_SPEC.name)).toBeVisible();
    await expect(restartedPanel.sidebarItem(SECOND_SPEC.name)).toBeVisible();

    await closeElectronApp(restarted);
  });

  test('leaves out the tab of a spec whose file was deleted while the app was closed', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('api-spec-restart-missing');
    const specsDir = await createTmpDir('api-spec-restart-missing-files');
    const firstPath = path.join(specsDir, FIRST_SPEC.file);
    const secondPath = path.join(specsDir, SECOND_SPEC.file);
    fs.copyFileSync(fixture(FIRST_SPEC.file), firstPath);
    fs.copyFileSync(fixture(SECOND_SPEC.file), secondPath);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await openBothSpecs(page, app, firstPath, secondPath);

    await waitForSnapshotApiSpecTabs(userDataPath, [firstPath, secondPath]);
    await closeElectronApp(app);

    fs.rmSync(secondPath);

    const restarted = await launchElectronApp({ userDataPath });
    const restartedPage = await waitForReadyPage(restarted);
    const restartedLocators = buildCommonLocators(restartedPage);

    const restartedPanel = buildApiSpecPanelLocators(restartedPage);

    await expect(restartedLocators.tabs.requestTab(FIRST_SPEC.file)).toHaveCount(1, { timeout: 15000 });
    await expect(restartedLocators.tabs.requestTab(SECOND_SPEC.file)).toHaveCount(0);
    await expandApiSpecsSection(restartedPage);
    await expect(restartedPanel.sidebarItems()).toHaveCount(1, { timeout: 30000 });
    await expect(restartedPanel.sidebarItem(FIRST_SPEC.name)).toBeVisible();
    await expect(restartedPanel.sidebarItem(SECOND_SPEC.name)).toHaveCount(0);

    await closeElectronApp(restarted);
  });
});
