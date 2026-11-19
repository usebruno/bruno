import { test, expect } from '../../playwright';
import { startLocalServer } from '../utils/local-server';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openResponseBodySearchBar,
  sendRequestAndWaitForResponse,
  switchToEditorTab
} from '../utils/page';

test('response search restores independent state and matches across request tabs', async ({ page, createTmpDir }) => {
  const collection = 'response-search-persistence';
  const { tabs, response, codeEditorSearch } = buildCommonLocators(page);
  const search = codeEditorSearch('response-preview-container');
  const localServer = await startLocalServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: request.url === '/first' ? 'Item item Itemized Item' : 'beta BETAbeta Beta' }));
  });

  try {
    const collectionPath = await createTmpDir(collection);
    await createCollection(page, collection, collectionPath);

    await test.step('Search the first response with regex, case and whole-word matching', async () => {
      await createRequest(page, 'First response', collection, { url: `${localServer.url}/first`, method: 'GET' });
      await sendRequestAndWaitForResponse(page);
      await switchToEditorTab(page);
      await expect(response.previewContainer()).toContainText('Item item Itemized Item');
      await openResponseBodySearchBar(page);
      await search.searchCaseBtn().click();
      await search.searchWholeWordBtn().click();
      await search.searchInput().fill('Item');
      await expect(search.matchCount()).toHaveText('1 / 2');
      await search.searchRegexBtn().click();
      await search.searchInput().fill('I.em\\b');
      await expect(search.matchCount()).toHaveText('1 / 2');
    });

    await test.step('A second response starts with its own search state', async () => {
      await createRequest(page, 'Second response', collection, { url: `${localServer.url}/second`, method: 'GET' });
      await sendRequestAndWaitForResponse(page);
      await switchToEditorTab(page);
      await expect(response.previewContainer()).toContainText('beta BETAbeta Beta');
      await expect(search.searchBar()).toBeHidden();
      await openResponseBodySearchBar(page);
      await expect(search.searchInput()).toHaveValue('');
      await expect(search.searchRegexBtn()).not.toHaveClass(/\bactive\b/);
      await expect(search.searchCaseBtn()).not.toHaveClass(/\bactive\b/);
      await expect(search.searchWholeWordBtn()).not.toHaveClass(/\bactive\b/);
      await search.searchInput().fill('beta');
      await expect(search.matchCount()).toHaveText('1 / 4');
    });

    await test.step('Returning to the first response restores options and executes its search', async () => {
      await tabs.requestTab('First response').click();
      await expect(search.searchBar()).toBeVisible();
      await expect(search.searchInput()).toHaveValue('I.em\\b');
      await expect(search.searchRegexBtn()).toHaveClass(/\bactive\b/);
      await expect(search.searchCaseBtn()).toHaveClass(/\bactive\b/);
      await expect(search.searchWholeWordBtn()).toHaveClass(/\bactive\b/);
      await expect(search.matchCount()).toHaveText('1 / 2');
      await search.searchCloseBtn().click();
      await expect(search.searchBar()).toBeHidden();
    });

    await test.step('Closing one search does not change the other response', async () => {
      await tabs.requestTab('Second response').click();
      await expect(search.searchBar()).toBeVisible();
      await expect(search.searchInput()).toHaveValue('beta');
      await expect(search.searchRegexBtn()).not.toHaveClass(/\bactive\b/);
      await expect(search.searchCaseBtn()).not.toHaveClass(/\bactive\b/);
      await expect(search.searchWholeWordBtn()).not.toHaveClass(/\bactive\b/);
      await expect(search.matchCount()).toHaveText('1 / 4');
    });

    await test.step('The first search stays closed after switching tabs and retains its query on reopening', async () => {
      await tabs.requestTab('First response').click();
      await expect(search.codeMirror()).toBeVisible();
      await expect(search.searchBar()).toBeHidden();
      await openResponseBodySearchBar(page);
      await expect(search.searchInput()).toHaveValue('I.em\\b');
      await expect(search.searchRegexBtn()).toHaveClass(/\bactive\b/);
      await expect(search.searchCaseBtn()).toHaveClass(/\bactive\b/);
      await expect(search.searchWholeWordBtn()).toHaveClass(/\bactive\b/);
      await expect(search.matchCount()).toHaveText('1 / 2');
    });
  } finally {
    localServer.close();
    await closeAllCollections(page);
  }
});
