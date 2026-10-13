const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadIterationData, getIterationDataPreview } = require('./iteration-data');

describe('iteration-data', () => {
  let tmpDir;

  const writeDataFile = (name, content) => {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-iteration-data-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe('loadIterationData', () => {
    it('parses a csv file', async () => {
      const filePath = writeDataFile('users.csv', 'name,age\r\nalice,30\r\nbob,25\r\n');
      await expect(loadIterationData(filePath)).resolves.toEqual([
        { name: 'alice', age: '30' },
        { name: 'bob', age: '25' }
      ]);
    });

    it('parses a json file', async () => {
      const filePath = writeDataFile('users.json', '[{"name":"alice","age":30}]');
      await expect(loadIterationData(filePath)).resolves.toEqual([{ name: 'alice', age: 30 }]);
    });

    it('rejects when no path is given', async () => {
      await expect(loadIterationData('')).rejects.toThrow('No data file selected');
      await expect(loadIterationData(undefined)).rejects.toThrow('No data file selected');
    });

    it('rejects unsupported extensions', async () => {
      const filePath = writeDataFile('users.txt', 'name\nalice\n');
      await expect(loadIterationData(filePath)).rejects.toThrow('Unsupported data file "users.txt"');
    });

    it('rejects a file that cannot be read', async () => {
      await expect(loadIterationData(path.join(tmpDir, 'missing.csv'))).rejects.toThrow('Could not read data file "missing.csv"');
    });

    it('prefixes parse errors with the file name', async () => {
      const filePath = writeDataFile('broken.json', '{"not":"an array"}');
      await expect(loadIterationData(filePath)).rejects.toThrow('broken.json: Invalid JSON data file');
    });
  });

  describe('getIterationDataPreview', () => {
    it('returns the row count and every column seen across rows', async () => {
      const filePath = writeDataFile('users.json', '[{"name":"alice"},{"name":"bob","age":25}]');
      await expect(getIterationDataPreview(filePath)).resolves.toEqual({ rowCount: 2, columns: ['name', 'age'] });
    });
  });
});
