const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Jest cannot load this ESM package. Point spawn at the same binary the package exports.
jest.mock('@vscode/ripgrep-universal', () => {
  const path = require('node:path');
  const binary = process.platform === 'win32' ? 'rg.exe' : 'rg';
  return {
    rgPath: path.join(
      path.resolve(__dirname, '../../../../../node_modules/@vscode/ripgrep-universal'),
      'bin',
      `${process.platform}-${process.env.npm_config_arch || process.arch}`,
      binary
    )
  };
});

const writeRequest = (root, relativePath, name) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `meta {\n  name: ${name}\n}\n`);
};

describe('ripgrep process', () => {
  let root;
  let messages;
  let send;

  beforeEach(() => {
    jest.resetModules();
    messages = [];
    process.parentPort = {
      postMessage: (message) => messages.push(message),
      on: (event, handler) => {
        send = (data) => handler({ data });
      }
    };
    require('./ripgrep-process');
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-rg-'));
  });

  afterEach(() => {
    delete process.parentPort;
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  const search = async (data) => {
    send({ type: 'search', id: 1, roots: [root], query: 'hit', ...data });
    const start = Date.now();
    while (!messages.some((message) => message.type === 'done')) {
      if (Date.now() - start > 5000) throw new Error('ripgrep search did not finish');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return messages.filter((message) => message.type === 'batch').flatMap((message) => message.paths).sort();
  };

  it('skips folders listed in the collection ignore config', async () => {
    writeRequest(root, 'hit.bru', 'hit');
    writeRequest(root, path.join('ignored', 'hit.bru'), 'hit');
    writeRequest(root, path.join('nested', 'skip', 'hit.bru'), 'hit');

    const paths = await search({ ignore: { [root]: ['ignored', '**/skip/**'] } });

    expect(paths).toEqual(['hit.bru']);
  });

  it('skips requests in the collection-root mocks folder', async () => {
    writeRequest(root, 'hit.bru', 'hit');
    writeRequest(root, path.join('mocks', 'hit.bru'), 'hit');
    writeRequest(root, path.join('nested', 'mocks', 'hit.bru'), 'hit');

    const paths = await search({});

    expect(paths).toEqual(['hit.bru', path.join('nested', 'mocks', 'hit.bru')].sort());
  });

  it('searches every folder when the collection has no ignore config', async () => {
    writeRequest(root, 'hit.bru', 'hit');
    writeRequest(root, path.join('ignored', 'hit.bru'), 'hit');

    const paths = await search({});

    expect(paths).toEqual(['hit.bru', path.join('ignored', 'hit.bru')].sort());
  });
});
