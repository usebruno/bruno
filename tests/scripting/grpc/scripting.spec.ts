import { test, expect } from '../../../playwright';
import type { Page } from '@playwright/test';
import { buildGrpcCommonLocators, buildScriptErrorLocators } from '../../utils/page/locators';
import {
  openCollectionFromPath,
  openConsoleAndClearLogs,
  selectRequestPaneTab,
  selectResponsePaneTab,
  setGrpcPhaseScript,
  streamGrpcMessagesAndEnd,
  waitForCollectionMount
} from '../../utils/page';

const COLLECTION_NAME = 'GrpcScripting';
const NETWORK_TIMEOUT = 15_000;

const GRPC_SCRIPT_PHASES = [
  { scriptType: 'grpc:before-call-start', label: 'Before Call' },
  { scriptType: 'grpc:before-message-send', label: 'Before Message' },
  { scriptType: 'grpc:after-message-receive', label: 'After Message' },
  { scriptType: 'grpc:after-call-end', label: 'After Call' }
].map(({ scriptType, label }) => {
  const hyphenatedLabel = label.replace(/\s+/g, '-');
  return {
    scriptType,
    label,
    sectionTitle: `${hyphenatedLabel} Tests`,
    errorTitle: `${hyphenatedLabel} Script Error`,
    testName: `${scriptType} test`
  };
});

const DEFAULT_PHASE_SCRIPTS = GRPC_SCRIPT_PHASES.map((phase) => ({
  scriptType: phase.scriptType,
  code: `console.log("${phase.scriptType}");`
}));

const setupPhaseScripts = async (
  page: Page,
  requestName: string,
  methodName: string,
  phaseScripts: { scriptType: string; code: string }[] = DEFAULT_PHASE_SCRIPTS
) => {
  const locators = buildGrpcCommonLocators(page);

  await test.step(`open the ${requestName} request`, async () => {
    await locators.sidebar.collection(COLLECTION_NAME).click();
    await locators.sidebar.request(requestName).click();
  });

  const codeByPhase = new Map(phaseScripts.map(({ scriptType, code }) => [scriptType, code]));

  await test.step('add the phase scripts', async () => {
    await selectRequestPaneTab(page, 'Script');
    for (const { scriptType } of GRPC_SCRIPT_PHASES) {
      await setGrpcPhaseScript(page, scriptType, codeByPhase.get(scriptType) ?? '');
    }
  });

  await expect(locators.method.selectedName()).toContainText(methodName, { timeout: NETWORK_TIMEOUT });
  await openConsoleAndClearLogs(page);

  return locators;
};

const assertPhaseLogCounts = async (
  locators: ReturnType<typeof buildGrpcCommonLocators>,
  { send, minReceive }: { send: number; minReceive: number }
) => {
  await test.step('wait for the call to finish (status OK)', async () => {
    await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: NETWORK_TIMEOUT });
  });

  await expect(locators.response.tabCount()).toHaveText(/\d+/);
  const receive = Number(await locators.response.tabCount().innerText());
  expect(receive).toBeGreaterThanOrEqual(minReceive);

  const expectedByPhase: Record<string, number> = {
    'grpc:before-call-start': 1,
    'grpc:before-message-send': send,
    'grpc:after-message-receive': receive,
    'grpc:after-call-end': 1
  };
  await test.step(`each phase logged once per time it fired (received ${receive})`, async () => {
    for (const phase of GRPC_SCRIPT_PHASES) {
      await expect(locators.devtools.logMessage(phase.scriptType)).toHaveCount(
        expectedByPhase[phase.scriptType],
        { timeout: NETWORK_TIMEOUT }
      );
    }
  });
};

test.describe('grpc scripting', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    test.setTimeout(2 * 60 * 1000);

    const collection = buildGrpcCommonLocators(page).sidebar.collection(COLLECTION_NAME);
    if (!(await collection.isVisible())) {
      await openCollectionFromPath(page, electronApp, collectionFixturePath!);
    }

    await waitForCollectionMount(page, COLLECTION_NAME);
  });

  test('Scripts tab has a sub-tab for every gRPC script phase', async ({ page }) => {
    const locators = await setupPhaseScripts(page, 'SayHello', 'SayHello');

    await test.step('all four phase tabs are visible with the expected labels', async () => {
      for (const phase of GRPC_SCRIPT_PHASES) {
        const tab = locators.paneTabs.tabTrigger(phase.scriptType);
        await expect(tab).toBeVisible();
        await expect(tab).toHaveText(new RegExp(phase.label));
      }
    });
  });

  test('scripts can read the request and response values and log them', async ({ page }) => {
    const requestValuesScript = [
      'console.log("url=" + bru.grpc.request.url);',
      'console.log("method=" + bru.grpc.request.method);',
      'console.log("methodType=" + bru.grpc.request.methodType);',
      'console.log("authMode=" + bru.grpc.request.authMode);'
    ].join('\n');
    const responseValuesScript = [
      'console.log("statusCode=" + bru.grpc.response.statusCode);',
      'console.log("statusText=" + bru.grpc.response.statusText);',
      'console.log("durationIsNumber=" + (typeof bru.grpc.response.duration === "number"));'
    ].join('\n');

    const locators = await setupPhaseScripts(page, 'SayHello', 'SayHello', [
      { scriptType: 'grpc:before-call-start', code: requestValuesScript },
      { scriptType: 'grpc:after-call-end', code: responseValuesScript }
    ]);

    await test.step('invoke the request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('the scripts logged the actual request and response values', async () => {
      await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: NETWORK_TIMEOUT });
      const expected = [
        'url=grpc',
        'method=/hello.HelloService/SayHello',
        'methodType=unary',
        'authMode=none',
        'statusCode=0',
        'statusText=OK',
        'durationIsNumber=true'
      ];
      for (const text of expected) {
        await expect(locators.devtools.logMessage(text).first()).toBeVisible();
      }
    });
  });

  test('each phase reports its test() results in its own Tests tab section', async ({ page }) => {
    const locators = await setupPhaseScripts(
      page,
      'SayHello',
      'SayHello',
      GRPC_SCRIPT_PHASES.map((phase) => ({
        scriptType: phase.scriptType,
        code: [`test("${phase.testName}", function() {`, '  expect(1).to.equal(1);'].join('\n')
      }))
    );

    await test.step('invoke the request', async () => {
      await locators.request.sendButton().click();
      await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: NETWORK_TIMEOUT });
    });

    await test.step('the Tests tab shows one passing test under every phase', async () => {
      await selectResponsePaneTab(page, 'Tests');
      for (const phase of GRPC_SCRIPT_PHASES) {
        await expect(locators.testResults.section(phase.scriptType)).toHaveText(
          `${phase.sectionTitle} (1), Passed: 1, Failed: 0`
        );
        await expect(locators.testResults.item(phase.testName)).toBeVisible();
      }
    });
  });

  for (const phase of GRPC_SCRIPT_PHASES) {
    test(`a broken ${phase.scriptType} script surfaces a script error`, async ({ page }) => {
      const scriptErrors = buildScriptErrorLocators(page);
      const locators = await setupPhaseScripts(page, 'SayHello', 'SayHello', [
        { scriptType: phase.scriptType, code: 'brokenCode' }
      ]);

      await test.step(`sending the request reports the ${phase.errorTitle} in the response pane`, async () => {
        await locators.request.sendButton().click();
        const card = scriptErrors.card();
        await expect(scriptErrors.title(card)).toHaveText(phase.errorTitle);
        await expect(scriptErrors.message(card)).toContainText(/ReferenceError:.*brokenCode.*not defined/);
      });
    });
  }

  test('unary', async ({ page }) => {
    const locators = await setupPhaseScripts(page, 'SayHello', 'SayHello');
    await test.step('invoke the request', async () => {
      await locators.request.sendButton().click();
    });
    await assertPhaseLogCounts(locators, { send: 1, minReceive: 1 });
  });

  test('server streaming', async ({ page }) => {
    const locators = await setupPhaseScripts(page, 'LotOfReplies', 'LotsOfReplies');
    await test.step('invoke the request', async () => {
      await locators.request.sendButton().click();
    });
    await assertPhaseLogCounts(locators, { send: 1, minReceive: 2 });
  });

  test('client streaming', async ({ page }) => {
    const locators = await setupPhaseScripts(page, 'LotOfGreetings', 'LotsOfGreetings');
    await test.step('stream two messages and end the call', async () => {
      await streamGrpcMessagesAndEnd(page, 2);
    });
    await assertPhaseLogCounts(locators, { send: 2, minReceive: 1 });
  });

  test('bidi streaming', async ({ page }) => {
    const locators = await setupPhaseScripts(page, 'BidiHello', 'BidiHello');
    await test.step('stream two messages and end the call', async () => {
      await streamGrpcMessagesAndEnd(page, 2);
    });
    await assertPhaseLogCounts(locators, { send: 2, minReceive: 2 });
  });
});
