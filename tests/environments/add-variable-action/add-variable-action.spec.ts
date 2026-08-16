import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { expect, test } from '../../../playwright';
import { closeAllCollections, importCollection, openEnvironmentSelector } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const envLocators = (page: Page) => buildCommonLocators(page).environment;
const floatingAdd = (page: Page) => envLocators(page).floatingAddAction();
const addRowNameInput = (page: Page) => envLocators(page).addRowNameInput();

const collectionFile = path.join(__dirname, '..', 'create-environment', 'fixtures', 'bruno-collection.json');
const COLLECTION_NAME = 'test_collection';

type SeededEnv = { name: string; varCount: number; secretCount: number };

const LARGE_ENV: SeededEnv = { name: 'LargeEnv', varCount: 60, secretCount: 60 };
const SMALL_ENV: SeededEnv = { name: 'SmallEnv', varCount: 2, secretCount: 0 };

const buildCollectionFixture = (tmpDir: string, env: SeededEnv) => {
  const collection = JSON.parse(fs.readFileSync(collectionFile, 'utf8'));

  const rows = (count: number, prefix: string, secret: boolean) =>
    Array.from({ length: count }, (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        uid: `uid-${prefix}-${n}`,
        name: `${prefix}${n}`,
        value: `value${n}`,
        type: 'text',
        secret,
        enabled: true
      };
    });

  collection.environments = [
    {
      uid: `uid-env-${env.name}`,
      name: env.name,
      variables: [...rows(env.varCount, 'var', false), ...rows(env.secretCount, 'secret', true)]
    }
  ];

  const fixturePath = path.join(tmpDir, `collection-with-${env.name}.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(collection), 'utf8');
  return fixturePath;
};

const openSeededEnvironment = async (page: Page, tmpDir: string, env: SeededEnv) => {
  const fixturePath = await test.step(
    `Build an import fixture carrying "${env.name}" (${env.varCount} variables, ${env.secretCount} secrets)`,
    async () => buildCollectionFixture(tmpDir, env)
  );

  await importCollection(page, fixturePath, tmpDir, { expectedCollectionName: COLLECTION_NAME });

  await test.step(`Open the editor for "${env.name}"`, async () => {
    const locators = buildCommonLocators(page);
    await openEnvironmentSelector(page);
    await expect(locators.environment.listOption(env.name)).toBeVisible();

    await locators.environment.configureButton().waitFor({ state: 'visible' });
    await locators.environment.configureButton().dispatchEvent('click');
    await expect(locators.environment.collectionEnvTab()).toBeVisible();
    await locators.environment.sidebarListItem('collection', env.name).click();
    await expect(locators.environment.varRow('var001')).toBeVisible();
  });
};

const searchEnv = async (page: Page, query: string) => {
  await test.step(`Search for "${query}"`, async () => {
    const input = envLocators(page).searchInput();
    if ((await input.count()) === 0) {
      await envLocators(page).searchAction().click();
      await input.waitFor({ state: 'visible' });
    }
    await input.fill(query);
  });
};

test.describe('Environment variables — floating "Add variable" action', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('stays hidden while the add row is already on screen', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('add-variable-action-small');
    await openSeededEnvironment(page, tmpDir, SMALL_ENV);

    await test.step('The add row is already visible, so no action is offered', async () => {
      await expect(addRowNameInput(page)).toBeVisible();
      await expect(floatingAdd(page)).toBeHidden();
    });
  });

  test('scrolls the add row into view, focuses it, and accepts a new variable', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('add-variable-action-focus');
    await openSeededEnvironment(page, tmpDir, LARGE_ENV);

    await test.step('The action is offered on first paint, before any scrolling', async () => {
      await expect(floatingAdd(page)).toBeVisible();
    });

    await test.step('Clicking it scrolls to the add row and focuses the name field', async () => {
      await floatingAdd(page).click();
      await expect(addRowNameInput(page)).toBeFocused();
    });

    await test.step('Reaching the add row retires the action', async () => {
      await expect(floatingAdd(page)).toBeHidden();
    });

    await test.step('Typing into the focused row creates the variable', async () => {
      await page.keyboard.type('addedViaAction');
      await expect(envLocators(page).varRow('addedViaAction')).toBeVisible();
    });
  });

  test('labels itself for the active tab', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('add-variable-action-label');
    await openSeededEnvironment(page, tmpDir, LARGE_ENV);

    await test.step('Variables tab reads "Add variable"', async () => {
      await expect(floatingAdd(page)).toContainText('Add variable');
    });

    await test.step('Secrets tab reads "Add secret"', async () => {
      await envLocators(page).secretsTab().click();
      await expect(envLocators(page).varRow('secret001')).toBeVisible();
      await expect(floatingAdd(page)).toContainText('Add secret');
    });
  });

  test('a search with no matches still leaves the add row usable', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('add-variable-action-search');
    await openSeededEnvironment(page, tmpDir, LARGE_ENV);

    await searchEnv(page, 'zzz-matches-nothing');

    await test.step('The empty state renders inside the table body', async () => {
      await expect(envLocators(page).noResultsRow()).toContainText('No results found');
      await expect(envLocators(page).noResultsRow()).toContainText('zzz-matches-nothing');
    });

    await test.step('A variable can still be added while the search is active', async () => {
      await expect(addRowNameInput(page)).toBeVisible();
      await addRowNameInput(page).fill('addedDuringSearch');
      await expect(envLocators(page).varRow('addedDuringSearch')).toBeVisible();
    });
  });
});
