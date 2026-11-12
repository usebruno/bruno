import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createEnvironment,
  createRequest,
  selectCollectionPaneTab
} from '../../utils/page';

const environmentCountLabel = (count: number, scope: 'collection' | 'global') =>
  `${count} ${scope} environment${count === 1 ? '' : 's'}`;

const openOverview = async (page: Page, collectionName: string) => {
  await test.step(`Open Overview for "${collectionName}"`, async () => {
    const { collectionHeader } = buildCommonLocators(page);
    await collectionHeader.overflowMenu().click();
    await collectionHeader.overflowMenuItem('collection-settings').click();
    await selectCollectionPaneTab(page, 'overview');
  });
};

test.describe('Collection settings overview', () => {
  test('TC-2619: Verify Location of the collection is displayed below the Overview', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'OverviewLocation';
    const location = await createTmpDir(collectionName);
    const expectedPath = path.join(location, collectionName);
    const { collectionOverview } = buildCommonLocators(page);

    await test.step('Open a collection on the Overview tab', async () => {
      await createCollection(page, collectionName, location);
      await openOverview(page, collectionName);
    });

    await test.step('Location shows the collection directory', async () => {
      await expect(collectionOverview.locationLabel()).toBeVisible();

      const displayedCollectionLocation = (await collectionOverview.collectionLocation().innerText()).trim();
      expect(displayedCollectionLocation.replace(/\\/g, '/')).toBe(expectedPath.replace(/\\/g, '/'));
    });
  });

  test('TC-2620: Verify the accuracy of Collection Environment and Global Environment counts displayed in the Environments section.', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }, testInfo) => {
    const collectionName = 'OverviewEnvironments';
    const suffix = `${testInfo.workerIndex}-${testInfo.retry}`;
    const { collectionOverview, paneTabs } = buildCommonLocators(page);
    let globalCountBefore = 0;

    await test.step('Clicking the collection name opens Overview by default', async () => {
      // createCollection ends by clicking the new collection's name in the sidebar.
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await paneTabs.collectionSettingsTab('overview').and(page.locator('.active')).waitFor({ state: 'visible' });
    });

    await test.step('Read the current environment counts', async () => {
      globalCountBefore = parseInt(await collectionOverview.globalEnvironmentCount().innerText());
      await expect(collectionOverview.collectionEnvironmentCount()).toHaveText(environmentCountLabel(0, 'collection'));
    });

    await test.step('Add two collection environments and one global environment', async () => {
      await createEnvironment(page, `Collection Env A ${suffix}`, 'collection');
      await createEnvironment(page, `Collection Env B ${suffix}`, 'collection');
      await createEnvironment(page, `Global Env ${suffix}`, 'global');
    });

    await test.step('Overview counts match the environments that were created', async () => {
      // Global environments belong to the worker's Electron app and are not reset between tests.
      const expectedGlobalEnvironmentCount = globalCountBefore + 1;

      await openOverview(page, collectionName);
      await expect(collectionOverview.environmentsLabel()).toBeVisible();
      await expect(collectionOverview.collectionEnvironmentCount()).toHaveText(environmentCountLabel(2, 'collection'));
      await expect(collectionOverview.globalEnvironmentCount()).toHaveText(
        environmentCountLabel(expectedGlobalEnvironmentCount, 'global')
      );
    });
  });

  test('TC-2622: Verify Number of Requests available in the collection is displayed under Requests section', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'OverviewRequests';
    const { collectionOverview } = buildCommonLocators(page);

    await test.step('Create a collection with two requests', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, 'request 1', collectionName);
      await createRequest(page, 'request 2', collectionName);
    });

    await test.step('Requests section shows the request count', async () => {
      await openOverview(page, collectionName);
      await expect(collectionOverview.requestsLabel()).toBeVisible();
      await expect(collectionOverview.requestCount()).toHaveText('2 requests in collection');
    });
  });

  test('TC-2623: Verify Share Collection option is available', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'OverviewShare';
    const { collectionOverview, shareCollection } = buildCommonLocators(page);

    await test.step('Open collection Overview', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await openOverview(page, collectionName);
    });

    await test.step('Share Collection is visible and opens the share modal', async () => {
      const share = collectionOverview.shareCollection();
      await expect(collectionOverview.shareLabel()).toBeVisible();
      await expect(share).toBeVisible();
      await share.click();

      const shareModal = shareCollection.modal();
      await expect(shareModal).toBeVisible();
    });

    // Enterprise Share Collection has Git / Export / Embed tabs (`share-collection-tab-export`).
    // OSS has no tabs — ZIP, YAML and Postman are on the modal itself.
    const isEnterprise = await shareCollection.exportTab().isVisible();

    if (isEnterprise) {
      await test.step('Enterprise modal shows Git, Export and Embed', async () => {
        await expect(shareCollection.gitTab()).toBeVisible();
        await expect(shareCollection.exportTab()).toBeVisible();
        await expect(shareCollection.embedTab()).toBeVisible();
      });

      await test.step('Export tab shows ZIP, YAML, Postman and OpenAPI', async () => {
        await shareCollection.exportTab().click();
        await expect(shareCollection.zipCard()).toBeVisible();
        await expect(shareCollection.yamlCard()).toBeVisible();
        await expect(shareCollection.postmanCard()).toBeVisible();
        await expect(shareCollection.openApiCard()).toBeVisible();
      });
    } else {
      await test.step('OSS modal shows ZIP, YAML and Postman', async () => {
        await expect(shareCollection.gitTab()).toBeHidden();
        await expect(shareCollection.exportTab()).toBeHidden();
        await expect(shareCollection.embedTab()).toBeHidden();
        await expect(shareCollection.zipCard()).toBeVisible();
        await expect(shareCollection.yamlCard()).toBeVisible();
        await expect(shareCollection.postmanCard()).toBeVisible();
        await expect(shareCollection.openApiCard()).toBeHidden();
      });
    }

    await test.step('Close the share modal', async () => {
      const shareModal = shareCollection.modal();
      await shareCollection.closeButton().click();
      await expect(shareModal).toBeHidden();
    });
  });

  test('TC-2624: Verify Generate docs option is available in the Documentation section', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const collectionName = 'OverviewDocs';
    const docsDirectory = await createTmpDir(collectionName);
    const { collectionOverview, generateDocs } = buildCommonLocators(page);

    await test.step('Open collection Overview', async () => {
      await createCollection(page, collectionName, docsDirectory);
      await openOverview(page, collectionName);
    });

    await test.step('Documentation section is visible', async () => {
      await expect(collectionOverview.documentationLabel()).toBeVisible();
    });

    await test.step('Generate Docs is available in the Documentation section', async () => {
      await expect(collectionOverview.generateDocs()).toBeVisible();
    });

    await test.step('Generate Docs opens a modal with Generate and Cancel', async () => {
      await collectionOverview.generateDocs().click();
      await expect(generateDocs.modal()).toBeVisible();
      await expect(generateDocs.generateButton()).toBeVisible();
      await expect(generateDocs.cancelButton()).toBeVisible();
      await expect(generateDocs.generateButton()).toBeEnabled();
    });

    await test.step('Generate saves the HTML documentation locally', async () => {
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
      expect(savedHtml).toContain('id="opencollection-container"');
    });
  });
});
