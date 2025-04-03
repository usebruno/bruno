// file.spec.js
import { parseFile, readFile, saveFile } from '../../src/common/file';
import path from 'path';
import fs from 'fs';

describe('File Operations', () => {
  const testDataDir = path.resolve(__dirname, '../data');
  const outputDir = path.resolve(__dirname, '../data/output');

  // Ensure the output directory exists
  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  });

  describe('parseFile Function', () => {
    it('should parse a valid JSON file', async () => {
      const filePath = path.resolve(testDataDir, 'valid_env.json');
      const data = await parseFile(filePath);
      expect(data.id).toEqual('some-id');
    });

    it('should parse a valid YAML file', async () => {
      const filePath = path.resolve(testDataDir, 'sample_openapi.yaml');
      const data = await parseFile(filePath);
      expect(data.openapi).toEqual('3.0.0');
    });

    it.skip('should throw an error for invalid JSON', async () => {
      const filePath = path.resolve(testDataDir, 'invalid_json_env.json');
      await expect(await parseFile(filePath)).rejects.toThrow();
    });

    it('should throw an error for unsupported file formats', async () => {
      const filePath = path.resolve(testDataDir, 'sample.txt');
      await expect(parseFile(filePath)).rejects.toThrow('Unsupported file format');
    });

    it('should handle file read errors', async () => {
      const filePath = path.resolve(testDataDir, 'nonexistent.json');
      await expect(parseFile(filePath)).rejects.toThrow();
    });
  });

  describe('readFile Function', () => {
    it('should read a file successfully', async () => {
      const filePath = path.resolve(testDataDir, 'sample.txt');
      const data = await readFile(filePath);
      expect(data).toBe('This is a sample text file.');
    });

    it('should throw an error when file does not exist', async () => {
      const filePath = path.resolve(testDataDir, 'nonexistent.txt');
      await expect(readFile(filePath)).rejects.toThrow();
    });
  });

  describe('saveFile Function', () => {
    const outputFilePath = path.resolve(outputDir, 'output.txt');

    afterEach(async () => {
      // Clean up: delete the output file after each test
      if (fs.existsSync(outputFilePath)) {
        await fs.unlinkSync(outputFilePath);
      }
    });

    it('should save data to a file successfully', async () => {
      const data = 'Hello, World!';
      await saveFile(data, outputFilePath);
      const savedData = fs.readFileSync(outputFilePath, 'utf8');
      expect(savedData).toBe(data);
    });

    it('should throw an error when unable to write to file', async () => {
      // Attempt to write to an invalid directory
      const invalidFilePath = path.resolve('/invalid_directory', 'output.txt');
      const data = 'Test data';
      await expect(saveFile(data, invalidFilePath)).rejects.toThrow();
    });
  });
});
