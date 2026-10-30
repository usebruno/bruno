import {
  aggregateScriptUsage,
  buildPreservedScriptsReport,
  buildScriptUsage,
  countPmApiUsages,
  mergeScriptTranslationReports
} from '../../../src/postman/postman-script-report';

const scan = (script) => countPmApiUsages(script);

// One measured block, as the translator emits it.
const translated = (source, output) => buildScriptUsage({ source, translated: output ?? source, fellBackToRegex: false });
const fellBack = (source) => buildScriptUsage({ source, translated: source, fellBackToRegex: true });

describe('countPmApiUsages', () => {
  describe('call-site counting', () => {
    it('counts one call site per pm root, not per member expression', () => {
      // Parses into four nested MemberExpressions; it is one call site.
      const result = scan('pm.response.to.have.status(200);');

      expect(result.total).toBe(1);
      expect(result.byApi).toEqual({ 'pm.response.to.have.status': 1 });
    });

    it('counts a call inside a loop once', () => {
      const result = scan('for (let i = 0; i < 10; i++) { pm.environment.set("k", i); }');

      expect(result.total).toBe(1);
      expect(result.byApi).toEqual({ 'pm.environment.set': 1 });
    });

    it('counts distinct call sites of the same API separately', () => {
      const result = scan('pm.environment.get("a"); pm.environment.get("b");');

      expect(result.total).toBe(2);
      expect(result.byApi).toEqual({ 'pm.environment.get': 2 });
    });

    it('counts nested pm references as separate call sites', () => {
      const result = scan('pm.environment.set("k", pm.response.code);');

      expect(result.total).toBe(2);
      expect(result.byApi).toEqual({ 'pm.environment.set': 1, 'pm.response.code': 1 });
    });
  });

  describe('identifier rules', () => {
    it('never includes call arguments', () => {
      expect(scan('pm.environment.get("SECRET_NAME");').byApi)
        .toEqual({ 'pm.environment.get': 1 });
    });

    it('terminates the identifier at a call, keeping the called API', () => {
      expect(scan('pm.cookies.jar().getCookie("session");').byApi)
        .toEqual({ 'pm.cookies.jar': 1 });
    });

    it('reports a chain in full rather than truncating it to a shared bucket', () => {
      expect(scan('pm.a.b.c.d.e.f.g;').byApi).toEqual({ 'pm.a.b.c.d.e.f.g': 1 });
    });

    it('keeps four- and five-segment APIs distinct rather than collapsing them', () => {
      // The translator's mapping tables go this deep; these must not share a bucket.
      const result = scan([
        'pm.request.headers.remove("X-One");',
        'pm.request.headers.upsert({ key: "X-Two" });',
        'pm.response.to.have.jsonSchema(schema);',
        'pm.response.to.have.jsonBody(body);'
      ].join('\n'));

      expect(result.byApi).toEqual({
        'pm.request.headers.remove': 1,
        'pm.request.headers.upsert': 1,
        'pm.response.to.have.jsonSchema': 1,
        'pm.response.to.have.jsonBody': 1
      });
    });

    it('counts legacy postman.* under its own root rather than inventing a pm.* name', () => {
      // `pm.setEnvironmentVariable` does not exist; reporting it as such would
      // both mislead and collide with a genuine `pm.*` key.
      expect(scan('postman.setEnvironmentVariable("k", "v");').byApi)
        .toEqual({ 'postman.setEnvironmentVariable': 1 });
    });

    it('keeps the two roots in separate buckets', () => {
      const result = scan('pm.someApi.doThing();\npostman.someApi.doThing();');

      expect(result.total).toBe(2);
      expect(result.byApi).toEqual({ 'pm.someApi.doThing': 1, 'postman.someApi.doThing': 1 });
    });
  });

  describe('appearances of pm that are not API accesses', () => {
    it('ignores property keys and property access', () => {
      const result = scan('const obj = { pm: 1 }; obj.pm; other.pm.thing;');

      expect(result.total).toBe(0);
      expect(result.byApi).toEqual({});
    });

    it('ignores the global used as a value rather than accessed', () => {
      // Real references, but not `pm.*` API call sites.
      const result = scan('obj[pm]; ({ [pm]: 1 }); foo(pm); typeof pm; const x = pm;');

      expect(result.total).toBe(0);
      expect(result.byApi).toEqual({});
    });

    it('ignores a class member named pm', () => {
      const result = scan('class A { pm() {} }');

      expect(result.total).toBe(0);
      expect(result.byApi).toEqual({});
    });
  });

  describe('privacy', () => {
    it('skips computed access rather than naming it by the key', () => {
      const result = scan('pm["secret_name"].get();\npm.environment["user_email"].deep;');

      expect(result.total).toBe(0);
      expect(result.byApi).toEqual({});
    });

    it('never emits argument values, URLs or header values', () => {
      const result = scan([
        'pm.sendRequest("https://internal.example.com/secret?token=abc123");',
        'pm.request.headers.add({ key: "Authorization", value: "Bearer sk-live-xyz" });'
      ].join('\n'));

      const serialized = JSON.stringify(result.byApi);
      expect(serialized).not.toContain('internal.example.com');
      expect(serialized).not.toContain('abc123');
      expect(serialized).not.toContain('sk-live-xyz');
      expect(serialized).not.toContain('Authorization');
    });
  });
});

describe('buildScriptUsage', () => {
  it('treats an empty or whitespace-only script as absent', () => {
    expect(translated('')).toBeNull();
    expect(translated('   \n  ')).toBeNull();
  });

  it('carries counts only, never the script text', () => {
    const usage = translated('pm.environment.set("k", "secret-value");', 'bru.setEnvVar("k", "secret-value");');

    expect(Object.keys(usage).sort()).toEqual([
      'apiCallsTotal', 'apiCallsUntranslated', 'fellBackToRegex', 'untranslatedApis'
    ]);
    expect(JSON.stringify(usage)).not.toContain('secret-value');
  });

  it('returns null rather than throwing when a block cannot be measured', () => {
    // Unparseable output from the regex fallback path must not cost the whole
    // import its report.
    expect(buildScriptUsage({ source: 'pm.test("x");', translated: 'function (', fellBackToRegex: false })).toBeNull();
  });
});

describe('buildPreservedScriptsReport', () => {
  it('reports only the flag, since translation never ran', () => {
    expect(buildPreservedScriptsReport()).toEqual({ preserveScripts: true });
  });
});

describe('aggregateScriptUsage', () => {
  // Omitting it would be indistinguishable from an import that was never measured.
  it('reports zeroes when nothing was measured', () => {
    const empty = {
      preserveScripts: false,
      fullyTranslated: true,
      apiCallsTotal: 0,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 0
    };

    expect(aggregateScriptUsage([])).toEqual(empty);
    expect(aggregateScriptUsage(undefined)).toEqual(empty);
    expect(aggregateScriptUsage([null, null])).toEqual(empty);
  });

  it('reports a fully translated import', () => {
    const report = aggregateScriptUsage([
      translated('pm.environment.set("k", "v");', 'bru.setEnvVar("k", "v");')
    ]);

    expect(report).toEqual({
      preserveScripts: false,
      fullyTranslated: true,
      apiCallsTotal: 1,
      apiCallsUntranslated: 0,
      untranslatedApis: {},
      scriptsFellBackToRegex: 0
    });
  });

  it('attributes surviving pm.* calls as untranslated', () => {
    const report = aggregateScriptUsage([
      translated(
        'pm.environment.set("k", "v");\npm.vault.get("secret-name");',
        'bru.setEnvVar("k", "v");\npm.vault.get("secret-name");'
      )
    ]);

    expect(report.apiCallsTotal).toBe(2);
    expect(report.apiCallsUntranslated).toBe(1);
    expect(report.untranslatedApis).toEqual({ 'pm.vault.get': 1 });
    expect(report.fullyTranslated).toBe(false);
  });

  it('counts a fallback separately and excludes it from both sides of the ratio', () => {
    const report = aggregateScriptUsage([fellBack('pm.vault.get("k");\npm.test("broken", function() { ')]);

    expect(report.scriptsFellBackToRegex).toBe(1);
    expect(report.apiCallsTotal).toBe(0);
    expect(report.apiCallsUntranslated).toBe(0);
    expect(report.untranslatedApis).toEqual({});
  });

  it('is not fully translated when a script fell back, even with nothing untranslated', () => {
    const report = aggregateScriptUsage([
      translated('pm.environment.get("a");', 'bru.getEnvVar("a");'),
      fellBack('pm.test("x", function() { ')
    ]);

    expect(report.apiCallsUntranslated).toBe(0);
    expect(report.scriptsFellBackToRegex).toBe(1);
    expect(report.fullyTranslated).toBe(false);
  });

  it('sums across every block, whatever level it came from', () => {
    const report = aggregateScriptUsage([
      translated('pm.vault.get("a");'),
      translated('pm.vault.get("b");'),
      translated('pm.vault.get("c");')
    ]);

    expect(report.apiCallsTotal).toBe(3);
    expect(report.untranslatedApis).toEqual({ 'pm.vault.get': 3 });
  });

  it('reports every distinct API, with counts that sum to the untranslated total', () => {
    const many = Array.from({ length: 60 }, (_, i) => `pm.unmappedApi${i}();`).join('\n');
    const report = aggregateScriptUsage([translated(many)]);

    expect(Object.keys(report.untranslatedApis)).toHaveLength(60);
    const sum = Object.values(report.untranslatedApis).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.apiCallsUntranslated);
  });
});

const collectionReport = (overrides = {}) => ({
  preserveScripts: false,
  fullyTranslated: true,
  apiCallsTotal: 1,
  apiCallsUntranslated: 0,
  untranslatedApis: {},
  scriptsFellBackToRegex: 0,
  ...overrides
});

// A bulk import is one `import_attempted` entry, so the per-collection reports
// are merged into one before they are recorded.
describe('mergeScriptTranslationReports', () => {
  it('returns null when no collection produced a report', () => {
    expect(mergeScriptTranslationReports([])).toBeNull();
    expect(mergeScriptTranslationReports([null, null])).toBeNull();
    expect(mergeScriptTranslationReports(undefined)).toBeNull();
  });

  it('sums counts and unions api maps across collections', () => {
    const merged = mergeScriptTranslationReports([
      collectionReport({
        fullyTranslated: false,
        apiCallsTotal: 10,
        apiCallsUntranslated: 3,
        untranslatedApis: { 'pm.vault.get': 3 },
        scriptsFellBackToRegex: 1
      }),
      collectionReport({
        fullyTranslated: false,
        apiCallsTotal: 5,
        apiCallsUntranslated: 2,
        untranslatedApis: { 'pm.vault.get': 1, 'pm.someUnknownApi': 1 }
      })
    ]);

    expect(merged).toEqual({
      preserveScripts: false,
      fullyTranslated: false,
      apiCallsTotal: 15,
      apiCallsUntranslated: 5,
      untranslatedApis: { 'pm.vault.get': 4, 'pm.someUnknownApi': 1 },
      scriptsFellBackToRegex: 1
    });
  });

  it('reports only the flag when every collection preserved its scripts', () => {
    expect(mergeScriptTranslationReports([{ preserveScripts: true }, { preserveScripts: true }])).toEqual({
      preserveScripts: true
    });
  });

  it('skips collections that produced no report', () => {
    const merged = mergeScriptTranslationReports([
      null,
      collectionReport({ fullyTranslated: false, apiCallsUntranslated: 1, untranslatedApis: { 'pm.x': 1 } })
    ]);

    expect(merged.apiCallsTotal).toBe(1);
    expect(merged.untranslatedApis).toEqual({ 'pm.x': 1 });
  });

  it('is fully translated only when every collection was', () => {
    expect(mergeScriptTranslationReports([collectionReport(), collectionReport()]).fullyTranslated).toBe(true);

    expect(
      mergeScriptTranslationReports([
        collectionReport(),
        collectionReport({ fullyTranslated: false, apiCallsUntranslated: 1, untranslatedApis: { 'pm.x': 1 } })
      ]).fullyTranslated
    ).toBe(false);

    // A fallback alone is enough, even with nothing untranslated.
    expect(
      mergeScriptTranslationReports([
        collectionReport(),
        collectionReport({ fullyTranslated: false, scriptsFellBackToRegex: 1 })
      ]).fullyTranslated
    ).toBe(false);
  });

  it('unions api maps without dropping any, keeping counts reconcilable', () => {
    const buildApis = (offset) =>
      Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`pm.api${offset + i}`, offset + i + 1]));

    const merged = mergeScriptTranslationReports([
      collectionReport({ fullyTranslated: false, apiCallsUntranslated: 465, untranslatedApis: buildApis(0) }),
      collectionReport({ fullyTranslated: false, apiCallsUntranslated: 1365, untranslatedApis: buildApis(30) })
    ]);

    expect(Object.keys(merged.untranslatedApis)).toHaveLength(60);
    const sum = Object.values(merged.untranslatedApis).reduce((a, b) => a + b, 0);
    expect(sum).toBe(merged.apiCallsUntranslated);
  });
});
