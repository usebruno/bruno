import fs from 'fs';
import os from 'os';
import path from 'path';
import url from 'url';
import { test, expect, closeElectronApp } from '../../../playwright';
import { waitForReadyPage, setWindowContentSize } from '../../../utils';
import { serveGitRepository } from '../../../servers';
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
  countCollectionRowsInView
} from '../../../pages/open-collection/git-page';
import { hasGitInstalled, runGit } from '../../collection/git/helpers';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const COLLECTION_COUNT = 30;
const SHORT_WINDOW = { width: 1000, height: 600 };
const OLD_MODAL_VISIBLE_ROWS = 8;
const BRANCH_COUNT = 40;
const REMOTE_REPOSITORY_URL = 'https://github.com/usebruno/github-rest-api-collection';
const REMOTE_DEFAULT_BRANCH = 'main';

type RepositoryEntry = { name: string; brunoJson: string };

const validCollection = (name: string): RepositoryEntry => ({
  name,
  brunoJson: JSON.stringify({ version: '1', name, type: 'collection' })
});

const toPosix = (value: string) => value.split(path.sep).join('/');

const createRepository = async (repoPath: string, entries: RepositoryEntry[]) => {
  await fs.promises.mkdir(repoPath, { recursive: true });
  runGit(repoPath, ['init', '-q', '-b', 'main']);
  for (const { name, brunoJson } of entries) {
    await fs.promises.mkdir(path.join(repoPath, name));
    await fs.promises.writeFile(path.join(repoPath, name, 'bruno.json'), brunoJson);
  }
  runGit(repoPath, ['add', '-A']);
  runGit(repoPath, ['-c', 'user.name=bruno', '-c', 'user.email=bruno@example.com', 'commit', '-q', '-m', 'init']);
};

const remoteIsReachable = () => {
  try {
    runGit(os.tmpdir(), ['ls-remote', '--heads', REMOTE_REPOSITORY_URL]);
    return true;
  } catch {
    return false;
  }
};

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
    await createRepository(
      repoPath,
      Array.from({ length: COLLECTION_COUNT }, (_, index) => validCollection(`c${String(index + 1).padStart(2, '0')}`))
    );
    const { app, cloneTarget } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);

      await test.step('Shrink the window and open the Git page', async () => {
        await setWindowContentSize(app, page, SHORT_WINDOW);
        await openGitPage(page);
      });

      await test.step('Clone the local repository', async () => {
        await gitPage.urlInput().fill(url.pathToFileURL(repoPath).href);
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
    }
  });

  test('warns about collections the scan skipped', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('skipped-collections-repo'), 'skipped-collections');
    await createRepository(repoPath, [validCollection('valid'), { name: 'broken', brunoJson: '{ not json' }]);
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.urlInput().fill(url.pathToFileURL(repoPath).href);
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
    }
  });

  test('closes the modal from Cancel', async ({ launchElectronApp, createTmpDir }) => {
    const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

    try {
      const page = await waitForReadyPage(app);
      const gitPage = buildGitPageLocators(page);
      await openGitPage(page);

      await gitPage.cancelButton().click();

      await expect(gitPage.modal()).toBeHidden();
    } finally {
      await closeElectronApp(app);
    }
  });

  test('opens the branch list below its trigger in a short window', async ({ launchElectronApp, createTmpDir }) => {
    const repoPath = path.join(await createTmpDir('many-branches-repo'), 'many-branches');
    await createRepository(repoPath, [validCollection('only')]);
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

  test.describe('branch list', () => {
    test.skip(() => !remoteIsReachable(), `Could not reach ${REMOTE_REPOSITORY_URL}.`);

    test('loads the branches of a typed URL with the default branch preselected', async ({ launchElectronApp, createTmpDir }) => {
      const { app } = await launchWithCloneTarget(launchElectronApp, createTmpDir);

      try {
        const page = await waitForReadyPage(app);
        const gitPage = buildGitPageLocators(page);
        await openGitPage(page);

        await gitPage.urlInput().fill(REMOTE_REPOSITORY_URL);

        await expect(gitPage.branchSelect()).toContainText(REMOTE_DEFAULT_BRANCH);
      } finally {
        await closeElectronApp(app);
      }
    });
  });
});
