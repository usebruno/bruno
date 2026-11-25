import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  openRequest,
  openTimelineEntryNetworkLogs,
  openTimelineEntryResponse,
  selectResponsePaneTab,
  sendRequest
} from '../../../pages';

const COLLECTION_NAME = 'timeline';
// Both failing calls target a port nothing listens on, so they fail the same way on every platform.
const UNREACHABLE_HOST = 'localhost:9999';
const REQUEST_ERROR_MESSAGE = 'there was an error executing the request!';

test.describe('Timeline - failed script requests', () => {
  test('TC-2385: Verify the Timeline shows a failed bru.sendRequest() call', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const { timeline } = buildCommonLocators(page);
    // 'pre' is the Timeline's kind for every bru.sendRequest() row, whichever script sent it.
    const sendRequestEntry = timeline.entriesOfKind('pre');

    await openRequest(page, COLLECTION_NAME, 'sendrequest-failed');
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step('Verify the failed call has a row with its method, address and a failed status', async () => {
      await expect(timeline.entries()).toHaveCount(2);
      await expect(sendRequestEntry).toHaveCount(1);
      await expect(timeline.entryMethod(sendRequestEntry)).toHaveText('GET');
      await expect(timeline.entryUrl(sendRequestEntry)).toContainText(UNREACHABLE_HOST);
      await expect(timeline.entryStatus(sendRequestEntry)).toHaveText('Error');
    });

    await openTimelineEntryResponse(page, sendRequestEntry);

    // The row keeps the error message but no tab renders it yet, so only the absent body is asserted.
    await test.step('Verify the failed call shows no response body', async () => {
      await expect(timeline.entryResponseNoBody(sendRequestEntry)).toBeVisible();
    });
  });

  test('TC-2389: Verify the Timeline shows a failed bru.runRequest() call', { tag: '@sanity' }, async ({
    pageWithUserData: page
  }) => {
    const { timeline } = buildCommonLocators(page);
    const requestEntry = timeline.entriesOfKind('main');
    const runRequestEntry = timeline.entriesOfKind('post');

    await openRequest(page, COLLECTION_NAME, 'runrequest-failed');
    // bru.runRequest() resolves on a network error, so the outer request still completes.
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step('Verify the Timeline lists the runRequest call', async () => {
      await expect(timeline.entries()).toHaveCount(2);
      await expect(timeline.entryBadge(requestEntry, 'main')).toHaveText('request');
      await expect(runRequestEntry).toHaveCount(1);
      await expect(timeline.entryBadge(runRequestEntry, 'post')).toHaveText('runRequest');
      await expect(timeline.entryUrl(runRequestEntry)).toContainText(UNREACHABLE_HOST);
    });

    await openTimelineEntryNetworkLogs(page, runRequestEntry);

    // Known bug: a failed bru.runRequest() row shows status 0 instead of Error, so the status
    // can't be asserted yet; the request error in the Network logs proves the failure instead.
    await test.step('Verify the runRequest Network logs show the request error', async () => {
      await expect(timeline.entryErrorLogs(runRequestEntry).filter({ hasText: REQUEST_ERROR_MESSAGE })).toHaveCount(1);
    });
  });
});
