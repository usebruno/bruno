import { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators, buildScriptErrorLocators } from '../../utils/page/locators';
import {
  selectEnvironment,
  selectResponsePaneTab,
  sendGrpcRequest,
  streamGrpcMessagesAndEndCall
} from '../../utils/page/actions';
import { setSandboxMode } from '../../utils/page/runner';

const COLLECTION_NAME = 'GrpcHooks';
const SANDBOX_MODES = ['safe', 'developer'] as const;

// Classnames for flashed line is addded to codemirror editor.
const FLASHED_LINE_NUMBER = '.CodeMirror-gutter-wrapper.cm-error-line-flash-gutter .CodeMirror-linenumber';
const FLASHED_LINE = '.CodeMirror-code > div:has(.cm-error-line-flash)';

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

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });

      await test.step('the hook saw the message the unary call sent', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.passedCount()).toHaveText('1');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees the message the unary call sent');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });

      // verifying if the previous afterCallEnd wrote the value.
      await test.step('a following request sees the variable afterCallEnd wrote', async () => {
        await sendGrpcRequest(page, 'EchoCapturedReply', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });
    });

    test('afterCallEnd sees every message of a server stream, once', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('receive the whole stream', async () => {
        await sendGrpcRequest(page, 'LotsOfReplies', 'HelloService/LotsOfReplies');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.responseItems()).toHaveCount(10);
      });

      // Ten replies came back, but only one message went out — and like a unary call, it never
      // streamed, so the hook's view of it is rebuilt rather than observed.
      await test.step('the hook saw the one message the stream sent', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.passedCount()).toHaveText('1');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees the one message the server stream sent');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });

      await test.step('the hook counted all ten messages', async () => {
        await sendGrpcRequest(page, 'EchoReplyCount', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
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
        await selectResponsePaneTab(page, 'Tests');

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
        await selectResponsePaneTab(page, 'Tests');

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
        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
      });

      await test.step('the tab label reports the failure, not the pass count', async () => {
        await selectResponsePaneTab(page, 'Tests');

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

      await test.step('clicking the file path opens the failing hook editor at the failing line', async () => {
        await scriptError.filePath().click();

        const editor = page.getByTestId('before-call-start-script-editor');
        await expect(editor).toBeVisible();
        await expect(editor.locator(FLASHED_LINE_NUMBER)).toHaveText('2');
        await expect(editor.locator(FLASHED_LINE)).toContainText('throw new Error(\'beforeCallStart exploded\');');
      });

      await test.step('a following request sees the variable the hook set before it threw', async () => {
        await sendGrpcRequest(page, 'EchoReachedVar', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('reached-yes');
      });
    });

    test('both message hooks run on a unary call, each handed the message it is about', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('the call completes', async () => {
        await sendGrpcRequest(page, 'MessageHooksUnary', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('hello unary-hooks');
      });

      await test.step('each message hook gets its own section, and every assertion passed', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.passedCount()).toHaveText('10');
        await expect(tests.summary('beforeMessageSend')).toContainText('Before Message Send Tests (4), Passed: 4, Failed: 0');
        await expect(tests.summary('afterMessageReceive')).toContainText('After Message Receive Tests (4), Passed: 4, Failed: 0');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (2), Passed: 2, Failed: 0');
        await expect(tests.failedRows('beforeMessageSend')).toHaveCount(0);
        await expect(tests.failedRows('afterMessageReceive')).toHaveCount(0);
      });

      // One message went out and one came back, so each message hook ran exactly once.
      await test.step('the results of both hooks sit under the one message the call carried', async () => {
        await expect(tests.messageGroups('beforeMessageSend')).toHaveCount(1);
        await expect(tests.messageGroup('beforeMessageSend', 0)).toHaveText('Message 1');
        await expect(tests.messageGroups('afterMessageReceive')).toHaveCount(1);
        await expect(tests.messageGroup('afterMessageReceive', 0)).toHaveText('Message 1');
      });

      // afterCallEnd runs once per call, not once per message, so its results carry no index.
      await test.step('the call hook results stay ungrouped', async () => {
        await expect(tests.messageGroups('afterCallEnd')).toHaveCount(0);
      });

      await test.step('a following request sees the variable afterMessageReceive wrote', async () => {
        await sendGrpcRequest(page, 'EchoLastReply', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('hello hello unary-hooks');
      });
    });

    test('afterMessageReceive runs once per reply of a server stream, beforeMessageSend once', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('receive the whole stream', async () => {
        await sendGrpcRequest(page, 'MessageHooksServerStream', 'HelloService/LotsOfReplies');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.responseItems()).toHaveCount(10);
      });

      // Ten replies came back over one outgoing message, so the two hooks run a different number of times.
      await test.step('the send hook ran once and the receive hook ten times', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.summary('beforeMessageSend')).toContainText('Before Message Send Tests (1), Passed: 1, Failed: 0');
        await expect(tests.summary('afterMessageReceive')).toContainText('After Message Receive Tests (20), Passed: 20, Failed: 0');
        await expect(tests.failedRows('afterMessageReceive')).toHaveCount(0);
      });

      await test.step('every run is grouped under the reply it handled, in order', async () => {
        await expect(tests.messageGroups('afterMessageReceive')).toHaveCount(10);
        await expect(tests.messageGroup('afterMessageReceive', 0)).toHaveText('Message 1');
        await expect(tests.messageGroup('afterMessageReceive', 9)).toHaveText('Message 10');
        await expect(tests.rows('afterMessageReceive').first()).toContainText('reply 1 is handed to its own run of the hook');
        await expect(tests.rows('afterMessageReceive').last()).toContainText('reply 10 sees only the replies up to itself');
      });

      await test.step('a following request sees the count the receive hook accumulated', async () => {
        await sendGrpcRequest(page, 'EchoReceivedCount', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('received-10');
      });
    });

    test('both hooks run per message on a bidi stream, and a rerun does not double the results', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('stream both messages, then end the call', async () => {
        await streamGrpcMessagesAndEndCall(page, 'MessageHooksBidi', 'HelloService/BidiHello', [0, 1]);
      });

      await test.step('each hook ran once per message', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.summary('beforeMessageSend')).toContainText('Before Message Send Tests (2), Passed: 2, Failed: 0');
        await expect(tests.summary('afterMessageReceive')).toContainText('After Message Receive Tests (4), Passed: 4, Failed: 0');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
      });

      await test.step('the send hook results name the message each run saw', async () => {
        await expect(tests.messageGroups('beforeMessageSend')).toHaveCount(2);
        await expect(tests.messageGroup('beforeMessageSend', 0)).toHaveText('Message 1');
        await expect(tests.messageGroup('beforeMessageSend', 1)).toHaveText('Message 2');
        await expect(tests.rows('beforeMessageSend').first()).toContainText('outgoing message 1 reaches the hook before it is streamed');
        await expect(tests.rows('beforeMessageSend').last()).toContainText('outgoing message 2 reaches the hook before it is streamed');
      });

      // Message hook results accumulate as the call runs, so a rerun has to clear them first.
      await test.step('rerunning the request replaces the accumulated results rather than adding to them', async () => {
        await streamGrpcMessagesAndEndCall(page, 'MessageHooksBidi', 'HelloService/BidiHello', [0, 1]);
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.summary('beforeMessageSend')).toContainText('Before Message Send Tests (2), Passed: 2, Failed: 0');
        await expect(tests.summary('afterMessageReceive')).toContainText('After Message Receive Tests (4), Passed: 4, Failed: 0');
        await expect(tests.messageGroups('beforeMessageSend')).toHaveCount(2);
      });
    });

    test('a throwing beforeMessageSend aborts the unary call before it opens', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const scriptError = buildScriptErrorLocators(page);

      await test.step('the card names the hook that failed and the message it failed on', async () => {
        await sendGrpcRequest(page, 'BrokenBeforeMessageSend', 'HelloService/SayHello');

        await expect(scriptError.card()).toBeVisible({ timeout: 30000 });
        await expect(scriptError.title()).toHaveText('Before Message Send Script Error');
        await expect(scriptError.message()).toContainText('Message 1: beforeMessageSend exploded');
        await expect(scriptError.filePath()).toHaveText('BrokenBeforeMessageSend.yml');
      });

      await test.step('nothing was put on the wire', async () => {
        await expect(locators.response.statusCode()).toHaveCount(0);
      });

      await test.step('clicking the file path opens the failing hook editor at the failing line', async () => {
        await scriptError.filePath().click();

        const editor = page.getByTestId('before-message-send-script-editor');
        await expect(editor).toBeVisible();
        await expect(editor.locator(FLASHED_LINE_NUMBER)).toHaveText('2');
        await expect(editor.locator(FLASHED_LINE)).toContainText('throw new Error(\'beforeMessageSend exploded\');');
      });

      await test.step('a following request sees the variable the hook set before it threw', async () => {
        await sendGrpcRequest(page, 'EchoSendReached', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('send-yes');
      });
    });

    test('a throwing beforeMessageSend drops one streamed message and leaves the stream open', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const scriptError = buildScriptErrorLocators(page);
      const tests = locators.response.tests;

      await test.step('open the stream', async () => {
        await sendGrpcRequest(page, 'BrokenSendOnBidiStream', 'HelloService/BidiHello');
        await expect(locators.request.endConnectionButton()).toBeVisible({ timeout: 30000 });
      });

      await test.step('the first message is refused, so nothing comes back for it', async () => {
        await locators.request.sendMessage(0).click();

        await expect(scriptError.card()).toBeVisible({ timeout: 30000 });
        await expect(locators.response.content()).toHaveCount(0);
      });

      await test.step('the stream survived, so the next message still goes out and is replied to', async () => {
        await locators.request.sendMessage(1).click();

        await expect(locators.response.singleResponse()).toBeVisible();
        await expect(locators.response.content()).toContainText('hello let-me-through');
        await expect(locators.request.endConnectionButton()).toBeVisible();
      });

      await test.step('ending the call still reports OK', async () => {
        await locators.request.endConnectionButton().click();

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
      });

      await test.step('the card names the message the hook refused', async () => {
        await expect(scriptError.card()).toBeVisible();
        await expect(scriptError.title()).toHaveText('Before Message Send Script Error');
        await expect(scriptError.message()).toContainText('Message 1: this message is not going out');
      });

      // The refused run still consumed an index, so the run that passed is the second one.
      await test.step('the surviving run is grouped under the second message', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.summary('beforeMessageSend')).toContainText('Before Message Send Tests (1), Passed: 1, Failed: 0');
        await expect(tests.messageGroups('beforeMessageSend')).toHaveCount(1);
        await expect(tests.messageGroup('beforeMessageSend', 1)).toHaveText('Message 2');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
      });
    });

    test('a throwing afterMessageReceive keeps the stream and afterCallEnd alive', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const scriptError = buildScriptErrorLocators(page);
      const tests = locators.response.tests;

      await test.step('every reply still arrives', async () => {
        await sendGrpcRequest(page, 'BrokenAfterMessageReceive', 'HelloService/LotsOfReplies');

        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.responseItems()).toHaveCount(10);
      });

      // Only the last failure is kept, and the hook ran once per reply, so it is the tenth.
      await test.step('the card reports the last of the ten failures', async () => {
        await expect(scriptError.card()).toBeVisible();
        await expect(scriptError.title()).toHaveText('After Message Receive Script Error');
        await expect(scriptError.message()).toContainText('Message 10: afterMessageReceive exploded');
        await expect(scriptError.filePath()).toHaveText('BrokenAfterMessageReceive.yml');
      });

      await test.step('afterCallEnd still ran behind the ten failures', async () => {
        await selectResponsePaneTab(page, 'Tests');

        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (1), Passed: 1, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('afterCallEnd still runs once every message hook has thrown');
      });

      await test.step('clicking the file path opens the failing hook editor at the failing line', async () => {
        await scriptError.filePath().click();

        const editor = page.getByTestId('after-message-receive-script-editor');
        await expect(editor).toBeVisible();
        await expect(editor.locator(FLASHED_LINE_NUMBER)).toHaveText('2');
        await expect(editor.locator(FLASHED_LINE)).toContainText('throw new Error(\'afterMessageReceive exploded\');');
      });
    });

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

      await test.step('the response arrived and is still readable behind the card', async () => {
        await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('after-hook-throws');
      });

      await test.step('clicking the file path opens the failing hook editor at the failing line', async () => {
        await scriptError.filePath().click();

        const editor = page.getByTestId('after-call-end-script-editor');
        await expect(editor).toBeVisible();
        await expect(editor.locator(FLASHED_LINE_NUMBER)).toHaveText('2');
        await expect(editor.locator(FLASHED_LINE)).toContainText('throw new Error(\'afterCallEnd exploded\');');
      });
    });
  });
}
