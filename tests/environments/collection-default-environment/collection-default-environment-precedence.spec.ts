import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  buildCommonLocators,
  openCollection,
  selectEnvironment,
  waitForReadyPage,
  waitForCollectionMount,
  waitForSnapshotCollectionEnvironment
} from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const collectionRoot = path.join(__dirname, 'fixtures', 'collection');

test.describe('Collection Default Environment - precedence', () => {
  test('snapshot selection wins over the configured default on reopen', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('default-env-snapshot-wins');

    // First launch. The collection configures presets.defaultEnvironment: "prod".
    const app = await launchElectronApp({ initUserDataPath, userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('First launch: open collection with configured default', async () => {
      await openCollection(page, 'collection-default-environment');
      await waitForCollectionMount(page, 'collection-default-environment');
    });

    await test.step('Explicitly select environment and persist to snapshot', async () => {
      // Explicitly select a different environment; this is persisted to the ui-snapshot.
      // (selectEnvironment waits for the option and asserts the selection internally.)
      await selectEnvironment(page, 'dev', 'collection');
      await waitForSnapshotCollectionEnvironment(userDataPath, collectionRoot, 'dev');
      await closeElectronApp(app);
    });

    // Second launch reuses the same userData, so the snapshot (dev) is present.
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);
    const { environment: environment2 } = buildCommonLocators(page2);

    await test.step('Second launch: verify snapshot selection wins over configured default', async () => {
      await openCollection(page2, 'collection-default-environment');
      await waitForCollectionMount(page2, 'collection-default-environment');
    });

    // The saved snapshot selection (dev) must win over the configured default (prod).
    await expect(environment2.currentEnvironment()).toContainText('dev');

    await closeElectronApp(app2);
  });

  test('explicit "No Environment" is preserved and the default is not re-applied on reopen', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('default-env-no-env-sticks');

    // First launch. The collection configures presets.defaultEnvironment: "prod".
    const app = await launchElectronApp({ initUserDataPath, userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('First launch: open collection with configured default', async () => {
      await openCollection(page, 'collection-default-environment');
      await waitForCollectionMount(page, 'collection-default-environment');
    });

    await test.step('Explicitly clear environment and persist to snapshot', async () => {
      // Explicitly clear the environment. This records a snapshot entry with an empty
      // selection (an explicit "No Environment" choice, distinct from "never chose").
      await selectEnvironment(page, 'No Environment', 'collection');
      await waitForSnapshotCollectionEnvironment(userDataPath, collectionRoot, '');
      await closeElectronApp(app);
    });

    // Second launch reuses the same userData → the snapshot entry exists (empty selection).
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);
    const { environment: environment2 } = buildCommonLocators(page2);

    await test.step('Second launch: verify recorded "No Environment" is not overridden by the default', async () => {
      await openCollection(page2, 'collection-default-environment');
      await waitForCollectionMount(page2, 'collection-default-environment');
    });

    // Because a choice was already recorded, the default (prod) must NOT be re-applied.
    await expect(environment2.currentEnvironment()).toContainText('No Environment');

    await closeElectronApp(app2);
  });
});
