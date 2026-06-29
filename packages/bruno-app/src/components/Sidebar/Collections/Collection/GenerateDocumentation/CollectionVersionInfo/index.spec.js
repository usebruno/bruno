import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CollectionVersionInfo from './index';

describe('CollectionVersionInfo', () => {
  it('shows the raw collection version with a "version :" prefix and no "v"/semver formatting', () => {
    render(<CollectionVersionInfo name="Hotel Booking API" version="1" />);
    expect(screen.getByTestId('version-value')).toHaveTextContent('version : 1');
  });

  it('shows whatever version string the collection has, unchanged', () => {
    render(<CollectionVersionInfo name="API" version="2.3-beta" />);
    expect(screen.getByTestId('version-value')).toHaveTextContent('version : 2.3-beta');
  });

  it('omits the version when the collection has none', () => {
    render(<CollectionVersionInfo name="API" />);
    expect(screen.queryByTestId('version-value')).not.toBeInTheDocument();
  });

  it('renders folder and request counts and pluralizes them', () => {
    const { rerender } = render(<CollectionVersionInfo name="API" folderCount={2} requestCount={5} environmentCount={3} />);
    expect(screen.getByTestId('version-summary')).toHaveTextContent('2 Folders');
    expect(screen.getByTestId('version-summary')).toHaveTextContent('5 requests');

    rerender(<CollectionVersionInfo name="API" folderCount={1} requestCount={1} environmentCount={3} />);
    expect(screen.getByTestId('version-summary')).toHaveTextContent('1 Folder');
    expect(screen.getByTestId('version-summary')).toHaveTextContent('1 request');
  });

  it('shows "0 environments" only when there are no environments', () => {
    const { rerender } = render(<CollectionVersionInfo name="API" folderCount={0} requestCount={0} environmentCount={0} />);
    expect(screen.getByTestId('version-summary')).toHaveTextContent('0 environments');

    rerender(<CollectionVersionInfo name="API" folderCount={0} requestCount={0} environmentCount={2} />);
    expect(screen.getByTestId('version-summary')).not.toHaveTextContent('environments');
  });
});
