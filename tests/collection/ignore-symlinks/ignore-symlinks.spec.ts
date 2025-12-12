import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections, openCollectionAndAcceptSandbox } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Ignore symlinked node_modules and .git directories', () => {
  let originalShowOpenDialog;

  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      originalShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = originalShowOpenDialog;
    });
  });

  test('Should open collection without hanging when node_modules is symlinked', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);

    // Create a parent directory to simulate npm workspaces setup
    const parentDir = await createTmpDir('npm-workspace-parent');
    const collectionDir = path.join(parentDir, 'collection');

    // Create the collection directory
    fs.mkdirSync(collectionDir);

    // Create parent node_modules with a package
    const parentNodeModules = path.join(parentDir, 'node_modules');
    fs.mkdirSync(parentNodeModules);
    fs.mkdirSync(path.join(parentNodeModules, 'some-package'));
    fs.writeFileSync(
      path.join(parentNodeModules, 'some-package', 'package.json'),
      JSON.stringify({ name: 'some-package', version: '1.0.0' })
    );

    // Create bruno.json for the collection (with custom ignore that doesn't include node_modules)
    const brunoConfig = {
      version: '1',
      name: 'Symlink Test Collection',
      type: 'collection',
      ignore: ['custom-ignore-folder'] // Intentionally NOT including node_modules to test default behavior
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create a sample request
    fs.writeFileSync(
      path.join(collectionDir, 'test-request.bru'),
      `meta {
  name: Test Request
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}
`
    );

    // Create symlink to parent's node_modules (simulating npm workspaces)
    const symlinkPath = path.join(collectionDir, 'node_modules');
    fs.symlinkSync(parentNodeModules, symlinkPath, 'dir');

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

    // Wait for collection to load (with a reasonable timeout)
    // If the symlink fix doesn't work, this would hang indefinitely
    await expect(locators.sidebar.collection('Symlink Test Collection')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode
    await openCollectionAndAcceptSandbox(page, 'Symlink Test Collection', 'safe');

    // Verify the request is visible (collection loaded successfully)
    await expect(locators.sidebar.request('Test Request')).toBeVisible({ timeout: 10000 });

    // node_modules folder should not appear in the sidebar
    await expect(locators.sidebar.folder('node_modules')).not.toBeVisible();

    // Cleanup
    await closeAllCollections(page);
  });

  test('Should open collection without hanging when .git is symlinked', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);

    // Create a parent directory
    const parentDir = await createTmpDir('git-symlink-parent');
    const collectionDir = path.join(parentDir, 'collection');

    // Create the collection directory
    fs.mkdirSync(collectionDir);

    // Create a mock .git directory in parent
    const parentGitDir = path.join(parentDir, '.git');
    fs.mkdirSync(parentGitDir);
    fs.writeFileSync(path.join(parentGitDir, 'config'), '[core]\nrepositoryformatversion = 0');
    fs.mkdirSync(path.join(parentGitDir, 'objects'));
    fs.mkdirSync(path.join(parentGitDir, 'refs'));

    // Create bruno.json for the collection
    const brunoConfig = {
      version: '1',
      name: 'Git Symlink Test Collection',
      type: 'collection',
      ignore: ['custom-ignore'] // Intentionally NOT including .git
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create a sample request
    fs.writeFileSync(
      path.join(collectionDir, 'test-request.bru'),
      `meta {
  name: Git Test Request
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}
`
    );

    // Create symlink to parent's .git
    const gitSymlinkPath = path.join(collectionDir, '.git');
    fs.symlinkSync(parentGitDir, gitSymlinkPath, 'dir');

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
    await expect(locators.sidebar.collection('Git Symlink Test Collection')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode
    await openCollectionAndAcceptSandbox(page, 'Git Symlink Test Collection', 'safe');

    // Verify the request is visible
    await expect(locators.sidebar.request('Git Test Request')).toBeVisible({ timeout: 10000 });

    // .git folder should not appear in the sidebar
    await expect(locators.sidebar.folder('.git')).not.toBeVisible();

    // Cleanup
    await closeAllCollections(page);
  });

  test('Should always ignore node_modules even when user has custom ignore config', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);

    // This test uses a REAL node_modules directory (not a symlink) to verify
    // that defaultIgnores works independently of followSymlinks setting.
    // The symlink tests above verify followSymlinks: false works.
    const collectionDir = await createTmpDir('custom-ignore-test');

    // Create bruno.json with custom ignore that doesn't include node_modules
    const brunoConfig = {
      version: '1',
      name: 'Custom Ignore Collection',
      type: 'collection',
      ignore: ['custom-folder', 'another-folder'] // Explicitly NOT including node_modules or .git
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create a REAL node_modules directory (not a symlink) with .bru files inside
    // This tests that defaultIgnores works even without symlinks
    const nodeModulesDir = path.join(collectionDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir);
    fs.mkdirSync(path.join(nodeModulesDir, 'package-a'));
    fs.mkdirSync(path.join(nodeModulesDir, 'package-b'));

    // Create files that look like requests inside node_modules (should be ignored)
    fs.writeFileSync(
      path.join(nodeModulesDir, 'package-a', 'fake-request.bru'),
      `meta {
  name: Fake Request
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

    // Create a REAL .git directory (not a symlink) - should also be ignored
    const gitDir = path.join(collectionDir, '.git');
    fs.mkdirSync(gitDir);
    fs.writeFileSync(path.join(gitDir, 'config'), '[core]');

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
    await expect(locators.sidebar.collection('Custom Ignore Collection')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode (this also expands the collection)
    await openCollectionAndAcceptSandbox(page, 'Custom Ignore Collection', 'safe');

    // Verify only the real request is visible (not the fake one in node_modules)
    await expect(locators.sidebar.request('Real Request')).toBeVisible({ timeout: 10000 });

    // The fake request inside node_modules should NOT be visible
    await expect(locators.sidebar.request('Fake Request')).not.toBeVisible();

    // node_modules folder should not appear in the sidebar
    await expect(locators.sidebar.folder('node_modules')).not.toBeVisible();

    // Cleanup
    await closeAllCollections(page);
  });

  test('Should handle circular symlinks without crashing', async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const collectionDir = await createTmpDir('circular-symlink-test');

    // Create bruno.json
    const brunoConfig = {
      version: '1',
      name: 'Circular Symlink Collection',
      type: 'collection'
    };
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));

    // Create a request
    fs.writeFileSync(
      path.join(collectionDir, 'test-request.bru'),
      `meta {
  name: Circular Test
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}
`
    );

    // Create node_modules that links back to the collection (circular reference)
    const nodeModulesDir = path.join(collectionDir, 'node_modules');
    fs.mkdirSync(nodeModulesDir);

    // Create a symlink inside node_modules that points back to the collection
    // This simulates what can happen with npm workspaces
    try {
      fs.symlinkSync(collectionDir, path.join(nodeModulesDir, 'circular-link'), 'dir');
    } catch (e) {
      // Some systems might not allow this, skip if so
      console.log('Could not create circular symlink, skipping this part');
    }

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

    // If the fix works, the collection should load without hanging
    await expect(locators.sidebar.collection('Circular Symlink Collection')).toBeVisible({ timeout: 30000 });

    // Accept the sandbox mode
    await openCollectionAndAcceptSandbox(page, 'Circular Symlink Collection', 'safe');

    // Verify the request is visible
    await expect(locators.sidebar.request('Circular Test')).toBeVisible({ timeout: 10000 });

    // node_modules folder should not appear in the sidebar
    await expect(locators.sidebar.folder('node_modules')).not.toBeVisible();

    // Cleanup
    await closeAllCollections(page);
  });
});
