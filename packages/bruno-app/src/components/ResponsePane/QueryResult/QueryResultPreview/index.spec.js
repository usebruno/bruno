import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import darkTheme from 'themes/dark/dark';
import QueryResultPreview from './index';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({ app: { preferences: {} } })
}));
jest.mock('react-pdf', () => ({ Document: () => null, Page: () => null }));
jest.mock('pdfjs-dist/build/pdf.worker', () => ({}));
jest.mock('pdfjs-dist/build/pdf', () => ({ GlobalWorkerOptions: {} }));
jest.mock('react-pdf/dist/esm/Page/AnnotationLayer.css', () => ({}));
jest.mock('react-pdf/dist/esm/Page/TextLayer.css', () => ({}));
jest.mock('components/CodeEditor/index', () => () => null);
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({}));
jest.mock('utils/codemirror/linkClickHandler', () => ({ resolveLinkClickHandler: () => undefined }));

const BOUNDARY = 'MIMEBoundary_6dede28bbb936f74e760b0f330c8d24abbf13537c40601ce';

describe('QueryResultPreview', () => {
  it('passes the response Content-Type, not the detected type, to the XML preview', () => {
    // An XML attachment precedes the SOAP root, so only the start parameter finds the envelope
    const data = [
      'preamble',
      `--${BOUNDARY}`,
      'Content-Type: text/xml',
      'Content-ID: <attachment@example.com>',
      '',
      '<attachment>not the root</attachment>',
      `--${BOUNDARY}`,
      'Content-Type: application/xop+xml; charset=utf-8; type="text/xml"',
      'Content-ID: <root@example.com>',
      '',
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body/></soapenv:Envelope>',
      `--${BOUNDARY}--`
    ].join('\r\n');

    render(
      <ThemeProvider theme={darkTheme}>
        <QueryResultPreview
          selectedTab="preview"
          previewMode="preview-xml"
          data={data}
          item={{ uid: 'request-1' }}
          collection={{ uid: 'collection-1' }}
          contentType="text/plain"
          responseContentType={`multipart/related; type="application/xop+xml"; boundary="${BOUNDARY}"; start="<root@example.com>"`}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('soapenv:Envelope')).toBeInTheDocument();
    expect(screen.queryByText('attachment')).not.toBeInTheDocument();
  });
});
