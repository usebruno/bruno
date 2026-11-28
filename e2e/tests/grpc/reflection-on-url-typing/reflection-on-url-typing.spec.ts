import { test, expect, waitForReadyPage, type ToastLog } from '../../../playwright';
import { buildGrpcCommonLocators, openCollection, typeGrpcUrl } from '../../../pages';

const COLLECTION_NAME = 'GrpcUrlTyping';
const SERVED_URL = 'grpc://localhost:50051';
const UNSERVED_URL = 'grpc://localhost:50052';
const REFLECTION_DEBOUNCE_MS = 3000;
const REFLECTION_TIMEOUT_MS = REFLECTION_DEBOUNCE_MS + 30000;
const LOADED_FROM_REFLECTION = /^Loaded \d+ gRPC methods from reflection$/;
const FAILED_TO_LOAD = /^Failed to load gRPC methods: /;

const reflectionToasts = async (toasts: ToastLog) =>
  (await toasts.messages()).filter((message) => /gRPC methods/.test(message));

test.describe('grpc reflection on url typing', () => {
  test.setTimeout(120000);

  test('types a url and reflects once, without a follow-up failure', async ({ restartApp, recordToasts }) => {
    const page = await waitForReadyPage(await restartApp());
    const locators = buildGrpcCommonLocators(page);
    const toasts = await recordToasts(page);

    await test.step('open the request, which starts without a url', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('SayHello', { timeout: 30000 });
    });

    await test.step('type the url and let the reflection debounce elapse', async () => {
      await typeGrpcUrl(page, SERVED_URL);

      await expect(locators.toast.byMessage(/Loaded \d+ gRPC methods from reflection/)).toBeVisible({
        timeout: REFLECTION_TIMEOUT_MS
      });
    });

    await test.step('the dropdown is filled with the served methods', async () => {
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello');
      await locators.method.dropdown().click();
      await expect(locators.method.item('SayHello')).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('a url nothing serves drops the methods of the one that did', async () => {
      await typeGrpcUrl(page, UNSERVED_URL);

      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toBeVisible({
        timeout: REFLECTION_TIMEOUT_MS
      });
      await expect(locators.method.dropdown()).toBeHidden();
    });

    await test.step('reflection toasts show one success, then one failure', async () => {
      expect(await reflectionToasts(toasts)).toStrictEqual([
        expect.stringMatching(LOADED_FROM_REFLECTION),
        expect.stringMatching(FAILED_TO_LOAD)
      ]);
    });
  });

  test('a refresh of a freshly typed url drops the methods of the previous one', async ({ restartApp, recordToasts }) => {
    const page = await waitForReadyPage(await restartApp());
    const locators = buildGrpcCommonLocators(page);
    const toasts = await recordToasts(page);

    await test.step('open the request, which starts without a url', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('SayHello', { timeout: 30000 });
    });

    await test.step('load the methods the served url offers', async () => {
      await typeGrpcUrl(page, SERVED_URL);

      await expect(locators.toast.byMessage(/Loaded \d+ gRPC methods from reflection/)).toBeVisible({
        timeout: REFLECTION_TIMEOUT_MS
      });
      await expect(locators.method.dropdown()).toBeVisible();
    });

    await test.step('point the request elsewhere and refresh before the debounce elapses', async () => {
      await typeGrpcUrl(page, UNSERVED_URL);
      await locators.method.refresh().click();

      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toBeVisible({ timeout: 30000 });
      await expect(locators.method.dropdown()).toBeHidden();
    });

    await test.step('reflection toasts show one success, then one failure', async () => {
      expect(await reflectionToasts(toasts)).toStrictEqual([
        expect.stringMatching(LOADED_FROM_REFLECTION),
        expect.stringMatching(FAILED_TO_LOAD)
      ]);
    });
  });
});
