const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadGqlSchemaFile } = require('../../src/utils/graphql');

describe('loadGqlSchemaFile', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-test-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should parse a valid JSON introspection file', () => {
    const filePath = path.join(tmpDir, 'valid-schema.json');
    const schemaData = { data: { __schema: { types: [] } } };
    fs.writeFileSync(filePath, JSON.stringify(schemaData), 'utf8');

    const result = loadGqlSchemaFile(filePath);
    expect(result).toEqual(schemaData);
  });

  it('should return raw string for valid SDL files', () => {
    const filePath = path.join(tmpDir, 'schema.graphql');
    const sdlContent = 'type Query { hello: String }';
    fs.writeFileSync(filePath, sdlContent, 'utf8');

    const result = loadGqlSchemaFile(filePath);
    expect(result).toBe(sdlContent);
  });

  it('should throw a clear error for binary files (e.g. PNG)', () => {
    const filePath = path.join(tmpDir, 'image.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));

    expect(() => loadGqlSchemaFile(filePath)).toThrow(
      'The file does not contain a valid GraphQL schema'
    );
  });

  it('should throw a clear error for HTML files', () => {
    const filePath = path.join(tmpDir, 'page.html');
    fs.writeFileSync(filePath, '<html><body>Not a schema</body></html>', 'utf8');

    expect(() => loadGqlSchemaFile(filePath)).toThrow(
      'The file does not contain a valid GraphQL schema'
    );
  });

  it('should throw a clear error for empty files', () => {
    const filePath = path.join(tmpDir, 'empty.json');
    fs.writeFileSync(filePath, '', 'utf8');

    expect(() => loadGqlSchemaFile(filePath)).toThrow(
      'The file does not contain a valid GraphQL schema'
    );
  });

  it('should throw a clear error when file does not exist', () => {
    const filePath = path.join(tmpDir, 'does-not-exist.json');

    expect(() => loadGqlSchemaFile(filePath)).toThrow('Unable to read file:');
  });

  it('should throw a clear error for CSV files', () => {
    const filePath = path.join(tmpDir, 'data.csv');
    fs.writeFileSync(filePath, 'name,value\nfoo,bar\n', 'utf8');

    expect(() => loadGqlSchemaFile(filePath)).toThrow(
      'The file does not contain a valid GraphQL schema'
    );
  });
});
