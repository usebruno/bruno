import { test, expect } from '../../../playwright';
import { EarlyAccessFeature, buildEarlyAccessLocators } from '../../../pages/open-collection-modal/early-access';
import {
  OpenCollectionPageId,
  closeOpenCollectionModal,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';

type EarlyAccessPage = {
  pageId: OpenCollectionPageId;
  pageTitle: string;
  feature: EarlyAccessFeature;
  title: string;
  subtitle: string;
  points: string[];
};

const EARLY_ACCESS_PAGES: EarlyAccessPage[] = [
  {
    pageId: 'registry',
    pageTitle: 'Registry',
    feature: 'registry',
    title: 'Enterprise Private Registry',
    subtitle: 'Release collections like packages, gated by your SSO',
    points: [
      'Publish a release or snapshot of any collection',
      'Testers, PMs and partners open it without git',
      'Runs on your premises, nothing leaves your network'
    ]
  },
  {
    pageId: 'api-catalog',
    pageTitle: 'API Catalog',
    feature: 'catalog',
    title: 'Bruno API Catalog',
    subtitle: 'The public home for Bruno collections',
    points: [
      'List your API’s collection straight from its public repo',
      'Search collections by API, company or topic',
      'They open it in Bruno in one click and get your updates'
    ]
  }
];

test.describe('Open collection modal early access pages', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
  });

  for (const earlyAccessPage of EARLY_ACCESS_PAGES) {
    test(`${earlyAccessPage.pageTitle} shows the ${earlyAccessPage.title} teaser`, async ({ pageWithUserData: page }) => {
      const earlyAccess = buildEarlyAccessLocators(page, earlyAccessPage.feature);

      await test.step(`Show the ${earlyAccessPage.pageTitle} page`, async () => {
        await showOpenCollectionModal(page, earlyAccessPage.pageId);
      });

      await test.step('Verify the teaser describes the feature', async () => {
        await expect(earlyAccess.title()).toHaveText(earlyAccessPage.title);
        await expect(earlyAccess.teaser()).toContainText(earlyAccessPage.subtitle);
        await expect(earlyAccess.points()).toHaveText(earlyAccessPage.points);
      });

      await test.step('Verify the request early access button is visible and enabled', async () => {
        await expect(earlyAccess.requestButton()).toBeVisible();
        await expect(earlyAccess.requestButton()).toBeEnabled();
        await expect(earlyAccess.requestButton()).toHaveText('Request early access');
      });
    });
  }
});
