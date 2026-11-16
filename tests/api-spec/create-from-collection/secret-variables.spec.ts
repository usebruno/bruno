import fs from 'fs';
import path from 'path';
import jsyaml from 'js-yaml';
import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  closeEnvironmentPanel,
  openCollection,
  openCollectionFromDialog,
  openEnvironmentConfigTab,
  setEnvironmentSecrets
} from '../../utils/page';
import { buildApiSpecPanelLocators, createApiSpecFromCollection, removeAllApiSpecsFromWorkspace } from '../../utils/page/openapi/render-spec';

const SECRETS = {
  secvar: 'secvar-from-secret-store',
  apiKey: 'api-key-from-secret-store',
  tenantSecret: 'tenant-from-secret-store',
  secretPort: 'port-from-secret-store'
};

const secvarPathParam = { name: 'secvar', in: 'path', required: true, example: '{{secvar}}', schema: { type: 'string' } };

test.describe('Create API spec from a collection: secrets', () => {
  test.afterEach(async ({ page }) => {
    await removeAllApiSpecsFromWorkspace(page);
    await closeAllCollections(page);
  });

  test('writes variable values but never secret values into the spec', async ({ page, electronApp, createTmpDir, collectionFixturePath }) => {
    const specsDir = await createTmpDir('secrets-spec');
    const { swaggerOperation, swaggerOperationSummary, swaggerTryItOut, swaggerPathParamInput } = buildApiSpecPanelLocators(page);

    await test.step('Give the environment secrets a value', async () => {
      await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
      await openCollection(page, 'secrets-in-url');
      await openEnvironmentConfigTab(page);
      await setEnvironmentSecrets(page, 'local', SECRETS);
      await closeEnvironmentPanel(page);
    });

    await createApiSpecFromCollection(page, electronApp, {
      name: 'secrets-in-url',
      collectionPath: collectionFixturePath!,
      environment: 'local',
      location: specsDir
    });

    const specText = await fs.promises.readFile(path.join(specsDir, 'secrets-in-url.yaml'), 'utf8');
    const spec = jsyaml.load(specText) as any;

    await test.step('Secrets become path parameters while variables are filled in', async () => {
      expect(spec.paths['/{secvar}/env-var-value'].get.parameters).toEqual([secvarPathParam]);
      expect(spec.paths['/users/{secvar}'].get.parameters).toEqual([secvarPathParam]);
      Object.values(SECRETS).forEach((value) => expect(specText).not.toContain(value));
    });

    await test.step('A secret in the environment base url gets its placeholder text as the default', async () => {
      const localServer = spec.servers.find((server: any) => server.description === 'local');
      expect(localServer).toEqual({
        url: 'https://{region}.api.test/{apiKey}',
        variables: { region: { default: 'eu' }, apiKey: { default: '{{apiKey}}' } },
        description: 'local'
      });
    });

    await test.step('A secret in a request host keeps its spelling as a server variable', async () => {
      expect(spec.paths['/data'].get.servers).toEqual([
        { url: 'https://{tenantSecret}.api.test', variables: { tenantSecret: { default: '{{tenantSecret}}' } } }
      ]);
    });

    await test.step('A prompt variable stays in the path as a path parameter, without a made-up query param', async () => {
      expect(spec.paths['/users/{?User Id}'].get.parameters).toEqual([
        { name: '?User Id', in: 'path', required: true, example: '{{?User Id}}', schema: { type: 'string' } }
      ]);
    });

    await test.step('A secret port stays in the server as a server variable', async () => {
      expect(spec.paths['/health'].get.servers).toEqual([
        { url: 'http://localhost:{secretPort}', variables: { secretPort: { default: '{{secretPort}}' } } }
      ]);
    });

    await test.step('Swagger shows a fill-in box for the secret in the path, prefilled with its placeholder', async () => {
      const operation = swaggerOperation('/{secvar}/env-var-value');
      await swaggerOperationSummary(operation).click();
      await swaggerTryItOut(operation).click();
      await expect(swaggerPathParamInput(operation, 'secvar')).toHaveValue('{{secvar}}');
    });
  });
});
