import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFolder, parseRequest } from '@usebruno/filestore';
import { importPostmanToBruno } from '../../src/io';

const PRE_REQUEST_SCRIPT = 'pm.environment.set("token", "abc");';

const postmanCollection = {
  info: {
    name: 'Imported Postman',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Users',
      item: [
        {
          name: 'Get Profile',
          event: [{ listen: 'prerequest', script: { exec: [PRE_REQUEST_SCRIPT] } }],
          request: { method: 'GET', url: 'https://api.example.com/users/profile' }
        }
      ]
    }
  ]
};

describe('importPostmanToBruno', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-converters-import-'));
    outputDir = path.join(tempDir, 'collection');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const read = (...segments: string[]) => fs.readFileSync(path.join(outputDir, ...segments), 'utf8');
  const readProfileRequest = () => parseRequest(read('Users', 'Get Profile.yml'), { format: 'yml' });

  it('writes the converted collection as a yml collection', async () => {
    await importPostmanToBruno(postmanCollection, outputDir);

    expect(fs.existsSync(path.join(outputDir, 'opencollection.yml'))).toBe(true);
    expect(parseFolder(read('Users', 'folder.yml'), { format: 'yml' }).meta.name).toBe('Users');
    expect(readProfileRequest().request).toMatchObject({
      method: 'GET',
      url: 'https://api.example.com/users/profile'
    });
  });

  it('resolves with no value', async () => {
    await expect(importPostmanToBruno(postmanCollection, outputDir)).resolves.toBeUndefined();
  });

  it('translates Postman scripts by default', async () => {
    await importPostmanToBruno(postmanCollection, outputDir);

    const script = readProfileRequest().request.script.req;
    expect(script).not.toContain('pm.environment.set');
    expect(script).toContain('bru.setEnvVar');
  });

  it('keeps Postman scripts verbatim with preserveScripts', async () => {
    await importPostmanToBruno(postmanCollection, outputDir, { preserveScripts: true });

    expect(readProfileRequest().request.script.req).toBe(PRE_REQUEST_SCRIPT);
  });

  it('rejects when the output directory is not empty', async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'existing.txt'), '');

    await expect(importPostmanToBruno(postmanCollection, outputDir)).rejects.toMatchObject({ code: 'ENOTEMPTY' });
  });

  it('rejects an unsupported Postman schema without writing anything', async () => {
    const unsupported = { ...postmanCollection, info: { ...postmanCollection.info, schema: 'https://example.com/unknown.json' } };

    await expect(importPostmanToBruno(unsupported, outputDir)).rejects.toThrow('Unsupported Postman schema version');
    expect(fs.existsSync(outputDir)).toBe(false);
  });
});
