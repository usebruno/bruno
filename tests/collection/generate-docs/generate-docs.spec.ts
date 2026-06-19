import jsyaml from 'js-yaml';
import { test, expect, Page } from '../../../playwright';
import { generateCollectionDocs } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  getCollectionTreeStructure,
  type CollectionTreeItem
} from '../../utils/page/mounting';

const COLLECTION_NAME = 'GenerateDocsOrder';

/**
 * Name-only nested view of an ordered item tree. Both the sidebar structure and
 * the generated-docs structure are reduced to this shape so they can be compared
 * directly — the change under test only affects ordering, so names + nesting are
 * all that matter.
 */
type NameTree = { name: string; items?: NameTree[] };

/**
 * The order the sidebar renders (and therefore the order the generated docs must
 * match): folders first by `seq`, then requests by `seq`, applied recursively.
 *
 * The on-disk fixture is intentionally laid out so this differs from both the
 * alphabetical filename order and the requests-before-folders grouping, so a
 * regression that drops the sort would produce a visibly different tree.
 */
const EXPECTED_ORDER: NameTree[] = [
  {
    name: 'Zoo',
    items: [{ name: 'Lion' }, { name: 'Bear' }]
  },
  { name: 'Aviary', items: [{ name: 'Parrot' }] },
  { name: 'ReqBeta' },
  { name: 'ReqAlpha' }
];

/**
 * Pull the OpenCollection payload out of the generated HTML and reduce it to a
 * NameTree. The docs file embeds the collection as a `jsesc`-encoded YAML string
 * literal (`const collectionData = "...";`); we decode that literal back to YAML
 * and parse it.
 */
const parseGeneratedDocs = (html: string): NameTree[] => {
  const match = html.match(/const collectionData = ("(?:\\.|[^"\\])*");/);
  if (!match) {
    throw new Error('Could not find the embedded collection data in the generated documentation');
  }

  // The literal is a double-quoted `jsesc` string of the YAML payload. For the
  // ASCII content this fixture produces, jsesc only emits JSON-valid escapes
  // (`\n`, `\"`, `\\`, `\/`), so the literal is also valid JSON and decodes back
  // to the raw YAML with a plain JSON.parse.
  const yamlContent = JSON.parse(match[1]) as string;

  const openCollection = jsyaml.load(yamlContent) as { items?: Array<Record<string, any>> };
  return openCollectionItemsToNameTree(openCollection.items);
};

/** Reduce OpenCollection items (name lives at `info.name`) to a NameTree. */
const openCollectionItemsToNameTree = (items: Array<Record<string, any>> = []): NameTree[] =>
  items.map((item) => {
    const node: NameTree = { name: item?.info?.name };
    if (Array.isArray(item?.items)) {
      node.items = openCollectionItemsToNameTree(item.items);
    }
    return node;
  });

/** Reduce the sidebar tree structure to a NameTree. */
const sidebarItemsToNameTree = (items: CollectionTreeItem[] = []): NameTree[] =>
  items.map((item) => {
    const node: NameTree = { name: item.name };
    if (item.type === 'folder') {
      node.items = sidebarItemsToNameTree(item.items ?? []);
    }
    return node;
  });

/**
 * Environments defined in the fixture collection (one `.bru` file each under
 * `environments/`). All of them should be selected by default in the modal.
 */
const EXPECTED_ENVIRONMENTS = ['Production', 'Development', 'Staging'];

/** Extract the full embedded OpenCollection payload from the generated docs HTML. */
const parseGeneratedOpenCollection = (html: string): Record<string, any> => {
  const match = html.match(/const collectionData = ("(?:\\.|[^"\\])*");/);
  if (!match) {
    throw new Error('Could not find the embedded collection data in the generated documentation');
  }
  const yamlContent = JSON.parse(match[1]) as string;
  return jsyaml.load(yamlContent) as Record<string, any>;
};

/** Names of the environments embedded in the generated docs (under config.environments). */
const generatedEnvironmentNames = (html: string): string[] => {
  const oc = parseGeneratedOpenCollection(html);
  const environments = (oc?.config?.environments ?? []) as Array<Record<string, any>>;
  return environments.map((env) => env?.name);
};

/** Text rendered by the header count, e.g. `(2/3 selected)`. */
const selectedCountText = (selected: number): string => `(${selected}/${EXPECTED_ENVIRONMENTS.length} selected)`;

/**
 * Open the Generate Documentation modal from the collection context menu and wait until
 * every fixture environment row has rendered, so selection/count assertions are stable.
 */
const openDocsModalWithEnvironments = async (page: Page) => {
  const locators = buildCommonLocators(page);

  await locators.sidebar.collection(COLLECTION_NAME).hover();
  await locators.actions.collectionActions(COLLECTION_NAME).click();
  await locators.generateDocs.menuItem().click();

  const modal = locators.generateDocs.modal();
  await expect(modal).toBeVisible();
  await expect(locators.generateDocs.environmentRows()).toHaveCount(EXPECTED_ENVIRONMENTS.length);

  return { locators, modal };
};

test.describe('Generate Documentation', () => {
  test('orders generated docs to match the sidebar tree (folders by seq, then requests by seq, recursively)', async ({
    pageWithUserData: page
  }) => {
    let generatedTree: NameTree[] = [];
    await test.step('Generate documentation and read the embedded collection order', async () => {
      const { content, fileName } = await generateCollectionDocs(page, COLLECTION_NAME);
      expect(fileName).toBe('GenerateDocsOrder-documentation.html');
      generatedTree = parseGeneratedDocs(content);
    });

    await test.step('Generated docs follow the sidebar order at every depth', async () => {
      expect(generatedTree).toEqual(EXPECTED_ORDER);
    });

    await test.step('The order also matches what the sidebar actually renders', async () => {
      const sidebarStructure = await getCollectionTreeStructure(page, COLLECTION_NAME);
      const sidebarTree = sidebarItemsToNameTree(sidebarStructure.items);

      expect(sidebarTree).toEqual(EXPECTED_ORDER);
      expect(generatedTree).toEqual(sidebarTree);
    });
  });

  test('shows the Generate Documentation modal from the collection context menu', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await locators.sidebar.collection(COLLECTION_NAME).hover();
    await locators.actions.collectionActions(COLLECTION_NAME).click();
    await locators.generateDocs.menuItem().click();

    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible();
    await expect(locators.generateDocs.heading()).toBeVisible();
    await expect(locators.generateDocs.generateButton()).toBeEnabled();

    // Cancel so the test leaves no download behind.
    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('shows the current collection version formatted as a v-prefixed semver', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await locators.sidebar.collection(COLLECTION_NAME).hover();
    await locators.actions.collectionActions(COLLECTION_NAME).click();
    await locators.generateDocs.menuItem().click();

    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible();

    // The fixture's bruno.json version ("1") is normalised for display to "v1.0.0".
    await expect(locators.generateDocs.versionInfo()).toContainText('Collection Version:');
    await expect(locators.generateDocs.versionValue()).toHaveText('v1.0.0');

    // The fixture has 2 folders (Zoo, Aviary) and 5 requests (Lion, Bear, Parrot,
    // ReqAlpha, ReqBeta), counted recursively across the whole tree.
    await expect(locators.generateDocs.versionCounts()).toHaveText('2 Folders • 5 requests');

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('lists every environment under "Environments to include", all selected by default', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await locators.sidebar.collection(COLLECTION_NAME).hover();
    await locators.actions.collectionActions(COLLECTION_NAME).click();
    await locators.generateDocs.menuItem().click();

    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible();
    await expect(locators.generateDocs.environmentsTitle()).toBeVisible();

    for (const name of EXPECTED_ENVIRONMENTS) {
      await expect(locators.generateDocs.environmentRow(name)).toBeVisible();
      await expect(locators.generateDocs.environmentCheckbox(name)).toBeChecked();
    }

    // Exactly the fixture's environments are listed — nothing more.
    await expect(locators.generateDocs.environmentRows()).toHaveCount(EXPECTED_ENVIRONMENTS.length);

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('includes every environment in the generated docs by default', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    // Ensure all environments have loaded (and stay checked) before generating.
    const { content } = await generateCollectionDocs(page, COLLECTION_NAME, async () => {
      for (const name of EXPECTED_ENVIRONMENTS) {
        await expect(locators.generateDocs.environmentCheckbox(name)).toBeChecked();
      }
    });

    expect(generatedEnvironmentNames(content).sort()).toEqual([...EXPECTED_ENVIRONMENTS].sort());
  });

  test('excludes a deselected environment from the generated docs', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    const { content } = await generateCollectionDocs(page, COLLECTION_NAME, async () => {
      // Wait for all environments to load, then deselect a single one.
      for (const name of EXPECTED_ENVIRONMENTS) {
        await expect(locators.generateDocs.environmentCheckbox(name)).toBeChecked();
      }
      await locators.generateDocs.environmentCheckbox('Development').uncheck();
      await expect(locators.generateDocs.environmentCheckbox('Development')).not.toBeChecked();
    });

    const envNames = generatedEnvironmentNames(content);
    expect(envNames).toContain('Production');
    expect(envNames).toContain('Staging');
    expect(envNames).not.toContain('Development');
  });

  test('checks "Select All" and shows a full count when every environment is selected by default', async ({
    pageWithUserData: page
  }) => {
    const { locators, modal } = await openDocsModalWithEnvironments(page);

    await expect(locators.generateDocs.selectAllLabel()).toContainText('Select All');
    await expect(locators.generateDocs.selectAllCheckbox()).toBeChecked();
    await expect(locators.generateDocs.selectedCount()).toHaveText(
      selectedCountText(EXPECTED_ENVIRONMENTS.length)
    );

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('shows "Select All" as indeterminate with a partial count when one environment is deselected', async ({
    pageWithUserData: page
  }) => {
    const { locators, modal } = await openDocsModalWithEnvironments(page);

    await locators.generateDocs.environmentCheckbox('Development').uncheck();

    // Some-but-not-all selected -> tri-state checkbox shows the indeterminate state.
    await expect(locators.generateDocs.selectAllCheckbox()).toBeChecked({ indeterminate: true });
    await expect(locators.generateDocs.selectedCount()).toHaveText(
      selectedCountText(EXPECTED_ENVIRONMENTS.length - 1)
    );

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('clicking "Select All" deselects every environment, emptying the checkbox and count', async ({
    pageWithUserData: page
  }) => {
    const { locators, modal } = await openDocsModalWithEnvironments(page);
    await expect(locators.generateDocs.selectAllCheckbox()).toBeChecked();

    await locators.generateDocs.selectAllCheckbox().click();

    await expect(locators.generateDocs.selectAllCheckbox()).not.toBeChecked();
    await expect(locators.generateDocs.selectedCount()).toHaveText(selectedCountText(0));
    for (const name of EXPECTED_ENVIRONMENTS) {
      await expect(locators.generateDocs.environmentCheckbox(name)).not.toBeChecked();
    }

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('clicking "Select All" from a partial selection re-selects every environment', async ({
    pageWithUserData: page
  }) => {
    const { locators, modal } = await openDocsModalWithEnvironments(page);

    // Drop into the partial (indeterminate) state first.
    await locators.generateDocs.environmentCheckbox('Development').uncheck();
    await expect(locators.generateDocs.selectAllCheckbox()).toBeChecked({ indeterminate: true });

    // Clicking the tri-state checkbox while partial selects everything.
    await locators.generateDocs.selectAllCheckbox().click();

    await expect(locators.generateDocs.selectAllCheckbox()).toBeChecked();
    await expect(locators.generateDocs.selectedCount()).toHaveText(
      selectedCountText(EXPECTED_ENVIRONMENTS.length)
    );
    for (const name of EXPECTED_ENVIRONMENTS) {
      await expect(locators.generateDocs.environmentCheckbox(name)).toBeChecked();
    }

    await locators.generateDocs.cancelButton().click();
    await expect(modal).toBeHidden();
  });

  test('deselecting everything via "Select All" excludes all environments from the generated docs', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    const { content } = await generateCollectionDocs(page, COLLECTION_NAME, async () => {
      await expect(locators.generateDocs.environmentRows()).toHaveCount(EXPECTED_ENVIRONMENTS.length);
      await locators.generateDocs.selectAllCheckbox().click();
      await expect(locators.generateDocs.selectedCount()).toHaveText(selectedCountText(0));
    });

    expect(generatedEnvironmentNames(content)).toEqual([]);
  });
});
