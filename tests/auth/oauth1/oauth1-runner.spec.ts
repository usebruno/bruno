import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  sendRequestAndWaitForResponse, closeAllCollections, selectEnvironment,
  openCollection, openRequest, selectResponsePaneTab
} from '../../utils/page';
import { runCollection, validateRunnerResults } from '../../utils/page/runner';

// The test PEM file is gitignored (*.pem). Write it to both fixture directories
// at module load time so collectionFixturePath includes it when copying.

const { TEST_RSA_PRIVATE_KEY } = require('../../../packages/bruno-tests/src/auth/oauth1');

const fixtureBase = path.join(__dirname, 'fixtures', 'collections');
for (const subdir of ['bru', 'yml']) {
  const pemPath = path.join(fixtureBase, subdir, 'test-private-key.pem');
  if (!fs.existsSync(pemPath)) {
    fs.writeFileSync(pemPath, TEST_RSA_PRIVATE_KEY);
  }
}

const requests = [
  { name: 'OAuth1 HMAC-SHA1 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA1 401', status: 401 },
  { name: 'OAuth1 HMAC-SHA1 POST 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA1 Query Params 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA256 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA256 401', status: 401 },
  { name: 'OAuth1 HMAC-SHA512 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA512 401', status: 401 },
  { name: 'OAuth1 PLAINTEXT 200', status: 200 },
  { name: 'OAuth1 PLAINTEXT 401', status: 401 },
  { name: 'OAuth1 PLAINTEXT Query Params 200', status: 200 },
  { name: 'OAuth1 RSA-SHA1 200', status: 200 },
  { name: 'OAuth1 RSA-SHA1 Query Params 200', status: 200 },
  { name: 'OAuth1 RSA-SHA256 200', status: 200 },
  { name: 'OAuth1 RSA-SHA512 200', status: 200 },
  { name: 'OAuth1 RSA-SHA1 Variable Key 200', status: 200 },
  { name: 'OAuth1 RSA-SHA1 File Key 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA1 Body 200', status: 200 },
  { name: 'OAuth1 PLAINTEXT Body 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA256 Body 200', status: 200 },
  { name: 'OAuth1 RSA-SHA1 Body 200', status: 200 },
  { name: 'OAuth1 HMAC-SHA1 Body JSON 200', status: 200 }
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

const runAndValidate = async (page, collectionName: string) => {
  await runCollection(page, collectionName);
  await validateRunnerResults(page, {
    totalRequests: requests.length,
    passed: requests.length,
    failed: 0
  });
};

/**
 * After sending a request, switch to the Timeline tab, expand the latest timeline item,
 * and return locators for the request URL and headers section.
 */
const openTimelineRequest = async (page) => {
  await selectResponsePaneTab(page, 'Timeline');

  // Click the first (latest) timeline item header to expand it
  const timelineItem = page.locator('.timeline-item').first();
  await timelineItem.locator('.oauth-request-item-header').click();

  return timelineItem;
};

const verifyAddParamsTo = async (page, collectionName: string, requestName: string, addParamsTo: 'header' | 'queryparams' | 'body') => {
  await openRequest(page, collectionName, requestName);
  await sendRequestAndWaitForResponse(page, 200);

  const timelineItem = await openTimelineRequest(page);
  const content = timelineItem.locator('.timeline-item-content');

  if (addParamsTo === 'header') {
    await expect(content).toContainText('Authorization');
    await expect(content).toContainText('OAuth');
  } else if (addParamsTo === 'queryparams') {
    const urlPre = content.locator('pre').first();
    await expect(urlPre).toContainText('oauth_consumer_key');
  } else {
    // Body: oauth params should be in the request body, not in URL or Authorization header
    const urlPre = content.locator('pre').first();
    await expect(urlPre).not.toContainText('oauth_consumer_key');
    // Body section is expanded by default — verify oauth params are in the body
    await expect(content.locator('.collapsible-section').filter({ hasText: 'Body' })).toContainText('oauth_consumer_key');
  }
};

test.describe('OAuth 1.0 Runner', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test.describe('[bru]', () => {
    test('Send individual requests', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await sendAllRequests(page, 'oauth1-testbench-bru');
    });

    test('Run collection and verify all assertions pass', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await runAndValidate(page, 'oauth1-testbench-bru');
    });

    test('Verify Add Params To placement via timeline', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await openCollection(page, 'oauth1-testbench-bru');
      await selectEnvironment(page, 'Local', 'collection');

      await test.step('Header: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 HMAC-SHA1 200', 'header');
      });

      await test.step('Query Params: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 HMAC-SHA1 Query Params 200', 'queryparams');
      });

      await test.step('Query Params: PLAINTEXT', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 PLAINTEXT Query Params 200', 'queryparams');
      });

      await test.step('Query Params: RSA-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 RSA-SHA1 Query Params 200', 'queryparams');
      });

      await test.step('Body: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 HMAC-SHA1 Body 200', 'body');
      });

      await test.step('Body: PLAINTEXT', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 PLAINTEXT Body 200', 'body');
      });

      await test.step('Body: HMAC-SHA256', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 HMAC-SHA256 Body 200', 'body');
      });

      await test.step('Body: RSA-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 RSA-SHA1 Body 200', 'body');
      });

      await test.step('Body: HMAC-SHA1 JSON (non-form body)', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-bru', 'OAuth1 HMAC-SHA1 Body JSON 200', 'body');
      });
    });
  });

  test.describe('[yml]', () => {
    test('Send individual requests', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await sendAllRequests(page, 'oauth1-testbench-yml');
    });

    test('Run collection and verify all assertions pass', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await runAndValidate(page, 'oauth1-testbench-yml');
    });

    test('Verify Add Params To placement via timeline', async ({ pageWithUserData: page }) => {
      test.setTimeout(3 * 60 * 1000);
      await openCollection(page, 'oauth1-testbench-yml');
      await selectEnvironment(page, 'Local', 'collection');

      await test.step('Header: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 HMAC-SHA1 200', 'header');
      });

      await test.step('Query Params: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 HMAC-SHA1 Query Params 200', 'queryparams');
      });

      await test.step('Query Params: PLAINTEXT', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 PLAINTEXT Query Params 200', 'queryparams');
      });

      await test.step('Query Params: RSA-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 RSA-SHA1 Query Params 200', 'queryparams');
      });

      await test.step('Body: HMAC-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 HMAC-SHA1 Body 200', 'body');
      });

      await test.step('Body: PLAINTEXT', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 PLAINTEXT Body 200', 'body');
      });

      await test.step('Body: HMAC-SHA256', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 HMAC-SHA256 Body 200', 'body');
      });

      await test.step('Body: RSA-SHA1', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 RSA-SHA1 Body 200', 'body');
      });

      await test.step('Body: HMAC-SHA1 JSON (non-form body)', async () => {
        await verifyAddParamsTo(page, 'oauth1-testbench-yml', 'OAuth1 HMAC-SHA1 Body JSON 200', 'body');
      });
    });
  });
});
