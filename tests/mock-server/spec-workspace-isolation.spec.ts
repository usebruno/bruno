import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import { buildMockServerLocators, openCreateMockServerModal, openMockServerSettings } from '../utils/page/mock-server';
import { buildApiSpecPanelLocators, openApiSpecFromDialog } from '../utils/page/openapi/render-spec';

const EMPTY_WORKSPACE_YML = [
  'opencollection: 1.0.0',
  'info:',
  '  name: EmptyWorkspace',
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

// The Mock Servers sidebar section is behind a beta flag, so it has to be enabled for the
// create-mock-server button and the mock server rows to exist at all.
const PREFERENCES = JSON.stringify({
  preferences: {
    onboarding: {
      hasLaunchedBefore: true,
      hasSeenWelcomeModal: true
    },
    beta: {
      'mock-server': true
    }
  }
}, null, 2);

const SPEC_FIXTURE = path.resolve(__dirname, '..', 'import', 'openapi', 'fixtures', 'openapi-comprehensive.yaml');
const SPEC_TITLE = 'Comprehensive API Test Collection';
const SPEC_FILENAME = 'openapi-comprehensive.yaml';
const STALE_SPEC_SERVER = 'Stale Spec Mock';

const buildStaleSpecMockYml = (specPath: string) => [
  'info:',
  `  name: ${STALE_SPEC_SERVER}`,
  'mock:',
  '  port: 4599',
  '  delay: 0',
  '  source:',
  '    type: spec',
  `    path: "${specPath.replace(/\\/g, '\\\\')}"`,
  'routes: []',
  ''
].join('\n');

const seedWorkspace = async (
  createTmpDir: (tag?: string) => Promise<string>,
  { staleSpecMock = false } = {}
) => {
  const userDataPath = await createTmpDir('mock-server-spec-isolation');
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), PREFERENCES);

  const workspacePath = await createTmpDir('empty-workspace');
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), EMPTY_WORKSPACE_YML);

  if (staleSpecMock) {
    const mocksDir = path.join(workspacePath, 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });
    fs.writeFileSync(path.join(mocksDir, 'stale-spec-mock.yml'), buildStaleSpecMockYml(SPEC_FIXTURE));
  }

  return { userDataPath, workspacePath };
};

test.describe('Mock server API spec source is scoped to the active workspace', () => {
  test('a spec opened in another workspace is never offered in an empty workspace', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);

    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir);
    const app = await launchElectronApp({ userDataPath });

    try {
      const page = await waitForReadyPage(app);
      const titleBar = buildTitleBarLocators(page);
      const apiSpecPanel = buildApiSpecPanelLocators(page);
      const ms = buildMockServerLocators(page);

      await test.step('Open an API spec in the starting workspace', async () => {
        await openApiSpecFromDialog(page, app, SPEC_FIXTURE);
        await expect(apiSpecPanel.sidebarItem(SPEC_TITLE)).toBeVisible({ timeout: 10000 });
      });

      await test.step('Switch to a workspace that has no collections and no specs', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await expect(titleBar.activeWorkspaceName()).toHaveText('EmptyWorkspace', { timeout: 10000 });
      });

      await test.step('The API Specs sidebar section is empty here', async () => {
        await expect(apiSpecPanel.sidebarItem(SPEC_TITLE)).toHaveCount(0);
      });

      await openCreateMockServerModal(page);

      await test.step('Standalone is the default because nothing here can be linked', async () => {
        await expect(ms.sourceManualRadio()).toBeChecked();
      });

      await test.step('The Collection and API Spec sources stay unavailable', async () => {
        await expect(ms.sourceCollectionRadio()).toBeDisabled();
        await expect(ms.sourceSpecRadio()).toBeDisabled();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('editing a mock server whose spec is not in this workspace does not offer that spec by name', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(60000);

    const { userDataPath, workspacePath } = await seedWorkspace(createTmpDir, { staleSpecMock: true });
    const app = await launchElectronApp({ userDataPath });

    try {
      const page = await waitForReadyPage(app);
      const titleBar = buildTitleBarLocators(page);
      const ms = buildMockServerLocators(page);

      await test.step('Open the workspace holding a mock server linked to an unregistered spec', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await expect(titleBar.activeWorkspaceName()).toHaveText('EmptyWorkspace', { timeout: 10000 });
      });

      await openMockServerSettings(page, STALE_SPEC_SERVER);

      await test.step('The stale spec keeps the selection filled instead of blanking the field', async () => {
        await expect(ms.specSelect()).toBeVisible();
        await expect(ms.specSelect()).not.toHaveValue('');
        await expect(ms.specSelectedOption()).toHaveText(SPEC_FILENAME);
      });

      await test.step('The unregistered spec is never offered under its own name', async () => {
        await expect(ms.specOption(SPEC_TITLE)).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
