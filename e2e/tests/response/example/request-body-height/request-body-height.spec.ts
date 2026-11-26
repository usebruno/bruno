import { test, expect } from '../../../../playwright';
import { buildCommonLocators, createExampleFromSidebar, openRequest } from '../../../../pages';
import { setWindowContentSize } from '../../../../utils';

const COLLECTION_NAME = 'request-body-height';
const REQUEST_NAME = 'create-order';
const EXAMPLE_NAME = 'Order Example';

const windowSize = { width: 1200, height: 900 };

test.describe('Response example request body', () => {
  test('fills the remaining height of the request pane', async ({ pageWithUserData: page, reuseOrLaunchElectronApp }, testInfo) => {
    const { responseExample } = buildCommonLocators(page);

    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await setWindowContentSize(app, page, windowSize);
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await createExampleFromSidebar(page, REQUEST_NAME, EXAMPLE_NAME);

    await test.step('Leave edit mode', async () => {
      await responseExample.saveButton().click();
      await expect(responseExample.editButton()).toBeVisible();
    });

    await test.step('Body editor reaches the bottom of the request pane', async () => {
      await expect(responseExample.requestBody()).toBeVisible();
      const paneBox = await responseExample.requestPane().boundingBox();
      const bodyBox = await responseExample.requestBody().boundingBox();

      expect(paneBox).not.toBeNull();
      expect(bodyBox).not.toBeNull();
      expect(bodyBox!.y + bodyBox!.height).toBeGreaterThanOrEqual(paneBox!.y + paneBox!.height - 1);
    });
  });
});
