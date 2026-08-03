import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('XmlPreview', () => {
  describe('valid XML', () => {
    it('renders an XML response whose root element is named <error>', () => {
      const xml = `<error xmlns="http://docs.oasis-open.org/odata/ns/metadata">
        <code>Unauthorized</code>
        <message>The credentials provided are incorrect</message>
      </error>`;

      renderXmlPreview(xml);

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.getByText('The credentials provided are incorrect')).toBeInTheDocument();
    });

    it('renders an <error> element nested inside a successful response', () => {
      renderXmlPreview('<response><status>ok</status><error>none</error></response>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('ok')).toBeInTheDocument();
      expect(screen.getByText('none')).toBeInTheDocument();
    });

    it('renders an <error> root whose only content is text', () => {
      renderXmlPreview('<error>Something went wrong</error>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders an ordinary XML response', () => {
      renderXmlPreview('<user><name>Bob</name><age>42</age></user>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders XML with an XML declaration', () => {
      renderXmlPreview(`<?xml version="1.0" encoding="UTF-8"?>
<user>
  <name>Bob</name>
</user>`);

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders element attributes alongside text content', () => {
      renderXmlPreview('<fault code="500" retryable="">upstream timed out</fault>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('_code')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('_text')).toBeInTheDocument();
      expect(screen.getByText('upstream timed out')).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
    });

    it('renders multiple attributes', () => {
      renderXmlPreview('<fault code="500" retryable="true" source="gateway">failed</fault>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('_code')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('_retryable')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
      expect(screen.getByText('_source')).toBeInTheDocument();
      expect(screen.getByText('gateway')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });

    it('renders attributes together with child elements', () => {
      renderXmlPreview('<user id="1"><name>Bob</name></user>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('_id')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('groups repeated sibling elements into a counted array node', () => {
      renderXmlPreview('<errors><error>first</error><error>second</error></errors>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('[2]')).toBeInTheDocument();
      expect(screen.getByText('first')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();
    });

    it('renders namespace-prefixed XML elements', () => {
      renderXmlPreview(`
        <soap:Fault xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:faultcode>soap:Client</soap:faultcode>
          <soap:faultstring>Unauthorized</soap:faultstring>
        </soap:Fault>
      `);

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('soap:Client')).toBeInTheDocument();
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });

    it('renders escaped XML entities', () => {
      renderXmlPreview('<message>Tom &amp; Jerry &lt;3</message>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Tom & Jerry <3')).toBeInTheDocument();
    });

    it('renders unicode characters', () => {
      renderXmlPreview('<message>こんにちは 🚀 नमस्ते</message>');

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('こんにちは 🚀 नमस्ते')).toBeInTheDocument();
    });

    it('ignores XML comments', () => {
      renderXmlPreview(`
        <!-- comment -->
        <user>
          <name>Bob</name>
        </user>
      `);

      expect(screen.queryByText(CANNOT_PREVIEW_TITLE)).not.toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  describe('invalid XML', () => {
    it('shows the cannot-preview banner for non-XML text', () => {
      renderXmlPreview('this is not xml at all');

      expect(screen.getByText(CANNOT_PREVIEW_TITLE)).toBeInTheDocument();
      expect(screen.getByText(PARSE_ERROR_MESSAGE)).toBeInTheDocument();
    });

    it('shows the cannot-preview banner for malformed XML with an unclosed tag', () => {
      renderXmlPreview('<user><name>Bob</name>');

      expect(screen.getByText(CANNOT_PREVIEW_TITLE)).toBeInTheDocument();
      expect(screen.getByText(PARSE_ERROR_MESSAGE)).toBeInTheDocument();
    });

    it('shows the cannot-preview banner for an empty response body', () => {
      renderXmlPreview('');

      expect(screen.getByText(CANNOT_PREVIEW_TITLE)).toBeInTheDocument();
      expect(screen.getByText(PARSE_ERROR_MESSAGE)).toBeInTheDocument();
    });

    it('shows the cannot-preview banner when data is not a string', () => {
      renderXmlPreview({ not: 'a string' });

      expect(screen.getByText(CANNOT_PREVIEW_TITLE)).toBeInTheDocument();
      expect(screen.getByText(INVALID_INPUT_MESSAGE)).toBeInTheDocument();
    });

    it.each([
      ['undefined', undefined],
      ['null', null]
    ])('shows the cannot-preview banner when data is %s', (_label, data) => {
      renderXmlPreview(data);

      expect(screen.getByText(CANNOT_PREVIEW_TITLE)).toBeInTheDocument();
      expect(screen.getByText(INVALID_INPUT_MESSAGE)).toBeInTheDocument();
    });
  });
});
