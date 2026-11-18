import path from 'node:path';
import { parse } from 'shell-quote';
import { ElectronApplication, Page, test } from '../../../../playwright';
import { mockBrowseFiles, selectRequestBodyMode } from '../actions';

export const readCurlFormFiles = (curl: string) => {
  const args: unknown[] = parse(curl.replace(/\\\r?\n/g, ''));

  return args.flatMap((arg, index) => {
    if (arg !== '--form') return [];

    const value = args[index + 1];
    if (typeof value !== 'string') throw new Error('Missing cURL form argument');
    const separator = value.indexOf('=@');
    if (separator <= 0) throw new Error('Expected a cURL file form argument: ' + value);

    const name = value.slice(0, separator);
    const fileList = value.slice(separator + '=@'.length);
    // Comma-separated file list: each entry is either an unquoted path (no `,`/`;`)
    // or a double-quoted path with `\"` / `\\` escapes. Bare `;` is not allowed.
    const tokens = Array.from(fileList.matchAll(/(?:^|,)("(?:\\["\\]|[^"\\])*"|[^",;]+)(?=,|$)/g), ([, token]) => token);
    if (!tokens.length || tokens.join(',') !== fileList) throw new Error('Invalid cURL file list: ' + fileList);

    const filePaths = tokens.map((token) => token.startsWith('"')
      ? token.slice(1, -1).replace(/\\(["\\])/g, '$1')
      : token);
    return [{ name, filePaths }];
  });
};

export const readMultipartEntries = (fileContent: string) => {
  const block = fileContent.match(/^body:multipart-form \{\r?\n([\s\S]*?)^\}\r?$/m)?.[1];
  return block?.trim().split(/\r?\n/).map((entry) => entry.trim()) ?? [];
};

/**
 * Kept in sync with getRelativePathWithinBasePath in
 * packages/bruno-app/src/utils/common/path.js — Bruno stores multipart paths
 * relative to the collection when the file is inside it, absolute otherwise.
 * Tests keep a Node copy so Playwright does not pull in the app's `platform` dep.
 */
const getStoredMultipartPath = (collectionPath: string | undefined, filePath: string) => {
  if (!collectionPath || !filePath) return filePath;

  try {
    const relativePath = path.relative(collectionPath, filePath);
    if (
      !relativePath
      || relativePath === '.'
      || relativePath === '..'
      || relativePath.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativePath)
    ) {
      return filePath;
    }
    return relativePath;
  } catch {
    return filePath;
  }
};

export const buildMultipartFormLocators = (page: Page) => {
  const table = page.getByTestId('multipart-form-table');

  const row = (index: number) => {
    const container = table.getByTestId('multipart-form-row').nth(index);
    return {
      key: container.getByTestId('multipart-form-key'),
      upload: container.getByTestId('multipart-file-upload'),
      selectedPath: (filePath: string, collectionPath?: string) => {
        // Match the path Bruno stores: collection-relative inside the collection, absolute outside.
        const storedPath = getStoredMultipartPath(collectionPath, filePath);
        // Match the whole JSON string for one path, escaped again for the CSS attribute selector.
        const encodedPath = JSON.stringify(JSON.stringify(storedPath));
        return container.getByTestId('multipart-file-selection').and(page.locator('[data-file-paths*=' + encodedPath + ']'));
      }
    };
  };

  return {
    table,
    row
  };
};

export const selectMultipartFormBody = async (page: Page) => {
  await selectRequestBodyMode(page, 'Multipart Form');
};

export const selectMultipartFiles = async (
  page: Page,
  electronApp: ElectronApplication,
  filePaths: string[],
  key: string,
  rowIndex = 0,
  collectionPath?: string
) => {
  await test.step(`Attach files to multipart field "${key}"`, async () => {
    const form = buildMultipartFormLocators(page);
    const row = form.row(rowIndex);
    await row.key.fill(key);
    await mockBrowseFiles(electronApp, filePaths);
    await row.upload.click();
    for (const filePath of filePaths) {
      await row.selectedPath(filePath, collectionPath).waitFor({ state: 'attached' });
    }
  });
};
