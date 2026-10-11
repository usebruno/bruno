const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { parseRequest } = require('@usebruno/filestore');
const { importRequestFile, exportRequestFile } = require('./request-transfer');

jest.mock('electron', () => ({ dialog: {} }));
jest.mock('./constants', () => ({
  REQUEST_TYPES: ['http-request', 'graphql-request', 'grpc-request', 'ws-request']
}));

const source = `meta {
  name: Shared request
  type: http
  seq: 42
}

post {
  url: http://localhost:8081/ping
  body: json
  auth: none
}

headers {
  Content-Type: application/json
  ~X-Disabled: no
}

body:json {
  {"message": "hello"}
}

script:pre-request {
  bru.setVar('shared', 'yes');
}

tests {
  test('status', () => expect(res.status).to.equal(200));
}

docs {
  A request to share with teammates.
}
`;

describe('request file transfer', () => {
  let directory;
  let sourcePath;
  let targetDir;

  const exportPayload = () => {
    const request = parseRequest(source, { format: 'bru' });
    request.uid = 'r'.repeat(21);
    request.request.headers.forEach((header) => {
      header.uid = 'h'.repeat(21);
    });
    return request;
  };

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bruno-request-transfer-'));
    sourcePath = path.join(directory, 'shared.bru');
    targetDir = path.join(directory, 'target');
    await fs.mkdir(targetDir);
    await fs.writeFile(sourcePath, source);
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it.each(['bru', 'yml'])('imports into a %s collection and preserves request content', async (format) => {
    const result = await importRequestFile(sourcePath, targetDir, format, 3);
    const imported = parseRequest(await fs.readFile(result.pathname, 'utf8'), { format });
    const original = parseRequest(source, { format: 'bru' });
    expect(result.pathname).toBe(path.join(targetDir, `shared.${format}`));
    expect(imported.name).toBe(original.name);
    expect(imported.seq).toBe(3);
    expect(imported.request).toMatchObject(original.request);
  });

  it('keeps existing requests when filenames collide', async () => {
    const existingPath = path.join(targetDir, 'shared.bru');
    await fs.writeFile(existingPath, 'existing request');
    const result = await importRequestFile(sourcePath, targetDir, 'bru', 1);
    expect(result.pathname).not.toBe(existingPath);
    expect(await fs.readFile(existingPath, 'utf8')).toBe('existing request');
    expect(parseRequest(await fs.readFile(result.pathname, 'utf8'), { format: 'bru' }).name).toBe('Shared request');
  });

  it.each([
    'not a valid request {',
    'meta {\n  name: Environment\n}\nvars {\n  host: localhost\n}',
    'meta {\n  name: Folder\n  seq: 1\n}'
  ])('rejects invalid or non-request files without creating a file', async (content) => {
    await fs.writeFile(sourcePath, content);
    await expect(importRequestFile(sourcePath, targetDir, 'bru', 1)).rejects.toThrow();
    expect(await fs.readdir(targetDir)).toEqual([]);
  });

  it('rejects unsupported file extensions', async () => {
    await expect(importRequestFile(path.join(directory, 'request.json'), targetDir, 'bru', 1)).rejects.toThrow('.bru');
  });

  it('rejects methodless HTTP imports into bru collections without creating a file', async () => {
    const content = source.replace('post {', 'http {');
    const parsed = parseRequest(content, { format: 'bru' });
    expect(parsed.type).toBe('http-request');
    expect(parsed.request.method).toBe('');
    expect(parsed.request.url).toBe('http://localhost:8081/ping');
    await fs.writeFile(sourcePath, content);

    await expect(importRequestFile(sourcePath, targetDir, 'bru', 1)).rejects.toThrow('HTTP request method is required');
    expect(await fs.readdir(targetDir)).toEqual([]);
  });

  it('exports a request as a portable bru file', async () => {
    const request = exportPayload();
    const filePath = path.join(directory, 'exported.bru');
    await exportRequestFile(filePath, request);
    const exported = parseRequest(await fs.readFile(filePath, 'utf8'), { format: 'bru' });
    expect(exported).toEqual(parseRequest(source, { format: 'bru' }));
  });

  it.each([0, -1, '3', NaN, Infinity])('rejects invalid request sequence %s without creating a file', async (seq) => {
    await expect(importRequestFile(sourcePath, targetDir, 'yml', seq)).rejects.toThrow('positive integer');
    expect(await fs.readdir(targetDir)).toEqual([]);
  });

  it('rejects malformed exports without overwriting the destination', async () => {
    const request = exportPayload();
    delete request.request.method;
    const filePath = path.join(directory, 'exported.bru');
    await fs.writeFile(filePath, 'existing content');
    await expect(exportRequestFile(filePath, request)).rejects.toThrow('method');
    expect(await fs.readFile(filePath, 'utf8')).toBe('existing content');
  });
});
