import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { test, expect, ElectronApplication, Page, waitForReadyPage, closeElectronApp } from '../../playwright';
import { getCollectionTreeStructure, CollectionTreeItem, closeAllCollections } from '../utils/page';

const formats = ['bru', 'yml'] as const;
type Format = (typeof formats)[number];

const cacheModes = [
  { label: 'file-cache off', fileCacheEnabled: false },
  { label: 'file-cache on', fileCacheEnabled: true }
];

const COLLECTION_NAME = 'Symlink Collection';

const requestFile = (format: Format, name: string) =>
  format === 'bru'
    ? `meta {\n  name: ${name}\n  type: http\n  seq: 1\n}\n\nget {\n  url: {{host}}/api/resource\n  body: none\n  auth: none\n}\n`
    : `info:\n  name: ${name}\n  type: http\n  seq: 1\n\nhttp:\n  method: GET\n  url: "{{host}}/api/resource"\n`;

const collectionFile = (format: Format) =>
  format === 'bru'
    ? `meta {\n  name: ${COLLECTION_NAME}\n}\n`
    : `opencollection: "1.0.0"\ninfo:\n  name: ${COLLECTION_NAME}\n`;

const symlinkType = (isDir: boolean): fs.symlink.Type =>
  process.platform === 'win32' ? (isDir ? 'junction' : 'file') : (isDir ? 'dir' : 'file');

interface SymlinkFixture {
  collectionPath: string;
  userDataPath: string;
  symlinksSupported: boolean;
  cleanup: () => Promise<void>;
}

/**
 * Build a collection whose entries include a symlinked request file and a
 * symlinked directory. The link targets live outside the collection root, so the
 * linked items surface in the tree only if the mount walk follows symlinks.
 */
async function buildSymlinkFixture(format: Format, fileCacheEnabled: boolean): Promise<SymlinkFixture> {
  const ext = format;
  const userDataPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-test-userdata-'));
  const collectionPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-test-collection-'));
  const targetsPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bruno-test-targets-'));

  const cleanup = async () => {
    await Promise.all([
      fs.promises.rm(userDataPath, { recursive: true, force: true }),
      fs.promises.rm(collectionPath, { recursive: true, force: true }),
      fs.promises.rm(targetsPath, { recursive: true, force: true })
    ]);
  };

  try {
    await fs.promises.writeFile(
      path.join(collectionPath, 'bruno.json'),
      JSON.stringify({ version: '1', name: COLLECTION_NAME, type: 'collection' }, null, 2)
    );
    const collectionRootFile = format === 'bru' ? 'collection.bru' : 'opencollection.yml';
    await fs.promises.writeFile(path.join(collectionPath, collectionRootFile), collectionFile(format));
    await fs.promises.writeFile(path.join(collectionPath, `RealRequest.${ext}`), requestFile(format, 'RealRequest'));

    // Symlink targets, kept outside the collection so they surface only via the links.
    const targetRequest = path.join(targetsPath, `linked-request.${ext}`);
    await fs.promises.writeFile(targetRequest, requestFile(format, 'LinkedRequest'));

    const targetDir = path.join(targetsPath, 'linked-folder');
    await fs.promises.mkdir(targetDir);
    await fs.promises.writeFile(path.join(targetDir, `NestedRequest.${ext}`), requestFile(format, 'NestedRequest'));

    let symlinksSupported = true;
    try {
      await fs.promises.symlink(targetRequest, path.join(collectionPath, `LinkedRequest.${ext}`), symlinkType(false));
      await fs.promises.symlink(targetDir, path.join(collectionPath, 'LinkedFolder'), symlinkType(true));
    } catch (err: any) {
      // Windows without Developer Mode / admin rights rejects symlink creation.
      if (err.code === 'EPERM' || err.code === 'EACCES') {
        symlinksSupported = false;
      } else {
        throw err;
      }
    }

    const preferences = {
      lastOpenedCollections: [collectionPath],
      preferences: {
        cache: {
          file: { enabled: fileCacheEnabled }
        },
        onboarding: {
          hasLaunchedBefore: true,
          hasSeenWelcomeModal: true
        }
      }
    };
    await fs.promises.writeFile(path.join(userDataPath, 'preferences.json'), JSON.stringify(preferences, null, 2));

    return { collectionPath, userDataPath, symlinksSupported, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

for (const { label, fileCacheEnabled } of cacheModes) {
  for (const format of formats) {
    test.describe(`[${format}] [${label}] Symlinked Collection Entries`, () => {
      let fixture: SymlinkFixture;
      let app: ElectronApplication;
      let page: Page;

      test.beforeAll(async ({ launchElectronApp }) => {
        fixture = await buildSymlinkFixture(format, fileCacheEnabled);
        app = await launchElectronApp({ userDataPath: fixture.userDataPath });
        page = await waitForReadyPage(app);
      });

      test.afterAll(async () => {
        if (page) {
          await closeAllCollections(page);
        }
        if (app) {
          await closeElectronApp(app);
        }
        if (fixture) {
          await fixture.cleanup();
        }
      });

      test('should list symlinked request and directory entries in the tree', async () => {
        test.skip(!fixture.symlinksSupported, 'symlink creation not permitted on this platform');

        const tree = await getCollectionTreeStructure(page, COLLECTION_NAME);

        const requestNames = tree.items.filter((item) => item.type === 'request').map((item) => item.name);
        expect(requestNames).toContain('RealRequest');
        expect(requestNames).toContain('LinkedRequest');

        const linkedFolder = tree.items.find(
          (item): item is CollectionTreeItem => item.type === 'folder' && item.name === 'LinkedFolder'
        );
        expect(linkedFolder).toBeDefined();

        const nestedRequestNames = (linkedFolder?.items ?? [])
          .filter((item) => item.type === 'request')
          .map((item) => item.name);
        expect(nestedRequestNames).toContain('NestedRequest');
      });
    });
  }
}
