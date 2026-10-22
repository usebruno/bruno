import { detectLabels } from './detectLabels';

const toBase64 = (str) => Buffer.from(str, 'latin1').toString('base64');
const ZPL = '^XA^FO50,50^ADN,36,20^FDHello^FS^XZ';
const PDF_BASE64 = toBase64('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n');

describe('detectLabels', () => {
  it('returns nothing for empty or missing input', () => {
    expect(detectLabels()).toEqual([]);
    expect(detectLabels({ data: '', dataBuffer: '' })).toEqual([]);
  });

  it('detects a PDF body from magic bytes', () => {
    expect(detectLabels({ data: '', dataBuffer: PDF_BASE64 })).toEqual([{ kind: 'pdf', content: PDF_BASE64 }]);
  });

  it('detects a ZPL text body', () => {
    expect(detectLabels({ data: ZPL, dataBuffer: toBase64(ZPL) })).toEqual([{ kind: 'zpl', content: ZPL }]);
  });

  it('splits a ZPL stream into one entry per label', () => {
    const stream = `${ZPL}\n${ZPL}`;
    expect(detectLabels({ data: stream })).toHaveLength(2);
  });

  it('detects ZPL in a JSON string value', () => {
    expect(detectLabels({ data: { shipment: { label: ZPL } } })).toEqual([{ kind: 'zpl', content: ZPL }]);
  });

  it('detects base64 ZPL and PDF inside JSON arrays', () => {
    const data = { labels: [{ content: toBase64(ZPL) }, { content: PDF_BASE64 }] };
    expect(detectLabels({ data })).toEqual([
      { kind: 'zpl', content: ZPL },
      { kind: 'pdf', content: PDF_BASE64 }
    ]);
  });

  it('detects labels in XML element text', () => {
    const xml = `<?xml version="1.0"?><Shipment><Label>${ZPL}</Label><Image>${PDF_BASE64}</Image><Other>${toBase64(ZPL)}</Other></Shipment>`;
    expect(detectLabels({ data: xml })).toEqual([
      { kind: 'zpl', content: ZPL },
      { kind: 'pdf', content: PDF_BASE64 },
      { kind: 'zpl', content: ZPL }
    ]);
  });

  it('detects base64 labels in CDATA and line-wrapped XML text', () => {
    const wrapped = PDF_BASE64.replace(/(.{20})/g, '$1&#13;\n');
    expect(detectLabels({ data: `<r><a><![CDATA[${PDF_BASE64}]]></a><b>\n  ${wrapped}\n</b></r>` })).toEqual([
      { kind: 'pdf', content: PDF_BASE64 },
      { kind: 'pdf', content: wrapped.replace(/&#13;/g, '').trim() }
    ]);
  });

  it('decodes named XML entities in ZPL text', () => {
    expect(detectLabels({ data: '<a><label>^XA^FDTom &amp; Jerry &lt;3^FS^XZ</label></a>' })).toEqual([
      { kind: 'zpl', content: '^XA^FDTom & Jerry <3^FS^XZ' }
    ]);
  });

  it('decodes numeric entities in ZPL text but drops carriage returns', () => {
    const xml = '<a><label>^XA^FDJos&#233; &#x4F60;&#13;^FS^XZ</label></a>';
    expect(detectLabels({ data: xml })).toEqual([{ kind: 'zpl', content: '^XA^FDJosé 你^FS^XZ' }]);
  });

  it('drops numeric entities that are not valid code points without throwing', () => {
    const xml = '<a><label>^XA^FD&#1114112;&#xD800;&#0;ok^FS^XZ</label></a>';
    expect(detectLabels({ data: xml })).toEqual([{ kind: 'zpl', content: '^XA^FDok^FS^XZ' }]);
  });

  it('keeps entity text inside CDATA literal', () => {
    const xml = '<a><label><![CDATA[^XA^FDTom &amp; J&#233; &#13;^FS^XZ]]></label></a>';
    expect(detectLabels({ data: xml })).toEqual([{ kind: 'zpl', content: '^XA^FDTom &amp; J&#233; &#13;^FS^XZ' }]);
  });

  it('keeps markup characters inside CDATA as part of the label', () => {
    const xml = '<a><label><![CDATA[^XA^FD<b>bold</b>^FS^XZ]]></label></a>';
    expect(detectLabels({ data: xml })).toEqual([{ kind: 'zpl', content: '^XA^FD<b>bold</b>^FS^XZ' }]);
  });

  it('reads text that follows a CDATA section in the same element', () => {
    const xml = `<a><label><![CDATA[${ZPL}]]>${PDF_BASE64}</label></a>`;
    expect(detectLabels({ data: xml })).toEqual([
      { kind: 'zpl', content: ZPL },
      { kind: 'pdf', content: PDF_BASE64 }
    ]);
  });

  it('does not decode an entity twice', () => {
    const xml = '<a><label>^XA^FDa &amp;#233; b^FS^XZ</label></a>';
    expect(detectLabels({ data: xml })).toEqual([{ kind: 'zpl', content: '^XA^FDa &#233; b^FS^XZ' }]);
  });

  it('keeps UTF-8 characters in base64 ZPL', () => {
    const zpl = '^XA^CI28^FDJosé Müller^FS^XZ';
    const encoded = Buffer.from(zpl, 'utf8').toString('base64');
    expect(detectLabels({ data: { label: encoded } })).toEqual([{ kind: 'zpl', content: zpl }]);
  });

  it('detects base64 wrapped with spaces and indentation', () => {
    const wrapped = PDF_BASE64.replace(/(.{16})/g, '$1\n    ');
    expect(detectLabels({ data: { content: wrapped } })).toEqual([{ kind: 'pdf', content: wrapped }]);
  });

  it('ignores a long run of unterminated labels', () => {
    expect(detectLabels({ data: '^XA'.repeat(50000) })).toEqual([]);
  });

  it('ignores ordinary XML', () => {
    expect(detectLabels({ data: '<a><b>hello world, nothing to see here</b><c>12345</c></a>' })).toEqual([]);
  });

  it('ignores ordinary JSON and text', () => {
    expect(detectLabels({ data: { id: 1, name: 'abc', token: toBase64('just some plain text here') } })).toEqual([]);
    expect(detectLabels({ data: 'plain text with ^XA but no end' })).toEqual([]);
  });

  it('does not scan past the depth limit', () => {
    let nested = { label: ZPL };
    for (let i = 0; i < 10; i++) nested = { next: nested };
    expect(detectLabels({ data: nested })).toEqual([]);
  });
});
