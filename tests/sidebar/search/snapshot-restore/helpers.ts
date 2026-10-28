import path from 'path';
import fs from 'fs';
import { version } from '../../../../packages/bruno-app/package.json';

const HEADER_COUNT = 60;
const REQUESTS_PER_FOLDER = 200;

export const writePreferences = (userDataPath: string, collections: string[], fileCacheEnabled: boolean) => {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
    lastOpenedCollections: collections,
    preferences: {
      onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
      cache: { file: { enabled: fileCacheEnabled }, searchIndex: { enabled: true } }
    }
  }));
};

const writeYmlRequest = (dir: string, name: string, seq: number, url: string) => {
  const headers = Array.from({ length: HEADER_COUNT }, (_, i) => `    - name: X-Header-${i}\n      value: value-${seq}-${i}-padding-padding-padding`).join('\n');
  fs.writeFileSync(
    path.join(dir, `${name}.yml`),
    `info:\n  name: ${name}\n  type: http\n  seq: ${seq}\n\nhttp:\n  method: GET\n  url: ${url}\n  headers:\n${headers}\n`
  );
};

/** Writes a YAML collection whose requests carry ~5KB of headers each, plus one named needle request. */
export const buildLargeYmlCollection = (dir: string, name: string, requestCount: number, needle: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), `opencollection: 1.0.0\n\ninfo:\n  name: ${name}\n`);
  for (let f = 0; f * REQUESTS_PER_FOLDER < requestCount; f += 1) {
    const folderDir = path.join(dir, `folder-${f}`);
    fs.mkdirSync(folderDir, { recursive: true });
    fs.writeFileSync(path.join(folderDir, 'folder.yml'), `info:\n  name: folder-${f}\n  type: folder\n  seq: ${f + 1}\n`);
    const count = Math.min(REQUESTS_PER_FOLDER, requestCount - f * REQUESTS_PER_FOLDER);
    for (let r = 0; r < count; r += 1) {
      const seq = f * REQUESTS_PER_FOLDER + r + 1;
      writeYmlRequest(folderDir, `request-${seq}`, seq, `https://api.example.com/v1/resource/${seq}`);
    }
  }
  writeYmlRequest(dir, needle, 1, `https://${needle}.example/resource`);
  return dir;
};
