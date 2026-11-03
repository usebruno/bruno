import { execSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'GenerateDocsOrder';

test.describe('Generate Documentation - git link', () => {
  test('shows the git-link control under Advanced when the collection has a git remote', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    execSync('git init', { cwd: collectionFixturePath!, stdio: 'pipe' });
    execSync('git remote add origin https://github.com/org/repo.git', { cwd: collectionFixturePath!, stdio: 'pipe' });

    const locators = buildCommonLocators(page);

    await locators.sidebar.collection(COLLECTION_NAME).hover();
    await locators.actions.collectionActions(COLLECTION_NAME).click();
    await locators.generateDocs.menuItem().click();

    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible();

    await locators.generateDocs.advancedToggle().click();
    await expect(locators.generateDocs.gitLinkLabel()).toBeVisible();

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });
});
