import { Page } from '../../../../playwright';

// Locators for the collection settings Overview info column.
export const buildCollectionOverviewLocators = (page: Page) => {
  const overviewInfo = page.getByTestId('collection-settings-content').locator('.col-span-2');

  const row = (label: string) =>
    overviewInfo.locator('.flex.items-start').filter({
      has: page.locator('.font-medium').getByText(label, { exact: true })
    });

  return {
    locationLabel: () => row('Location').locator('.font-medium').getByText('Location', { exact: true }),
    collectionLocation: () => row('Location').locator('.break-all'),
    environmentsLabel: () => row('Environments').locator('.font-medium').getByText('Environments', { exact: true }),
    collectionEnvironmentCount: () => row('Environments').getByRole('button', { name: /collection environment/ }),
    globalEnvironmentCount: () => row('Environments').getByRole('button', { name: /global environment/ }),
    requestsLabel: () => row('Requests').locator('.font-medium').getByText('Requests', { exact: true }),
    requestCount: () => row('Requests').locator('.text-muted'),
    shareLabel: () => row('Share').locator('.font-medium').getByText('Share', { exact: true }),
    shareCollection: () => row('Share').getByText('Share Collection', { exact: true }),
    documentationLabel: () => row('Documentation').locator('.font-medium').getByText('Documentation', { exact: true }),
    generateDocs: () => row('Documentation').getByText('Generate Docs', { exact: true })
  };
};
