const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeFileWithSuffix } = require('./write-file-with-suffix');

describe('writeFileWithSuffix', () => {
  let dirname;

  beforeEach(async () => {
    dirname = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-suffix-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(dirname, { recursive: true, force: true });
  });

  it('creates distinct files when saves with the same name run concurrently', async () => {
    const save = (content) => writeFileWithSuffix({
      dirname,
      basename: 'Login',
      extension: 'bru',
      createContent: async () => content
    });

    const results = await Promise.all([save('first'), save('second')]);
    const filenames = results.map((result) => result.filename).sort();
    const contents = await Promise.all(results.map((result) => fs.promises.readFile(result.pathname, 'utf8')));

    expect(filenames).toEqual(['Login (1).bru', 'Login.bru']);
    expect(contents.sort()).toEqual(['first', 'second']);
  });
});
