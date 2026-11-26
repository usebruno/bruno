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
    ], 'https://link.usebruno.com/registry-waitlist'],
    ['API Catalog', ApiCatalogPage, 'catalog', 'Bruno API Catalog', 'Discover every public Bruno API collections', [
      'Indexed automatically from public GitHub repos',
      'Browse by API, company or category',
      'Preview a collection, then add it to your workspace'
    ], 'https://link.usebruno.com/catalog-waitlist']
  ])('shows the %s page and opens its waitlist in the browser', (_name, Page, feature, title, subtitle, points, waitlistUrl) => {
    renderPage(Page);
    const page = within(screen.getByTestId(`open-collection-early-access-${feature}`));

    expect(page.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(page.getByText(subtitle)).toBeInTheDocument();
    expect(page.getAllByRole('listitem').map((item) => item.textContent)).toEqual(points);

    expect(page.getAllByRole('button').map((button) => button.textContent)).toEqual(['Join waitlist']);

    fireEvent.click(page.getByRole('button', { name: 'Join waitlist' }));
    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith(waitlistUrl);
  });
});
