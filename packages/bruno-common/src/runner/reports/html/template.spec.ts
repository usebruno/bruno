import { generateHtmlReport } from './generate-report';
import htmlTemplateString, { getFilteredRequestResults } from './template';
import { isBinaryContentType, redactBinaryData } from '../../utils';
import vm from 'vm';

const readEmbeddedIterations = (html: string) => {
  const base64 = html.match(/decodeBase64\('([^']*)'\)/)?.[1];
  if (!base64) {
    throw new Error('The report did not embed its results as a base64 payload');
  }
  return JSON.parse(Buffer.from(base64, 'base64').toString()).results;
};

describe('getFilteredRequestResults', () => {
  it('preserves original request indexes when filtering failed results', () => {
    const results = [
      {
        path: '01-passing',
        status: 'pass',
        testResults: [{ description: 'status is 200', status: 'pass' }],
        assertionResults: []
      },
      {
        path: '02-failing',
        status: 'pass',
        testResults: [{ description: 'forced failure', status: 'fail' }],
        assertionResults: []
      }
    ];
    const ctx = vm.createContext({ results });
    vm.runInContext(`var fn = ${getFilteredRequestResults.toString()}`, ctx);

    const result = vm.runInContext('fn(results, true)', ctx);

    expect(result).toEqual([
      {
        value: results[1],
        index: 1
      }
    ]);
  });
});

describe('htmlTemplateString', () => {
  it('renders skipped requests off the request status, naming bail as the reason', () => {
    const template = htmlTemplateString('');

    expect(template).toContain('result.response.status === \'skipped\'');
    expect(template).toContain('result.skipReason === \'bail\' ? \'Request skipped due to bail\'');
  });
});

describe('generateHtmlReport', () => {
  it('keeps the skip reason, method and url of bail-skipped requests', () => {
    const bailSkippedResult = {
      path: 'Create User.yml',
      status: 'skipped',
      skipped: true,
      skipReason: 'bail',
      request: { method: 'POST', url: 'https://api.example.com/users' },
      response: { status: 'skipped', responseTime: 0 },
      runDuration: 0
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [bailSkippedResult], summary: { totalRequests: 1 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0]).toMatchObject({
      status: 'skipped',
      skipReason: 'bail',
      request: { method: 'POST', url: 'https://api.example.com/users' },
      response: { status: 'skipped' }
    });
  });

  it('redacts image response bodies to prevent bloating the report', () => {
    const imageResult = {
      path: 'Get Image.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/logo.png', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'image/png' },
        data: 'fake-png-binary-data'
      },
      runDuration: 0.1
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [imageResult], summary: { totalRequests: 1 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0].response.data).toBe('Response content redacted (image data)');
  });

  it('redacts binary PDF and archive responses to prevent garbled text and report bloat', () => {
    const pdfResult = {
      path: 'Download PDF.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/invoice.pdf', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
        data: '%PDF-1.4 binary content...'
      },
      runDuration: 0.2
    };

    const zipResult = {
      path: 'Download Zip.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/archive.zip', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'application/zip' },
        data: 'PK\x03\x04 binary zip data'
      },
      runDuration: 0.3
    };

    const protoResult = {
      path: 'Download Proto.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/data.pb', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'application/x-protobuf' },
        data: '\x08\x96\x01'
      },
      runDuration: 0.1
    };

    const parquetResult = {
      path: 'Download Parquet.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/data.parquet', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'application/vnd.apache.parquet' },
        data: 'PAR1-raw-parquet-binary'
      },
      runDuration: 0.15
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [pdfResult, zipResult, protoResult, parquetResult], summary: { totalRequests: 4 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0].response.data).toBe('Response content redacted (binary data)');
    expect(iteration.results[1].response.data).toBe('Response content redacted (binary data)');
    expect(iteration.results[2].response.data).toBe('Response content redacted (binary data)');
    expect(iteration.results[3].response.data).toBe('Response content redacted (binary data)');
  });

  it('redacts binary request bodies uploaded in requests', () => {
    const uploadResult = {
      path: 'Upload File.yml',
      status: 'pass',
      request: {
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: { 'content-type': 'application/octet-stream' },
        data: 'binary upload stream payload'
      },
      response: {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { success: true }
      },
      runDuration: 0.15
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [uploadResult], summary: { totalRequests: 1 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0].request.data).toBe('Response content redacted (binary data)');
    expect(iteration.results[0].response.data).toEqual({ success: true });
  });

  it('preserves text, JSON, XML, and SVG response bodies without redacting them', () => {
    const jsonResult = {
      path: 'Get JSON.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/users', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        data: { id: 1, name: 'Alice' }
      },
      runDuration: 0.1
    };

    const svgResult = {
      path: 'Get SVG.yml',
      status: 'pass',
      request: { method: 'GET', url: 'https://api.example.com/icon.svg', headers: {} },
      response: {
        status: 200,
        headers: { 'content-type': 'image/svg+xml' },
        data: '<svg><circle cx="50" cy="50" r="40"/></svg>'
      },
      runDuration: 0.1
    };

    const html = generateHtmlReport({
      runnerResults: [{ iterationIndex: 0, results: [jsonResult, svgResult], summary: { totalRequests: 2 } }] as any
    });
    const [iteration] = readEmbeddedIterations(html);

    expect(iteration.results[0].response.data).toEqual({ id: 1, name: 'Alice' });
    expect(iteration.results[1].response.data).toBe('<svg><circle cx="50" cy="50" r="40"/></svg>');
  });
});

describe('redactBinaryData & isBinaryContentType', () => {
  it('identifies binary media types accurately', () => {
    expect(isBinaryContentType('application/pdf')).toBe(true);
    expect(isBinaryContentType('application/zip')).toBe(true);
    expect(isBinaryContentType('application/octet-stream')).toBe(true);
    expect(isBinaryContentType('application/gzip')).toBe(true);
    expect(isBinaryContentType('image/png')).toBe(true);
    expect(isBinaryContentType('image/jpeg; charset=binary')).toBe(true);
    expect(isBinaryContentType('audio/mpeg')).toBe(true);
    expect(isBinaryContentType('video/mp4')).toBe(true);
    expect(isBinaryContentType('application/msword')).toBe(true);
    expect(isBinaryContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(isBinaryContentType('application/vnd.ms-excel')).toBe(true);
    expect(isBinaryContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
    expect(isBinaryContentType('application/wasm')).toBe(true);

    // Text and structured text formats must not be treated as binary
    expect(isBinaryContentType('application/json')).toBe(false);
    expect(isBinaryContentType('application/problem+json')).toBe(false);
    expect(isBinaryContentType('text/plain')).toBe(false);
    expect(isBinaryContentType('text/html; charset=utf-8')).toBe(false);
    expect(isBinaryContentType('application/xml')).toBe(false);
    expect(isBinaryContentType('image/svg+xml')).toBe(false);
  });

  it('redacts binary content while returning text and null values untouched', () => {
    expect(redactBinaryData('raw-bytes', 'application/pdf')).toBe('Response content redacted (binary data)');
    expect(redactBinaryData('raw-bytes', 'image/png')).toBe('Response content redacted (image data)');
    expect(redactBinaryData('{"hello":"world"}', 'application/json')).toBe('{"hello":"world"}');
    expect(redactBinaryData('<xml></xml>', 'application/xml')).toBe('<xml></xml>');
    expect(redactBinaryData('', 'application/pdf')).toBe('');
    expect(redactBinaryData(null as any, 'application/pdf')).toBe(null);
  });
});
