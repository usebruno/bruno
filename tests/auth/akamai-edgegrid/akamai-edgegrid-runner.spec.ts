import { test } from '../../../playwright';
import {
  closeAllCollections,
  openCollection,
  openRequest,
  selectEnvironment,
  sendRequestAndWaitForResponse
} from '../../utils/page';

/**
 * End-to-end EdgeGrid (EG1-HMAC-SHA256) auth against the local simulator
 * (packages/bruno-tests/src/auth/edgegrid.js, mounted at /api/auth/edgegrid). The simulator
 * independently re-derives the signature and returns 200/401 - so a green run proves the full
 * UI → prepare-request → interceptor → wire → server-validation path, with no real Akamai API.
 */

const BRU_COLLECTION = 'edgegrid-testbench-bru';
const YML_COLLECTION = 'edgegrid-testbench-yml';

const requests = [
  { name: 'EdgeGrid GET 200', status: 200 },
  { name: 'EdgeGrid GET 401', status: 401 },
  { name: 'EdgeGrid POST JSON 200', status: 200 },
  { name: 'EdgeGrid POST Pretty JSON 200', status: 200 }, // regression: body hashed as-sent
  { name: 'EdgeGrid Signed Headers 200', status: 200 }, // regression: headers_to_sign canonicalization
  { name: 'EdgeGrid Base URL Override 200', status: 200 },
  { name: 'EdgeGrid Inherit 200', status: 200 } // request inherits collection-level EdgeGrid auth
];

const sendAllRequests = async (page, collectionName: string) => {
  await openCollection(page, collectionName);
  await selectEnvironment(page, 'Local', 'collection');

  for (const { name, status } of requests) {
    await test.step(name, async () => {
      await openRequest(page, collectionName, name);
      await sendRequestAndWaitForResponse(page, status);
    });
  }
};

test.describe('Akamai EdgeGrid Runner', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test.describe('[bru]', () => {
    test('Send individual requests', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await sendAllRequests(page, BRU_COLLECTION);
    });
  });

  test.describe('[yml]', () => {
    test('Send individual requests', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await sendAllRequests(page, YML_COLLECTION);
    });
  });
});
