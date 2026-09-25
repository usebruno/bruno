import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  closeEnvironmentPanel,
  expectResponseContains,
  openCollection,
  openEnvironmentConfigTab,
  openExampleFromSidebar,
  openRequest,
  selectEnvironment,
  setEnvironmentSecrets
} from '../../utils/page/actions';
import { sendRequestAndSaveResponseExample } from '../../utils/page/response-example';

const COLLECTION = 'try-example-yml';
const REQUEST = 'try-example';
const EXAMPLE = 'Try Me';
const ENVIRONMENT = 'Local';
const API_TOKEN = 'secret-token-123';

test.describe('Try Response Example', () => {
  test('should open the example as a focused transient request, send it and interpolate variables', async ({ pageWithUserData: page }) => {
    test.setTimeout(60000);
    const locators = buildCommonLocators(page);

    await test.step('Give the secret a value and select the environment', async () => {
      await openCollection(page, COLLECTION);
      await openEnvironmentConfigTab(page);
      await setEnvironmentSecrets(page, ENVIRONMENT, { apiToken: API_TOKEN });
      // open the request before closing the environment tab so a tab with the selector stays active
      await openRequest(page, COLLECTION, REQUEST);
      await closeEnvironmentPanel(page);
      await selectEnvironment(page, ENVIRONMENT);
    });

    await test.step('Save a response example on the request', async () => {
      await sendRequestAndSaveResponseExample(page, REQUEST, EXAMPLE);
    });

    await test.step('Open the saved example', async () => {
      await openExampleFromSidebar(page, REQUEST, EXAMPLE);
      await expect(locators.responseExample.title()).toHaveText(`${REQUEST} / ${EXAMPLE}`);
    });

    await test.step('Click Try and verify a transient request tab is focused', async () => {
      await locators.responseExample.tryButton().click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Untitled');
      await expect(locators.request.urlInput()).toContainText('http://localhost:8081/api/echo/anything/try?version={{apiVersion}}');
    });

    await test.step('Verify the example tab stays open', async () => {
      await expect(locators.tabs.requestTab(EXAMPLE)).toBeVisible();
    });

    await test.step('Verify the request was sent with interpolated param and header', async () => {
      await expect(locators.response.statusCode()).toContainText('200');
      await expectResponseContains(page, ['"version": "v1"', `"x-api-token": "${API_TOKEN}"`]);
    });

    await test.step('Verify the transient request is not in the sidebar', async () => {
      await expect(locators.sidebar.request('Untitled')).toHaveCount(0);
    });
  });
});
