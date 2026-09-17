import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

const buildCollection = ({ folderEvent, requestEvent, collectionEvent } = {}) => ({
  info: {
    name: 'Pkg Detection Test',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  ...(collectionEvent ? { event: [collectionEvent] } : {}),
  item: [
    {
      name: 'Sample Folder',
      ...(folderEvent ? { event: [folderEvent] } : {}),
      item: [
        {
          name: 'Sample Request',
          ...(requestEvent ? { event: [requestEvent] } : {}),
          request: {
            method: 'GET',
            url: { raw: 'https://example.com/', protocol: 'https', host: ['example', 'com'], path: [''] },
            header: []
          }
        }
      ]
    }
  ]
});

const preRequestEvent = (lines) => ({
  listen: 'prerequest',
  script: { type: 'text/javascript', exec: lines }
});

const testEvent = (lines) => ({
  listen: 'test',
  script: { type: 'text/javascript', exec: lines }
});

describe('postman-to-bruno :: package detection integration', () => {
  it('rewrites pm.require to require in the converted scripts', async () => {
    const collection = buildCollection({
      requestEvent: preRequestEvent([
        `const _ = pm.require('npm:lodash@4.17.21');`,
        `const ajv = pm.require('ajv');`
      ])
    });

    const { collection: converted } = await postmanToBruno(collection);
    const requestScript = converted.items[0].items[0].request.script.req;

    expect(requestScript).toContain(`require('lodash')`);
    expect(requestScript).toContain(`require('ajv')`);
    expect(requestScript).not.toContain('pm.require');
  });

  it('aggregates packages across collection, folder, and request scripts', async () => {
    const collection = buildCollection({
      collectionEvent: preRequestEvent([`const path = require('path');`]),
      folderEvent: testEvent([`const _ = pm.require('lodash');`]),
      requestEvent: preRequestEvent([`const ajv = pm.require('npm:ajv@8');`])
    });

    const { collection: converted } = await postmanToBruno(collection);
    const report = converted.packageReport;

    expect(report.hasAny).toBe(true);
    expect(report.safeMode).toEqual(['path']);
    expect(report.devMode).toEqual(['lodash']);
    expect(report.needsInstall).toEqual(['ajv']);
    expect(report.unsupported).toEqual([]);
  });

  it('attaches an empty packageReport when no requires are present', async () => {
    const collection = buildCollection({
      requestEvent: preRequestEvent([`console.log('no requires here');`])
    });

    const { collection: converted } = await postmanToBruno(collection);
    expect(converted.packageReport).toBeDefined();
    expect(converted.packageReport.hasAny).toBe(false);
  });

  it('flags Postman-specific packages as unsupported', async () => {
    const collection = buildCollection({
      requestEvent: testEvent([`const pc = pm.require('postman-collection');`])
    });

    const { collection: converted } = await postmanToBruno(collection);
    expect(converted.packageReport.unsupported).toEqual(['postman-collection']);
    expect(converted.packageReport.needsInstall).toEqual([]);
  });

  it('detects translator-injected sandbox globals (cheerio used as a bare identifier)', async () => {
    // No explicit require - Postman exposes `cheerio` as a sandbox global.
    // The Bruno translator injects `const cheerio = require('cheerio')`,
    // which the post-translation scan should surface as needsInstall.
    const collection = buildCollection({
      requestEvent: testEvent([
        `const $ = cheerio.load('<div>hi</div>');`,
        `console.log($('div').text());`
      ])
    });

    const { collection: converted } = await postmanToBruno(collection);
    expect(converted.packageReport.needsInstall).toContain('cheerio');
    expect(converted.packageReport.hasAny).toBe(true);
  });
});
