import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  addPreRequestScript,
  addPostResponseScript,
  saveRequest,
  sendRequest,
  selectResponsePaneTab
} from '../../utils/page/actions';

// Regression: inner script's sendRequest/runRequest must bubble to outer Timeline.
test.describe('Timeline — nested bru.runRequest bubbles inner scripted entries to outer Timeline', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('inner request\'s sendRequest call shows up on the outer request\'s Timeline', async ({ page, createTmpDir }) => {
    const collectionName = 'nested-runrequest';
    const outer = 'outer'; // the request we send
    const inner = 'inner'; // invoked via bru.runRequest

    // Distinct URLs so we can identify each row by URL.
    const outerUrl = 'http://localhost:8081/ping';
    const innerUrl = 'http://localhost:8081/ping';
    const innerSendRequestUrl = 'http://localhost:8081/headers';

    await test.step('Create collection with outer + inner requests', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, outer, collectionName, { url: outerUrl });
      await createRequest(page, inner, collectionName, { url: innerUrl });
    });

    await test.step('Add pre-request scripts: inner does sendRequest, outer calls runRequest("inner")', async () => {
      // Inner: sendRequest in pre-request this is what should bubble.
      await openRequest(page, collectionName, inner);
      await addPreRequestScript(
        page,
        `await bru.sendRequest({ url: "${innerSendRequestUrl}", method: "GET" });`
      );
      await saveRequest(page);

      // Outer: drives inner via runRequest.
      await openRequest(page, collectionName, outer);
      await addPreRequestScript(page, `await bru.runRequest("${inner}");`);
      await saveRequest(page);
    });

    await test.step('Send the outer request', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Outer Timeline shows three rows: main + runRequest + bubbled inner sendRequest', async () => {
      await selectResponsePaneTab(page, 'Timeline');

      const rows = page.getByTestId('timeline-container').getByTestId('timeline-entry');
      // Without the fix: 2 (main + runRequest); inner sendRequest is dropped.
      await expect(rows).toHaveCount(3);

      // Badge mix guards against an accidental wrong-3-rows pass.
      await expect(rows.getByTestId('timeline-badge-main')).toHaveCount(1);
      await expect(rows.getByTestId('timeline-badge-post')).toHaveCount(1);
      await expect(rows.getByTestId('timeline-badge-pre')).toHaveCount(1);
    });

    await test.step('Bubbled sendRequest row targets the inner-script URL (proving it came from inner)', async () => {
      const rows = page.getByTestId('timeline-container').getByTestId('timeline-entry');
      const scriptedRow = rows.filter({ has: page.getByTestId('timeline-badge-pre') });
      await expect(scriptedRow).toHaveCount(1);
      await expect(scriptedRow.getByTestId('timeline-url')).toContainText('/headers');
    });

    await test.step('Filter chips count the bubbled entry under Pre-Request', async () => {
      const countFor = (id: string) =>
        page.getByTestId(`timeline-chip-${id}`).getByTestId('timeline-chip-count');

      await expect(countFor('all')).toHaveText('3');
      await expect(countFor('main')).toHaveText('1');
      // runRequest + bubbled sendRequest both ran during outer's pre-request.
      await expect(countFor('pre')).toHaveText('2');
    });
  });

  test('inner request\'s post-response sendRequest also bubbles to the outer Timeline', async ({ page, createTmpDir }) => {
    const collectionName = 'nested-runrequest-post';
    const outer = 'outer-post';
    const inner = 'inner-post';

    const outerUrl = 'http://localhost:8081/ping';
    const innerUrl = 'http://localhost:8081/ping';
    const innerPostUrl = 'http://localhost:8081/query';

    await test.step('Set up collection with outer + inner requests', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, outer, collectionName, { url: outerUrl });
      await createRequest(page, inner, collectionName, { url: innerUrl });
    });

    await test.step('Inner has a post-response sendRequest; outer calls runRequest("inner") in pre-request', async () => {
      await openRequest(page, collectionName, inner);
      await addPostResponseScript(
        page,
        `await bru.sendRequest({ url: "${innerPostUrl}", method: "GET" });`
      );
      await saveRequest(page);

      await openRequest(page, collectionName, outer);
      await addPreRequestScript(page, `await bru.runRequest("${inner}");`);
      await saveRequest(page);
    });

    await test.step('Send outer', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Outer Timeline shows the bubbled post-response sendRequest row', async () => {
      await selectResponsePaneTab(page, 'Timeline');

      const rows = page.getByTestId('timeline-container').getByTestId('timeline-entry');
      await expect(rows).toHaveCount(3);

      // URL match confirms the scripted row is the post-response one.
      const scriptedRow = rows.filter({ has: page.getByTestId('timeline-badge-pre') });
      await expect(scriptedRow).toHaveCount(1);
      await expect(scriptedRow.getByTestId('timeline-url')).toContainText('/query');
    });
  });
});
