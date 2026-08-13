import { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators, buildScriptErrorLocators } from '../../utils/page/locators';
import { openGrpcTestsTab } from '../../utils/page/actions';
import { setSandboxMode } from '../../utils/page/runner';

// The gRPC hooks execute here, against grpcb.in's HelloService. A hook's work is only observable
// through what it leaves behind, so the assertions below read either a variable the hook set —
// interpolated into the same request (`beforeCallStart`, which runs before interpolation) or into a
// following one (`afterCallEnd`) — or the results of `test()` calls made inside the hook, which the
// response pane renders per hook. Both sandboxes are exercised because a missing QuickJS shim is
// invisible in Safe Mode until a script touches the method that was never bridged.
//
// The suite's preferences pin the response pane to the vertical (stacked) layout, where the pane is
// wide enough to show every tab: side by side it is not, and ResponsiveTabs moves Tests into its
// overflow menu. That is a convenience only — `openGrpcTestsTab` finds the tab either way, and the
// counts on its label are read only once it is active, which forces it back into the bar.

const COLLECTION_NAME = 'GrpcHooks';
const SANDBOX_MODES = ['safe', 'developer'] as const;

type GrpcLocators = ReturnType<typeof buildGrpcCommonLocators>;

for (const mode of SANDBOX_MODES) {
  test.describe.serial(`grpc lifecycle hooks in ${mode} mode`, () => {
    const openCollection = async (page: Page) => {
      const locators = buildGrpcCommonLocators(page);

      await test.step(`open the collection in ${mode} mode`, async () => {
        await setSandboxMode(page, COLLECTION_NAME, mode);
        await locators.sidebar.collection(COLLECTION_NAME).click();
      });

      await test.step('select the environment', async () => {
        await locators.environment.selector().click();
        await locators.environment.collectionTab().click();
        await locators.environment.envOption('Env').click();
      });

      return locators;
    };

    const send = async (page: Page, locators: GrpcLocators, requestName: string, method: string) => {
      await locators.sidebar.request(requestName).click();
      await expect(locators.method.dropdownTrigger()).toContainText(method, { timeout: 30000 });
      await locators.request.sendButton().click();
    };

    // A client or bidi stream sends nothing on connect: each message goes out only when its own
    // send button is clicked, and the call ends when the connection is ended by hand. That is what
    // makes `bru.grpc.req.messages` in `afterCallEnd` differ from the authored messages.
    const streamAndEnd = async (page: Page, locators: GrpcLocators, requestName: string, method: string, messageIndexes: number[]) => {
      await send(page, locators, requestName, method);
      await expect(locators.request.endConnectionButton()).toBeVisible({ timeout: 30000 });

      for (const index of messageIndexes) {
        await locators.request.sendMessage(index).click();
      }

      await locators.request.endConnectionButton().click();
      await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
    };

    test('beforeCallStart reaches the message through interpolation, afterCallEnd reads the reply', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);

      await test.step('the message carries the value the hook set', async () => {
        await send(page, locators, 'SayHello', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });

      // The only way to observe an afterCallEnd variable is to use it, which is also the only way
      // a user can: a following request interpolates it.
      await test.step('a following request sees the variable afterCallEnd wrote', async () => {
        await send(page, locators, 'EchoCapturedReply', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('set-by-hook');
      });
    });

    test('afterCallEnd sees every message of a server stream, once', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);

      await test.step('receive the whole stream', async () => {
        await send(page, locators, 'LotsOfReplies', 'HelloService/LotsOfReplies');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.responseItems()).toHaveCount(10);
      });

      await test.step('the hook counted all ten messages', async () => {
        await send(page, locators, 'EchoReplyCount', 'HelloService/SayHello');

        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
        await expect(locators.response.content()).toContainText('replies-10');
      });
    });

    test('afterCallEnd on a client stream sees only the messages that were streamed', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('stream one of the two authored messages, then end the call', async () => {
        await streamAndEnd(page, locators, 'LotsOfGreetings', 'HelloService/LotsOfGreetings', [0, 1]);
      });

      await test.step('every hook assertion passed', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.passedCount()).toHaveText('3');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (3), Passed: 3, Failed: 0');
        await expect(tests.section('afterCallEnd')).toContainText('the hook sees only the streamed message');
        await expect(tests.failedRows('afterCallEnd')).toHaveCount(0);
      });
    });

    test('afterCallEnd on a bidi stream sees every streamed message and every reply', async ({ pageWithUserData: page }) => {
      const locators = await openCollection(page);
      const tests = locators.response.tests;

      await test.step('stream both messages, then end the call', async () => {
        await streamAndEnd(page, locators, 'BidiHello', 'HelloService/BidiHello', [0, 1]);
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
        await send(page, locators, 'HookTests', 'HelloService/SayHello');
        await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
      });

      await test.step('the tab label reports the failure, not the pass count', async () => {
        await openGrpcTestsTab(page);

        await expect(tests.failedCount()).toHaveText('1');
        await expect(tests.passedCount()).toHaveCount(0);
      });

      await test.step('each hook gets its own section', async () => {
        await expect(tests.summary('beforeCallStart')).toContainText('Before Call Start Tests (3), Passed: 3, Failed: 0');
        await expect(tests.summary('afterCallEnd')).toContainText('After Call End Tests (6), Passed: 5, Failed: 1');
        await expect(tests.passedRows('beforeCallStart')).toHaveCount(3);
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
        await send(page, locators, 'BrokenHook', 'HelloService/SayHello');

        await expect(scriptError.card()).toBeVisible({ timeout: 30000 });
        await expect(scriptError.title()).toHaveText('Before Call Start Script Error');
        await expect(scriptError.message()).toContainText('beforeCallStart exploded');
        await expect(scriptError.filePath()).toHaveText('BrokenHook.bru');
      });

      await test.step('no response arrived', async () => {
        await expect(locators.response.statusCode()).toHaveCount(0);
      });

      await test.step('clicking the file path opens the failing hook editor', async () => {
        await scriptError.filePath().click();

        await expect(page.getByTestId('before-call-start-script-editor')).toBeVisible();
      });
    });
  });
}
