/**
 * Drives the report through the real converter rather than hand-written
 * measurements, so an API that gains a Bruno mapping upstream stops being
 * reported without anyone touching this module.
 */

import postmanToBruno from '../../../src/postman/postman-to-bruno';

const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const buildCollection = (items, collectionEvents) => ({
  info: { name: 'integration', schema: POSTMAN_SCHEMA },
  ...(collectionEvents ? { event: collectionEvents } : {}),
  item: items
});

const requestItem = (name, exec, listen = 'test') => ({
  name,
  request: { method: 'GET', url: 'https://example.com' },
  event: [{ listen, script: { exec } }]
});

const reportFor = async (collection, options) => {
  const { scriptTranslationReport } = await postmanToBruno(collection, options);
  return scriptTranslationReport;
};

describe('postman script report (against the real converter)', () => {
  it('reports nothing untranslated for APIs the translator maps', async () => {
    const report = await reportFor(
      buildCollection([
        requestItem('mapped', [
          'pm.environment.set("token", pm.response.json().token);',
          'pm.test("ok", function () {',
          '  pm.response.to.have.status(200);',
          '});',
          'pm.cookies.jar().get("session");'
        ])
      ])
    );

    expect(report).toEqual({
      preserveScripts: false,
      fullyTranslated: true,
      apiCallsTotal: 5,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 0
    });
  });

  it('reports an API with no Bruno mapping', async () => {
    const report = await reportFor(
      buildCollection([requestItem('unmapped', ['pm.someUnknownApi.doThing();'])])
    );

    expect(report.fullyTranslated).toBe(false);
    expect(report.apiCallsUntranslated).toBe(1);
    expect(report.untranslatedApis).toEqual({ 'pm.someUnknownApi.doThing': 1 });
  });

  it('counts a looped call site once', async () => {
    const report = await reportFor(
      buildCollection([
        requestItem('looped', ['for (let i = 0; i < 10; i++) { pm.someUnknownApi.doThing(i); }'])
      ])
    );

    expect(report.apiCallsTotal).toBe(1);
    expect(report.untranslatedApis).toEqual({ 'pm.someUnknownApi.doThing': 1 });
  });

  it('never leaks a computed key the translator leaves in place', async () => {
    const { collection: bruno, scriptTranslationReport } = await postmanToBruno(
      buildCollection([requestItem('computed', ['const v = pm["my_secret_var_name"];'])])
    );

    // The translator has no mapping for computed access, so the user's variable
    // name really is still present in the translated output...
    expect(bruno.items[0].request.script.res).toContain('my_secret_var_name');

    // ...but it must never reach the report
    expect(scriptTranslationReport.untranslatedApis).toEqual({});
    expect(JSON.stringify(scriptTranslationReport)).not.toContain('my_secret_var_name');
  });

  it('returns no script text alongside the report', async () => {
    const result = await postmanToBruno(
      buildCollection([requestItem('secretive', ['pm.someUnknownApi.doThing("sk-live-xyz");'])])
    );

    expect(Object.keys(result).sort()).toEqual(['collection', 'issues', 'scriptTranslationReport']);
    expect(JSON.stringify(result.scriptTranslationReport)).not.toContain('sk-live-xyz');
  });

  it('counts a script the converter could not translate structurally as a fallback', async () => {
    const report = await reportFor(
      buildCollection([requestItem('broken', ['pm.test("unclosed", function () {'])])
    );

    expect(report).toEqual({
      preserveScripts: false,
      fullyTranslated: false,
      apiCallsTotal: 0,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 1
    });
  });

  it('covers collection, folder and request scripts in one import', async () => {
    const report = await reportFor(
      buildCollection(
        [
          {
            name: 'folder',
            event: [{ listen: 'prerequest', script: { exec: ['pm.someUnknownApi.folderLevel();'] } }],
            item: [requestItem('req', ['pm.someUnknownApi.requestLevel();'])]
          }
        ],
        [{ listen: 'prerequest', script: { exec: ['pm.someUnknownApi.collectionLevel();'] } }]
      )
    );

    expect(report.apiCallsTotal).toBe(3);
    expect(report.untranslatedApis).toEqual({
      'pm.someUnknownApi.collectionLevel': 1,
      'pm.someUnknownApi.folderLevel': 1,
      'pm.someUnknownApi.requestLevel': 1
    });
  });

  it('takes legacy postman.* APIs into account under their own root', async () => {
    const report = await reportFor(
      buildCollection([
        requestItem('legacy', [
          'postman.setEnvironmentVariable("a", 1);',
          'postman.someUnknownApi.legacyThing();'
        ])
      ])
    );

    expect(report.apiCallsTotal).toBe(2);
    expect(report.apiCallsUntranslated).toBe(1);
    expect(report.untranslatedApis).toEqual({ 'postman.someUnknownApi.legacyThing': 1 });
  });

  it('reports only the flag when scripts are preserved, since nothing was translated', async () => {
    const report = await reportFor(
      buildCollection([requestItem('kept', ['pm.someUnknownApi.doThing();'])]),
      { preserveScripts: true }
    );

    expect(report).toEqual({ preserveScripts: true });
  });

  it('reports zeroes for a collection with no scripts', async () => {
    const report = await reportFor({
      info: { name: 'empty', schema: POSTMAN_SCHEMA },
      item: [{ name: 'req', request: { method: 'GET', url: 'https://example.com' } }]
    });

    expect(report).toEqual({
      preserveScripts: false,
      fullyTranslated: true,
      apiCallsTotal: 0,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 0
    });
  });

  it('counts a pm.require the import rewrites to require() as translated', async () => {
    const { collection, scriptTranslationReport } = await postmanToBruno(
      buildCollection([requestItem('library', ['const _ = pm.require("lodash");', 'pm.environment.set("k", "v");'])])
    );

    expect(collection.items[0].request.script.res).toContain('require("lodash")');
    expect(collection.items[0].request.script.res).not.toContain('pm.require');

    expect(scriptTranslationReport).toEqual({
      preserveScripts: false,
      fullyTranslated: true,
      apiCallsTotal: 2,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 0
    });
  });

  it('still reports a pm.require the rewrite cannot resolve', async () => {
    // A non-literal specifier is left alone by the rewrite, so it really does
    // reach the user as `pm.require`.
    const { collection, scriptTranslationReport } = await postmanToBruno(
      buildCollection([requestItem('dynamic', ['const lib = pm.require(packageName);'])])
    );

    expect(collection.items[0].request.script.res).toContain('pm.require');
    expect(scriptTranslationReport.fullyTranslated).toBe(false);
    expect(scriptTranslationReport.untranslatedApis).toEqual({ 'pm.require': 1 });
  });
});
