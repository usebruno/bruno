const path = require('node:path');
const { describe, test, expect } = require('@jest/globals');
const { wrapAndJoinScripts } = require('../../../src/utils/collection');

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
