import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { test, expect, ElectronApplication, Page, waitForReadyPage, closeElectronApp } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import { openEnvironmentSelector } from '../../utils/page/environments';

const COLLECTION_NAME = 'Env Color Collection';
const ENVIRONMENT_NAME = 'Local';
const COLOR = '#CE4F3B';
const COLOR_RGB = 'rgb(206, 79, 59)';

interface Fixture {
  userDataPath: string;
  collectionPath: string;
  cleanup: () => Promise<void>;
}

const buildFixture = async (): Promise<Fixture> => {
  const userDataPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-env-color-userdata-'));
  const collectionPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-env-color-collection-'));

  const cleanup = async () => {
    await Promise.all([
      fs.promises.rm(userDataPath, { recursive: true, force: true }),
      fs.promises.rm(collectionPath, { recursive: true, force: true })
    ]);
  };

  try {
    await fs.promises.writeFile(
      path.join(collectionPath, 'opencollection.yml'),
      `opencollection: "1.0.0"\ninfo:\n  name: ${COLLECTION_NAME}\n`
    );
    await fs.promises.mkdir(path.join(collectionPath, 'environments'));
    await fs.promises.writeFile(
      path.join(collectionPath, 'environments', `${ENVIRONMENT_NAME}.yml`),
      `name: ${ENVIRONMENT_NAME}\ncolor: "${COLOR}"\nvariables:\n  - name: host\n    value: http://localhost:8081\n`
    );

    const preferences = {
      lastOpenedCollections: [collectionPath],
      preferences: {
        cache: {
          file: { enabled: true }
        },
        onboarding: {
          hasLaunchedBefore: true,
          hasSeenWelcomeModal: true
        }
      }
    };
    await fs.promises.writeFile(path.join(userDataPath, 'preferences.json'), JSON.stringify(preferences, null, 2));

    return { userDataPath, collectionPath, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};

test.describe('[file-cache on] Environment colors', () => {
  let fixture: Fixture;
  let app: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ launchElectronApp }) => {
    fixture = await buildFixture();
    app = await launchElectronApp({ userDataPath: fixture.userDataPath });
    page = await waitForReadyPage(app);
  });

  test.afterAll(async () => {
    if (app) {
      await closeElectronApp(app);
    }
    if (fixture) {
      await fixture.cleanup();
    }
  });

  test('survive a mount served from the file cache', async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection(COLLECTION_NAME).click();
    await openEnvironmentSelector(page);
    const colorBadge = locators.environment.listOptionBadge(ENVIRONMENT_NAME).first();
    await expect(colorBadge).toHaveCSS('background-color', COLOR_RGB);
  });
});
