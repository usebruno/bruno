import { Page } from '../../playwright';

type StartLink = 'overview' | 'open-or-import' | 'import' | 'open' | 'clone';
type CreateButton = 'http' | 'graphql' | 'grpc' | 'ws' | 'workspace' | 'collection' | 'environment' | 'api-spec' | 'mock-server';

export const buildStartPageLocators = (page: Page) => ({
  root: () => page.getByTestId('start-page'),
  link: (id: StartLink) => page.getByTestId(`start-page-${id}`),
  createButton: (id: CreateButton) => page.getByTestId(`start-page-new-${id}`)
});
