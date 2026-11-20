import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createEnvironment,
  openCollectionSettings,
  selectCollectionPaneTab
} from '../../../pages';

const environmentCountLabel = (count: number, scope: 'collection' | 'global') =>
  `${count} ${scope} environment${count === 1 ? '' : 's'}`;

test.use({
  collectionFixturePath: path.join(__dirname, 'fixtures', 'collections')
});

test.describe('Collection settings overview', () => {
  test('TC-2619: Verify Location of the collection is displayed below the Overview', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const collectionName = 'OverviewLocation';
    const { collectionSettingsOverview } = buildCommonLocators(page);
    await test.step('Open a collection on the Overview tab', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'overview');
    });
    await test.step('Verify that location shows the collection directory', async () => {
      await expect(collectionSettingsOverview.locationLabel()).toBeVisible();
      await expect(collectionSettingsOverview.collectionLocation()).toHaveText(/[\\/]OverviewLocation$/);
    });
  });

  test('TC-2620: Verify the accuracy of Collection Environment and Global Environment counts displayed in the Environments section.', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }, testInfo) => {
    const collectionName = 'OverviewEnvironments';
    const suffix = `${testInfo.workerIndex}-${testInfo.retry}`;
    const { collectionSettingsOverview, paneTabs } = buildCommonLocators(page);
    let globalCountBefore = 0;

    await test.step('Verify that clicking the collection name opens Overview by default', async () => {
      await openCollectionSettings(page, collectionName);
      await expect(paneTabs.collectionSettingsTab('overview')).toContainClass('active');
    });

    await test.step('Verify that the initial environment counts are shown', async () => {
      await expect(collectionSettingsOverview.collectionEnvironmentCount()).toHaveText(environmentCountLabel(0, 'collection'));
      globalCountBefore = parseInt(await collectionSettingsOverview.globalEnvironmentCount().innerText(), 10);
    });

    await test.step('Add two collection environments and one global environment', async () => {
      await createEnvironment(page, `Collection Env A ${suffix}`, 'collection');
      await createEnvironment(page, `Collection Env B ${suffix}`, 'collection');
      await createEnvironment(page, `Global Env ${suffix}`, 'global');
    });

    await test.step('Verify that overview counts match the environments that were created', async () => {
      // Global environments belong to the worker's Electron app and are not reset between tests.
      const expectedGlobalEnvironmentCount = globalCountBefore + 1;

      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'overview');
      await expect(collectionSettingsOverview.environmentsLabel()).toBeVisible();
      await expect(collectionSettingsOverview.collectionEnvironmentCount()).toHaveText(environmentCountLabel(2, 'collection'));
      await expect(collectionSettingsOverview.globalEnvironmentCount()).toHaveText(
        environmentCountLabel(expectedGlobalEnvironmentCount, 'global')
      );
    });
  });

  test('TC-2622: Verify the number of requests in the collection is displayed in the Requests section', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const collectionName = 'OverviewRequests';
    const { collectionSettingsOverview } = buildCommonLocators(page);

    await test.step('Verify that requests section shows the request count', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'overview');
      await expect(collectionSettingsOverview.requestsLabel()).toBeVisible();
      await expect(collectionSettingsOverview.requestCount()).toHaveText('2 requests in collection');
    });
  });

  test('TC-2623: Verify Share Collection option is available', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const collectionName = 'OverviewShare';
    const { collectionSettingsOverview, export: exportLocators } = buildCommonLocators(page);

    await test.step('Open collection Overview', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'overview');
    });

    await test.step('Verify that Share Collection is visible and opens the share modal', async () => {
      const share = collectionSettingsOverview.shareCollection();
      await expect(collectionSettingsOverview.shareLabel()).toBeVisible();
      await expect(share).toBeVisible();
      await share.click();

      const shareModal = exportLocators.modal();
      await expect(shareModal).toBeVisible();
    });

    await test.step('Verify that share modal shows ZIP, YAML and Postman export options', async () => {
      await expect(exportLocators.zipFormatCard()).toBeVisible();
      await expect(exportLocators.yamlFormatCard()).toBeVisible();
      await expect(exportLocators.postmanFormatCard()).toBeVisible();
    });

    await test.step('Verify that the share modal closes', async () => {
      const shareModal = exportLocators.modal();
      await exportLocators.closeButton().click();
      await expect(shareModal).toBeHidden();
    });
  });

  test('TC-2624: Verify Generate docs option is available in the Documentation section', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp,
    createTmpDir
  }, testInfo) => {
    const collectionName = 'OverviewDocs';
    const docsDirectory = await createTmpDir(collectionName);
    const electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    const { collectionSettingsOverview, generateDocs } = buildCommonLocators(page);

    await test.step('Open collection Overview', async () => {
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'overview');
    });

    await test.step('Verify that the documentation section is visible', async () => {
      await expect(collectionSettingsOverview.documentationLabel()).toBeVisible();
    });

    await test.step('Verify that Generate Docs is available in the Documentation section', async () => {
      await expect(collectionSettingsOverview.generateDocs()).toBeVisible();
    });

    await test.step('Verify that Generate Docs opens a modal with Generate and Cancel', async () => {
      await collectionSettingsOverview.generateDocs().click();
      await expect(generateDocs.modal()).toBeVisible();
      await expect(generateDocs.generateButton()).toBeVisible();
      await expect(generateDocs.cancelButton()).toBeVisible();
      await expect(generateDocs.generateButton()).toBeEnabled();
    });

    await test.step('Verify that generate saves the HTML documentation locally', async () => {
      // Electron shows its save dialog for this download, so the test answers it with a temp path.
      await electronApp.evaluate(({ session }, { directory, separator }) => {
        session.defaultSession.once('will-download', (_event, item) => {
          item.setSavePath(`${directory}${separator}${item.getFilename()}`);
        });
      }, { directory: docsDirectory, separator: path.sep });

      const savedDocsPath = path.join(docsDirectory, `${collectionName}-documentation.html`);

      await generateDocs.generateButton().click();
      await expect(generateDocs.modal()).toBeHidden();

      await expect.poll(() => fs.readFile(savedDocsPath, 'utf8').catch(() => '')).toContain('</html>');

      const savedHtml = await fs.readFile(savedDocsPath, 'utf8');
      expect(savedHtml).toContain(`<title>${collectionName} - API Documentation</title>`);
      expect(savedHtml).toContain('id="bruno-api-docs"');
    });
  });
});
