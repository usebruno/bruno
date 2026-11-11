import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import RegistryPage from '../../sidebar/RegistryPage';
import ApiCatalogPage from '../../sidebar/ApiCatalogPage';

const renderPage = (Page) =>
  render(
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  );

describe('early access pages', () => {
  beforeEach(() => {
    window.ipcRenderer = { send: jest.fn(), openExternal: jest.fn() };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it.each([
    ['Registry', RegistryPage, 'registry', 'Enterprise Private Registry', 'Release collections like packages, gated by your SSO', [
      'Publish a release or snapshot of any collection',
      'Testers, PMs and partners open it without git',
      'Runs on your premises, nothing leaves your network'
    ]],
    ['API Catalog', ApiCatalogPage, 'catalog', 'Bruno API Catalog', 'The public home for Bruno collections', [
      'List your API’s collection straight from its public repo',
      'Search collections by API, company or topic',
      'They open it in Bruno in one click and get your updates'
    ]]
  ])('shows the %s page and requests access in the browser', (_name, Page, feature, title, subtitle, points) => {
    renderPage(Page);
    const page = within(screen.getByTestId(`open-collection-early-access-${feature}`));

    expect(page.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(page.getByText(subtitle)).toBeInTheDocument();
    expect(page.getAllByRole('listitem').map((item) => item.textContent)).toEqual(points);

    fireEvent.click(page.getByRole('button', { name: 'Request early access' }));

    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`\\?feature=${feature}$`)));
  });
});
