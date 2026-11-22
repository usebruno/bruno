import { Page } from '../../playwright';

export type EarlyAccessFeature = 'registry' | 'catalog';

export const buildEarlyAccessLocators = (page: Page, feature: EarlyAccessFeature) => {
  const teaser = () => page.getByTestId(`open-collection-early-access-${feature}`);

  return {
    teaser,
    title: () => teaser().getByRole('heading'),
    points: () => teaser().getByRole('listitem'),
    requestButton: () => page.getByTestId(`open-collection-early-access-request-${feature}`)
  };
};
