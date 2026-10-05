import { test, expect } from '../../../playwright';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';

const COLLECTION_NAME = 'Zip Git Metadata';

const GIT_METADATA_FILES = [
  { relativePath: '.git/hooks/post-checkout', content: '#!/bin/sh', mode: 0o755 },
  { relativePath: 'users/.git', content: 'gitdir: ../elsewhere' },
  { relativePath: 'orders/.GIT/config', content: '[core]' }
];

const addGitMetadata = (collectionDir: string) => {
  for (const { relativePath, content, mode } of GIT_METADATA_FILES) {
    const filePath = path.join(collectionDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, { mode });
  }
};

const listFilesRecursively = (dir: string) =>
  fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((dirent) => !dirent.isDirectory())
    .map((dirent) => path.relative(dir, path.join(dirent.parentPath, dirent.name)).split(path.sep).join('/'))
    .sort();

const hasGitSegment = (relativePath: string) =>
  relativePath.split('/').some((segment) => segment.toLowerCase() === '.git');

test.describe('Collection ZIP import leaves out git metadata', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('importing a zip that carries git metadata leaves no .git in the imported collection', async ({
    page,
    collectionFixturePath,
    createTmpDir
  }) => {
    const collectionDir = collectionFixturePath!;
    const zipFilePath = path.join(await createTmpDir('zip-git-import-source'), `${COLLECTION_NAME}.zip`);
    const collectionLocation = await createTmpDir('zip-git-import-location');

    await test.step('Zip the collection together with its git metadata', async () => {
      addGitMetadata(collectionDir);
      const zip = new AdmZip();
      zip.addLocalFolder(collectionDir, COLLECTION_NAME);
      zip.writeZip(zipFilePath);
    });

    await importCollection(page, zipFilePath, collectionLocation, { expectedCollectionName: COLLECTION_NAME });

    await test.step('The imported collection keeps its files and has no .git anywhere', async () => {
      const importedFiles = listFilesRecursively(path.join(collectionLocation, COLLECTION_NAME));

      expect(importedFiles).toEqual(expect.arrayContaining(['opencollection.yml', 'users/get-user.yml']));
      expect(importedFiles.filter(hasGitSegment)).toEqual([]);
    });
  });
});
