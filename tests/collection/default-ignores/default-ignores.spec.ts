import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, openCollectionAndAcceptSandbox } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Default ignores for node_modules and .git', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Should always ignore node_modules even when user has custom ignore config', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('node-modules-ignore-test');

    // Create bruno.json with custom ignore that doesn't include node_modules
    const brunoConfig = {
      version: '1',
      name: 'Node Modules Ignore Test',
      type: 'collection',
      ignore: ['custom-folder', 'another-folder'] // Explicitly NOT including node_modules
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create node_modules directory with .bru files inside
    const nodeModulesDir = path.join(collectionDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir);
    fs.mkdirSync(path.join(nodeModulesDir, 'some-package'));

    // Create a .bru file inside node_modules (should be ignored)
    fs.writeFileSync(
      path.join(nodeModulesDir, 'some-package', 'fake-request.bru'),
      `meta {
  name: Fake Request In Node Modules
  type: http
  seq: 1
}

get {
  url: https://fake.com
  body: none
  auth: none
}
`
    );

    // Create a real request at the collection root
    fs.writeFileSync(
      path.join(collectionDir, 'real-request.bru'),
      `meta {
  name: Real Request
  type: http
  seq: 1
}

get {
  url: https://real.com
  body: none
  auth: none
}
`
    );

    // Mock the electron dialog
    await electronApp.evaluate(
      ({ dialog }, { collectionDir }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [collectionDir]
        });
      },
      { collectionDir }
    );

    // Open the collection
    await locators.plusMenu.button().click();
    await locators.dropdown.tippyItem('Open collection').click();

    // Wait for collection to load
    await expect(locators.sidebar.collection('Node Modules Ignore Test')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode
    await openCollectionAndAcceptSandbox(page, 'Node Modules Ignore Test', 'safe');

    // Verify only the real request is visible
    await expect(locators.sidebar.request('Real Request')).toBeVisible({ timeout: 10000 });

    // The fake request inside node_modules should NOT be visible
    await expect(locators.sidebar.request('Fake Request In Node Modules')).not.toBeVisible();

    // node_modules folder should not appear in the sidebar
    await expect(locators.sidebar.folder('node_modules')).not.toBeVisible();
  });

  test('Should always ignore .git even when user has custom ignore config', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('git-ignore-test');

    // Create bruno.json with custom ignore that doesn't include .git
    const brunoConfig = {
      version: '1',
      name: 'Git Ignore Test',
      type: 'collection',
      ignore: ['custom-folder'] // Explicitly NOT including .git
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create .git directory with .bru files inside
    const gitDir = path.join(collectionDir, '.git');
    fs.mkdirSync(gitDir);
    fs.mkdirSync(path.join(gitDir, 'hooks'));

    // Create a .bru file inside .git (should be ignored)
    fs.writeFileSync(
      path.join(gitDir, 'hooks', 'fake-git-request.bru'),
      `meta {
  name: Fake Request In Git
  type: http
  seq: 1
}

get {
  url: https://fake-git.com
  body: none
  auth: none
}
`
    );

    // Create a real request at the collection root
    fs.writeFileSync(
      path.join(collectionDir, 'real-request.bru'),
      `meta {
  name: Real Git Request
  type: http
  seq: 1
}

get {
  url: https://real.com
  body: none
  auth: none
}
`
    );

    // Mock the electron dialog
    await electronApp.evaluate(
      ({ dialog }, { collectionDir }) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [collectionDir]
        });
      },
      { collectionDir }
    );

    // Open the collection
    await locators.plusMenu.button().click();
    await locators.dropdown.tippyItem('Open collection').click();

    // Wait for collection to load
    await expect(locators.sidebar.collection('Git Ignore Test')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode
    await openCollectionAndAcceptSandbox(page, 'Git Ignore Test', 'safe');

    // Verify only the real request is visible
    await expect(locators.sidebar.request('Real Git Request')).toBeVisible({ timeout: 10000 });

    // The fake request inside .git should NOT be visible
    await expect(locators.sidebar.request('Fake Request In Git')).not.toBeVisible();

    // .git folder should not appear in the sidebar
    await expect(locators.sidebar.folder('.git')).not.toBeVisible();
  });
});
