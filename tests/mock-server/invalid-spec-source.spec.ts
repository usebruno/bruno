import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { buildMockServerLocators, openCreateMockServerModal } from '../utils/page/mock-server';
import { buildApiSpecPanelLocators, openApiSpecFromDialog } from '../utils/page/openapi/render-spec';

// The Mock Servers sidebar section is behind a beta flag.
const PREFERENCES = JSON.stringify({
  preferences: {
    onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true },
    beta: { 'mock-server': true }
  }
});

const SERVER_NAME = 'Invalid Spec Mock';
const NOT_PARSEABLE = /API spec is not valid YAML or JSON: .*\(line \d+, column \d+\)/;
const NOT_A_SPEC = 'API spec must have an openapi or swagger version and an info object.';
const NO_PATHS = 'API spec does not define any paths.';

const scenarios = [
  {
    name: 'YAML that does not parse',
    filename: 'broken.yaml',
    content: 'openapi: 3.0.0\ninfo:\n  title: Broken\n   version: : :\npaths: [\n',
    error: NOT_PARSEABLE
  },
  {
    name: 'JSON that does not parse',
    filename: 'broken.json',
    content: '{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "Broken"\n    "version": "1.0.0"\n  },\n  "paths": {\n',
    error: NOT_PARSEABLE
  },
  {
    name: 'a plain text file',
    filename: 'notes.yaml',
    content: 'This is a plain text file, not an OpenAPI spec.\n',
    error: NOT_A_SPEC
  },
  {
    name: 'an empty file',
    filename: 'empty.yaml',
    content: '',
    error: NOT_A_SPEC
  },
  {
    name: 'a spec with no openapi or swagger version',
    filename: 'no-version.yaml',
    content: 'info:\n  title: No Version\n  version: 1.0.0\npaths:\n  /pets:\n    get:\n      responses:\n        "200":\n          description: OK\n',
    error: NOT_A_SPEC
  },
  {
    name: 'a spec whose openapi version is not a string',
    filename: 'numeric-version.yaml',
    content: 'openapi: 3.0\ninfo:\n  title: Numeric Version\n  version: 1.0.0\npaths:\n  /pets: {}\n',
    error: NOT_A_SPEC
  },
  {
    name: 'a spec with no info object',
    filename: 'no-info.yaml',
    content: 'swagger: "2.0"\npaths:\n  /pets:\n    get:\n      responses:\n        "200":\n          description: OK\n',
    error: NOT_A_SPEC
  },
  {
    name: 'a spec with no paths',
    filename: 'no-paths.yaml',
    content: 'openapi: 3.0.0\ninfo:\n  title: No Paths\n  version: 1.0.0\n',
    error: NO_PATHS
  },
  {
    name: 'a spec with empty paths',
    filename: 'empty-paths.yaml',
    content: 'swagger: "2.0"\ninfo:\n  title: Empty Paths\n  version: 1.0.0\npaths: {}\n',
    error: NO_PATHS
  },
  {
    name: 'a spec with empty paths, with response sync turned off',
    filename: 'empty-paths-no-sync.yaml',
    content: 'openapi: 3.0.0\ninfo:\n  title: Empty Paths\n  version: 1.0.0\npaths: {}\n',
    error: NO_PATHS,
    syncOnCreate: false
  }
];

test.describe('Creating a mock server from an invalid API spec', () => {
  for (const scenario of scenarios) {
    test(`is blocked for ${scenario.name}`, async ({ launchElectronApp, createTmpDir }) => {
      test.setTimeout(60000);

      const userDataPath = await createTmpDir('mock-server-invalid-spec');
      fs.writeFileSync(path.join(userDataPath, 'preferences.json'), PREFERENCES);
      const specPath = path.join(await createTmpDir('invalid-spec'), scenario.filename);
      fs.writeFileSync(specPath, scenario.content);

      const app = await launchElectronApp({ userDataPath });

      try {
        const page = await waitForReadyPage(app);
        const ms = buildMockServerLocators(page);

        await test.step('Open the invalid spec', async () => {
          await openApiSpecFromDialog(page, app, specPath);
          await expect(buildApiSpecPanelLocators(page).sidebarItems()).toHaveCount(1, { timeout: 10000 });
        });

        await openCreateMockServerModal(page);

        await test.step('Submit a mock server that uses the spec as its source', async () => {
          await ms.nameInput().fill(SERVER_NAME);
          await ms.sourceSpecRadio().check();
          await ms.specSelect().selectOption({ index: 1 });
          await ms.syncOnCreateCheckbox().setChecked(scenario.syncOnCreate ?? true);
          await ms.modalSubmit().click();
        });

        await test.step('The spec error is shown and the modal stays open', async () => {
          await expect(ms.createModal().getByText(scenario.error)).toBeVisible({ timeout: 10000 });
          await expect(ms.createModal()).toBeVisible();
        });

        await test.step('No mock server was created', async () => {
          await expect(ms.sidebarItem(SERVER_NAME)).toHaveCount(0);
          await expect(ms.dashboard()).toHaveCount(0);
        });
      } finally {
        await closeElectronApp(app);
      }
    });
  }
});
