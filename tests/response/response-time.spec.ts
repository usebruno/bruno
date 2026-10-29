import { test, expect, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  selectResponsePaneTab,
  sendRequestAndWaitForResponse
} from '../utils/page/actions';
import { buildCommonLocators } from '../utils/page/locators';

const COLLECTION = 'response-time';
const WAIT_MS = 2000;
// The server's timer can fire a few ms before `time` has elapsed, and the display rounds to 10ms.
const TIMER_SLACK_MS = 50;
const MS_PER_SECOND = 1000;

/** Reads the displayed response time in ms; times of a second or more show as seconds to two decimals. */
const displayedResponseTimeMs = async (page: Page) => {
  const text = (await buildCommonLocators(page).response.time().innerText()).trim();
  if (text.endsWith('ms')) {
    return Number(text.slice(0, -'ms'.length));
  }
  return Math.round(parseFloat(text) * MS_PER_SECOND);
};

test.describe('Response time', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  const scenarios = [
    { name: 'delayed-headers', path: 'headers', description: 'headers are held back' },
    { name: 'delayed-body', path: 'body', description: 'body streams slowly' }
  ];

  for (const { name, path, description } of scenarios) {
    test(`covers the whole response when the ${description}`, async ({ page, createTmpDir }) => {
      await test.step('Create a request to the wait-for endpoint', async () => {
        await createCollection(page, `${COLLECTION}-${name}`, await createTmpDir(`${COLLECTION}-${name}`));
        await createRequest(page, name, `${COLLECTION}-${name}`, {
          url: `http://localhost:8081/api/wait-for/${path}?time=${WAIT_MS}`
        });
      });

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      await test.step('The response time includes the full wait', async () => {
        await expect(buildCommonLocators(page).response.time()).toBeVisible();
        expect(await displayedResponseTimeMs(page)).toBeGreaterThanOrEqual(WAIT_MS - TIMER_SLACK_MS);
      });

      await test.step('The timeline logs headers received separately from request completed', async () => {
        const { timeline } = buildCommonLocators(page);
        await selectResponsePaneTab(page, 'Timeline');
        const entry = timeline.items().first();
        await timeline.itemHeader(entry).click();
        await timeline.networkButton(entry).click();

        const networkLogs = timeline.networkLogs(entry);
        await expect(networkLogs).toContainText(/Response headers received in \d+ ms/);
        await expect(networkLogs).toContainText(/Request completed in \d+ ms/);
      });
    });
  }
});
