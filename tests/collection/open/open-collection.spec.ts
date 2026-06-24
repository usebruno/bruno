import path from 'path';
import { test } from '../../../playwright';
import {
  createCollectionWithExecutableRequest,
  openCollectionActionsMenu,
  expectCollectionRemoveMenuOptions,
  clickRemoveInCollectionMenu,
  expectRemoveCollectionModal,
  confirmRemoveCollection,
  expectCollectionRemovedFromSidebar
} from '../../utils/page';

test.describe('Open collection sanity testcases', () => {
  test('TC-2614 Verify user able to Remove the Opened collection from the sidebar', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'remove-test-collection';
    const requestName = 'ping';
    const requestUrl = 'https://echo.usebruno.com';
    const collectionLocation = await createTmpDir(collectionName);
    const collectionPath = path.join(collectionLocation, collectionName);

    await test.step('Precondition: create collection with a request, verify it is open and executable', async () => {
      await createCollectionWithExecutableRequest(page, {
        collectionName,
        collectionLocation,
        requestName,
        requestUrl
      });
    });

    await test.step('Step 01: open collection actions menu and verify Remove option is shown', async () => {
      await openCollectionActionsMenu(page, collectionName);
      await expectCollectionRemoveMenuOptions(page);
    });

    await test.step('Step 02: click Remove and verify confirmation modal shows path and CTAs', async () => {
      await clickRemoveInCollectionMenu(page);
      await expectRemoveCollectionModal(page, collectionPath);
    });

    await test.step('Step 03: confirm removal and verify success toast', async () => {
      await confirmRemoveCollection(page);
      await expectCollectionRemovedFromSidebar(page, collectionName);
    });
  });
});
