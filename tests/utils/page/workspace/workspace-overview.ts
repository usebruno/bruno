import { Page } from '../../../../playwright';

export const buildWorkspaceOverviewLocators = (page: Page) => {
  const collectionCard = (collectionName: string) =>
    page.locator('.collection-card').filter({ hasText: collectionName });

  return {
    collectionCard,
    collectionCardMenu: (collectionName: string) => collectionCard(collectionName).locator('.collection-menu'),
    collectionCardMenuItems: (collectionName: string) => collectionCard(collectionName).locator('.dropdown-item')
  };
};
