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
