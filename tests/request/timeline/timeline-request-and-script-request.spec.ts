import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  expandTimelineEntry,
  openRequest,
  selectResponsePaneTab,
  sendRequest
} from '../../utils/page';

const COLLECTION_NAME = 'timeline';
const REQUEST_NAME = 'sendrequest-in-tests';
const REQUEST_URL = 'http://localhost:8081/ping';
const SCRIPT_REQUEST_URL = 'http://localhost:8081/headers';

test.describe('Timeline - successful script requests', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-2383: Verify the Timeline lists your request and the script request separately', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const { timeline } = buildCommonLocators(page);
    const requestEntry = timeline.entriesOfKind('main');
    // 'pre' is the Timeline's kind for every bru.sendRequest() row, whichever script sent it.
    const scriptRequestEntry = timeline.entriesOfKind('pre');

    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step('Verify the Timeline shows your request and the script request as two rows', async () => {
      await expect(timeline.entries()).toHaveCount(2);
      await expect(timeline.entryBadge(requestEntry, 'main')).toHaveText('request');
      await expect(timeline.entryBadge(scriptRequestEntry, 'pre')).toHaveText('sendRequest');
    });

    await expandTimelineEntry(page, requestEntry);
    await expandTimelineEntry(page, scriptRequestEntry);

    await test.step('Verify each row shows its own address', async () => {
      await expect(timeline.entryDetailUrl(requestEntry)).toHaveText(REQUEST_URL);
      await expect(timeline.entryDetailUrl(scriptRequestEntry)).toHaveText(SCRIPT_REQUEST_URL);
    });
  });
});
