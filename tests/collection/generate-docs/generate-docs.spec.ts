import jsyaml from 'js-yaml';
import { test, expect } from '../../../playwright';
import { generateCollectionDocs } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import {
  getCollectionTreeStructure,
  waitForCollectionMount,
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

    await waitForCollectionMount(page, COLLECTION_NAME);

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
});
