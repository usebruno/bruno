import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { recordToasts } from '../../utils/page/toast';
import { openCollection } from '../../utils/page/actions';

const COLLECTION_NAME = 'GrpcReflectionCache';
const REFLECTION_TIMEOUT_MS = 40000;
const REFLECTED_TOAST = /Loaded \d+ gRPC methods from reflection/;
// Longer than a reflection round trip against the local test server, so "no toast appeared" means
// no reflection happened rather than "it had not come back yet"
const REFLECTION_SETTLE_MS = 5000;

test.describe('grpc reflection cache', () => {
  test.setTimeout(120000);

  test('reflects a url once, and only asks the server again on a manual refresh', async ({
    pageWithUserData: page
  }) => {
    const locators = buildGrpcCommonLocators(page);
    const reflectedToast = locators.toast.byMessage(REFLECTED_TOAST);

    await test.step('opening the request reflects the server for the first time', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();

      await expect(reflectedToast).toBeVisible({ timeout: REFLECTION_TIMEOUT_MS });
      await expect(locators.method.dropdown()).toBeVisible();
      await expect(reflectedToast).toBeHidden({ timeout: REFLECTION_TIMEOUT_MS });
    });

    await test.step('another request on the same url lists the methods without reflecting again', async () => {
      const toasts = await recordToasts(page, REFLECTED_TOAST, async () => {
        await locators.sidebar.request('GreetAgain').click();

        await expect(locators.method.dropdown()).toBeVisible({ timeout: REFLECTION_TIMEOUT_MS });
        await page.waitForTimeout(REFLECTION_SETTLE_MS);
      });

      expect(toasts).toEqual([]);
    });

    await test.step('the stored methods are the ones the server serves', async () => {
      await locators.method.dropdown().click();

      await expect(locators.method.item('SayHello')).toBeVisible();
      await expect(locators.method.item('BidiHello')).toBeVisible();
    });

    // Serializers are functions, so they are rebuilt from the stored descriptors rather than
    // restored — a request only goes out if that rebuild produced working ones.
    await test.step('a request sends on methods that were never reflected for it', async () => {
      await locators.method.item('SayHello').click();
      await locators.request.sendButton().click();

      await expect(locators.response.statusCode()).toHaveText(/0/, { timeout: 30000 });
      await expect(locators.response.statusText()).toHaveText(/OK/);
      await expect(locators.response.content()).toBeVisible();
    });

    await test.step('a manual refresh does go back to the server', async () => {
      const toasts = await recordToasts(page, REFLECTED_TOAST, async () => {
        await locators.request.refreshMethodsButton().click();

        await expect(reflectedToast).toBeVisible({ timeout: REFLECTION_TIMEOUT_MS });
      });

      expect(toasts).toHaveLength(1);
      await expect(locators.method.dropdown()).toBeVisible();
    });
  });
});
