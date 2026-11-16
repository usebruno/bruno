import fs from 'fs';
import path from 'path';
import { Page, test, expect } from '../../../playwright';
import { expandCollection, expandFolder } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

export type RequestFileFormat = 'bru' | 'yml';

const FIXED_REQUEST: Record<RequestFileFormat, string> = {
  bru: `meta {
  name: broken
  type: http
  seq: 1
}

get {
  url: https://example.com/broken
  body: none
  auth: none
}
`,
  yml: `info:
  name: broken
  type: http
  seq: 1

http:
  method: GET
  url: https://example.com/broken
`
};

const BROKEN_REQUEST: Record<RequestFileFormat, string> = {
  bru: FIXED_REQUEST.bru.replace(/}\n$/, ''),
  yml: FIXED_REQUEST.yml.replace('url: https', 'url: "https')
};

export const verifyInvalidFileIndicators = async (
  page: Page,
  { collectionName, collectionPath, format }: { collectionName: string; collectionPath: string; format: RequestFileFormat }
) => {
  const { sidebar, paneTabs } = buildCommonLocators(page);
  const brokenFilePath = path.join(collectionPath, 'parent', 'nested', `broken.${format}`);
  const shallowBrokenFilePath = path.join(collectionPath, 'parent', `shallow-broken.${format}`);

  await test.step('the collection row counts invalid files at every depth', async () => {
    await expandCollection(page, collectionName);
    await expect(sidebar.invalidFilesBadge(collectionName)).toHaveText('2');
  });

  await test.step('hovering the count explains it and links to the overview table', async () => {
    await sidebar.invalidFilesBadge(collectionName).hover();
    await expect(sidebar.invalidFilesTooltip()).toHaveText('You have 2 invalid files. See here');
    // Click the plain text, not the "See here" link
    await sidebar.invalidFilesTooltip().click({ position: { x: 4, y: 4 } });
    await expect(paneTabs.requestsNotLoadedTable()).toHaveCount(0);
    await sidebar.invalidFilesSeeHere().click();
    await expect(paneTabs.requestsNotLoadedTable()).toContainText('parent/nested/broken.' + format);
    await expect(paneTabs.requestsNotLoadedTable()).toContainText('parent/shallow-broken.' + format);
    await expect(paneTabs.overviewInvalidFilesCount()).toContainText('2 invalid');
  });

  await test.step('the tooltip closes once the pointer leaves it', async () => {
    await paneTabs.requestsNotLoadedTable().hover();
    await expect(sidebar.invalidFilesTooltip()).toHaveCount(0);
  });

  await test.step('each folder counts the invalid files beneath it', async () => {
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'parent')).toHaveText('2');
    await expandFolder(page, 'parent');
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'nested')).toHaveText('1');
  });

  await test.step('hovering a folder count shows that folder\'s count with the overview link', async () => {
    await sidebar.folderInvalidFilesBadge(collectionName, 'nested').hover();
    await expect(sidebar.invalidFilesTooltip()).toHaveText('You have 1 invalid file. See here');
    await expect(sidebar.invalidFilesSeeHere()).toBeVisible();
  });

  await test.step('fixing a deeply nested file updates every count above it', async () => {
    fs.writeFileSync(brokenFilePath, FIXED_REQUEST[format]);

    await expect(sidebar.invalidFilesBadge(collectionName)).toHaveText('1');
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'parent')).toHaveText('1');
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'nested')).toHaveCount(0);
    await expect(paneTabs.overviewInvalidFilesCount()).toContainText('1 invalid');
  });

  await test.step('breaking it again brings the counts back', async () => {
    fs.writeFileSync(brokenFilePath, BROKEN_REQUEST[format]);

    await expect(sidebar.invalidFilesBadge(collectionName)).toHaveText('2');
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'parent')).toHaveText('2');
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'nested')).toHaveText('1');
  });

  await test.step('removing the invalid files clears every count', async () => {
    fs.unlinkSync(brokenFilePath);
    fs.unlinkSync(shallowBrokenFilePath);

    await expect(sidebar.invalidFilesBadge(collectionName)).toHaveCount(0);
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'parent')).toHaveCount(0);
    await expect(sidebar.folderInvalidFilesBadge(collectionName, 'nested')).toHaveCount(0);
    await expect(paneTabs.overviewInvalidFilesCount()).toHaveCount(0);
  });

  // collapse so the next collection's folders with the same names are unambiguous.
  await sidebar.collectionChevron(collectionName).click();
};
