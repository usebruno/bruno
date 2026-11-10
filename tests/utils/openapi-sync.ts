import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import jsyaml from 'js-yaml';
import { expect } from '../../playwright';

export const readOpenApiSyncConfig = (collectionDir: string) => {
  const collection = jsyaml.load(fs.readFileSync(path.join(collectionDir, 'opencollection.yml'), 'utf8'), { schema: jsyaml.JSON_SCHEMA }) as any;
  return collection.extensions.bruno.openapi;
};

export const readBrunoJsonSyncConfig = (collectionDir: string) => {
  return JSON.parse(fs.readFileSync(path.join(collectionDir, 'bruno.json'), 'utf8')).openapi;
};

const specHashOf = (specFile: string) => {
  return crypto.createHash('md5').update(JSON.stringify(jsyaml.load(fs.readFileSync(specFile, 'utf8')))).digest('hex');
};

export const expectSyncedWithSpec = (collectionDir: string, syncConfig: any, specFile: string, { authPlacement = 'request', requestNameSource = 'summary' } = {}) => {
  expect(syncConfig).toEqual([{
    sourceUrl: path.relative(collectionDir, specFile).split(path.sep).join('/'),
    groupBy: 'tags',
    authPlacement,
    requestNameSource,
    autoCheck: true,
    autoCheckInterval: 5,
    lastSyncDate: expect.any(String),
    specHash: specHashOf(specFile)
  }]);
};
