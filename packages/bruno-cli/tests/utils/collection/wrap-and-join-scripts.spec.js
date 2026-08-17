const path = require('node:path');
const { describe, test, expect } = require('@jest/globals');
const { wrapAndJoinScripts } = require('../../../src/utils/collection');

describe('CLI wrapAndJoinScripts — hierarchical __dirname/__filename', () => {
  test('binds per-segment __dirname/__filename via IIFE args when filePath is provided', () => {
    const sources = [
      { filePath: '/col/collection.bru', displayPath: 'collection.bru' },
      { filePath: '/col/sub/folder.bru', displayPath: 'sub/folder.bru' },
      null
    ];
    const requestSegmentSource = { filePath: '/col/sub/req.bru' };
    const result = wrapAndJoinScripts(
      ['let a = 1;', 'let b = 2;', 'let c = 3;'],
      2,
      sources,
      requestSegmentSource
    );

    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(`)(${JSON.stringify(path.dirname('/col/collection.bru'))}, "/col/collection.bru");`);
    expect(result.code).toContain(`)(${JSON.stringify(path.dirname('/col/sub/folder.bru'))}, "/col/sub/folder.bru");`);
    expect(result.code).toContain(`)(${JSON.stringify(path.dirname('/col/sub/req.bru'))}, "/col/sub/req.bru");`);
  });

  test('preserves line counts when injecting IIFE args (opener stays on one line)', () => {
    const withPaths = wrapAndJoinScripts(
      ['let x = 1;', '', 'let y = 2;'],
      2,
      [{ filePath: '/col/collection.bru', displayPath: 'collection.bru' }, null, null],
      { filePath: '/col/sub/req.bru' }
    );
    const withoutPaths = wrapAndJoinScripts(['let x = 1;', '', 'let y = 2;'], 2);
    expect(withPaths.metadata.requestStartLine).toBe(withoutPaths.metadata.requestStartLine);
    expect(withPaths.metadata.requestEndLine).toBe(withoutPaths.metadata.requestEndLine);
  });

  test('falls back to sandbox __dirname/__filename identifiers when no filePath is provided', () => {
    const result = wrapAndJoinScripts(['', '', 'console.log("hi");'], 2);
    expect(result.code).toContain('async (__dirname, __filename) => {');
    expect(result.code).toContain(')(__dirname, __filename);');
  });
});
