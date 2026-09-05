import path from 'path';
import fs from 'fs';
import os from 'os';
import { test, expect, closeElectronApp } from '../../../playwright';
import { switchWorkspace, waitForReadyPage, buildCommonLocators, openCloneDialogFromImport } from '../../utils/page';
import { currentGitBranch, hasGitInstalled, runGit } from './helpers';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturesPath = path.join(__dirname, 'fixtures');

const WORKSPACE_NAME = 'Clone WS';
const REPOSITORY_URL = 'https://github.com/usebruno/github-rest-api-collection';
const UNREACHABLE_REPOSITORY_URL = 'https://github.com/usebruno/this-repo-does-not-exist';
const DEFAULT_BRANCH = 'main';
const CLONED_COLLECTION_DIR = 'github-rest-api-collection';
const BRANCH_SEARCH_TERM = 'feat/';

const remoteIsReachable = () => {
  try {
    runGit(os.tmpdir(), ['ls-remote', '--heads', REPOSITORY_URL]);
    return true;
  } catch {
    return false;
  }
};

const createWorkspace = async (createTmpDir: (tag?: string) => Promise<string>, tag: string): Promise<string> => {
  const workspacePath = await createTmpDir(tag);
  await fs.promises.cp(path.join(fixturesPath, 'clone-workspace'), workspacePath, { recursive: true });
  await fs.promises.mkdir(path.join(workspacePath, 'collections'), { recursive: true });
  return workspacePath;
};

const clonedCollectionPath = (workspacePath: string) =>
  path.join(workspacePath, 'collections', CLONED_COLLECTION_DIR);

test.describe('Clone Git Repository branch selection', () => {
  test.skip(!hasGitInstalled(), 'requires git installed');
  test.skip(!remoteIsReachable(), `Could not reach ${REPOSITORY_URL}.`);

  test('clones the branch picked from the branch list', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createWorkspace(createTmpDir, 'clone-branch-picked');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { cloneGitRepository } = buildCommonLocators(page);
    await switchWorkspace(page, WORKSPACE_NAME);

    await test.step('Import a git repository to open the clone dialog', async () => {
      await openCloneDialogFromImport(page, REPOSITORY_URL);
    });

    await test.step('Branch field is prefilled with the repository default', async () => {
      await expect(cloneGitRepository.branchSelect()).toContainText(DEFAULT_BRANCH);
    });

    // Picked from what the dialog actually lists, so the assertion never pins a branch name
    // that the upstream repository is free to rename.
    let pickedBranch = '';

    await test.step('Branch list offers the non-default branches', async () => {
      await cloneGitRepository.branchSelect().click();
      await expect(cloneGitRepository.branchOptions().first()).toBeVisible();

      const branches = await cloneGitRepository.branchOptions().allTextContents();
      pickedBranch = branches.map((branch) => branch.trim()).find((branch) => branch && branch !== DEFAULT_BRANCH)!;
      expect(pickedBranch).toBeTruthy();

      await cloneGitRepository.branchOption(pickedBranch).first().click();
      await expect(cloneGitRepository.branchSelect()).toContainText(pickedBranch);
    });

    await test.step('Cloning lands on the selected branch', async () => {
      await cloneGitRepository.button('Clone').click();
      await expect(cloneGitRepository.button('Open')).toBeVisible();
      expect(currentGitBranch(clonedCollectionPath(workspacePath))).toBe(pickedBranch);
    });

    await closeElectronApp(app);
  });

  test('clones the prefilled default branch when no other branch is picked', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createWorkspace(createTmpDir, 'clone-branch-default');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { cloneGitRepository } = buildCommonLocators(page);
    await switchWorkspace(page, WORKSPACE_NAME);

    await test.step('Import a git repository to open the clone dialog', async () => {
      await openCloneDialogFromImport(page, REPOSITORY_URL);
    });

    await test.step('The remote default arrives prefilled and stays selected', async () => {
      await expect(cloneGitRepository.branchSelect()).toContainText(DEFAULT_BRANCH);
      // Re-picking the selected branch must not empty the field.
      await cloneGitRepository.branchSelect().click();
      await cloneGitRepository.branchOption(DEFAULT_BRANCH).first().click();
      await expect(cloneGitRepository.branchSelect()).toContainText(DEFAULT_BRANCH);
    });

    await test.step('Cloning lands on the default branch', async () => {
      await cloneGitRepository.button('Clone').click();
      await expect(cloneGitRepository.button('Open')).toBeVisible();
      expect(currentGitBranch(clonedCollectionPath(workspacePath))).toBe(DEFAULT_BRANCH);
    });

    await closeElectronApp(app);
  });

  test('narrows the branch list to the search term', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createWorkspace(createTmpDir, 'clone-branch-search');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { cloneGitRepository } = buildCommonLocators(page);
    await switchWorkspace(page, WORKSPACE_NAME);

    await test.step('Import a git repository to open the clone dialog', async () => {
      await openCloneDialogFromImport(page, REPOSITORY_URL);
    });

    await test.step('Searching keeps only the matching branches', async () => {
      await expect(cloneGitRepository.branchSelect()).toContainText(DEFAULT_BRANCH);
      await cloneGitRepository.branchSelect().click();

      const unfiltered = await cloneGitRepository.branchOptions().count();
      await cloneGitRepository.branchSearchInput().fill(BRANCH_SEARCH_TERM);

      await expect(cloneGitRepository.branchOptions().first()).toBeVisible();
      const filtered = await cloneGitRepository.branchOptions().allTextContents();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(unfiltered);
      expect(filtered.every((branch) => branch.includes(BRANCH_SEARCH_TERM))).toBe(true);
    });

    await test.step('A term matching no branch offers nothing to select', async () => {
      await cloneGitRepository.branchSearchInput().fill('does-not-exist');
      await expect(cloneGitRepository.branchOptions()).toHaveCount(0);
      await expect(cloneGitRepository.noBranchesFound()).toBeVisible();
    });

    await closeElectronApp(app);
  });

  test('explains when the branches cannot be listed', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createWorkspace(createTmpDir, 'clone-branch-listing-failed');

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { cloneGitRepository } = buildCommonLocators(page);
    await switchWorkspace(page, WORKSPACE_NAME);

    await test.step('Import a repository the remote listing cannot resolve', async () => {
      await openCloneDialogFromImport(page, UNREACHABLE_REPOSITORY_URL);
    });

    await test.step('The dialog says branches are unavailable and falls back to the default', async () => {
      await expect(cloneGitRepository.branchListingFailed()).toBeVisible();
      await expect(cloneGitRepository.branchSelect()).toContainText('Repository default');
    });

    await test.step('The branch field is disabled and no branches are listed', async () => {
      await expect(cloneGitRepository.branchSelect()).toHaveClass(/disabled/);
      await cloneGitRepository.branchSelect().click();
      await expect(cloneGitRepository.branchOptions()).toHaveCount(0);
    });

    await closeElectronApp(app);
  });
});
