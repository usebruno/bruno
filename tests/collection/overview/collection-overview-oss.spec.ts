import path from 'node:path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createEnvironment,
  createRequest,
  openCollectionSettings,
  selectCollectionPaneTab
} from '../../utils/page';

const environmentCountLabel = (count: number, scope: 'collection' | 'global') =>
  `${count} ${scope} environment${count === 1 ? '' : 's'}`;

const openOverview = async (page: Parameters<typeof openCollectionSettings>[0], collectionName: string) => {
  await openCollectionSettings(page, collectionName);
  await selectCollectionPaneTab(page, 'overview');
};

test.describe('Collection settings overview', () => {
  test.setTimeout(90 * 1000);
  test('TC-2619: Verify Location of the collection is displayed below the Overview', async ({ page, createTmpDir }) => {
    const collectionName = 'OverviewLocation';
    const location = await createTmpDir('TC-2619');
    const expectedPath = path.join(location, collectionName);

    await test.step('Open a collection on the Overview tab', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, location);
      await openOverview(page, collectionName);
    });

    await test.step('Location shows the collection directory', async () => {
      await expect(page.getByTestId('overview-location-label')).toBeVisible();

      const displayed = (await page.getByTestId('overview-collection-location').innerText()).trim();
      expect(displayed.replace(/\\/g, '/')).toBe(expectedPath.replace(/\\/g, '/'));
      expect(path.basename(displayed)).toBe(collectionName);
    });
  });

  test('TC-2620: Verify the accuracy of Collection Environment and Global Environment counts displayed in the Environments section.', async ({
    page,
    createTmpDir
  }, testInfo) => {
    const collectionName = 'OverviewEnvironments';
    const suffix = `${testInfo.workerIndex}-${testInfo.retry}`;
    let globalCountBefore = 0;

    await test.step('Open a new collection and read the current global environment count', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('TC-2620'));
      await openOverview(page, collectionName);

      const globalLabel = (await page.getByTestId('overview-global-environment-count').innerText()).trim();
      globalCountBefore = Number(globalLabel.match(/^(\d+)/)?.[1]);
      expect(globalCountBefore).not.toBeNaN();
      await expect(page.getByTestId('overview-collection-environment-count')).toHaveText(environmentCountLabel(0, 'collection'));
    });

    await test.step('Add two collection environments and one global environment', async () => {
      await createEnvironment(page, `Collection Env A ${suffix}`, 'collection');
      await createEnvironment(page, `Collection Env B ${suffix}`, 'collection');
      await createEnvironment(page, `Global Env ${suffix}`, 'global');
    });

    await test.step('Overview counts match the environments that were created', async () => {
      await openOverview(page, collectionName);
      await expect(page.getByTestId('overview-environments-label')).toBeVisible();
      await expect(page.getByTestId('overview-collection-environment-count')).toHaveText(environmentCountLabel(2, 'collection'));
      await expect(page.getByTestId('overview-global-environment-count')).toHaveText(
        environmentCountLabel(globalCountBefore + 1, 'global')
      );
    });
  });

  test('TC-2622: Verify Number of Requests available in the collection is displayed under Requests section', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'OverviewRequests';

    await test.step('Create a collection with two requests', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('TC-2622'));
      await createRequest(page, 'List users', collectionName);
      await createRequest(page, 'Create user', collectionName);
    });

    await test.step('Requests section shows the request count', async () => {
      await openOverview(page, collectionName);
      await expect(page.getByTestId('overview-requests-label')).toBeVisible();
      await expect(page.getByTestId('overview-request-count')).toHaveText('2 requests in collection');
    });
  });

  test('TC-2623: Verify Share Collection option is available', async ({ page, createTmpDir }) => {
    const collectionName = 'OverviewShare';

    await test.step('Open collection Overview', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('TC-2623'));
      await openOverview(page, collectionName);
    });

    await test.step('Share Collection is visible and opens the share modal', async () => {
      const share = page.getByTestId('overview-share-collection');
      await expect(page.getByTestId('overview-share-label')).toBeVisible();
      await expect(share).toBeVisible();
      await share.click();

      const modal = page.locator('.bruno-modal').filter({ hasText: 'Share Collection' });
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Bruno Collection (ZIP)', { exact: true })).toBeVisible();
      await expect(modal.getByText('Single File (YAML)', { exact: true })).toBeVisible();
      await expect(modal.getByText('Export for Postman', { exact: true })).toBeVisible();
      await expect(modal.locator('.format-card, .other-format-card')).toHaveCount(3);

      await modal.getByTestId('modal-close-button').click();
      await expect(modal).toBeHidden();
    });
  });

  test('TC-2624: Verify Generate docs option is available in the Documentation section', async ({ page, createTmpDir }) => {
    const collectionName = 'OverviewDocs';
    const locators = buildCommonLocators(page);

    await test.step('Open collection Overview', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('TC-2624'));
      await openOverview(page, collectionName);
    });

    await test.step('Generate Docs opens a modal with Generate and Cancel', async () => {
      await expect(page.getByTestId('overview-documentation-label')).toBeVisible();
      await expect(page.getByTestId('overview-generate-docs')).toBeVisible();
      await page.getByTestId('overview-generate-docs').click();

      const modal = locators.generateDocs.modal();
      await expect(modal).toBeVisible();
      await expect(locators.generateDocs.generateButton()).toBeVisible();
      await expect(locators.generateDocs.cancelButton()).toBeVisible();
      await expect(locators.generateDocs.generateButton()).toBeEnabled({ timeout: 10000 });
    });

    await test.step('Generate saves an HTML documentation file', async () => {
      const modal = locators.generateDocs.modal();

      await page.evaluate(() => {
        const w = window as any;
        const originalCreate = URL.createObjectURL.bind(URL);
        const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent;

        w.__docsContent = new Promise<string>((resolve) => {
          URL.createObjectURL = function (obj: Blob | MediaSource) {
            if (obj instanceof Blob) {
              obj.text().then(resolve);
            }
            return originalCreate(obj as Blob);
          };
        });

        w.__docsFileName = new Promise<string>((resolve) => {
          HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, event: Event) {
            if (this.download && event && event.type === 'click') {
              resolve(this.download);
              return true;
            }
            return originalDispatch.call(this, event);
          };
        });
      });

      await locators.generateDocs.generateButton().click();

      const content = await page.evaluate(() => (window as any).__docsContent as Promise<string>);
      const fileName = await page.evaluate(() => (window as any).__docsFileName as Promise<string>);

      expect(fileName).toBe(`${collectionName}-documentation.html`);
      expect(content).toContain('<html');
      await expect(modal).toBeHidden();
    });
  });
});
