import * as fs from 'fs';
import * as path from 'path';
import { closeElectronApp, expect, test, waitForReadyPage } from '../../../playwright';
import { closeAllCollections, getCollectionTreeStructure } from '../../utils/page';

const formats = ['bru', 'yml'] as const;
type Format = (typeof formats)[number];

const requestFile = (format: Format, name: string) =>
  format === 'bru'
    ? `meta {\n  name: ${name}\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://example.com\n  body: none\n  auth: none\n}\n`
    : `info:\n  name: ${name}\n  type: http\n  seq: 1\n\nhttp:\n  method: GET\n  url: https://example.com\n`;

const collectionConfig = (format: Format, name: string) =>
  format === 'bru'
    ? JSON.stringify({ version: '1', name, type: 'collection', ignore: ['ignored-folder'] }, null, 2)
    : `opencollection: "1.0.0"\ninfo:\n  name: ${name}\n\nextensions:\n  bruno:\n    ignore:\n      - ignored-folder\n`;

for (const format of formats) {
  test(`[${format}] applies custom ignores during the initial scan with file cache off`, async ({
    createTmpDir,
    launchElectronApp
  }) => {
    const collectionName = `Initial Ignore ${format.toUpperCase()}`;
    const collectionPath = await createTmpDir(`initial-ignore-${format}`);
    const userDataPath = await createTmpDir(`initial-ignore-userdata-${format}`);
    const extension = format;
    const configFilename = format === 'bru' ? 'bruno.json' : 'opencollection.yml';

    await test.step('Arrange a collection with a custom ignored folder', async () => {
      await fs.promises.writeFile(
        path.join(collectionPath, configFilename),
        collectionConfig(format, collectionName)
      );
      await fs.promises.writeFile(
        path.join(collectionPath, `visible-request.${extension}`),
        requestFile(format, 'Visible Request')
      );

      const ignoredFolder = path.join(collectionPath, 'ignored-folder');
      await fs.promises.mkdir(ignoredFolder);
      await fs.promises.writeFile(
        path.join(ignoredFolder, `hidden-request.${extension}`),
        requestFile(format, 'Hidden Request')
      );

      await fs.promises.writeFile(
        path.join(userDataPath, 'preferences.json'),
        JSON.stringify({
          lastOpenedCollections: [collectionPath],
          preferences: {
            cache: {
              file: { enabled: false }
            },
            onboarding: {
              hasLaunchedBefore: true,
              hasSeenWelcomeModal: true
            }
          }
        }, null, 2)
      );
    });

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    try {
      const tree = await getCollectionTreeStructure(page, collectionName);

      await test.step('Assert only non-ignored entries appear', async () => {
        expect(tree.items).toContainEqual(expect.objectContaining({ name: 'Visible Request', type: 'request' }));
        expect(tree.items.some((item) => item.name === 'ignored-folder')).toBe(false);
        expect(tree.items.some((item) => item.name === 'Hidden Request')).toBe(false);
      });
    } finally {
      await closeAllCollections(page);
      await closeElectronApp(app);
    }
  });
}
