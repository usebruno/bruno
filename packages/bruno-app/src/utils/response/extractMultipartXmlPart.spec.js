import { extractMultipartXmlPart } from './index';

const BOUNDARY = 'MIMEBoundary_6dede28bbb936f74e760b0f330c8d24abbf13537c40601ce';
const ENVELOPE = '<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><ns:id>42</ns:id></soapenv:Body></soapenv:Envelope>';

const mtomBody = ({ eol = '\r\n', blankLine = true } = {}) =>
  [
    `--${BOUNDARY}`,
    'Content-Type: application/xop+xml; charset=utf-8; type="text/xml"',
    'Content-Transfer-Encoding: binary',
    'Content-ID: <0.1dede28bbb936f74e760b0f330c8d24abbf13537c40601ce@apache.org>',
    ...(blankLine ? [''] : []),
    ENVELOPE,
    `--${BOUNDARY}`,
    'Content-Type: application/octet-stream',
    'Content-Transfer-Encoding: binary',
    'Content-ID: <1.attachment@apache.org>',
    '',
    'not xml',
    `--${BOUNDARY}--`,
    ''
  ].join(eol);

describe('extractMultipartXmlPart', () => {
  it('returns the XML root part of an MTOM/XOP response', () => {
    expect(extractMultipartXmlPart(mtomBody())).toBe(ENVELOPE);
  });

  it('accepts LF line endings', () => {
    expect(extractMultipartXmlPart(mtomBody({ eol: '\n' }))).toBe(ENVELOPE);
  });

  it('accepts a part without a blank line after its headers', () => {
    expect(extractMultipartXmlPart(mtomBody({ blankLine: false }))).toBe(ENVELOPE);
  });

  it('keeps namespaced XML lines that look like headers in the part body', () => {
    const body = [`--${BOUNDARY}`, 'Content-Type: text/xml', '', '<a:root xmlns:a="urn:a">', '<a:x>1</a:x>', '</a:root>', `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBe('<a:root xmlns:a="urn:a">\n<a:x>1</a:x>\n</a:root>');
  });

  it('ignores boundary text that is not at the start of a delimiter line', () => {
    const xml = [`<root><ref>see --${BOUNDARY}</ref>`, `--${BOUNDARY}-suffix`, `--${BOUNDARY}--suffix`, '</root>'].join('\r\n');
    const body = [`--${BOUNDARY}`, 'Content-Type: text/xml', '', xml, `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBe(xml.replace(/\r\n/g, '\n'));
  });

  it('uses the boundary from the Content-Type and ignores a preamble', () => {
    const body = ['This is a multi-part message in MIME format.', `--${BOUNDARY}`, 'Content-Type: text/xml', '', '<root/>', `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBeNull();
    expect(extractMultipartXmlPart(body, `multipart/related; type="text/xml"; boundary="${BOUNDARY}"`)).toBe('<root/>');
  });

  it('selects the root part named by the start parameter', () => {
    const body = [
      `--${BOUNDARY}`,
      'Content-Type: text/xml',
      'Content-ID: <attachment@example.com>',
      '',
      '<attachment/>',
      `--${BOUNDARY}`,
      'Content-Type: application/xop+xml; type="text/xml"',
      'Content-ID: <root@example.com>',
      '',
      '<envelope/>',
      `--${BOUNDARY}--`
    ].join('\r\n');
    const contentType = `multipart/related; type="application/xop+xml"; boundary="${BOUNDARY}"; start="<root@example.com>"; start-info="text/xml"`;

    expect(extractMultipartXmlPart(body, contentType)).toBe('<envelope/>');
    expect(extractMultipartXmlPart(body, `multipart/related; boundary=${BOUNDARY}`)).toBe('<attachment/>');
  });

  it('decodes a base64 transfer-encoded XML part', () => {
    const xml = '<root><name>Zoë</name></root>';
    const encoded = Buffer.from(xml, 'utf8').toString('base64');
    const body = [`--${BOUNDARY}`, 'Content-Type: text/xml; charset=utf-8', 'Content-Transfer-Encoding: base64', '', encoded.slice(0, 20), encoded.slice(20), `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBe(xml);
  });

  it('skips parts that are not XML', () => {
    const body = [`--${BOUNDARY}`, 'Content-Type: text/plain', '', 'hello', `--${BOUNDARY}`, 'Content-Type: application/soap+xml', '', '<root/>', `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBe('<root/>');
  });

  it('returns null when no part is XML', () => {
    const body = [`--${BOUNDARY}`, 'Content-Type: text/plain', '', '<root/>', `--${BOUNDARY}--`].join('\r\n');

    expect(extractMultipartXmlPart(body)).toBeNull();
  });

  it('returns null for bodies that are not multipart', () => {
    expect(extractMultipartXmlPart('<root/>')).toBeNull();
    expect(extractMultipartXmlPart('')).toBeNull();
    expect(extractMultipartXmlPart({ not: 'a string' })).toBeNull();
  });
});
