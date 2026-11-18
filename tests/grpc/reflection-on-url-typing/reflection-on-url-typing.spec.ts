import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { openCollection } from '../../utils/page/actions';

const COLLECTION_NAME = 'GrpcUrlTyping';
const SERVED_URL = 'grpc://localhost:50051';
const UNSERVED_URL = 'grpc://localhost:50052';
const REFLECTION_DEBOUNCE_MS = 3000;
const REFLECTION_TIMEOUT_MS = REFLECTION_DEBOUNCE_MS + 30000;

test.describe('grpc reflection on url typing', () => {
  test.setTimeout(120000);

  test('types a url and reflects once, without a follow-up failure', async ({
    pageWithUserData: page,
    recordToasts
  }) => {
    const locators = buildGrpcCommonLocators(page);
    const toasts = await recordToasts(page);
    const filterReflectionToasts = async () => (await toasts.messages()).filter((message) => /gRPC methods/.test(message));

    await test.step('open the request, which starts without a url', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('SayHello', { timeout: 30000 });
    });

    await test.step('type the url and let the reflection debounce elapse', async () => {
      await locators.request.queryUrlEditor().click();
      await page.keyboard.type(SERVED_URL);

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
      await locators.request.queryUrlEditor().click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(UNSERVED_URL);

      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toBeVisible({
        timeout: REFLECTION_TIMEOUT_MS
      });
      await expect(locators.method.dropdown()).toBeHidden();
    });

    await test.step('each url was looked up once, and no reflection ran in between', async () => {
      expect(await filterReflectionToasts()).toStrictEqual([
        expect.stringMatching(/^Loaded \d+ gRPC methods from reflection$/),
        expect.stringMatching(/^Failed to load gRPC methods: /)
      ]);
    });
  });

  test('a refresh of a freshly typed url drops the methods of the previous one', async ({
    pageWithUserData: page
  }) => {
    const locators = buildGrpcCommonLocators(page);

    await test.step('load the methods the served url offers', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('SayHello', { timeout: 30000 });

      await locators.request.queryUrlEditor().click();
      await page.keyboard.type(SERVED_URL);
      await expect(locators.toast.byMessage(/Loaded \d+ gRPC methods from reflection/)).toBeVisible({
        timeout: REFLECTION_TIMEOUT_MS
      });
      await expect(locators.method.dropdown()).toBeVisible();
    });

    await test.step('point the request elsewhere and refresh before the debounce elapses', async () => {
      await locators.request.queryUrlEditor().click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(UNSERVED_URL);
      await locators.method.refresh().click();

      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toBeVisible({ timeout: 30000 });
      await expect(locators.method.dropdown()).toBeHidden();
    });
  });
});
