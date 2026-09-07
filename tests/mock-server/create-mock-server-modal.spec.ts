import { test, expect } from '../../playwright';
import { buildMockServerLocators, openCreateMockServerModal } from '../utils/page/mock-server';

const COLLECTION_NAME = 'mock-server-test-collection';

test.describe('Create mock server modal validation', () => {
  test('does not show name errors while typing, then clears them on change after Create', async ({
    pageWithUserData: page
  }) => {
    const ms = buildMockServerLocators(page);

    await openCreateMockServerModal(page);
    await ms.sourceManualRadio().click();

    await test.step('Typing before the first Create click does not show a name error', async () => {
      await ms.nameInput().fill('x');
      await ms.nameInput().fill('');
      await expect(ms.nameRequiredError()).toHaveCount(0);
    });

    await test.step('Create with an empty name shows the error and keeps the modal open', async () => {
      await ms.modalSubmit().click();
      await expect(ms.createModal()).toBeVisible();
      await expect(ms.nameRequiredError()).toBeVisible();
    });

    await test.step('Typing a name clears the error without another Create click', async () => {
      await ms.nameInput().fill('Standalone Validation Server');
      await expect(ms.nameRequiredError()).toHaveCount(0);
    });

    await test.step('A single Create click then submits', async () => {
      await ms.modalSubmit().click();
      await expect(ms.dashboard()).toBeVisible({ timeout: 10000 });
    });
  });

  test('clears the collection error when a collection is selected after Create', async ({
    pageWithUserData: page
  }) => {
    const ms = buildMockServerLocators(page);

    await openCreateMockServerModal(page);
    await ms.nameInput().fill('Collection Validation Server');

    await test.step('Create with no collection shows the error and keeps the modal open', async () => {
      await expect(ms.sourceCollectionRadio()).toBeChecked();
      await expect(ms.collectionSelect()).toHaveValue('');
      await ms.modalSubmit().click();
      await expect(ms.createModal()).toBeVisible();
      await expect(ms.collectionRequiredError()).toBeVisible();
    });

    await test.step('Choosing a collection clears the error', async () => {
      await ms.collectionSelect().selectOption({ label: COLLECTION_NAME });
      await expect(ms.collectionRequiredError()).toHaveCount(0);
    });

    await ms.modalCancel().click();
    await expect(ms.createModal()).toHaveCount(0);
  });
});
