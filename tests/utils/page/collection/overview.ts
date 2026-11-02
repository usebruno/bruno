import { Page } from '../../../../playwright';

// Locators for the collection settings Overview info column.
export const buildCollectionOverviewLocators = (page: Page) => {
  return {
    locationLabel: () => page.getByTestId('info-location-label'),
    collectionLocation: () => page.getByTestId('info-location-value'),
    environmentsLabel: () => page.getByTestId('info-environments-label'),
    collectionEnvironmentCount: () => page.getByTestId('info-collection-environment-count'),
    globalEnvironmentCount: () => page.getByTestId('info-global-environment-count'),
    requestsLabel: () => page.getByTestId('info-requests-label'),
    requestCount: () => page.getByTestId('info-request-count'),
    shareLabel: () => page.getByTestId('info-share-label'),
    shareCollection: () => page.getByTestId('info-share-collection'),
    documentationLabel: () => page.getByTestId('info-documentation-label'),
    generateDocs: () => page.getByTestId('info-generate-docs')
  };
};
