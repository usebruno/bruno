const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const filestore = require('@usebruno/filestore');
const { readBruMetaFromStream, parseMetaBlock, parseMethodBlock } = require('../../src/services/stream-meta/bru');
const { readYmlMetaFromStream, parseInfoSlice } = require('../../src/services/stream-meta/yml');
const { readMetaFromFile } = require('../../src/services/stream-meta');

const bruRequest = `meta {
  name: Searchable
  type: http
  seq: 2
}

get {
  url: https://example.com/api
}

body:json {
  "huge": true
`;

const ymlRequest = `info:
  name: Searchable
  type: http
  seq: 2
http:
  method: GET
  url: https://example.com/api
  body:
    json: |
      line1
      line2
`;

describe('stream-meta bru', () => {
  it('parses meta and method blocks from a stream and stops before body', async () => {
    const stream = new PassThrough();
    const promise = readBruMetaFromStream(stream, 'request');
    stream.write(bruRequest);
    stream.end();

    const data = await promise;
    expect(data.name).toBe('Searchable');
    expect(data.type).toBe('http-request');
    expect(data.seq).toBe(2);
    expect(data.request.url).toBe('https://example.com/api');
    expect(data.request.method).toBe('GET');
  });

  it('parses complete meta block slices', () => {
    const meta = parseMetaBlock(`meta {
  name: Foo
  type: graphql
  seq: 1
}`);
    expect(meta.name).toBe('Foo');
    expect(meta.type).toBe('graphql-request');
  });

  it('matches full parser fields for a small bru file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-stream-meta-'));
    const file = path.join(dir, 'req.bru');
    const content = `meta {
  name: Compare
  type: http
  seq: 1
}

get {
  url: https://example.com/x
}
`;
    fs.writeFileSync(file, content);
    const streamed = await readMetaFromFile(file, { format: 'bru', type: 'request' });
    const full = filestore.parseRequest(content, { format: 'bru' });
    expect(streamed.name).toBe(full.name);
    expect(streamed.type).toBe(full.type);
    expect(streamed.request.url).toBe(full.request.url);
    expect(streamed.request.method).toBe(full.request.method);
  });
});

describe('stream-meta yml', () => {
  it('parses info and http keys from a stream', async () => {
    const stream = new PassThrough();
    const promise = readYmlMetaFromStream(stream, 'request');
    stream.write(ymlRequest);
    stream.end();

    const data = await promise;
    expect(data.name).toBe('Searchable');
    expect(data.type).toBe('http-request');
    expect(data.request.method).toBe('GET');
    expect(data.request.url).toBe('https://example.com/api');
  });

  it('parses a closed info slice', () => {
    const parsed = parseInfoSlice([
      'info:',
      '  name: Slice',
      '  type: http',
      '  seq: 3'
    ]);
    expect(parsed.name).toBe('Slice');
    expect(parsed.type).toBe('http-request');
    expect(parsed.seq).toBe(3);
  });

  it('matches full parser fields for a small yml file', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-stream-meta-'));
    const file = path.join(dir, 'req.yml');
    fs.writeFileSync(file, ymlRequest);
    const streamed = await readMetaFromFile(file, { format: 'yml', type: 'request' });
    const full = filestore.parseRequest(ymlRequest, { format: 'yml' });
    expect(streamed.name).toBe(full.name);
    expect(streamed.type).toBe(full.type);
    expect(streamed.request.url).toBe(full.request.url);
    expect(streamed.request.method).toBe(full.request.method);
  });
});

describe('stream-meta chunk boundaries', () => {
  it('parses bru meta when records are split across chunks', async () => {
    const content = `meta {
  name: Searchable
  type: http
  seq: 2
}

get {
  url: https://example.com/api
}
`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-stream-chunks-'));
    const file = path.join(dir, 'req.bru');
    fs.writeFileSync(file, content);
    const stream = fs.createReadStream(file, { highWaterMark: 8 });
    const data = await readBruMetaFromStream(stream, 'request');
    expect(data.name).toBe('Searchable');
    expect(data.request.url).toBe('https://example.com/api');
  });

  it('destroys the stream before EOF when meta is complete', async () => {
    const content = `${bruRequest}}\n`;
    const stream = new PassThrough();
    let ended = false;
    stream.on('end', () => {
      ended = true;
    });
    const destroySpy = jest.spyOn(stream, 'destroy');
    const promise = readBruMetaFromStream(stream, 'request');
    stream.end(content);
    const data = await promise;
    expect(data.name).toBe('Searchable');
    expect(destroySpy).toHaveBeenCalled();
    expect(ended).toBe(false);
    destroySpy.mockRestore();
  });
});
