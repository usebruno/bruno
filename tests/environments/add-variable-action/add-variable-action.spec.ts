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

type SeededEnv = { name: string; varCount: number; secretCount: number; extendsEnv?: string };

const LARGE_ENV: SeededEnv = { name: 'LargeEnv', varCount: 60, secretCount: 60 };
const SMALL_ENV: SeededEnv = { name: 'SmallEnv', varCount: 2, secretCount: 0 };
const BASE_ENV_NAME = 'BaseEnv';
const CHILD_ENV: SeededEnv = { name: 'ChildEnv', varCount: 60, secretCount: 0, extendsEnv: BASE_ENV_NAME };

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

  const seeded = {
    uid: `uid-env-${env.name}`,
    name: env.name,
    variables: [...rows(env.varCount, 'var', false), ...rows(env.secretCount, 'secret', true)],
    ...(env.extendsEnv ? { extends: env.extendsEnv } : {})
  };

  // An extending environment needs its parent present so the table renders inherited rows.
  collection.environments = env.extendsEnv
    ? [
        {
          uid: `uid-env-${env.extendsEnv}`,
          name: env.extendsEnv,
          variables: rows(3, 'base', false)
        },
        seeded
      ]
    : [seeded];

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

  test('works for an environment that extends another (inherited rows above its own)', async ({ page, createTmpDir }) => {
    const tmpDir = await createTmpDir('add-variable-action-inherited');
    await openSeededEnvironment(page, tmpDir, CHILD_ENV);

    await test.step('Inherited rows are rendered and the action is offered', async () => {
      await expect(envLocators(page).varRow('var001')).toBeVisible();
      await expect(page.getByTestId('env-var-section-inherited')).toBeVisible();
      await expect(floatingAdd(page)).toBeVisible();
    });

    await test.step('Clicking it focuses the add row', async () => {
      await floatingAdd(page).click();
      await expect(addRowNameInput(page)).toBeFocused();
    });

    await test.step('Collapsing the own section removes the add row, so the action is hidden', async () => {
      // The section header is a virtualized row; scroll back up so it is mounted.
      await envLocators(page).variablesTable().locator('.table-container').evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.getByTestId('env-var-section-toggle-own').click();
      await expect(floatingAdd(page)).toBeHidden();
    });
  });
});
