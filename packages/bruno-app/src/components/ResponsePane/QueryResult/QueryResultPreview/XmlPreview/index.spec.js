import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import XmlPreview from './index';

const CANNOT_PREVIEW_TITLE = 'Cannot preview as XML';
const PARSE_ERROR_MESSAGE = 'Failed to parse XML string. Invalid XML format.';
const INVALID_INPUT_MESSAGE = 'Invalid input. Expected an XML string.';

const renderXmlPreview = (data) =>
  render(
    <ThemeProvider theme={darkTheme}>
      <XmlPreview data={data} />
    </ThemeProvider>
  );

// Asserts the strings render as one ErrorBanner entry's title/message pair
// and that no tree is rendered beside the banner.
const expectErrorBanner = (title, message) => {
  const entry = within(screen.getByTestId('error-banner')).getByTestId('error-banner-entry');

  expect(within(entry).getByTestId('error-banner-title')).toHaveTextContent(title);
  expect(within(entry).getByTestId('error-banner-message')).toHaveTextContent(message);
  expect(screen.queryByTestId('xml-tree')).not.toBeInTheDocument();
};

describe('XmlPreview', () => {
  describe('valid XML', () => {
    it('renders an XML response whose root element is named <error>', () => {
      const xml = `<error xmlns="http://docs.oasis-open.org/odata/ns/metadata">
        <code>Unauthorized</code>
        <message>The credentials provided are incorrect</message>
      </error>`;

      renderXmlPreview(xml);

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.getByText('The credentials provided are incorrect')).toBeInTheDocument();
    });

    it('renders an <error> element nested inside a successful response', () => {
      renderXmlPreview('<response><status>ok</status><error>none</error></response>');
      expect(screen.getByText('ok')).toBeInTheDocument();
      expect(screen.getByText('none')).toBeInTheDocument();
    });

    it('renders an <error> root whose only content is text', () => {
      renderXmlPreview('<error>Something went wrong</error>');
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders an ordinary XML response', () => {
      renderXmlPreview('<user><name>Bob</name><age>42</age></user>');

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('invalid XML', () => {
    it('shows the cannot-preview banner for non-XML text', () => {
      renderXmlPreview('this is not xml at all');

      expectErrorBanner(CANNOT_PREVIEW_TITLE, PARSE_ERROR_MESSAGE);
    });

    it('shows the cannot-preview banner for malformed XML with an unclosed tag', () => {
      renderXmlPreview('<user><name>Bob</name>');

      expectErrorBanner(CANNOT_PREVIEW_TITLE, PARSE_ERROR_MESSAGE);
    });

    it('shows the cannot-preview banner for an empty response body', () => {
      renderXmlPreview('');

      expectErrorBanner(CANNOT_PREVIEW_TITLE, PARSE_ERROR_MESSAGE);
    });

    it('shows the cannot-preview banner when data is not a string', () => {
      renderXmlPreview({ not: 'a string' });

      expectErrorBanner(CANNOT_PREVIEW_TITLE, INVALID_INPUT_MESSAGE);
    });
  });
});
