import type { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import { selectResponsePaneTab } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

const STRIP_MESSAGE
  = 'Cross-origin redirect: stripping Authorization and Proxy-Authorization headers (proxy credentials from proxy settings are still sent).';

const expectStripMessageInTimeline = async (page: Page, present: boolean) => {
  const expectation = present ? 'logs' : 'does not log';
  await test.step(`Assert - Timeline ${expectation} the strip message`, async () => {
    const { timeline } = buildCommonLocators(page);
    await selectResponsePaneTab(page, 'Timeline');
    const entry = timeline.items().first();
    await timeline.itemHeader(entry).click();
    await timeline.networkButton(entry).click();

    const networkLogs = timeline.networkLogs(entry);
    await expect(networkLogs).toContainText(/Request completed in \d+ ms/);
    if (present) {
      await expect(networkLogs).toContainText(STRIP_MESSAGE);
    } else {
      await expect(networkLogs).not.toContainText(STRIP_MESSAGE);
    }
  });
};

test.describe('Redirect Authorization Stripping E2E Tests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeEach(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test('TC-6443: Verify Authorization and Proxy-Authorization are not sent on a cross-origin redirect when Forward Authorization on Redirect is OFF', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('cross-origin-redirect-auth-strip').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify headers are stripped', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const fullText = await locators.response.previewContainer().innerText();
      expect(fullText).not.toContain('"authorization":');
      expect(fullText).not.toContain('"proxy-authorization":');
    });

    await expectStripMessageInTimeline(page, true);

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('cross-origin-redirect-auth-strip').click({ force: true });
    });
  });

  test('TC-6445: Verify Authorization is sent on a cross-origin redirect when Forward Authorization on Redirect is ON', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('cross-origin-redirect-auth-forward').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify headers are preserved', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const fullText = await locators.response.previewContainer().innerText();
      expect(fullText).toContain('"authorization": "Bearer token-test"');
      expect(fullText).toContain('"proxy-authorization": "Bearer proxy-test"');
    });

    await expectStripMessageInTimeline(page, false);

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('cross-origin-redirect-auth-forward').click({ force: true });
    });
  });

  test('TC-6461: Verify AWS Signature headers are not sent on a cross-origin redirect', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('cross-origin-redirect-awsv4-strip').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify AWS headers are stripped', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const fullText = await locators.response.previewContainer().innerText();
      expect(fullText).not.toContain('"authorization":');
      expect(fullText).not.toContain('"x-amz-date":');
      expect(fullText).not.toContain('"x-amz-security-token":');
    });

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('cross-origin-redirect-awsv4-strip').click({ force: true });
    });
  });

  test('TC-6444: Verify Authorization is still sent on a same-origin redirect when Forward Authorization on Redirect is off', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('same-origin-redirect-auth').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify headers are still sent', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const fullText = await locators.response.previewContainer().innerText();
      expect(fullText).toContain('"authorization": "Bearer token-test"');
      expect(fullText).toContain('"proxy-authorization": "Bearer proxy-test"');
    });

    await expectStripMessageInTimeline(page, false);

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('same-origin-redirect-auth').click({ force: true });
    });
  });
});
