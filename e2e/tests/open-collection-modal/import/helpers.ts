import AdmZip from 'adm-zip';
import * as path from 'path';

export const importFixturePath = (name: string) => path.join(__dirname, 'fixtures', 'import-files', name);

export const writeZip = (zipPath: string, entries: Record<string, string>) => {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.addFile(name, Buffer.from(content));
  }
  zip.writeZip(zipPath);
  return zipPath;
};
