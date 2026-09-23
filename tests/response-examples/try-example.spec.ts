import { test, expect } from '../../playwright';
import { execSync } from 'child_process';
import path from 'path';
import { buildCommonLocators } from '../utils/page/locators';
import { openExampleFromSidebar, openRequest } from '../utils/page/actions';
import { sendRequestAndSaveResponseExample } from '../utils/page/response-example';

test.describe.serial('Try Response Example', () => {
  test.afterAll(async () => {
    execSync(`git checkout -- ${path.join(__dirname, 'fixtures', 'collection', 'try-example.bru')}`);
  });

  test('should open the example as a focused transient request and send it', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Save a response example on the request', async () => {
      await openRequest(page, 'collection', 'try-example');
      await sendRequestAndSaveResponseExample(page, 'try-example', 'Try Me');
    });

    await test.step('Open the saved example', async () => {
      await openExampleFromSidebar(page, 'try-example', 'Try Me');
      await expect(locators.responseExample.title()).toHaveText('try-example / Try Me');
    });

    await test.step('Click Try and verify a transient request tab is focused', async () => {
      await locators.responseExample.tryButton().click();
      await expect(locators.tabs.activeRequestTab()).toContainText('Untitled');
      await expect(locators.request.urlInput()).toContainText('http://localhost:8081/api/echo/json');
    });

    await test.step('Verify the example tab stays open', async () => {
      await expect(locators.tabs.requestTab('Try Me')).toBeVisible();
    });

    await test.step('Verify the request was sent automatically', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
    });

    await test.step('Verify the transient request is not in the sidebar', async () => {
      await expect(locators.sidebar.request('Untitled')).toHaveCount(0);
    });
  });
});
