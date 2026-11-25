import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  waitForReadyPage,
  setWindowContentSize,
  hasGitInstalled,
  runGit,
  createGitRepository,
  validCollectionEntry,
  ymlCollectionEntry
} from '../../../utils';
import { serveGitRepository } from '../../../servers';
import { buildCommonLocators, closeAllCollections } from '../../../pages';
import { buildToastLocators } from '../../../pages/app-shell/toast';
import { buildOpenCollectionModalLocators } from '../../../pages/open-collection/modal';
import {
  buildGitPageLocators,
  openGitPage,
  openBranchList,
  getBranchListPlacement,
  isGitPagePanelScrollable,
  isInlineBodyScrollable,
  isCollectionListScrollable,
  isBranchListScrollable,
  getCollectionListAndFooterEdges,
  getCollectionListAndSkippedWarningEdges,
  countCollectionRowsInView,
  getFormFieldHeights
} from '../../../pages/open-collection/git-page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const COLLECTION_COUNT = 30;
const SHORT_WINDOW = { width: 1000, height: 600 };
const OLD_MODAL_VISIBLE_ROWS = 8;
const BRANCH_COUNT = 40;

const toPosix = (value: string) => value.split(path.sep).join('/');

const launchWithCloneTarget = async (launchElectronApp, createTmpDir) => {
  const cloneTarget = toPosix(await createTmpDir('git-page-clone'));
  const app = await launchElectronApp({ initUserDataPath, templateVars: { cloneTarget } });
  return { app, cloneTarget };
};

test.describe('Git page', () => {
  test.fixme(true, 'Open collection modal has no entry point yet');
  test.skip(!hasGitInstalled(), 'requires git installed');

  test('keeps the selection footer visible when the window is short', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('many-collections-repo'), 'many-collections');
    await createGitRepository(
      repoPath,
      Array.from({ length: COLLECTION_COUNT }, (_, index) => validCollectionEntry(`c${String(index + 1).padStart(2, '0')}`))
    );
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app, cloneTarget } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);

      await test.step('Shrink the window and open the Git page', async () => {
        await setWindowContentSize(app, page, SHORT_WINDOW);
        await openGitPage(page);
      });

      await test.step('Clone the local repository', async () => {
        await gitPage.urlInput().fill(server.url);
        await expect.poll(async () => toPosix(await gitPage.locationInput().inputValue())).toBe(cloneTarget);
        await gitPage.confirmButton().click();
        await gitPage.collectionList().waitFor({ state: 'visible' });
      });

      await test.step('The footer stays in view', async () => {
        await expect(gitPage.selectedCount()).toHaveText(`0 of ${COLLECTION_COUNT} selected`);
        await expect(gitPage.selectedCount()).toBeInViewport();
        await expect(gitPage.confirmButton()).toBeInViewport();
        await expect(gitPage.cancelButton()).toBeInViewport();
      });

      await test.step('The list shows fewer rows and scrolls inside, not the page', async () => {
        await expect.poll(() => countCollectionRowsInView(page)).toBeGreaterThanOrEqual(1);
        await expect.poll(() => countCollectionRowsInView(page)).toBeLessThan(OLD_MODAL_VISIBLE_ROWS);
        await expect.poll(() => isCollectionListScrollable(page)).toBe(true);
        await expect.poll(() => isInlineBodyScrollable(page)).toBe(false);
        await expect.poll(() => isGitPagePanelScrollable(page)).toBe(false);
      });

      await test.step('The list ends above the footer', async () => {
        const { listBottom, footerTop } = await getCollectionListAndFooterEdges(page);
        expect(listBottom).toBeLessThanOrEqual(footerTop);
      });
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('warns about collections the scan skipped', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('skipped-collections-repo'), 'skipped-collections');
    await createGitRepository(repoPath, [validCollectionEntry('valid'), { folder: 'broken', brunoJson: '{ not json' }]);
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.urlInput().fill(server.url);
      await gitPage.confirmButton().click();

      await expect(gitPage.collectionRow('valid')).toBeVisible();
      await expect(gitPage.collectionRows()).toHaveCount(1);
      await expect(gitPage.skippedWarning()).toContainText('1 collections were skipped because their config could not be read.');

      const { listBottom, warningTop } = await getCollectionListAndSkippedWarningEdges(page);
      expect(warningTop).toBeGreaterThanOrEqual(listBottom);

      await gitPage.skippedDetailsButton().click();
      await expect(gitPage.skippedPath('broken')).toBeVisible();
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('shows the url field with its hint and gives all three fields one height', async ({ launchElectronApp, createTmpDir }) => {
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await expect(gitPage.urlInput()).toHaveAttribute('placeholder', 'https://github.com/org/repo');
      await expect(gitPage.urlHint()).toHaveText('Any git host: GitHub, GitLab, Bitbucket or self-hosted.');
      await expect(gitPage.locationInput()).toBeVisible();

      await expect.poll(async () => new Set(await getFormFieldHeights(page)).size).toBe(1);
    } finally {
      await closeElectronApp(app);
    }
  });

  test('keeps a clone running on another page and shows its collections back on the Git page', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('background-clone-repo'), 'background-clone');
    await createGitRepository(repoPath, [validCollectionEntry('only')]);
    const server = await serveGitRepository({
      sourceRepoPath: repoPath,
      servedRoot: await createTmpDir('git-http-root'),
      holdResponses: true
    });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      const modal = buildOpenCollectionModalLocators(page);
      await openGitPage(page);

      await test.step('Start a clone the server holds', async () => {
        await gitPage.urlInput().fill(server.url);
        await gitPage.confirmButton().click();
        await expect(modal.menuItemSpinner('git')).toBeVisible();
      });

      await test.step('Recents opens while the clone runs', async () => {
        await modal.menuItem('recents').click();
        await expect(modal.page('recents')).toBeVisible();
        await expect(modal.menuItemSpinner('git')).toBeVisible();
      });

      await test.step('The clone finishes in the background and its collections show on the Git page', async () => {
        server.releaseResponses();
        await expect(modal.menuItemSpinner('git')).toBeHidden();
        await modal.menuItem('git').click();
        await expect(gitPage.collectionRow('only')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('keeps cloning after the modal closes and says when it is done', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('closed-modal-clone-repo'), 'closed-modal-clone');
    await createGitRepository(repoPath, [validCollectionEntry('only')]);
    const server = await serveGitRepository({
      sourceRepoPath: repoPath,
      servedRoot: await createTmpDir('git-http-root'),
      holdResponses: true
    });
    const { app, cloneTarget } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      const modal = buildOpenCollectionModalLocators(page);
      await openGitPage(page);

      await test.step('Start a clone the server holds', async () => {
        await gitPage.urlInput().fill(server.url);
        await gitPage.confirmButton().click();
        await expect(modal.menuItemSpinner('git')).toBeVisible();
      });

      await test.step('Close the modal while the clone runs', async () => {
        await modal.closeButton().click();
        await expect(modal.root()).toBeHidden();
      });

      await test.step('The clone finishes in the background', async () => {
        server.releaseResponses();
        await expect(buildToastLocators(page).byMessage('Repository cloned successfully').first()).toBeVisible();
        expect(fs.existsSync(path.join(cloneTarget, server.cloneFolderName, 'only', 'bruno.json'))).toBe(true);
      });
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('lists every collection in the repository, including nested, hidden and build folders, but not node_modules', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('whole-repo-scan'), 'whole-repo');
    await createGitRepository(repoPath, [
      validCollectionEntry('Root', '.'),
      ymlCollectionEntry('Nested yml', 'examples/nested'),
      validCollectionEntry('Hidden', '.hidden/tools'),
      validCollectionEntry('Build', 'build/out'),
      validCollectionEntry('Should not show', 'node_modules/pkg')
    ]);
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await test.step('Clone the repository', async () => {
        await gitPage.urlInput().fill(server.url);
        await gitPage.confirmButton().click();
      });

      await test.step('Every collection outside node_modules is listed', async () => {
        for (const name of ['Root', 'Nested yml', 'Hidden', 'Build']) {
          await expect(gitPage.collectionRow(name)).toBeVisible();
        }
        await expect(gitPage.collectionRows()).toHaveCount(4);
      });
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('does not load branches for a URL with a token, and still clones it', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('token-url-repo'), 'token-url');
    await createGitRepository(repoPath, [validCollectionEntry('only')]);
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await test.step('Branches do not load for the URL with a token', async () => {
        await gitPage.urlInput().fill(server.url.replace('http://', 'http://ghp_token@'));
        // Asserts that branch loading never starts, so wait past its 500ms debounce before checking
        await page.waitForTimeout(1000);
        await expect(gitPage.branchSelect()).toHaveText('Repository default');
      });

      await test.step('The URL still clones', async () => {
        await gitPage.confirmButton().click();
        await expect(gitPage.collectionRow('only')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('opens a picked collection from the clone result in the sidebar', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('open-picked-repo'), 'open-picked');
    await createGitRepository(repoPath, [validCollectionEntry('picked'), validCollectionEntry('left out')]);
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      const modal = buildOpenCollectionModalLocators(page);
      const { sidebar } = buildCommonLocators(page);
      await openGitPage(page);

      await test.step('Clone the repository', async () => {
        await gitPage.urlInput().fill(server.url);
        await gitPage.confirmButton().click();
        await expect(gitPage.collectionRow('picked')).toBeVisible();
      });

      await test.step('Pick one collection and open it', async () => {
        await gitPage.collectionCheckbox('picked').check();
        await expect(gitPage.selectedCount()).toHaveText('1 of 2 selected');
        await gitPage.confirmButton().click();
        await expect(modal.root()).toBeHidden();
      });

      await test.step('Only the picked collection is in the sidebar', async () => {
        await expect(sidebar.collectionExact('picked')).toBeVisible();
        await expect(sidebar.collectionExact('left out')).toHaveCount(0);
      });

      await closeAllCollections(page);
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('says the URL is not valid and stays on the form', async ({ launchElectronApp, createTmpDir }) => {
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.urlInput().fill('github.com/acme/api');
      await gitPage.confirmButton().click();

      await expect(gitPage.urlError()).toHaveText('Please enter a valid git repository URL');
      await expect(gitPage.urlInput()).toBeVisible();
      await expect(gitPage.confirmButton()).toHaveText('Clone');
    } finally {
      await closeElectronApp(app);
    }
  });

  test('closes the modal from Cancel', async ({ launchElectronApp, createTmpDir }) => {
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.cancelButton().click();

      await expect(buildOpenCollectionModalLocators(page).root()).toBeHidden();
    } finally {
      await closeElectronApp(app);
    }
  });

  test('opens the branch list below its trigger in a short window', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('many-branches-repo'), 'many-branches');
    await createGitRepository(repoPath, [validCollectionEntry('only')]);
    for (let index = 1; index <= BRANCH_COUNT; index++) {
      runGit(repoPath, ['branch', `feature-${String(index).padStart(2, '0')}`]);
    }
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await setWindowContentSize(app, page, SHORT_WINDOW);
      await openGitPage(page);
      await gitPage.urlInput().fill(server.url);
      await expect(gitPage.branchSelect()).toContainText('main');

      await openBranchList(page);
      const { triggerBottom, listTop, listBottom, viewportHeight } = await getBranchListPlacement(page);

      expect(listTop).toBeGreaterThanOrEqual(triggerBottom);
      expect(listBottom).toBeLessThanOrEqual(viewportHeight);
      await expect.poll(() => isBranchListScrollable(page)).toBe(true);
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });

  test('loads the branches of a typed URL with the default branch preselected', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('default-branch-repo'), 'default-branch');
    await createGitRepository(repoPath, [validCollectionEntry('only')]);
    runGit(repoPath, ['branch', 'feature-a']);
    const server = await serveGitRepository({ sourceRepoPath: repoPath, servedRoot: await createTmpDir('git-http-root') });
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.urlInput().fill(server.url);

      await expect(gitPage.branchSelect()).toContainText('main');
    } finally {
      await closeElectronApp(app);
      server.close();
    }
  });
});
