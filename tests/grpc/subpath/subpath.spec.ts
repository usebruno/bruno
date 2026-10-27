import { test, expect } from '../../../playwright';
import { buildGrpcCommonLocators } from '../../utils/page/locators';
import { openCollection, sendGrpcRequest } from '../../utils/page/actions';

const COLLECTION_NAME = 'GrpcSubpath';
const METHOD = 'HelloService/SayHello';

// The testbench mounts hello.HelloService at the root and under /Hello.Api and /hello.api,
// which differ only in case; each reply names its mount, so the text says which one answered.
test.describe('grpc requests under a URL subpath', () => {
  test('reaches the service mounted under the subpath', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await sendGrpcRequest(page, 'ReflectionUnderSubpath', METHOD);

    await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
    await expect(locators.response.content()).toContainText('hello amoveo from /Hello.Api');
  });

  test('reaches the service mounted under the subpath when methods come from a proto file', async ({
    pageWithUserData: page
  }) => {
    const locators = buildGrpcCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await sendGrpcRequest(page, 'ProtoFileUnderSubpath', METHOD);

    await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
    await expect(locators.response.content()).toContainText('hello amoveo from /Hello.Api');
  });

  test('sends the subpath with its case preserved', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await sendGrpcRequest(page, 'LowercaseSubpath', METHOD);

    await expect(locators.response.statusCode()).toHaveText(/^0$/, { timeout: 30000 });
    await expect(locators.response.content()).toContainText('hello amoveo from /hello.api');
  });

  test('reports UNIMPLEMENTED for a subpath the server does not serve', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await sendGrpcRequest(page, 'UnservedSubpath', METHOD);

    await expect(locators.response.statusCode()).toHaveText(/^12$/, { timeout: 30000 });
    await expect(locators.response.statusText()).toHaveText(/UNIMPLEMENTED/);
  });

  test('reflection fails for a subpath the server does not serve', async ({ pageWithUserData: page }) => {
    const locators = buildGrpcCommonLocators(page);

    await openCollection(page, COLLECTION_NAME);
    await locators.sidebar.request('ReflectionOnMissingSubpath').click();

    await expect(locators.toast.byMessage(/Failed to load gRPC methods/)).toBeVisible({ timeout: 30000 });
  });
});
