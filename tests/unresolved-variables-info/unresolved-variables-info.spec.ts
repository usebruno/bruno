import * as path from 'path';
import { once } from 'events';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  buildCommonLocators,
  copyUnresolvedVariableNames,
  openRequest,
  openUnresolvedVariablesPopover,
  openUnresolvedVariablesPopoverWithKeyboard,
  selectResponsePaneTab,
  sendAndWaitForResponse,
  waitForReadyPage
} from '../utils/page';
import { startLocalServer } from '../utils/local-server';

const COLLECTION = 'unresolved-variables-info';
const INIT_USER_DATA_PATH = path.join(__dirname, 'init-user-data');
const MANY_UNRESOLVED_NAMES = ['stripe_secret_key', 'tenant_identifier', 'oauth_client_id', 'oauth_client_secret', 'region'];

test.describe('Unresolved variables info', () => {
  test('an http request with an undefined variable shows a dismissible info card', async ({ pageWithUserData: page }) => {
    const { unresolvedVariablesInfo: info, response } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-unresolved');
      await sendAndWaitForResponse(page);
    });

    await test.step('The info card names the variable', async () => {
      await expect(info.names()).toHaveText('tenant');
    });

    await test.step('Dismissing hides the info card', async () => {
      await info.closeButton().click();
      await expect(info.card()).toBeHidden();
    });

    await test.step('The info card stays dismissed after switching to another request and back', async () => {
      await openRequest(page, COLLECTION, 'http-resolved');
      await openRequest(page, COLLECTION, 'http-unresolved');
      await expect(response.statusCode()).toBeVisible();
      await expect(info.card()).toBeHidden();
    });
  });

  test('the info card shows only on the Response tab', async ({ pageWithUserData: page }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-unresolved');
      await sendAndWaitForResponse(page);
      await expect(info.card()).toBeVisible();
    });

    await test.step('Another response tab hides the info card', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      await expect(info.card()).toBeHidden();
    });

    await test.step('The Response tab shows it again', async () => {
      await selectResponsePaneTab(page, 'Response');
      await expect(info.card()).toBeVisible();
    });
  });

  test('a request with many undefined variables shows a count that lists and copies every name', async ({ pageWithUserData: page, installFakeClipboard }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-many-unresolved');
      await sendAndWaitForResponse(page);
    });

    await test.step('The info card shows a count that lists every name on hover', async () => {
      await expect(info.count()).toHaveText('5 variables');
      await openUnresolvedVariablesPopover(page);
      await expect(info.popoverNames()).toHaveText(MANY_UNRESOLVED_NAMES);
    });

    await test.step('Moving the pointer away hides the list', async () => {
      await page.mouse.move(0, 0);
      await expect(info.popoverNames().first()).toBeHidden();
    });

    await test.step('Copying puts every name on the clipboard', async () => {
      const clipboard = await installFakeClipboard(page);
      await openUnresolvedVariablesPopover(page);
      await copyUnresolvedVariableNames(page);
      expect(await clipboard.copiedText()).toBe(MANY_UNRESOLVED_NAMES.join('\n'));
    });
  });

  test('the variable count is a button that opens the list of names from the keyboard', async ({ pageWithUserData: page, installFakeClipboard }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-many-unresolved');
      await sendAndWaitForResponse(page);
    });

    await test.step('The count is a collapsed button that controls the popover', async () => {
      await expect(info.count()).toHaveRole('button');
      await expect(info.count()).toHaveAttribute('type', 'button');
      await expect(info.count()).toHaveAttribute('aria-expanded', 'false');
      await expect(info.count()).toHaveAttribute('aria-controls', /.+/);
    });

    await test.step('Focusing the count opens the list and marks the button expanded', async () => {
      await openUnresolvedVariablesPopoverWithKeyboard(page);
      await expect(info.count()).toHaveAttribute('aria-expanded', 'true');
    });

    await test.step('The button points at the popover that holds the list', async () => {
      const popoverId = await info.count().getAttribute('aria-controls');
      await expect(info.popoverInsideElement(popoverId!)).toBeVisible();
    });

    await test.step('Tabbing to the copy button keeps the popover open and copies every name', async () => {
      const clipboard = await installFakeClipboard(page);
      await page.keyboard.press('Tab');
      await expect(info.copyButton()).toBeFocused();
      await expect(info.popoverNames().first()).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(info.copyButton()).toHaveAttribute('title', 'Copied');
      expect(await clipboard.copiedText()).toBe(MANY_UNRESOLVED_NAMES.join('\n'));
    });

    await test.step('Moving focus out of the popover closes it', async () => {
      await info.closeButton().focus();
      await expect(info.popoverNames().first()).toBeHidden();
      await expect(info.count()).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test('an api key sent as a query param reports its undefined value', async ({ pageWithUserData: page }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-api-key-unresolved');
      await sendAndWaitForResponse(page);
    });

    await test.step('The info card names the api key variable', async () => {
      await expect(info.names()).toHaveText('apiKey');
    });
  });

  test('a request cancelled in flight keeps the info card for variables resolved before sending', async ({ launchElectronApp }) => {
    const localServer = await startLocalServer();
    const requestReceived = once(localServer.server, 'request');
    const app = await launchElectronApp({
      initUserDataPath: INIT_USER_DATA_PATH,
      dotEnv: { NEVER_RESPONDING_URL: localServer.url }
    });

    try {
      const page = await waitForReadyPage(app);
      const { unresolvedVariablesInfo: info, request, response } = buildCommonLocators(page);

      await test.step('Send the request and cancel it once the server has it', async () => {
        await openRequest(page, COLLECTION, 'http-cancelled');
        await request.sendButton().click();
        await requestReceived;
        await response.cancelRequestButton().click();
      });

      await test.step('The info card names the variable', async () => {
        await expect(info.names()).toHaveText('tenant');
      });
    } finally {
      localServer.close();
      await closeElectronApp(app);
    }
  });

  test('a streamed response reports variables its post-response script reads after the stream ends', async ({ launchElectronApp }) => {
    const localServer = await startLocalServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.end('data: done\n\n');
    });
    const app = await launchElectronApp({
      initUserDataPath: INIT_USER_DATA_PATH,
      dotEnv: { STREAMING_URL: localServer.url }
    });

    try {
      const page = await waitForReadyPage(app);
      const { unresolvedVariablesInfo: info, request } = buildCommonLocators(page);

      await test.step('Send the request', async () => {
        await openRequest(page, COLLECTION, 'http-streamed');
        await request.sendButton().click();
      });

      await test.step('The info card names the variable the script read', async () => {
        await expect(info.names()).toHaveText('afterStream');
      });
    } finally {
      localServer.close();
      await closeElectronApp(app);
    }
  });

  test('a variable missing in a request run by bru.runRequest shows on the calling request', async ({ pageWithUserData: page }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the calling request', async () => {
      await openRequest(page, COLLECTION, 'run-request-parent');
      await sendAndWaitForResponse(page);
    });

    await test.step('The info card names the variable from the called request', async () => {
      await expect(info.names()).toHaveText('childOnly');
    });
  });

  test('an http request with every variable defined shows no info card', async ({ pageWithUserData: page }) => {
    const { unresolvedVariablesInfo: info } = buildCommonLocators(page);

    await test.step('Send the request', async () => {
      await openRequest(page, COLLECTION, 'http-resolved');
      await sendAndWaitForResponse(page);
    });

    await test.step('No info card is shown', async () => {
      await expect(info.card()).toBeHidden();
    });
  });
});
