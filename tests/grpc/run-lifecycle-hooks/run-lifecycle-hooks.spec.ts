import { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators, buildScriptErrorLocators } from '../../utils/page/locators';
import {
  openGrpcTestsTab,
  selectEnvironment,
  sendGrpcRequest,
  streamGrpcMessagesAndEndCall
} from '../../utils/page/actions';
import { setSandboxMode } from '../../utils/page/runner';

const COLLECTION_NAME = 'GrpcHooks';
const SANDBOX_MODES = ['safe', 'developer'] as const;

for (const mode of SANDBOX_MODES) {
  test.describe.serial(`grpc lifecycle hooks in ${mode} mode`, () => {
    const openCollection = async (page: Page) => {
      await setSandboxMode(page, COLLECTION_NAME, mode);
      await selectEnvironment(page, 'Env');

      return buildGrpcCommonLocators(page);
    };

    test('beforeCallStart reaches the message through interpolation, afterCallEnd reads the reply', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('the message carries the value the hook set', async () => {
        await sendGrpcRequest(page, 'SayHello', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });

      // Nothing on a unary call ever streams, so `bru.grpc.request.messages` is rebuilt from the
      // request body rather than observed — a hook that saw an empty list would be indistinguishable
      // from a working one anywhere else in this suite.
      await test.step('the hook saw the message the unary call sent', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.passedCount()).toHaveText('1');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees the message the unary call sent');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });

      // The only way to observe an afterCallEnd variable is to use it, which is also the only way
      // a user can: a following request interpolates it.
      await test.step('a following request sees the variable afterCallEnd wrote', async () => {
        await sendGrpcRequest(page, 'EchoCapturedReply', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });
    });

    test('afterCallEnd sees every message of a server stream, once', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('receive the whole stream', async () => {
        await sendGrpcRequest(page, 'LotsOfReplies', 'HelloService/LotsOfReplies');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.responseItems()).toHaveCount(10);
      });

      // Ten replies came back, but only one message went out — and like a unary call, it never
      // streamed, so the hook's view of it is rebuilt rather than observed.
      await test.step('the hook saw the one message the stream sent', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.passedCount()).toHaveText('1');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees the one message the server stream sent');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });

      await test.step('the hook counted all ten messages', async () => {
        await sendGrpcRequest(page, 'EchoReplyCount', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('replies-10');
      });
    });

    test('afterCallEnd on a client stream sees only the messages that were streamed', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('stream two of the three authored messages, then end the call', async () => {
        await streamGrpcMessagesAndEndCall(page, 'LotsOfGreetings', 'HelloService/LotsOfGreetings', [0, 1]);
      });

      await test.step('every hook assertion passed', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.passedCount()).toHaveText('3');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (3), Passed: 3, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees only the streamed messages');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });
    });

    test('afterCallEnd on a bidi stream sees every streamed message and every reply', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('stream both messages, then end the call', async () => {
        await streamGrpcMessagesAndEndCall(page, 'BidiHello', 'HelloService/BidiHello', [0, 1]);
      });

      await test.step('every hook assertion passed', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.passedCount()).toHaveText('3');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (3), Passed: 3, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('both streamed messages reach the hook, in order');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });
    });

    test('test() results from both hooks land in the response pane, one section each', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('send a request whose hooks both run tests', async () => {
        await sendGrpcRequest(page, 'HookTests', 'HelloService/SayHello');
        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
      });

      await test.step('the tab label reports the failure, not the pass count', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.failedCount()).toHaveText('1');
        await expect(tests.passedCount()).toHaveCount(0);
      });

      await test.step('each hook gets its own section', async () => {
        await expect(tests.summary('beforeCallStart')).toContainText('Before Call Start Tests (4), Passed: 4, Failed: 0');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (6), Passed: 5, Failed: 1');
        await expect(tests.passedRows('beforeCallStart')).toHaveCount(4);
        await expect(tests.passedRows('afterCallEnd')).toHaveCount(5);
      });

      await test.step('the failing test names itself and carries the assertion message', async () => {
        const failed = tests.failedRows('afterCallEnd');

        await expect(failed).toHaveCount(1);
        await expect(failed).toContainText('this failure is intentional');
        await expect(failed).toContainText('to equal 99');
      });
    });

    test('a throwing beforeCallStart aborts the call and shows a card', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const scriptError = buildScriptErrorLocators(page);

      await test.step('the card names the hook that failed', async () => {
        await sendGrpcRequest(page, 'BrokenHook', 'HelloService/SayHello');

        await expect(scriptError.card()).toBeVisible({ timeout: 30000 });
        await expect(scriptError.title()).toHaveText('Before Call Start Script Error');
        await expect(scriptError.message()).toContainText('beforeCallStart exploded');
        await expect(scriptError.filePath()).toHaveText('BrokenHook.yml');
      });

      await test.step('no response arrived', async () => {
        await expect(locators.response.statusCode()).toHaveCount(0);
      });

      await test.step('clicking the file path opens the failing hook editor', async () => {
        await scriptError.filePath().click();

        await expect(page.getByTestId('before-call-start-script-editor')).toBeVisible();
      });

      // The hook sets a variable on its way to throwing. Aborting the call must not throw that
      // away with it — the only way to see that it survived is the way a user would.
      await test.step('a following request sees the variable the hook set before it threw', async () => {
        await sendGrpcRequest(page, 'EchoReachedVar', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('reached-yes');
      });
    });

    // The mirror of the case above, and it fails differently: `afterCallEnd` throws once the call
    // is already over, so the error is reported rather than propagated and there is nothing left to
    // abort. The response pane therefore renders its card over a completed response, not over the
    // empty placeholder a failed `beforeCallStart` leaves behind.
    test('a throwing afterCallEnd shows a card without taking the response with it', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const scriptError = buildScriptErrorLocators(page);

      await test.step('the card names the hook that failed', async () => {
        await sendGrpcRequest(page, 'BrokenAfterCallEnd', 'HelloService/SayHello');

        await expect(scriptError.card()).toBeVisible({ timeout: 30000 });
        await expect(scriptError.title()).toHaveText('After Call End Script Error');
        await expect(scriptError.message()).toContainText('afterCallEnd exploded');
        await expect(scriptError.filePath()).toHaveText('BrokenAfterCallEnd.yml');
      });

      // The status code lives in the tab bar, so reading it alongside the card is what proves the
      // pane kept its tabs rather than falling back to the placeholder.
      await test.step('the response arrived and is still readable behind the card', async () => {
        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('after-hook-throws');
      });

      await test.step('clicking the file path opens the failing hook editor', async () => {
        await scriptError.filePath().click();

        await expect(page.getByTestId('after-call-end-script-editor')).toBeVisible();
      });
    });
  });
}
