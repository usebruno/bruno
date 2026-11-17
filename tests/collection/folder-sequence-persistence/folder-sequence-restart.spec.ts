import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, createCollection, createFolder, createRequest, expandCollection, expandFolder, waitForReadyPage } from '../../utils/page';

const COLLECTION_NAME = 'Customer API';
const BILLING = 'Billing';
const ACCOUNTS = 'Accounts';

const FOLDERS = [BILLING, ACCOUNTS];
const BILLING_REQUESTS = ['list-invoices', 'create-invoice'];
const ACCOUNTS_REQUESTS = ['get-profile'];
const SEQUENCE = [BILLING, ...BILLING_REQUESTS, ACCOUNTS, ...ACCOUNTS_REQUESTS];

test.describe('Folder sequence persistence', () => {
  test('TC-489: Verify that the Persisting of folder and request sequence after application restart', { tag: '@sanity' }, async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('folder-seq-userdata');
    const collectionLocation = await createTmpDir('folder-seq-collection');

    let app = await launchElectronApp({ userDataPath });
    try {
      const page = await waitForReadyPage(app);
      const { sidebar } = buildCommonLocators(page);
      const sidebarNames = sidebar.collectionItemNames(COLLECTION_NAME);

      await test.step('Create the collection, folders, and requests', async () => {
        await createCollection(page, COLLECTION_NAME, collectionLocation, 'bru');
        for (const name of FOLDERS) {
          await createFolder(page, name, COLLECTION_NAME);
        }

        for (const name of BILLING_REQUESTS) {
          await createRequest(page, name, BILLING, { inFolder: true });
        }
        await createRequest(page, ACCOUNTS_REQUESTS[0], ACCOUNTS, { inFolder: true });
      });

      await test.step('Keep every folder expanded and record the sequence', async () => {
        await expandCollection(page, COLLECTION_NAME);
        for (const name of FOLDERS) {
          await expandFolder(page, name);
        }

        await expect(sidebarNames).toHaveText(SEQUENCE);
      });

      await test.step('Close the app', async () => {
        await closeElectronApp(app);
      });

      app = await launchElectronApp({ userDataPath });
      await test.step('Reopen the app and confirm the folder and request sequence is unchanged', async () => {
        const page2 = await waitForReadyPage(app);
        const sidebar2 = buildCommonLocators(page2).sidebar;

        await expect(sidebar2.collection(COLLECTION_NAME)).toBeVisible();
        await expandCollection(page2, COLLECTION_NAME);
        for (const name of FOLDERS) {
          await expandFolder(page2, name);
        }

        const sidebarNames2 = sidebar2.collectionItemNames(COLLECTION_NAME);
        await expect(sidebarNames2).toHaveText(SEQUENCE);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
