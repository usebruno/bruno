import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CollectionVersionInfo from './index';

describe('CollectionVersionInfo', () => {
  describe('collection name', () => {
    it('renders the collection name in the collection-name slot', () => {
      render(<CollectionVersionInfo name="Hotel Booking API" version="1.2.0" />);
      expect(screen.getByTestId('collection-name')).toHaveTextContent('Hotel Booking API');
    });

    it('keeps the name and the version in separate slots', () => {
      render(<CollectionVersionInfo name="Hotel Booking API" version="1.2.0" />);

      const nameSlot = screen.getByTestId('collection-name');
      const versionSlot = screen.getByTestId('version-value');

      // Name lives only in the name slot, version only in the version slot.
      expect(nameSlot).toHaveTextContent('Hotel Booking API');
      expect(nameSlot).not.toHaveTextContent('v1.2.0');
      expect(versionSlot).toHaveTextContent('v1.2.0');
      expect(versionSlot).not.toHaveTextContent('Hotel Booking API');
    });
  });

  describe('version formatting', () => {
    it('renders a full semver with a v prefix', () => {
      render(<CollectionVersionInfo name="API" version="1.2.0" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v1.2.0');
    });

    it('coerces a bare major version to major.minor.patch', () => {
      render(<CollectionVersionInfo name="API" version="1" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v1.0.0');
    });

    it('coerces a partial major.minor version to major.minor.patch', () => {
      render(<CollectionVersionInfo name="API" version="2.1" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v2.1.0');
    });

    it('does not double-prefix an already v-prefixed version', () => {
      render(<CollectionVersionInfo name="API" version="v1.2.0" />);
      const versionSlot = screen.getByTestId('version-value');
      expect(versionSlot).toHaveTextContent('v1.2.0');
      expect(versionSlot).not.toHaveTextContent('vv');
    });

    it('preserves a pre-release suffix', () => {
      render(<CollectionVersionInfo name="API" version="1.0.0-beta" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v1.0.0-beta');
    });

    it('falls back to the default version when unset', () => {
      render(<CollectionVersionInfo name="API" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v1.0.0');
    });

    it('falls back to the default version when unparseable', () => {
      render(<CollectionVersionInfo name="API" version="not-a-version" />);
      expect(screen.getByTestId('version-value')).toHaveTextContent('v1.0.0');
    });
  });

  describe('content summary', () => {
    it('pluralises folder and request counts', () => {
      render(<CollectionVersionInfo name="API" version="1.0.0" folderCount={2} requestCount={5} />);
      // Exact-match each count span so a singular/plural regression is caught.
      expect(screen.getByText('2 Folders')).toBeInTheDocument();
      expect(screen.getByText('5 requests')).toBeInTheDocument();
    });

    it('uses singular labels for a single folder and request', () => {
      render(<CollectionVersionInfo name="API" version="1.0.0" folderCount={1} requestCount={1} />);
      expect(screen.getByText('1 Folder')).toBeInTheDocument();
      expect(screen.getByText('1 request')).toBeInTheDocument();
    });

    it('defaults the counts to zero', () => {
      render(<CollectionVersionInfo name="API" version="1.0.0" />);
      expect(screen.getByText('0 Folders')).toBeInTheDocument();
      expect(screen.getByText('0 requests')).toBeInTheDocument();
    });

    it('renders the separator as an aria-hidden decorative dot', () => {
      const { container } = render(
        <CollectionVersionInfo name="API" version="1.0.0" folderCount={2} requestCount={5} />
      );
      const dot = container.querySelector('.version-dot');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveAttribute('aria-hidden', 'true');
      // Decorative only — carries no text.
      expect(dot).toHaveTextContent('');
    });
  });
});
