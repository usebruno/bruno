import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { openCollection } from '../../utils/page/actions';

const COLLECTION_NAME = 'GrpcUrlTyping';
const REFLECTION_DEBOUNCE_MS = 3000;

test.describe('grpc reflection on url typing', () => {
  test('types a url and reflects once, without a follow-up failure', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);

    await test.step('open the request, which starts without a url', async () => {
      await openCollection(page, COLLECTION_NAME);
      await locators.sidebar.request('SayHello').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('SayHello', { timeout: 30000 });
    });

    await test.step('type the url and let the reflection debounce elapse', async () => {
      await locators.request.queryUrlContainer().locator('.CodeMirror').click();
      await page.keyboard.type('grpc://localhost:50051');

      await expect(locators.toast.byMessage(/Loaded \d+ gRPC methods from reflection/)).toBeVisible({
        timeout: REFLECTION_DEBOUNCE_MS + 30000
      });
    });

    // The debounced loader hands its result to the completion callback; a callback that
    // takes a URL in that position reflects a second time against "[object Object]".
    await test.step('no second reflection fails behind the successful one', async () => {
      await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toHaveCount(0);
      await expect(locators.method.dropdownTrigger()).toContainText('HelloService/SayHello');
    });
  });
});
