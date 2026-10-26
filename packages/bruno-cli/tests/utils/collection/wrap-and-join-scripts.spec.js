const path = require('node:path');
const { describe, test, expect } = require('@jest/globals');
const { runScriptInNodeVm } = require('@usebruno/js');
const { executeQuickJsVmAsync } = require('@usebruno/js/src/sandbox/quickjs');
const { wrapAndJoinScripts, mergeScripts } = require('../../../src/utils/collection');

describe('CLI wrapAndJoinScripts: hierarchical __dirname/__filename', () => {
  const colDir = path.resolve('/col');
  const collectionFile = path.join(colDir, 'collection.bru');
  const subDir = path.join(colDir, 'sub');
  const folderFile = path.join(subDir, 'folder.bru');
  const requestFile = path.join(subDir, 'req.bru');

  test('binds per-segment __dirname/__filename via IIFE args when filePath is provided', () => {
    const sources = [
      { filePath: collectionFile, displayPath: 'collection.bru' },
      { filePath: folderFile, displayPath: path.join('sub', 'folder.bru') },
      null
    ];
    const requestSegmentSource = { filePath: requestFile };
    const result = wrapAndJoinScripts(
      ['let a = 1;', 'let b = 2;', 'let c = 3;'],
      2,
      { segmentSources: sources, requestSegmentSource }
    );

    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(`)(${JSON.stringify(colDir)}, ${JSON.stringify(collectionFile)});`);
    expect(result.code).toContain(`)(${JSON.stringify(subDir)}, ${JSON.stringify(folderFile)});`);
    expect(result.code).toContain(`)(${JSON.stringify(subDir)}, ${JSON.stringify(requestFile)});`);
  });

  test('preserves line counts when injecting IIFE args (opener stays on one line)', () => {
    const withPaths = wrapAndJoinScripts(
      ['let x = 1;', '', 'let y = 2;'],
      2,
      {
        segmentSources: [{ filePath: collectionFile, displayPath: 'collection.bru' }, null, null],
        requestSegmentSource: { filePath: requestFile }
      }
    );
    const withoutPaths = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2);
    expect(withPaths.metadata.requestStartLine).toBe(withoutPaths.metadata.requestStartLine);
    expect(withPaths.metadata.requestEndLine).toBe(withoutPaths.metadata.requestEndLine);
  });

  test('falls back to collection dir for __dirname and leaves __filename undefined when a segment has no filePath', () => {
    const result = wrapAndJoinScripts(
      ['', '', 'console.log("hi");'],
      2,
      { collectionPath: colDir }
    );
    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(`)(${JSON.stringify(colDir)}, undefined);`);
  });

  test('binds both __dirname and __filename to undefined when neither filePath nor collectionPath is provided', () => {
    const result = wrapAndJoinScripts(['', '', 'console.log("hi");'], 2);
    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(')(undefined, undefined);');
  });
});

describe('CLI wrapAndJoinScripts: line endings', () => {
  test('normalises CRLF segments to LF so line counts stay correct', () => {
    const result = wrapAndJoinScripts(['let a = 1;\r\nlet b = 2;', '', 'let c = 3;'], 2);
    expect(result.code).not.toContain('\r');
    expect(result.code).toContain('let a = 1;\nlet b = 2;');
    // Collection segment: opener + 2 body lines + closer = 4 lines, blank separator at 5
    expect(result.metadata.requestStartLine).toBe(6);
    expect(result.metadata.requestEndLine).toBe(8);
  });

  test('mixed endings across collection, folder and request segments all become LF', () => {
    const result = wrapAndJoinScripts(['col();\r\n', 'folder();\n', '// note\r\nreq();'], 2);
    expect(result.code).not.toContain('\r');
    expect(result.code).toContain('// note\nreq();');
  });
});

describe('CLI mergeScripts: merged scripts execute in both sandboxes', () => {
  const makeCollection = (scripts = {}, pathname = '/test/collection') => ({
    pathname,
    format: 'bru',
    root: {
      request: {
        script: {
          req: scripts.preReq || '',
          res: scripts.postRes || ''
        },
        tests: scripts.tests || ''
      }
    }
  });

  const makeRequest = (scripts = {}) => ({
    script: {
      req: scripts.preReq || '',
      res: scripts.postRes || ''
    },
    tests: scripts.tests || ''
  });

  const sandboxes = [
    ['nodevm', (script, bru) => runScriptInNodeVm({ script, context: { bru, console, __bruSetScope: jest.fn() }, collectionPath: '/test/collection', scriptingConfig: {} })],
    ['quickjs', (script, bru) => executeQuickJsVmAsync({ script, context: { bru }, collectionPath: '/test/collection' })]
  ];

  const crlfCollectionScript = [
    'function extractDataPaths(scRaw) {',
    '    const placeholderRegExp = /{{([^}]+)}}/g;',
    '    const dataPaths = [];',
    '    let match;',
    '    while ((match = placeholderRegExp.exec(scRaw)) != null) {',
    '        dataPaths.push(match[1]);',
    '    }',
    '    return dataPaths;',
    '}'
  ].join('\r\n');

  test.each(sandboxes)('CRLF collection script + request script with a // comment still runs in %s', async (_, runScript) => {
    const collection = makeCollection({ preReq: crlfCollectionScript });
    const request = makeRequest({ preReq: '// Set the pet ID before sending the request\nbru.setVar("petId", 9091)' });
    mergeScripts(collection, request, [request], 'sandwich');

    expect(request.script.req).not.toContain('\r');
    const bru = { setVar: jest.fn() };
    await runScript(request.script.req, bru);
    expect(bru.setVar).toHaveBeenCalledWith('petId', 9091);
  });

  test.each(sandboxes)('CRLF collection script + request script that is only a // comment does not break the combined script in %s', async (_, runScript) => {
    const collection = makeCollection({ preReq: crlfCollectionScript });
    const request = makeRequest({ preReq: '// just a comment' });
    mergeScripts(collection, request, [request], 'sandwich');

    const bru = { setVar: jest.fn() };
    await expect(runScript(request.script.req, bru)).resolves.not.toThrow();
  });

  test.each(sandboxes)('a // comment at the end of a CR-only collection script does not swallow the closer in %s', async (_, runScript) => {
    const collection = makeCollection({ preReq: 'bru.setVar("a", 1);\r// trailing comment' });
    const request = makeRequest({ preReq: 'bru.setVar("b", 2);' });
    mergeScripts(collection, request, [request], 'sandwich');

    const bru = { setVar: jest.fn() };
    await runScript(request.script.req, bru);

    expect(bru.setVar).toHaveBeenCalledWith('a', 1);
    expect(bru.setVar).toHaveBeenCalledWith('b', 2);
  });
});
