import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { openCollection } from '../../utils/page/actions';

const COLLECTION_NAME = 'GrpcUrlTyping';
const SERVED_URL = 'grpc://localhost:50051';
const UNSERVED_URL = 'grpc://localhost:50052';
// The url bar debounces reflection by 3s, then the call itself has to come back
const REFLECTION_TIMEOUT_MS = 33000;
// Long enough for a reflection triggered behind the one under assertion to come back
const FOLLOW_UP_REFLECTION_MS = 5000;

test.describe('grpc reflection on url typing', () => {
  test('types a url and reflects once, without a follow-up failure', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);
    const failureToast = locators.toast.byMessage(/Failed to load gRPC methods/);

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

    await test.step('no second reflection fails behind the successful one', async () => {
      await page.waitForTimeout(FOLLOW_UP_REFLECTION_MS);
      await expect(failureToast).toHaveCount(0);
      await expect(locators.method.dropdown()).toBeVisible();
    });

    await test.step('a url nothing serves drops the methods of the one that did', async () => {
      await locators.request.queryUrlEditor().click();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(UNSERVED_URL);

      await expect(failureToast).toBeVisible({ timeout: REFLECTION_TIMEOUT_MS });
      await expect(locators.method.dropdown()).toBeHidden();
    });
  });
});
